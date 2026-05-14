import json
from pathlib import Path

import pytest

from administrate.models import (
    CourseTemplate,
    Event,
    Instructor,
    Location,
    Venue,
)
from administrate.services.webhook_handlers import (
    EVENT_HANDLERS,
    handle_event_cancelled,
    handle_event_created,
    handle_event_updated,
)


FIXTURES = Path(__file__).resolve().parent.parent / 'fixtures' / 'webhooks'


def _load_event(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())['payload']['event']


@pytest.fixture
def deps(db):
    """Seed FK models shared by all three handler fixtures.

    External IDs match those used in event_created/updated/cancelled JSON.
    """
    location = Location.objects.create(external_id='loc_external_1')
    venue = Venue.objects.create(
        external_id='ven_external_1', location=location,
    )
    instructor = Instructor.objects.create(external_id='ins_external_1')
    course_template = CourseTemplate.objects.create(external_id='ct_external_1')
    return {
        'location': location, 'venue': venue,
        'instructor': instructor, 'course_template': course_template,
    }


@pytest.mark.django_db
class TestHandlers:
    def test_registry_has_three_handlers(self):
        assert set(EVENT_HANDLERS.keys()) == {
            'Event Created', 'Event Updated', 'Event Cancelled',
        }

    def test_event_created_inserts(self, deps):
        node = _load_event('event_created.json')
        event = handle_event_created(node)

        assert event.pk is not None
        assert event.external_id == 'evt_external_43'
        assert event.tutorial_event is None
        assert Event.objects.filter(external_id='evt_external_43').count() == 1

    def test_event_updated_overwrites(self, deps):
        # First call creates
        node = _load_event('event_updated.json')
        handle_event_updated(node)
        # Mutate and re-apply
        node['title'] = 'CB1 Tutorial — RENAMED'
        handle_event_updated(node)

        event = Event.objects.get(external_id='evt_external_42')
        assert event.title == 'CB1 Tutorial — RENAMED'
        assert Event.objects.filter(external_id='evt_external_42').count() == 1

    def test_event_cancelled_sets_flag_and_state(self, deps):
        # Seed an active event first
        handle_event_updated(_load_event('event_updated.json'))
        # Cancel it
        cancelled_node = _load_event('event_cancelled.json')
        handle_event_cancelled(cancelled_node)

        event = Event.objects.get(external_id='evt_external_42')
        assert event.cancelled is True
        assert event.lifecycle_state == 'CANCELLED'

    def test_upsert_does_not_include_tutorial_event_in_defaults(self, deps):
        """The mapper deliberately omits `tutorial_event` (staff-managed).
        Verify the upsert call's defaults kwarg never contains it — which is
        what guarantees existing tutorial_event FKs survive a webhook update.
        """
        from unittest.mock import patch, MagicMock

        node = _load_event('event_updated.json')
        mock_event = MagicMock(spec=Event)
        with patch.object(
            Event.objects, 'update_or_create', return_value=(mock_event, False)
        ) as mock_uoc:
            handle_event_updated(node)

        assert mock_uoc.called
        _, kwargs = mock_uoc.call_args
        defaults = kwargs.get('defaults', {})
        assert 'tutorial_event' not in defaults, (
            'Mapper output must NOT include tutorial_event in defaults — '
            'that key is staff-managed and Webhook updates must preserve it.'
        )

    def test_event_cancelled_overrides_payload_cancelled_false(self, deps):
        """Defense: if a Cancelled webhook arrives with cancelled=false (data
        lag edge case), the webhook type still wins and the event is marked
        cancelled."""
        node = _load_event('event_cancelled.json')
        node['cancelled'] = False  # Deliberately wrong
        node['lifecycleState'] = 'PUBLISHED'  # Deliberately wrong
        handle_event_cancelled(node)

        event = Event.objects.get(external_id='evt_external_42')
        assert event.cancelled is True
        assert event.lifecycle_state == 'CANCELLED'
