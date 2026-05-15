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
    WebhookRegistration,
)


FIXTURES = Path(__file__).resolve().parent / 'fixtures' / 'webhooks'


def _load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


@pytest.fixture(autouse=True)
def _webhook_settings(settings):
    """Pin webhook settings independent of DJANGO_SETTINGS_MODULE."""
    settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN = 'test-route-token'
    settings.ADMINISTRATE_WEBHOOK_SECRET = 'test-shared-secret'


@pytest.fixture(autouse=True)
def _webhook_registrations(db):
    """Seed the local webhook_id->type mapping for every e2e test.

    Administrate's payload metadata doesn't echo a type label, so the
    ingress needs this lookup to route. Kept autouse + separate from `deps`
    so the dead-letter test (which deliberately skips `deps` to provoke
    a missing-FK failure) still gets past ingress to exercise the
    dispatch failure path it's designed to test.
    """
    for wh_id, type_name in [
        ('wh_test_updated_1', 'Event Updated'),
        ('wh_test_created_1', 'Event Created'),
        ('wh_test_cancelled_1', 'Event Cancelled'),
    ]:
        WebhookRegistration.objects.create(
            administrate_webhook_id=wh_id,
            name=f'test {type_name}',
            webhook_type_name=type_name,
        )


@pytest.fixture
def deps(db):
    """Seed FK rows that the mapper resolves out of the webhook payload.

    Returns the seeded objects so other fixtures can reuse them when
    building Event rows that satisfy the model's NOT NULL FKs.
    """
    location = Location.objects.create(external_id='loc_external_1')
    venue = Venue.objects.create(
        external_id='ven_external_1', location=location,
    )
    instructor = Instructor.objects.create(external_id='ins_external_1')
    course_template = CourseTemplate.objects.create(
        external_id='ct_external_1',
    )
    return {
        'location': location, 'venue': venue,
        'instructor': instructor, 'course_template': course_template,
    }


@pytest.fixture
def existing_events(deps):
    """Pre-seed the two Event rows the e2e tests target.

    The webhook intake design intentionally omits `primary_instructor`
    from the mapper output (Administrate's typed Event surface has no
    such field). The model still requires it as NOT NULL, so brand-new
    rows fail at INSERT time and dead-letter — that's the documented
    operator workflow ("sync_events first, then accept webhooks").
    For the happy-path e2e tests we mimic the post-sync state by
    pre-seeding the rows the fixtures target.
    """
    base = dict(
        title='Pre-existing title',
        learning_mode='CLASSROOM',
        lifecycle_state='DRAFT',
        course_template=deps['course_template'],
        location=deps['location'],
        venue=deps['venue'],
        primary_instructor=deps['instructor'],
    )
    Event.objects.create(external_id='evt_external_42', **base)
    Event.objects.create(external_id='evt_external_43', **base)
    return deps


@pytest.mark.django_db
class TestEndToEnd:
    URL = '/api/administrate/webhooks/test-route-token/event/'

    def test_event_updated_full_cycle(self, existing_events):
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

    def test_event_cancelled_full_cycle(self, existing_events):
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

    def test_event_created_full_cycle(self, existing_events):
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
        MissingDependencyError, which apply_inbox_row classifies as terminal
        and marks the inbox row DEAD on first attempt (no retry — the missing
        FK won't materialize without operator action: run sync_*, then replay).

        The view's dispatch try/except keeps the HTTP response at 202 either
        way. The row's status records the failure for operator-triggered replay.
        """
        body = _load('event_updated.json')
        resp = APIClient().post(self.URL, body, format='json')
        assert resp.status_code == 202

        row = WebhookInbox.objects.get(id=resp.json()['inbox_id'])
        # First attempt: terminal. Row is DEAD and surfaces on dashboards.
        assert row.status == WebhookInbox.STATUS_DEAD
        assert row.attempts == 1
        assert 'MissingDependencyError' in row.error_message

    def test_duplicate_delivery_does_not_re_process(self, existing_events):
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
