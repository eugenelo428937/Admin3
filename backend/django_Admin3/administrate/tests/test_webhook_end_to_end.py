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
def store_product(db):
    """Bare-minimum store.TutorialProduct chain to satisfy
    TutorialEvents.store_product NOT NULL.

    Phase 4b (PR #115): the FK target was retargeted from store.Product
    to store.TutorialProduct (an MTI subclass with `format`).
    """
    from datetime import timedelta
    from django.utils import timezone
    from catalog.models import (
        ExamSession, ExamSessionSubject, Subject,
        Product as CatalogProduct, ProductProductVariation, ProductVariation,
    )
    from store.models import TutorialProduct
    es = ExamSession.objects.create(
        session_code='E2E26S',
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=60),
    )
    sub = Subject.objects.create(code='CB1', description='CB1 e2e', active=True)
    ess = ExamSessionSubject.objects.create(exam_session=es, subject=sub)
    p = CatalogProduct.objects.create(code='TUTE2E', fullname='E2E', shortname='E2E')
    pv = ProductVariation.objects.create(
        code='WKD', name='Weekend', description='W', description_short='W',
        variation_type='Tutorial',
    )
    ppv = ProductProductVariation.objects.create(product=p, product_variation=pv)
    return TutorialProduct.objects.create(
        exam_session_subject=ess,product_code='CB1/TUTE2EWKD/E2E26S',
        format='LO_6H',
    )


@pytest.fixture
def existing_events(deps, store_product):
    """Pre-seed the two TutorialEvents rows the e2e tests target.

    Phase 2 of the tutorial-events-as-master refactor: the webhook handler
    now updates `acted.tutorial_events` (looking up by code=node.title), and
    upserts a thin `adm.events` bridge row keyed by external_id. Each
    fixture must have a corresponding TutorialEvents row pre-seeded — that
    matches the "create the tutorial_events row first, then accept webhooks"
    operator workflow.
    """
    from datetime import date
    from tutorials.models import TutorialEvents
    te_42 = TutorialEvents.objects.create(
        code='CB1-EVT42-26S',
        lms_start_date=date(2026, 9, 1),
        lms_end_date=date(2026, 12, 1),
        store_product=store_product,
    )
    te_43 = TutorialEvents.objects.create(
        code='CB1-EVT43-26S',
        lms_start_date=date(2026, 9, 1),
        lms_end_date=date(2026, 12, 1),
        store_product=store_product,
    )
    return {**deps, 'tutorial_event_42': te_42, 'tutorial_event_43': te_43}


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

        # New: assertions target tutorial_events (the master) and the
        # adm.events bridge row (just for the join key).
        te = existing_events['tutorial_event_42']
        te.refresh_from_db()
        assert te.external_id == 'evt_external_42'
        assert te.lifecycle_state == 'PUBLISHED'
        assert te.cancelled is False

        bridge = Event.objects.get(external_id='evt_external_42')
        assert bridge.tutorial_event_id == te.pk

    def test_event_cancelled_full_cycle(self, existing_events):
        client = APIClient()
        # Apply the update first so external_id is wired up before the cancel.
        client.post(self.URL, _load('event_updated.json'), format='json')

        resp = client.post(self.URL, _load('event_cancelled.json'), format='json')
        assert resp.status_code == 202

        inbox_id = resp.json()['inbox_id']
        cancelled_row = WebhookInbox.objects.get(id=inbox_id)
        assert cancelled_row.status == WebhookInbox.STATUS_APPLIED
        assert cancelled_row.applied_at is not None

        te = existing_events['tutorial_event_42']
        te.refresh_from_db()
        assert te.cancelled is True
        assert te.lifecycle_state == 'CANCELLED'

    def test_event_created_full_cycle(self, existing_events):
        body = _load('event_created.json')
        resp = APIClient().post(self.URL, body, format='json')
        assert resp.status_code == 202

        inbox_id = resp.json()['inbox_id']
        row = WebhookInbox.objects.get(id=inbox_id)
        assert row.status == WebhookInbox.STATUS_APPLIED

        te = existing_events['tutorial_event_43']
        te.refresh_from_db()
        assert te.external_id == 'evt_external_43'
        assert te.lifecycle_state == 'PUBLISHED'
        assert te.cancelled is False
        assert te.learning_mode == 'CLASSROOM'

        bridge = Event.objects.get(external_id='evt_external_43')
        assert bridge.tutorial_event_id == te.pk

    def test_missing_dependency_dead_letters_via_full_cycle(self):
        """No `existing_events` fixture — no TutorialEvents row matches the
        fixture title. The new handler raises MissingDependencyError(
        'TutorialEvents', code), which apply_inbox_row classifies as
        terminal and marks the inbox row DEAD on first attempt.

        Operator runbook: create the tutorial_events row (with its
        store_product), then `administrate_webhooks_inbox replay`.
        """
        body = _load('event_updated.json')
        resp = APIClient().post(self.URL, body, format='json')
        assert resp.status_code == 202

        row = WebhookInbox.objects.get(id=resp.json()['inbox_id'])
        assert row.status == WebhookInbox.STATUS_DEAD
        assert row.attempts == 1
        assert 'MissingDependencyError' in row.error_message
        # The error must name the missing tutorial_events.code so an
        # operator can fix it without grepping logs.
        assert 'CB1-EVT42-26S' in row.error_message

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
