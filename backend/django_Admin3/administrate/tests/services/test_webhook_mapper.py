import json
from pathlib import Path

import pytest

from administrate.exceptions import MissingDependencyError
from administrate.models import (
    CourseTemplate,
    Instructor,
    Location,
    Venue,
)
from administrate.services.webhook_handlers import map_node_to_event_fields


FIXTURES = Path(__file__).resolve().parent.parent / 'fixtures' / 'webhooks'


def _load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())['payload']['event']


@pytest.fixture
def seed_dependencies(db):
    """The mapper resolves FK external_ids -> local PKs. Seed all four.

    Models in administrate app use external_id as the canonical identifier;
    none of Location, Venue, Instructor, CourseTemplate has a `name`/`title`
    field of its own — display names come via the optional `tutorial_*`
    cross-schema FKs which we don't need for mapping tests.
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
class TestMapper:
    def test_maps_full_payload(self, seed_dependencies):
        node = _load('event_updated.json')
        fields = map_node_to_event_fields(node)

        assert fields['external_id'] == 'evt_external_42'
        assert fields['title'] == 'CB1 Tutorial — September 2026'
        assert fields['lifecycle_state'] == 'PUBLISHED'
        assert fields['cancelled'] is False
        assert fields['sold_out'] is False
        assert fields['web_sale'] is True
        assert fields['learning_mode'] == 'CLASSROOM'
        assert fields['max_places'] == 30
        assert fields['min_places'] == 5
        assert fields['location'] == seed_dependencies['location']
        assert fields['venue'] == seed_dependencies['venue']
        assert fields['primary_instructor'] == seed_dependencies['instructor']
        assert fields['course_template'] == seed_dependencies['course_template']
        assert fields['event_url'] == 'https://example.com/event/42'
        assert fields['timezone'] == 'Europe/London'
        # Note: `tutorial_event` (cross-schema FK to tutorials.TutorialEvents)
        # MUST NOT appear in the field dict — staff link manually.
        assert 'tutorial_event' not in fields

    def test_missing_required_root_key_raises_keyerror(self, seed_dependencies):
        node = _load('event_updated.json')
        del node['id']
        with pytest.raises(KeyError):
            map_node_to_event_fields(node)

    def test_unknown_course_template_raises_missing_dependency(self, seed_dependencies):
        node = _load('event_updated.json')
        node['courseTemplate']['id'] = 'ct_does_not_exist'
        with pytest.raises(MissingDependencyError) as exc:
            map_node_to_event_fields(node)
        assert exc.value.model_name == 'CourseTemplate'
        assert exc.value.external_id == 'ct_does_not_exist'

    def test_nullable_venue_allowed(self, seed_dependencies):
        node = _load('event_updated.json')
        node['venue'] = None
        fields = map_node_to_event_fields(node)
        assert fields['venue'] is None

    def test_missing_web_sale_raises_keyerror(self, seed_dependencies):
        node = _load('event_updated.json')
        del node['webSale']
        with pytest.raises(KeyError):
            map_node_to_event_fields(node)

    def test_empty_venue_dict_treated_as_none(self, seed_dependencies):
        """venue={} can happen when GraphQL returns an empty object for a
        nullable relation; must NOT raise KeyError, must produce venue=None.
        """
        node = _load('event_updated.json')
        node['venue'] = {}
        fields = map_node_to_event_fields(node)
        assert fields['venue'] is None

    def test_venue_missing_id_treated_as_none(self, seed_dependencies):
        """Defensive: venue dict present but missing the id key shouldn't crash."""
        node = _load('event_updated.json')
        node['venue'] = {'someOtherField': 'whatever'}
        fields = map_node_to_event_fields(node)
        assert fields['venue'] is None
