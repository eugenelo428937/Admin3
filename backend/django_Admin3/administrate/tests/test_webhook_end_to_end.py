import json
from pathlib import Path

import pytest
from rest_framework.test import APIClient

from administrate.models import (
    CourseTemplate,
    Event,
    Instructor,
    Location,
    Venue,
    WebhookInbox,
)


FIXTURES = Path(__file__).resolve().parent / 'fixtures' / 'webhooks'


def _load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


@pytest.fixture(autouse=True)
def _webhook_settings(settings):
    """Pin webhook settings independent of DJANGO_SETTINGS_MODULE."""
    settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN = 'test-route-token'
    settings.ADMINISTRATE_WEBHOOK_SECRET = 'test-shared-secret'


@pytest.fixture
def deps(db):
    location = Location.objects.create(external_id='loc_external_1')
    Venue.objects.create(external_id='ven_external_1', location=location)
    Instructor.objects.create(external_id='ins_external_1')
    CourseTemplate.objects.create(external_id='ct_external_1')


@pytest.mark.django_db
class TestEndToEnd:
    URL = '/api/administrate/webhooks/test-route-token/event/'

    def test_event_updated_full_cycle(self, deps):
        body = _load('event_updated.json')
        client = APIClient()

        resp = client.post(self.URL, body, format='json')

        assert resp.status_code == 202
        inbox_id = resp.json()['inbox_id']
        # Immediate backend ran the task synchronously inside the POST call.
        row = WebhookInbox.objects.get(id=inbox_id)
        assert row.status == WebhookInbox.STATUS_APPLIED
        assert row.applied_at is not None

        event = Event.objects.get(external_id='evt_external_42')
        assert event.title == 'CB1 Tutorial — September 2026'
        assert event.lifecycle_state == 'PUBLISHED'
        assert event.cancelled is False

    def test_event_cancelled_full_cycle(self, deps):
        client = APIClient()
        # Seed the Event row; this delivery must apply before we can cancel it.
        client.post(self.URL, _load('event_updated.json'), format='json')

        resp = client.post(self.URL, _load('event_cancelled.json'), format='json')
        assert resp.status_code == 202

        # Verify the inbox row for the cancellation reached APPLIED.
        inbox_id = resp.json()['inbox_id']
        cancelled_row = WebhookInbox.objects.get(id=inbox_id)
        assert cancelled_row.status == WebhookInbox.STATUS_APPLIED
        assert cancelled_row.applied_at is not None

        event = Event.objects.get(external_id='evt_external_42')
        assert event.cancelled is True
        assert event.lifecycle_state == 'CANCELLED'

    def test_event_created_full_cycle(self, deps):
        body = _load('event_created.json')
        resp = APIClient().post(self.URL, body, format='json')
        assert resp.status_code == 202

        inbox_id = resp.json()['inbox_id']
        row = WebhookInbox.objects.get(id=inbox_id)
        assert row.status == WebhookInbox.STATUS_APPLIED

        event = Event.objects.get(external_id='evt_external_43')
        assert event.tutorial_event is None
        assert event.title == 'CB1 Tutorial — September 2026'
        assert event.lifecycle_state == 'PUBLISHED'
        assert event.cancelled is False
        assert event.learning_mode == 'CLASSROOM'

    def test_missing_dependency_dead_letters_via_full_cycle(self):
        """No deps fixture — FK lookups will fail. The handler raises
        MissingDependencyError, which apply_inbox_row catches and marks
        the inbox row failed (attempts=1, < MAX_ATTEMPTS=5).

        The view's dispatch try/except suppresses the re-raise so the HTTP
        response stays 202. The row's status records the failure for replay.
        """
        body = _load('event_updated.json')
        resp = APIClient().post(self.URL, body, format='json')
        assert resp.status_code == 202

        row = WebhookInbox.objects.get(id=resp.json()['inbox_id'])
        # First attempt failed; row is in 'failed' state for replay.
        assert row.status == WebhookInbox.STATUS_FAILED
        assert row.attempts == 1
        assert 'MissingDependencyError' in row.error_message

    def test_duplicate_delivery_does_not_re_process(self, deps):
        """Second delivery of the same webhook should return 200 duplicate
        and NOT re-run the handler (otherwise idempotency is broken)."""
        client = APIClient()
        body = _load('event_updated.json')

        client.post(self.URL, body, format='json')  # first delivery: applied
        # Second delivery should be deduped.
        resp = client.post(self.URL, body, format='json')
        assert resp.status_code == 200
        assert resp.json()['status'] == 'duplicate'
        assert WebhookInbox.objects.count() == 1
        # And only one Event row exists.
        assert Event.objects.filter(external_id='evt_external_42').count() == 1
