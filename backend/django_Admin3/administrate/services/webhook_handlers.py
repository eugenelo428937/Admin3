"""Webhook handler registry + payload mapper for Administrate `Event`.

The mapper is a deliberately pure function: GraphQL `node` dict in,
`Event` field dict out. This is the layer most likely to break when
Administrate's schema drifts, so we keep it free of DB writes and
isolate FK lookups behind explicit `_resolve_*` helpers that raise
`MissingDependencyError` (a typed exception the task layer treats as a
dead-letter signal).

Field-name decisions verified against UAT introspection (2026-05-15):
  - `cancelled` (bool) is derived from `cancelledAt` (datetime/null).
  - `web_sale` and `event_url` are pulled from `customFieldValues`,
    matching by stable `definitionKey` (Administrate's base64-encoded
    definition ID like `Q3VzdG9tRmllbGREZWZpbml0aW9uOjI0`). The local
    `adm.custom_fields` table maps the human-readable label
    (`'Web sale'`, `'URL'`) to that key — so renames on either side
    don't silently break the mapper as long as `sync_custom_fields`
    has run.
  - `virtual_classroom` and `primary_instructor` have no Administrate
    equivalent on this slice's chosen query surface, so they're
    omitted from `defaults` and preserved by `update_or_create` on
    existing rows. Event Created webhooks for brand-new rows fail at
    the DB level (NOT NULL FK on `primary_instructor`); we re-raise
    that as `MissingDependencyError` from `_upsert_event` so the
    dispatcher routes it to DEAD on first attempt.
"""

from typing import Callable, Dict, Optional

from django.db import transaction

from administrate.exceptions import MissingDependencyError
from administrate.models import (
    CourseTemplate,
    CustomField,
    Event,
    Location,
    Venue,
)


# Local labels we consume from Administrate's customFieldValues. The mapper
# resolves these to stable `external_id`s via the CustomField table at apply
# time, so a label rename on the Administrate side requires only re-running
# `sync_custom_fields` (no code change).
_CONSUMED_CUSTOM_FIELD_LABELS = ('Web sale', 'URL')


EVENT_HANDLERS: Dict[str, Callable[[dict], Event]] = {}


def register(webhook_type_name: str):
    """Decorator that registers a handler for an Administrate webhook type."""

    def deco(fn: Callable[[dict], Event]) -> Callable[[dict], Event]:
        EVENT_HANDLERS[webhook_type_name] = fn
        return fn

    return deco


def _load_event_custom_field_keys() -> Dict[str, str]:
    """Return `{label: external_id}` for the custom fields we consume.

    One indexed query per webhook delivery, scoped to the labels in
    `_CONSUMED_CUSTOM_FIELD_LABELS`. Admins are free to rename labels in
    Administrate; as long as `sync_custom_fields` has run, the rename
    propagates to `adm.custom_fields.label` and the mapper's lookup
    keeps resolving to the correct stable `external_id`.

    Missing rows are silently absent from the returned dict — the
    consuming lookup then falls back to the model field's default.
    """
    return dict(
        CustomField.objects.filter(
            entity_type='event',
            label__in=_CONSUMED_CUSTOM_FIELD_LABELS,
        ).values_list('label', 'external_id')
    )


def _custom_field_value(
    node: dict, label: str, cf_keys: Dict[str, str],
) -> Optional[str]:
    """Return the `value` of the custom field with the given local label.

    Joins on `definitionKey` (Administrate's stable definition ID)
    rather than `definition.label` (admin-editable string). Tolerant of
    missing definitions / empty lists.
    """
    key = cf_keys.get(label)
    if key is None:
        return None
    for cfv in node.get('customFieldValues') or []:
        if cfv.get('definitionKey') == key:
            return cfv.get('value')
    return None


def _bool_from_string(value, default: bool) -> bool:
    """Interpret Administrate's String-typed custom field values as Boolean.

    Administrate stores all custom fields as String; their canonical
    truthy values for boolean-shaped fields are `'true'`/`'1'`/`'yes'`/
    `'on'` (case-insensitive). Empty or absent → fall back to `default`
    (which matches the model field's default for new rows).
    """
    if value is None or value == '':
        return default
    return str(value).strip().lower() in {'true', '1', 'yes', 'on'}


def _resolve_fk(model_cls, external_id: str):
    """Look up a local row by external_id, or raise MissingDependencyError."""
    try:
        return model_cls.objects.get(external_id=external_id)
    except model_cls.DoesNotExist:
        raise MissingDependencyError(model_cls.__name__, external_id)


@register('Event Updated')
def handle_event_updated(payload_node: dict) -> Event:
    return _upsert_tutorial_event(payload_node)


@register('Event Created')
def handle_event_created(payload_node: dict) -> Event:
    # Per user decision 2026-05-15: a brand-new Administrate event with no
    # matching `tutorial_events.code` dead-letters. Operator workflow: create
    # the tutorial_events row (with its store_product), then replay the
    # inbox row. We do NOT auto-create — store_product is NOT NULL and the
    # webhook payload doesn't carry that information.
    return _upsert_tutorial_event(payload_node)


@register('Event Cancelled')
def handle_event_cancelled(payload_node: dict) -> Event:
    # Force authoritative cancelled state regardless of payload content.
    # Administrate's Cancelled webhook is the source of truth; if the payload
    # field ever lags the event type (edge case), the webhook type wins.
    # The mapper derives `cancelled` from `cancelledAt is not None`, so we
    # backfill `cancelledAt` to a non-null sentinel when Administrate didn't
    # supply one (e.g. a stale snapshot caught mid-cancellation).
    from django.utils import timezone
    node = {**payload_node, 'lifecycleState': 'CANCELLED'}
    if not node.get('cancelledAt'):
        node['cancelledAt'] = timezone.now().isoformat()
    return _upsert_tutorial_event(node)


# ---------------------------------------------------------------------------
# Phase 2: tutorial-events-as-master upsert flow
# ---------------------------------------------------------------------------

def map_node_to_tutorial_event_fields(node: dict) -> dict:
    """Translate a GraphQL `node` payload into a kwargs dict for TutorialEvents.

    Differs from `map_node_to_event_fields` (which targeted adm.events) in:
      - FK fields resolve through the existing `adm.<entity>.tutorial_<entity>`
        bridges, so the result references tutorials-side master data not
        Administrate-side. (The `course_template` FK stays on the
        Administrate side per the Phase 1 cross-schema FK design.)
      - `external_id` is the Administrate event id, used as the join key.
      - DateTime fields stay DateTime — no Date truncation here. The dual-
        write of legacy `start_date`/`end_date` happens in `_upsert_tutorial_event`.

    Raises `MissingDependencyError` if a required FK can't be resolved
    (the dispatcher dead-letters the row).
    """
    cf_keys = _load_event_custom_field_keys()
    return {
        'external_id': node['id'],
        'lifecycle_state': node.get('lifecycleState') or '',
        'learning_mode': node.get('learningMode') or '',
        'cancelled': node.get('cancelledAt') is not None,
        'sold_out': bool(node.get('isSoldOut') or False),
        # Mirror the new sold_out into the legacy is_soldout column so
        # readers using the old field stay current during Phases 2-4.
        'is_soldout': bool(node.get('isSoldOut') or False),
        'web_sale': _bool_from_string(
            _custom_field_value(node, 'Web sale', cf_keys),
            default=True,
        ),
        'max_places': int(node.get('maxPlaces') or 0),
        'min_places': int(node.get('minPlaces') or 0),
        'event_url': _custom_field_value(node, 'URL', cf_keys) or '',
        'timezone': node.get('timeZoneName') or 'Europe/London',
        'lms_start_date': node.get('lmsStart') or None,
        'lms_end_date': node.get('lmsEnd') or None,
        'registration_deadline': node.get('registrationDeadline') or None,
        'course_template': _resolve_fk(
            CourseTemplate, node['courseTemplate']['id'],
        ),
        'location': _resolve_tutorial_location_via_bridge(
            node['location']['id']
        ),
        'venue': (
            _resolve_tutorial_venue_via_bridge(node['venue']['id'])
            if node.get('venue') and node['venue'].get('id') else None
        ),
        # main_instructor: Administrate's webhook query doesn't carry staff,
        # so we don't write it. Existing FK survives the partial update.
    }


def _resolve_tutorial_location_via_bridge(adm_external_id: str):
    """`adm.locations.tutorial_location` is the canonical bridge from
    Administrate's master data to the tutorials-side master data. Resolve
    once; let unknown ids dead-letter."""
    adm_loc = _resolve_fk(Location, adm_external_id)
    return adm_loc.tutorial_location  # may be None — caller handles via SET_NULL


def _resolve_tutorial_venue_via_bridge(adm_external_id: str):
    adm_venue = _resolve_fk(Venue, adm_external_id)
    return adm_venue.tutorial_venue  # may be None


def _upsert_tutorial_event(node: dict) -> Event:
    """Look up the TutorialEvents row by `code=node.title`, update it from
    the payload, and upsert the `adm.events` bridge row.

    Raises:
        MissingDependencyError('TutorialEvents', code) if no row matches —
        the dispatcher's dead-letter path catches this. Operator workflow:
        create the tutorial_events row, then `administrate_webhooks_inbox replay`.

    Returns the bridge `Event` row so the dispatch layer can reference it
    (e.g. in audit logs).
    """
    from tutorials.models import TutorialEvents

    code = (node.get('title') or '').strip()
    external_id = node['id']
    if not code:
        # An empty title can't possibly match — fail loud rather than
        # silently linking a blank-code TutorialEvents row.
        raise MissingDependencyError('TutorialEvents', f'<empty title for {external_id!r}>')

    tutorial_event = TutorialEvents.objects.filter(code=code).first()
    if tutorial_event is None:
        raise MissingDependencyError('TutorialEvents', code)

    defaults = map_node_to_tutorial_event_fields(node)
    # Dual-write the new DateTime values into the legacy Date columns so
    # readers using `start_date`/`end_date` keep working through Phases 2-4.
    # Phase 5 drops the legacy columns and the dual-write goes with them.
    if defaults.get('lms_start_date'):
        defaults['start_date'] = _truncate_to_date(defaults['lms_start_date'])
    if defaults.get('lms_end_date'):
        defaults['end_date'] = _truncate_to_date(defaults['lms_end_date'])

    with transaction.atomic():
        for field, value in defaults.items():
            setattr(tutorial_event, field, value)
        tutorial_event.save()

        # Upsert the adm.events bridge. We intentionally write only
        # external_id + tutorial_event; legacy columns are nullable per
        # the Phase 2 nullify migration and will be dropped in Phase 5.
        bridge, _created = Event.objects.update_or_create(
            external_id=external_id,
            defaults={'tutorial_event': tutorial_event},
        )
    return bridge


def _truncate_to_date(value):
    """Convert a DateTime or ISO string to a date for legacy column dual-write."""
    if value is None:
        return None
    if isinstance(value, str):
        from django.utils.dateparse import parse_datetime, parse_date
        dt = parse_datetime(value)
        if dt is not None:
            return dt.date()
        return parse_date(value)
    if hasattr(value, 'date'):
        return value.date()
    return value


# NOTE: the original `_upsert_event` and `map_node_to_event_fields` —
# which targeted `adm.events` directly with a 20+ field write — were
# removed in Phase 5 of the tutorial-events-as-master refactor (2026-05-15).
# The bridge no longer carries those columns; all writes flow through
# `_upsert_tutorial_event` above, which updates `acted.tutorial_events`
# (the master) and upserts a thin `adm.events` row (external_id +
# tutorial_event_id only).
