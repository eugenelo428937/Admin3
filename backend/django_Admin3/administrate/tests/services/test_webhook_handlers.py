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
    def test_registry_has_three_handlers(self):
        assert set(EVENT_HANDLERS.keys()) == {
            'Event Created', 'Event Updated', 'Event Cancelled',
        }

    def test_event_created_dead_letters_when_no_existing_row(self, deps):
        """Administrate's typed Event interface exposes no `primaryInstructor`
        equivalent, so the webhook query can't supply that FK. The local
        Event model has primary_instructor as NOT NULL, so an INSERT for a
        brand-new event id fails the constraint. We translate the
        IntegrityError to MissingDependencyError so the dispatcher
        dead-letters the row on first attempt — the operator runbook's
        prescribed recovery is "run sync_events, then replay"."""
        from administrate.exceptions import MissingDependencyError
        node = _load_event('event_created.json')
        with pytest.raises(MissingDependencyError) as excinfo:
            handle_event_created(node)
        assert excinfo.value.model_name == 'Instructor'
        assert 'evt_external_43' in excinfo.value.external_id
        assert Event.objects.filter(external_id='evt_external_43').count() == 0

    def test_event_created_updates_existing_row(self, existing_event):
        """When a pre-seeded Event row exists at the webhook's external_id,
        Event Created is idempotent — it goes through the UPDATE path
        (since update_or_create matches by external_id) and the existing
        FK survives. This is what happens when sync_events ran first."""
        # Use event_updated.json since both fixtures share evt_external_42.
        node = _load_event('event_updated.json')
        event = handle_event_created(node)

        assert event.pk == existing_event.pk
        assert event.title == 'CB1 Tutorial — September 2026'
        # primary_instructor FK survived because mapper omits it from defaults
        assert event.primary_instructor_id == existing_event.primary_instructor_id

    def test_event_updated_overwrites(self, existing_event):
        node = _load_event('event_updated.json')
        handle_event_updated(node)
        # Mutate and re-apply
        node['title'] = 'CB1 Tutorial — RENAMED'
        handle_event_updated(node)

        event = Event.objects.get(external_id='evt_external_42')
        assert event.title == 'CB1 Tutorial — RENAMED'
        assert Event.objects.filter(external_id='evt_external_42').count() == 1

    def test_event_cancelled_sets_flag_and_state(self, existing_event):
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

    def test_event_cancelled_overrides_payload_when_cancelledAt_missing(
        self, existing_event,
    ):
        """Defense: if a Cancelled webhook arrives with cancelledAt=null
        (data lag edge case where Administrate's snapshot caught the event
        mid-cancellation), the webhook type still wins. The handler
        backfills cancelledAt to the current time so the mapper derives
        cancelled=True; lifecycleState is forced to CANCELLED."""
        node = _load_event('event_cancelled.json')
        node['cancelledAt'] = None        # Deliberately wrong
        node['lifecycleState'] = 'PUBLISHED'  # Deliberately wrong
        handle_event_cancelled(node)

        event = Event.objects.get(external_id='evt_external_42')
        assert event.cancelled is True
        assert event.lifecycle_state == 'CANCELLED'


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
        from administrate.services.webhook_handlers import map_node_to_event_fields
        base_node['cancelledAt'] = '2026-05-14T10:00:00Z'
        defaults = map_node_to_event_fields(base_node)
        assert defaults['cancelled'] is True

    def test_cancelled_derived_from_cancelledAt_null(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_event_fields
        base_node['cancelledAt'] = None
        defaults = map_node_to_event_fields(base_node)
        assert defaults['cancelled'] is False

    def test_web_sale_extracted_from_custom_field_true_string(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_event_fields
        base_node['customFieldValues'] = [
            {'definitionKey': WEB_SALE_KEY, 'value': 'true'},
        ]
        defaults = map_node_to_event_fields(base_node)
        assert defaults['web_sale'] is True

    def test_web_sale_extracted_from_custom_field_false_string(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_event_fields
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
        from administrate.services.webhook_handlers import map_node_to_event_fields
        base_node['customFieldValues'] = []
        defaults = map_node_to_event_fields(base_node)
        assert defaults['web_sale'] is True

    def test_event_url_extracted_from_url_custom_field(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_event_fields
        base_node['customFieldValues'] = [
            {'definitionKey': URL_KEY, 'value': 'https://example.com/x'},
        ]
        defaults = map_node_to_event_fields(base_node)
        assert defaults['event_url'] == 'https://example.com/x'

    def test_primary_instructor_omitted_from_defaults(self, base_node):
        """The mapper must NOT include primary_instructor — that's what
        protects existing FK values via update_or_create defaults semantics."""
        from administrate.services.webhook_handlers import map_node_to_event_fields
        defaults = map_node_to_event_fields(base_node)
        assert 'primary_instructor' not in defaults

    def test_virtual_classroom_omitted_from_defaults(self, base_node):
        """Same protection for virtual_classroom — Administrate has no
        equivalent and we don't want webhook deliveries clobbering values
        set by other workflows."""
        from administrate.services.webhook_handlers import map_node_to_event_fields
        defaults = map_node_to_event_fields(base_node)
        assert 'virtual_classroom' not in defaults

    def test_lms_start_end_use_renamed_fields(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_event_fields
        base_node['lmsStart'] = '2026-09-01T09:00:00Z'
        base_node['lmsEnd'] = '2026-12-01T17:00:00Z'
        defaults = map_node_to_event_fields(base_node)
        assert defaults['lms_start_date'] == '2026-09-01T09:00:00Z'
        assert defaults['lms_end_date'] == '2026-12-01T17:00:00Z'

    def test_timezone_uses_timeZoneName_field(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_event_fields
        base_node['timeZoneName'] = 'America/New_York'
        defaults = map_node_to_event_fields(base_node)
        assert defaults['timezone'] == 'America/New_York'

    def test_sold_out_uses_isSoldOut_field(self, base_node):
        from administrate.services.webhook_handlers import map_node_to_event_fields
        base_node['isSoldOut'] = True
        defaults = map_node_to_event_fields(base_node)
        assert defaults['sold_out'] is True
