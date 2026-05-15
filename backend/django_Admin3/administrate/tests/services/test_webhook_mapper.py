"""Defensive contract tests for `map_node_to_event_fields`.

The bulk of field-by-field derivation tests live in
[test_webhook_handlers.py::TestMapperFieldDerivation]. This file
covers what's specific to fixture-driven (rather than synthetic-dict)
input: KeyError contracts on missing required root keys, FK lookup
failures, and the defensive paths for nullable / partially-shaped
relations like venue.
"""

import json
from pathlib import Path

import pytest

from administrate.exceptions import MissingDependencyError
from administrate.models import (
    CourseTemplate,
    Location,
    Venue,
)
from administrate.services.webhook_handlers import map_node_to_event_fields


FIXTURES = Path(__file__).resolve().parent.parent / 'fixtures' / 'webhooks'


def _load(name: str) -> dict:
    """Return the event node out of a fixture, accepting both the
    production-shape `payload.node` (Relay singular fetch) and the
    legacy `payload.event` key for backward compat with older fixtures.
    """
    payload = json.loads((FIXTURES / name).read_text())['payload']
    return payload.get('node') or payload.get('event')


@pytest.fixture
def seed_dependencies(db):
    """Seed only the FKs the mapper actually resolves now.

    The new mapper omits `primary_instructor` from defaults (Administrate's
    typed Event surface has no equivalent), so we don't need an Instructor
    row here — the mapper never calls `_resolve_fk(Instructor, ...)`.
    """
    location = Location.objects.create(external_id='loc_external_1')
    venue = Venue.objects.create(
        external_id='ven_external_1', location=location,
    )
    course_template = CourseTemplate.objects.create(
        external_id='ct_external_1',
    )
    return {
        'location': location, 'venue': venue,
        'course_template': course_template,
    }


@pytest.mark.django_db
class TestMapperContracts:
    def test_missing_required_root_key_raises_keyerror(self, seed_dependencies):
        """`id` is a required root key — its absence is a programming error
        upstream (the GraphQL response was malformed). Surface as KeyError
        so the dispatcher routes it to FAILED with a clear traceback,
        rather than silently producing a row with external_id=None which
        would corrupt downstream UNIQUE-on-external_id semantics."""
        node = _load('event_updated.json')
        del node['id']
        with pytest.raises(KeyError):
            map_node_to_event_fields(node)

    def test_unknown_course_template_raises_missing_dependency(
        self, seed_dependencies,
    ):
        """FK lookups for courseTemplate.id raise MissingDependencyError —
        the dispatcher dead-letters with a runbook-recognised message
        ('run sync_course_templates, then replay')."""
        node = _load('event_updated.json')
        node['courseTemplate']['id'] = 'ct_does_not_exist'
        with pytest.raises(MissingDependencyError) as exc:
            map_node_to_event_fields(node)
        assert exc.value.model_name == 'CourseTemplate'
        assert exc.value.external_id == 'ct_does_not_exist'

    def test_nullable_venue_allowed(self, seed_dependencies):
        """Administrate emits venue=null for events without a physical
        venue (live online tutorials). The mapper must produce venue=None
        rather than raising or stripping the field."""
        node = _load('event_updated.json')
        node['venue'] = None
        fields = map_node_to_event_fields(node)
        assert fields['venue'] is None

    def test_empty_venue_dict_treated_as_none(self, seed_dependencies):
        """venue={} can happen when GraphQL returns an empty object for a
        nullable relation; must NOT raise KeyError on `venue['id']`,
        must produce venue=None.
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
