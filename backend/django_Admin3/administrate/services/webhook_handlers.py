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

from django.db import IntegrityError, transaction

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


def map_node_to_event_fields(node: dict) -> dict:
    """Translate a GraphQL `node` payload into a kwargs dict for `Event.objects`.

    Required root keys (raise `KeyError` if absent): `id`, `title`,
    `lifecycleState`, `learningMode`, `courseTemplate`, `location`.

    FK fields are resolved to local model instances. Unknown external_ids
    raise `MissingDependencyError` — the caller treats this as a
    dead-letter condition (operator runs sync_* + replay).

    Deliberately omitted from defaults (so `update_or_create` preserves
    existing values on the update path):
      - `tutorial_event`: cross-schema FK, staff-managed.
      - `primary_instructor`: no equivalent on Administrate's typed Event
        surface. Update path: existing FK survives. Create path: DB
        NOT NULL constraint fires — re-raised as MissingDependencyError
        in `_upsert_event`.
      - `virtual_classroom`: no custom field defined in UAT org.
    """
    cf_keys = _load_event_custom_field_keys()
    return {
        'external_id': node['id'],
        'title': node['title'],
        'lifecycle_state': node['lifecycleState'],
        'learning_mode': node['learningMode'],
        'cancelled': node.get('cancelledAt') is not None,
        'sold_out': bool(node.get('isSoldOut') or False),
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
            CourseTemplate, node['courseTemplate']['id']
        ),
        'location': _resolve_fk(Location, node['location']['id']),
        'venue': (
            _resolve_fk(Venue, node['venue']['id'])
            if node.get('venue') and node['venue'].get('id') else None
        ),
    }


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
    return _upsert_event(payload_node)


@register('Event Created')
def handle_event_created(payload_node: dict) -> Event:
    # `tutorial_event` FK stays null; staff link later. _upsert_event uses
    # update_or_create with `defaults=` (which intentionally excludes
    # tutorial_event from the mapper), so existing FKs are preserved on update
    # and new rows get a null FK.
    return _upsert_event(payload_node)


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
    return _upsert_event(node)


def _upsert_event(node: dict) -> Event:
    """Idempotent overwrite by external_id. Webhook always wins.

    Uses `update_or_create` with `defaults=` so:
      - Insertion path: new row, missing fields (like `tutorial_event`) default
        per the model definition (null).
      - Update path: only the keys present in `defaults` are overwritten —
        `tutorial_event` and any other field omitted by the mapper survive.

    The webhook intentionally omits `primary_instructor` from defaults
    (Administrate's typed Event interface has no equivalent). For an
    existing row this is harmless — the FK survives. For a brand-new
    Event Created delivery, the model's NOT NULL constraint on
    `primary_instructor_id` triggers an `IntegrityError`. We translate
    that to MissingDependencyError so the dispatcher dead-letters the
    row on first attempt with a message the operator runbook recognizes
    (Section 5.2 — run sync_events, then replay).
    """
    external_id = node['id']
    defaults = map_node_to_event_fields(node)
    defaults.pop('external_id', None)
    try:
        with transaction.atomic():
            event, _created = Event.objects.update_or_create(
                external_id=external_id, defaults=defaults,
            )
        return event
    except IntegrityError as exc:
        # Most common cause: NOT NULL FK on primary_instructor_id firing
        # because this is an Event Created delivery and the row doesn't
        # exist yet. We don't have the Administrate-side staff id from
        # the webhook payload, so the operator has to seed the row via
        # sync_events (or a manual create) before replaying.
        message = str(exc)
        if 'primary_instructor' in message:
            raise MissingDependencyError(
                'Instructor',
                f'<not-provided-by-webhook for event {external_id}>',
            ) from exc
        raise
