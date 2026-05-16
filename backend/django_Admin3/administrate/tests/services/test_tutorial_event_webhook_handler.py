"""Tests for the new tutorial-events-as-master webhook handler.

Phase 2 of the refactor (plan:
docs/superpowers/plans/2026-05-15-tutorial-events-as-master-refactor.md):

The new handler replaces the old `_upsert_event` flow. Behaviour:

  1. Map the GraphQL node onto a TutorialEvents field dict via
     `map_node_to_tutorial_event_fields`.
  2. Look up `TutorialEvents.objects.filter(code=node['title']).first()`.
  3. If no match → raise `MissingDependencyError('TutorialEvents', code)`.
     The dispatcher's existing dead-letter path catches this.
  4. If match → update the row with mapped fields.
  5. Upsert the `adm.events` bridge row:
     `(external_id=node['id'], tutorial_event=found)`.

The bridge row is intentionally minimal — Phase 5 drops the legacy
columns and `adm.events` becomes `(id, external_id, tutorial_event_id)`.
"""
from datetime import date, timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from administrate.exceptions import MissingDependencyError
from administrate.models import (
    CourseTemplate, Event, Instructor, Location, Venue,
)
from administrate.services.webhook_handlers import (
    handle_event_updated, handle_event_created, handle_event_cancelled,
)
from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatalogProduct, ProductProductVariation, ProductVariation,
)
from store.models import TutorialProduct
from tutorials.models import TutorialEvents


@pytest.fixture
def adm_master_data(db):
    """The Administrate-side FK master data the mapper resolves through."""
    return {
        'location': Location.objects.create(external_id='loc_te_1'),
        'venue': Venue.objects.create(
            external_id='ven_te_1',
            location=Location.objects.get(external_id='loc_te_1'),
        ),
        'instructor': Instructor.objects.create(external_id='ins_te_1'),
        'course_template': CourseTemplate.objects.create(external_id='ct_te_1'),
    }


@pytest.fixture
def store_product(db):
    """Bare-minimum store.Product chain for TutorialEvents.store_product NOT NULL."""
    es = ExamSession.objects.create(
        session_code='TE26S',
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=60),
    )
    sub = Subject.objects.create(code='CB1', description='CB1 te', active=True)
    ess = ExamSessionSubject.objects.create(exam_session=es, subject=sub)
    p = CatalogProduct.objects.create(code='TUTTE', fullname='TE', shortname='TE')
    pv = ProductVariation.objects.create(
        code='WKD', name='Weekend', description='W', description_short='W',
        variation_type='Tutorial',
    )
    ppv = ProductProductVariation.objects.create(product=p, product_variation=pv)
    return TutorialProduct.objects.create(
        exam_session_subject=ess, product_product_variation=ppv,
        product_code='CB1/TUTTEWKD/TE26S',
        format='LO_6H',
    )


@pytest.fixture
def tutorial_event(store_product):
    """A pre-existing TutorialEvents row keyed by `code` — the handler's
    lookup target. The webhook will update this row (not create one)."""
    return TutorialEvents.objects.create(
        code='CB1-PHASE2-26S',
        start_date=date(2026, 9, 1),
        end_date=date(2026, 12, 1),
        store_product=store_product,
    )


def _node(
    external_id='evt_phase2_1',
    title='CB1-PHASE2-26S',
    lifecycleState='PUBLISHED',
    cancelledAt=None,
    isSoldOut=False,
    learningMode='CLASSROOM',
    location_id='loc_te_1',
    venue_id='ven_te_1',
    course_template_id='ct_te_1',
):
    """Build an Administrate event node matching the registered webhook query."""
    return {
        'id': external_id,
        'title': title,
        'lifecycleState': lifecycleState,
        'cancelledAt': cancelledAt,
        'isSoldOut': isSoldOut,
        'learningMode': learningMode,
        'maxPlaces': 30,
        'minPlaces': 5,
        'location': {'id': location_id},
        'venue': {'id': venue_id} if venue_id else None,
        'courseTemplate': {'id': course_template_id},
        'timeZoneName': 'Europe/London',
        'lmsStart': '2026-09-01T09:00:00Z',
        'lmsEnd': '2026-12-01T17:00:00Z',
        'registrationDeadline': '2026-08-25T23:59:59Z',
        'updatedAt': '2026-05-15T10:00:00Z',
        'customFieldValues': [],
    }


@pytest.mark.django_db
class TestEventUpdatedWritesToTutorialEvents:
    """Event Updated webhook should update the linked tutorial_events row."""

    def test_updates_existing_tutorial_event(
        self, tutorial_event, adm_master_data,
    ):
        """When the payload's title matches an existing tutorial_events.code,
        the handler updates that row with all mapped Administrate fields."""
        node = _node(
            external_id='evt_te_upd',
            title='CB1-PHASE2-26S',
            lifecycleState='PUBLISHED',
        )
        handle_event_updated(node)

        tutorial_event.refresh_from_db()
        assert tutorial_event.external_id == 'evt_te_upd'
        assert tutorial_event.lifecycle_state == 'PUBLISHED'
        assert tutorial_event.learning_mode == 'CLASSROOM'
        assert tutorial_event.cancelled is False
        assert tutorial_event.sold_out is False
        assert tutorial_event.max_places == 30
        assert tutorial_event.min_places == 5
        assert tutorial_event.timezone == 'Europe/London'
        # DateTime, not Date — the new fields use the new column types.
        assert tutorial_event.lms_start_date is not None
        assert tutorial_event.lms_end_date is not None
        # Cross-schema FK was resolved.
        assert tutorial_event.course_template.external_id == 'ct_te_1'

    def test_creates_or_updates_adm_events_bridge_row(
        self, tutorial_event, adm_master_data,
    ):
        """After updating tutorial_events, the handler must upsert the
        adm.events bridge row so joins from local data to Administrate
        keep working."""
        handle_event_updated(_node(external_id='evt_te_upd', title='CB1-PHASE2-26S'))

        bridge = Event.objects.get(external_id='evt_te_upd')
        assert bridge.tutorial_event_id == tutorial_event.pk

    def test_dead_letters_when_no_tutorial_event_matches(self, adm_master_data):
        """No tutorial_events.code = node.title → MissingDependencyError.
        The dispatcher catches this and marks the inbox row DEAD on first
        attempt (operator must create the tutorial_events row first, then
        replay)."""
        node = _node(title='CB1-NEVER-CREATED-26S')
        with pytest.raises(MissingDependencyError) as exc:
            handle_event_updated(node)
        # The error must name the missing code so an operator can create it.
        assert 'CB1-NEVER-CREATED-26S' in str(exc.value.external_id)


@pytest.mark.django_db
class TestEventCreatedDeadLetters:
    """Event Created with no matching tutorial_events.code is the same
    code path as Event Updated above (per user decision 2026-05-15) —
    the handler doesn't auto-create. This test exists so a future
    refactor can't silently change the policy."""

    def test_event_created_dead_letters_for_unmatched(self, adm_master_data):
        with pytest.raises(MissingDependencyError):
            handle_event_created(_node(title='CB1-NEW-AND-UNMATCHED-26S'))


@pytest.mark.django_db
class TestEventCancelledForcesCancelledState:
    """Event Cancelled handler must set cancelled=True regardless of payload
    content (Administrate's webhook type is the source of truth, not the
    payload's cancelledAt timestamp). Same forcing semantics as the old
    handler."""

    def test_cancellation_overrides_payload(self, tutorial_event, adm_master_data):
        # Payload deliberately has cancelledAt=None; the handler must
        # still mark the row cancelled because the webhook type is
        # 'Event Cancelled'.
        handle_event_cancelled(_node(
            title='CB1-PHASE2-26S',
            cancelledAt=None,
            lifecycleState='PUBLISHED',
        ))
        tutorial_event.refresh_from_db()
        assert tutorial_event.cancelled is True
        assert tutorial_event.lifecycle_state == 'CANCELLED'


@pytest.mark.django_db
class TestBridgeRowUpsertSemantics:
    """The bridge row must be idempotent — a re-delivery (Administrate retry)
    must not duplicate it."""

    def test_idempotent_bridge_upsert(self, tutorial_event, adm_master_data):
        node = _node(external_id='evt_idem', title='CB1-PHASE2-26S')
        handle_event_updated(node)
        handle_event_updated(node)
        assert Event.objects.filter(external_id='evt_idem').count() == 1

    def test_bridge_only_writes_external_id_and_tutorial_event(
        self, tutorial_event, adm_master_data,
    ):
        """The bridge row carries only external_id + tutorial_event.

        Phase 5 (2026-05-15) dropped title/location/etc columns from
        adm.events entirely — the assertion is now structural: those
        attributes shouldn't exist on the model at all."""
        handle_event_updated(_node(external_id='evt_thin', title='CB1-PHASE2-26S'))
        bridge = Event.objects.get(external_id='evt_thin')
        assert bridge.external_id == 'evt_thin'
        assert bridge.tutorial_event_id == tutorial_event.pk
        # Pin the slim shape: legacy data columns must not exist on the
        # bridge model anymore. If a future refactor reintroduces them,
        # this assertion fails loud.
        for legacy_field in ('title', 'lifecycle_state', 'learning_mode',
                             'location_id', 'venue_id',
                             'primary_instructor_id', 'course_template_id'):
            assert not hasattr(bridge, legacy_field), (
                f'adm.Event should not carry {legacy_field!r} after Phase 5'
            )
