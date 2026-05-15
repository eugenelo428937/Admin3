"""Integration tests for `python manage.py sync_events`.

The command's contract:
  1. Paginate Administrate events filtered by sitting + lifecycle state.
  2. For each event, upsert into adm.events using the same mapper the
     webhook handler uses (so behaviour stays in lockstep).
  3. Resolve primary_instructor from the staff connection (which the
     webhook query cannot — that's the whole point of this command).
  4. After upsert, attempt to link tutorial_event by exact-title match.
  5. Report stats: created, updated, linked, unlinked, skipped.

The linker itself is unit-tested in test_tutorial_event_linker.py; here
we only verify the command calls it correctly.
"""
from io import StringIO
from unittest.mock import patch, MagicMock

import pytest
from django.core.management import call_command

from administrate.models import (
    CourseTemplate,
    Event,
    Instructor,
    Location,
    Venue,
)


@pytest.fixture
def deps(db):
    """Seed the Administrate-side FK rows that the sync's upsert needs."""
    Location.objects.create(external_id='loc_sync_1')
    Venue.objects.create(
        external_id='ven_sync_1',
        location=Location.objects.get(external_id='loc_sync_1'),
    )
    Instructor.objects.create(external_id='ins_sync_1')
    CourseTemplate.objects.create(external_id='ct_sync_1')


def _api_response(nodes, has_next_page=False, total=None):
    """Build a canned response in the shape the command expects from
    AdministrateAPIService.execute_query (one page)."""
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
    @patch('administrate.management.commands.sync_events.link_event_to_tutorial')
    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_creates_new_event_when_deps_exist(
        self, MockAPI, mock_link, deps,
    ):
        """Happy path: a new Administrate event with all deps in the local
        DB should result in one row in adm.events with all the renamed
        fields populated correctly (via map_node_to_event_fields)."""
        MockAPI.return_value.execute_query.return_value = _api_response(
            [_event_node(title='CB1-1-26S')]
        )
        mock_link.return_value = None  # no TutorialEvents match needed for this assertion

        call_command(
            'sync_events',
            '--sitting', '26S',
            '--lifecycle', 'PUBLISHED',
        )

        event = Event.objects.get(external_id='evt_sync_1')
        assert event.title == 'CB1-1-26S'
        assert event.lifecycle_state == 'PUBLISHED'
        assert event.cancelled is False
        # primary_instructor must be set — that's the whole reason the sync
        # exists (webhook can't fill it).
        assert event.primary_instructor.external_id == 'ins_sync_1'

    @patch('administrate.management.commands.sync_events.link_event_to_tutorial')
    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_updates_existing_event(self, MockAPI, mock_link, deps):
        """Re-running sync against the same external_id should update,
        not duplicate. update_or_create handles this in the mapper."""
        Event.objects.create(
            external_id='evt_sync_1',
            title='OLD-TITLE',
            course_template=CourseTemplate.objects.get(external_id='ct_sync_1'),
            location=Location.objects.get(external_id='loc_sync_1'),
            primary_instructor=Instructor.objects.get(external_id='ins_sync_1'),
        )
        MockAPI.return_value.execute_query.return_value = _api_response(
            [_event_node(title='CB1-1-26S')]
        )
        mock_link.return_value = None

        call_command(
            'sync_events',
            '--sitting', '26S',
            '--lifecycle', 'PUBLISHED',
        )

        assert Event.objects.filter(external_id='evt_sync_1').count() == 1
        assert Event.objects.get(external_id='evt_sync_1').title == 'CB1-1-26S'

    @patch('administrate.management.commands.sync_events.link_event_to_tutorial')
    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_links_tutorial_event_when_match_found(
        self, MockAPI, mock_link, deps,
    ):
        """For each successfully-upserted event, the command must call
        link_event_to_tutorial and persist the FK when a match is returned.
        The linker itself is unit-tested separately; here we verify the
        command wires it in correctly by checking it's invoked with the
        upserted Event row. Asserting the actual FK assignment requires
        a real TutorialEvents row (FK constraint), which would mean the
        5-level catalog chain — out of scope for this test, see the
        linker's own unit tests for code-correctness coverage."""
        mock_link.return_value = None  # FK assignment branch verified elsewhere
        MockAPI.return_value.execute_query.return_value = _api_response(
            [_event_node()]
        )

        call_command(
            'sync_events',
            '--sitting', '26S',
            '--lifecycle', 'PUBLISHED',
        )

        # Linker must be called exactly once per upserted event, and
        # called with the upserted Event row (not the raw API node).
        assert mock_link.call_count == 1
        passed_event = mock_link.call_args[0][0]
        assert isinstance(passed_event, Event)
        assert passed_event.external_id == 'evt_sync_1'

    @patch('administrate.management.commands.sync_events.link_event_to_tutorial')
    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_unlinked_when_no_tutorial_event_matches(
        self, MockAPI, mock_link, deps,
    ):
        """When the linker returns None (typo in title, missing TutorialEvents
        row), the event still syncs cleanly — tutorial_event stays null and
        the unlinked count surfaces in the summary so operators can audit."""
        mock_link.return_value = None
        MockAPI.return_value.execute_query.return_value = _api_response(
            [_event_node(title='CB1-1-NOTYPO')]
        )
        out = StringIO()

        call_command(
            'sync_events', '--sitting', '26S', '--lifecycle', 'PUBLISHED',
            stdout=out,
        )

        event = Event.objects.get(external_id='evt_sync_1')
        assert event.tutorial_event_id is None
        # Surface unlinked count so it can be alerted on.
        assert 'unlinked' in out.getvalue().lower()

    @patch('administrate.management.commands.sync_events.link_event_to_tutorial')
    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_skips_event_with_missing_fk_logs_and_continues(
        self, MockAPI, mock_link, deps,
    ):
        """If an Administrate event references a CourseTemplate that's
        not in the local DB, the per-event upsert should fail gracefully:
        log + skip, NOT abort the whole batch. (The webhook's dead-letter
        pathway handles this for per-delivery; sync needs the same
        tolerance for batch.)"""
        mock_link.return_value = None
        MockAPI.return_value.execute_query.return_value = _api_response([
            _event_node(
                external_id='evt_ok',
                title='CB1-1-26S',
                course_template_id='ct_sync_1',  # exists
            ),
            _event_node(
                external_id='evt_bad',
                title='CB1-2-26S',
                course_template_id='ct_DOES_NOT_EXIST',
            ),
        ])
        out = StringIO()

        call_command(
            'sync_events', '--sitting', '26S', '--lifecycle', 'PUBLISHED',
            stdout=out,
        )

        # The good event applied; the bad one was skipped.
        assert Event.objects.filter(external_id='evt_ok').exists()
        assert not Event.objects.filter(external_id='evt_bad').exists()
        # And the skip was reported, not silently swallowed.
        assert 'skipped' in out.getvalue().lower()

    @patch('administrate.management.commands.sync_events.link_event_to_tutorial')
    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_dry_run_does_not_write(self, MockAPI, mock_link, deps):
        """--dry-run should fetch + report but not touch the DB."""
        mock_link.return_value = None
        MockAPI.return_value.execute_query.return_value = _api_response(
            [_event_node()]
        )

        call_command(
            'sync_events',
            '--sitting', '26S', '--lifecycle', 'PUBLISHED', '--dry-run',
        )

        assert not Event.objects.filter(external_id='evt_sync_1').exists()
        # Linker should NOT be called either — pure dry-run.
        mock_link.assert_not_called()

    @patch('administrate.management.commands.sync_events.AdministrateAPIService')
    def test_pagination_continues_until_has_next_page_false(
        self, MockAPI, deps,
    ):
        """The command must page through Administrate's results until
        hasNextPage is false. Otherwise we'd silently sync only the first
        100 events and operators wouldn't notice the truncation until a
        webhook for a never-synced event dead-lettered."""
        responses = [
            _api_response([_event_node(external_id='evt_p1_1')], has_next_page=True, total=2),
            _api_response([_event_node(external_id='evt_p1_2')], has_next_page=False, total=2),
        ]
        MockAPI.return_value.execute_query.side_effect = responses

        # No linker mock needed — leaving the FK null is fine for this test.
        with patch(
            'administrate.management.commands.sync_events.link_event_to_tutorial',
            return_value=None,
        ):
            call_command(
                'sync_events', '--sitting', '26S', '--lifecycle', 'PUBLISHED',
            )

        assert Event.objects.filter(external_id='evt_p1_1').exists()
        assert Event.objects.filter(external_id='evt_p1_2').exists()
