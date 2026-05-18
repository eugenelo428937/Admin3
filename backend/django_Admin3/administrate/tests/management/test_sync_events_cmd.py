"""Integration tests for `python manage.py sync_events` (Phase 4 rewrite).

The command's contract after the tutorial-events-as-master refactor:
  1. Paginate Administrate events filtered by sitting + lifecycle state.
  2. For each event, look up tutorial_events.code == node.title.
  3. If no match → skip (logged, counted as `unlinked`). The webhook
     dead-letters this same case; sync just keeps going so a single
     unmatched event doesn't poison a batch sync.
  4. If match → update tutorial_events with mapped fields PLUS
     main_instructor (resolved from the staff connection — sync's
     unique value-add over the webhook).
  5. Upsert adm.events bridge row.
  6. Report stats: created/updated/skipped + unlinked count.
"""
from datetime import date, timedelta
from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.utils import timezone

from administrate.models import (
    CourseTemplate, Event, Instructor, Location, Venue,
)
from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatalogProduct, ProductProductVariation, ProductVariation,
)
from store.models import TutorialProduct
from tutorials.models import (
    TutorialEvents, TutorialInstructor,
)


@pytest.fixture
def deps(db):
    """Seed the Administrate-side FK rows + the bridge to tutorials side."""
    location = Location.objects.create(external_id='loc_sync_1')
    Venue.objects.create(external_id='ven_sync_1', location=location)
    CourseTemplate.objects.create(external_id='ct_sync_1')
    # Instructor with bridge to tutorial_instructor (so sync can resolve
    # main_instructor on tutorial_events). TutorialInstructor only requires
    # is_active (FK to staff is nullable).
    tutor = TutorialInstructor.objects.create(is_active=True)
    Instructor.objects.create(
        external_id='ins_sync_1', tutorial_instructor=tutor,
    )


@pytest.fixture
def store_product(db):
    es = ExamSession.objects.create(
        session_code='SYN26S',
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=60),
    )
    sub = Subject.objects.create(code='CB1', description='CB1 sync', active=True)
    ess = ExamSessionSubject.objects.create(exam_session=es, subject=sub)
    p = CatalogProduct.objects.create(code='TUTSYN', fullname='S', shortname='S')
    pv = ProductVariation.objects.create(
        code='WKD', name='Weekend', description='W', description_short='W',
        variation_type='Tutorial',
    )
    ppv = ProductProductVariation.objects.create(product=p, product_variation=pv)
    return TutorialProduct.objects.create(
        exam_session_subject=ess, product_product_variation=ppv,
        product_code='CB1/TUTSYNWKD/SYN26S',
        format='LO_6H',
    )


@pytest.fixture
def tutorial_event(store_product):
    """Pre-existing tutorial_events row matching the default fixture title."""
    return TutorialEvents.objects.create(
        code='CB1-1-26S',
        lms_start_date=date(2026, 9, 1),
        lms_end_date=date(2026, 12, 1),
        store_product=store_product,
    )


def _api_response(nodes, has_next_page=False, total=None):
    return {
        'data': {
            'events': {
                'pageInfo': {
                    'totalRecords': total if total is not None else len(nodes),
                    'hasNextPage': has_next_page,
                },
                'edges': [{'node': n} for n in nodes],
            }
        }
    }


def _event_node(
    external_id='evt_sync_1',
    title='CB1-1-26S',
    location_id='loc_sync_1',
    venue_id='ven_sync_1',
    course_template_id='ct_sync_1',
    primary_staff_contact_id='ins_sync_1',
):
    """Construct an Administrate event node matching get_events_for_sync.graphql."""
    return {
        'id': external_id,
        'title': title,
        'lifecycleState': 'PUBLISHED',
        'cancelledAt': None,
        'isSoldOut': False,
        'learningMode': 'CLASSROOM',
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
        'staff': {
            'edges': [
                {'node': {'contact': {'id': primary_staff_contact_id}}}
            ] if primary_staff_contact_id else []
        },
    }


@pytest.mark.django_db
class TestSyncEventsCommand:
    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_updates_existing_tutorial_event_and_creates_bridge(
        self, MockAPI, deps, tutorial_event,
    ):
        """Happy path: a node with title matching tutorial_events.code
        triggers an update of that row plus a fresh bridge row."""
        MockAPI.return_value.execute_query.return_value = _api_response(
            [_event_node(title='CB1-1-26S')]
        )
        call_command('sync_events', '--sitting', '26S', '--lifecycle', 'PUBLISHED')

        tutorial_event.refresh_from_db()
        assert tutorial_event.external_id == 'evt_sync_1'
        assert tutorial_event.lifecycle_state == 'PUBLISHED'
        # main_instructor resolved via adm.instructors.tutorial_instructor bridge.
        assert tutorial_event.main_instructor is not None
        assert tutorial_event.main_instructor.is_active is True
        # Bridge row created.
        bridge = Event.objects.get(external_id='evt_sync_1')
        assert bridge.tutorial_event_id == tutorial_event.pk

    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_unmatched_title_logged_and_counted_not_skipped_silently(
        self, MockAPI, deps,
    ):
        """No tutorial_events.code = node.title → logged + counted as
        unlinked. Sync DOES NOT auto-create (same policy as the webhook)."""
        MockAPI.return_value.execute_query.return_value = _api_response(
            [_event_node(title='CB1-NEVER-CREATED-26S')]
        )
        out = StringIO()
        call_command(
            'sync_events', '--sitting', '26S', '--lifecycle', 'PUBLISHED',
            stdout=out,
        )
        # No tutorial_events row was created.
        assert TutorialEvents.objects.filter(code='CB1-NEVER-CREATED-26S').count() == 0
        # No bridge row was created.
        assert Event.objects.filter(external_id='evt_sync_1').count() == 0
        # The unlinked event is surfaced so operators can investigate.
        output = out.getvalue().lower()
        assert 'unlinked' in output

    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_dry_run_does_not_write(
        self, MockAPI, deps, tutorial_event,
    ):
        MockAPI.return_value.execute_query.return_value = _api_response(
            [_event_node()]
        )
        call_command(
            'sync_events', '--sitting', '26S', '--lifecycle', 'PUBLISHED',
            '--dry-run',
        )
        tutorial_event.refresh_from_db()
        # Dry-run: tutorial_events untouched.
        assert tutorial_event.external_id is None
        assert Event.objects.filter(external_id='evt_sync_1').count() == 0

    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_pagination_continues_until_has_next_page_false(
        self, MockAPI, deps, store_product,
    ):
        """Sync must page through Administrate's results until hasNextPage
        is false. Otherwise we'd silently sync only the first 100 events
        and operators wouldn't notice the truncation."""
        # Seed two tutorial_events rows so both nodes find a match.
        TutorialEvents.objects.create(
            code='CB1-1-26S',
            lms_start_date=date(2026, 9, 1), lms_end_date=date(2026, 12, 1),
            store_product=store_product,
        )
        TutorialEvents.objects.create(
            code='CB1-2-26S',
            lms_start_date=date(2026, 9, 1), lms_end_date=date(2026, 12, 1),
            store_product=store_product,
        )
        responses = [
            _api_response(
                [_event_node(external_id='evt_p1_1', title='CB1-1-26S')],
                has_next_page=True, total=2,
            ),
            _api_response(
                [_event_node(external_id='evt_p1_2', title='CB1-2-26S')],
                has_next_page=False, total=2,
            ),
        ]
        MockAPI.return_value.execute_query.side_effect = responses
        call_command('sync_events', '--sitting', '26S', '--lifecycle', 'PUBLISHED')

        assert Event.objects.filter(external_id='evt_p1_1').exists()
        assert Event.objects.filter(external_id='evt_p1_2').exists()

    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_skips_event_with_missing_adm_instructor(
        self, MockAPI, deps, tutorial_event,
    ):
        """If the staff connection points at an Administrate Contact id
        that has no local adm.instructors row, MissingDependencyError fires
        and the event is skipped (operator runs sync_instructors first).
        The good event in the same batch still applies — savepoint isolation."""
        # An extra tutorial_events for the bad node so its only failure
        # is the missing instructor (not a no-code-match).
        from datetime import date
        TutorialEvents.objects.create(
            code='CB1-BAD-26S',
            lms_start_date=date(2026, 9, 1), lms_end_date=date(2026, 12, 1),
            store_product=tutorial_event.store_product,
        )
        MockAPI.return_value.execute_query.return_value = _api_response([
            _event_node(external_id='evt_ok', title='CB1-1-26S'),
            _event_node(
                external_id='evt_bad', title='CB1-BAD-26S',
                primary_staff_contact_id='ins_DOES_NOT_EXIST',
            ),
        ])
        out = StringIO()
        call_command(
            'sync_events', '--sitting', '26S', '--lifecycle', 'PUBLISHED',
            stdout=out,
        )

        assert Event.objects.filter(external_id='evt_ok').exists()
        assert not Event.objects.filter(external_id='evt_bad').exists()
        assert 'skipped' in out.getvalue().lower()
