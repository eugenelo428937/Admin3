import json
from pathlib import Path

import pytest

from administrate.models import (
    CourseTemplate,
    CustomField,
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

# Must match `definitionKey` values in the JSON fixtures and the labels
# the mapper consumes via `_CONSUMED_CUSTOM_FIELD_LABELS`.
WEB_SALE_KEY = 'Q3VzdG9tRmllbGREZWZpbml0aW9uOjI0'
URL_KEY = 'Q3VzdG9tRmllbGREZWZpbml0aW9uOjM5'


def _load_event(name: str) -> dict:
    """Pluck the event node out of a fixture.

    The synthetic fixtures now use the production-shape `payload.node` key
    (matching Administrate's response from `node(id: $objectid)` Relay
    queries). Older fixtures used `payload.event`; accept both for a
    smoother migration when real-capture fixtures replace the synthetic
    ones (Section 3.5 of the integration doc).
    """
    payload = json.loads((FIXTURES / name).read_text())['payload']
    return payload.get('node') or payload.get('event')


@pytest.fixture
def deps(db):
    """Seed FK models shared by all three handler fixtures.

    External IDs match those used in event_created/updated/cancelled JSON.

    Note: `Instructor` is still seeded here even though the new mapper
    no longer resolves it from the webhook payload — the `existing_event`
    fixture below uses it to satisfy the model's NOT NULL FK on
    `primary_instructor_id`. Without that, no Event row can be created
    in tests at all.
    """
    location = Location.objects.create(external_id='loc_external_1')
    venue = Venue.objects.create(
        external_id='ven_external_1', location=location,
    )
    instructor = Instructor.objects.create(external_id='ins_external_1')
    course_template = CourseTemplate.objects.create(external_id='ct_external_1')
    # Seed Event-entity custom-field definitions the mapper looks up by
    # label. Without these, _load_event_custom_field_keys returns {} and
    # web_sale/event_url silently fall back to model defaults — making
    # custom-field assertions in the mapper tests unverifiable.
    CustomField.objects.create(
        entity_type='event', label='Web sale',
        external_id=WEB_SALE_KEY, field_type='checkbox',
    )
    CustomField.objects.create(
        entity_type='event', label='URL',
        external_id=URL_KEY, field_type='url',
    )
    return {
        'location': location, 'venue': venue,
        'instructor': instructor, 'course_template': course_template,
    }


@pytest.fixture
def existing_event(deps):
    """Pre-seed an Event row matching the fixture external_id.

    Tests that exercise the UPDATE path of `_upsert_event` use this; the
    new mapper omits `primary_instructor` from defaults, so update_or_create
    on an existing row leaves the FK alone, but a brand-new INSERT would
    fire the model's NOT NULL constraint. This fixture mimics what the
    operator runbook prescribes: pre-seed via sync_events, then the
    webhook handles updates idempotently.
    """
    return Event.objects.create(
        external_id='evt_external_42',
        title='Pre-existing title',
        learning_mode='CLASSROOM',
        lifecycle_state='DRAFT',
        course_template=deps['course_template'],
        location=deps['location'],
        venue=deps['venue'],
        primary_instructor=deps['instructor'],
    )


@pytest.mark.django_db
class TestHandlers:
    """Slim integration smoke for the dispatch wiring. Behavior is covered
    by `test_tutorial_event_webhook_handler.py` (Phase 2 of the
    tutorial-events-as-master refactor) — duplicating those assertions here
    would just double maintenance for no extra coverage. The one test we
    keep pins that the dispatch table still has three entries."""

    def test_registry_has_all_expected_handlers(self):
        # Post Phase 5 (2026-05-18): the registry grew from 3 Event-only
        # handlers to 8 (Event + Session triples + Learner pair).
        # `Learner Attended Session` was deliberately NOT registered —
        # attendance writes through CSV / public-attendance views, not
        # webhook. New handlers are registered via the same
        # `@register(...)` decorator so the dispatcher's lookup is
        # identical.
        assert set(EVENT_HANDLERS.keys()) == {
            'Event Created', 'Event Updated', 'Event Cancelled',
            'Session Created', 'Session Updated', 'Session Deleted',
            'Learner Created', 'Learner Cancelled',
        }


@pytest.mark.django_db
class TestMapperFieldDerivation:
    """Coverage for the field-shape changes after the 2026-05-15 schema
    reconciliation against Administrate's typed Event interface."""

    @pytest.fixture
    def base_node(self, deps):
        """Minimal valid node with all required typed fields populated."""
        return {
            'id': 'evt_map_1',
            'title': 'Mapper test',
            'lifecycleState': 'PUBLISHED',
            'learningMode': 'CLASSROOM',
            'cancelledAt': None,
            'isSoldOut': False,
            'maxPlaces': 10,
            'minPlaces': 1,
            'location': {'id': 'loc_external_1'},
            'venue': {'id': 'ven_external_1'},
            'courseTemplate': {'id': 'ct_external_1'},
            'timeZoneName': 'Europe/London',
            'lmsStart': None,
            'lmsEnd': None,
            'registrationDeadline': None,
            'updatedAt': '2026-05-15T00:00:00Z',
            'customFieldValues': [],
        }

    def test_cancelled_derived_from_cancelledAt_present(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_tutorial_event_fields as map_node_to_event_fields
        base_node['cancelledAt'] = '2026-05-14T10:00:00Z'
        defaults = map_node_to_event_fields(base_node)
        assert defaults['cancelled'] is True

    def test_cancelled_derived_from_cancelledAt_null(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_tutorial_event_fields as map_node_to_event_fields
        base_node['cancelledAt'] = None
        defaults = map_node_to_event_fields(base_node)
        assert defaults['cancelled'] is False

    def test_web_sale_extracted_from_custom_field_true_string(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_tutorial_event_fields as map_node_to_event_fields
        base_node['customFieldValues'] = [
            {'definitionKey': WEB_SALE_KEY, 'value': 'true'},
        ]
        defaults = map_node_to_event_fields(base_node)
        assert defaults['web_sale'] is True

    def test_web_sale_extracted_from_custom_field_false_string(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_tutorial_event_fields as map_node_to_event_fields
        base_node['customFieldValues'] = [
            {'definitionKey': WEB_SALE_KEY, 'value': 'false'},
        ]
        defaults = map_node_to_event_fields(base_node)
        assert defaults['web_sale'] is False

    def test_web_sale_falls_back_to_default_when_field_missing(self, base_node):
        """When the 'Web sale' custom field is absent (legacy event, or org
        hasn't configured the field), preserve the model default of True
        rather than coercing to False — that would silently un-publish events
        from web sale on every webhook delivery."""
        from administrate.services.webhook_handlers import map_node_to_tutorial_event_fields as map_node_to_event_fields
        base_node['customFieldValues'] = []
        defaults = map_node_to_event_fields(base_node)
        assert defaults['web_sale'] is True

    def test_event_url_extracted_from_url_custom_field(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_tutorial_event_fields as map_node_to_event_fields
        base_node['customFieldValues'] = [
            {'definitionKey': URL_KEY, 'value': 'https://example.com/x'},
        ]
        defaults = map_node_to_event_fields(base_node)
        assert defaults['event_url'] == 'https://example.com/x'

    # NOTE: tests for omitted `primary_instructor` / `virtual_classroom`
    # were removed in Phase 5 (2026-05-15). The new tutorial_event mapper
    # also doesn't include `primary_instructor` (no equivalent on
    # Administrate's typed Event surface — same reason as before), but
    # the omission is now structural (those fields are on TutorialEvents
    # as `main_instructor` / `virtual_classroom`, populated by the sync
    # command rather than the webhook). Behavior covered in
    # test_tutorial_event_webhook_handler.py.

    def test_lms_start_end_use_renamed_fields(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_tutorial_event_fields as map_node_to_event_fields
        base_node['lmsStart'] = '2026-09-01T09:00:00Z'
        base_node['lmsEnd'] = '2026-12-01T17:00:00Z'
        defaults = map_node_to_event_fields(base_node)
        assert defaults['lms_start_date'] == '2026-09-01T09:00:00Z'
        assert defaults['lms_end_date'] == '2026-12-01T17:00:00Z'

    def test_timezone_uses_timeZoneName_field(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_tutorial_event_fields as map_node_to_event_fields
        base_node['timeZoneName'] = 'America/New_York'
        defaults = map_node_to_event_fields(base_node)
        assert defaults['timezone'] == 'America/New_York'

    def test_sold_out_uses_isSoldOut_field(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_tutorial_event_fields as map_node_to_event_fields
        base_node['isSoldOut'] = True
        defaults = map_node_to_event_fields(base_node)
        assert defaults['sold_out'] is True
