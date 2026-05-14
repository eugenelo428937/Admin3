"""Webhook handler registry + payload mapper for Administrate `Event`.

The mapper is a deliberately pure function: GraphQL `node` dict in,
`Event` field dict out. This is the layer most likely to break when
Administrate's schema drifts, so we keep it free of DB writes and
isolate FK lookups behind explicit `_resolve_*` helpers that raise
`MissingDependencyError` (a typed exception the task layer treats as a
dead-letter signal).
"""

from typing import Callable, Dict

from administrate.exceptions import MissingDependencyError
from administrate.models import (
    CourseTemplate,
    Event,
    Instructor,
    Location,
    Venue,
)


EVENT_HANDLERS: Dict[str, Callable[[dict], Event]] = {}


def register(webhook_type_name: str):
    """Decorator that registers a handler for an Administrate webhook type."""

    def deco(fn: Callable[[dict], Event]) -> Callable[[dict], Event]:
        EVENT_HANDLERS[webhook_type_name] = fn
        return fn

    return deco


def map_node_to_event_fields(node: dict) -> dict:
    """Translate a GraphQL `event` node into a kwargs dict for `Event.objects`.

    Required root keys (raise `KeyError` if absent): `id`, `title`,
    `lifecycleState`, `learningMode`, `webSale`, `courseTemplate`,
    `location`, `primaryInstructor`.

    FK fields are resolved to local model instances. Unknown external_ids
    raise `MissingDependencyError` — the caller treats this as a
    dead-letter condition (operator runs sync_* + replay).

    `tutorial_event` is deliberately NOT included: that cross-schema FK
    is managed by staff workflows, not by Administrate.
    """
    return {
        'external_id': node['id'],
        'title': node['title'],
        'lifecycle_state': node['lifecycleState'],
        'learning_mode': node['learningMode'],
        'cancelled': bool(node.get('cancelled', False)),
        'sold_out': bool(node.get('soldOut', False)),
        'web_sale': bool(node['webSale']),
        'max_places': int(node.get('maxPlaces') or 0),
        'min_places': int(node.get('minPlaces') or 0),
        'event_url': node.get('eventUrl') or '',
        'virtual_classroom': node.get('virtualClassroom') or '',
        'timezone': node.get('timezone') or 'Europe/London',
        'lms_start_date': node.get('lmsStartDate') or None,
        'lms_end_date': node.get('lmsEndDate') or None,
        'registration_deadline': node.get('registrationDeadline') or None,
        'course_template': _resolve_fk(
            CourseTemplate, node['courseTemplate']['id']
        ),
        'location': _resolve_fk(Location, node['location']['id']),
        'venue': (
            _resolve_fk(Venue, node['venue']['id'])
            if node.get('venue') and node['venue'].get('id') else None
        ),
        'primary_instructor': _resolve_fk(
            Instructor, node['primaryInstructor']['id']
        ),
    }


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
    event = _upsert_event(payload_node)
    event.cancelled = True
    event.lifecycle_state = 'CANCELLED'
    event.save(update_fields=['cancelled', 'lifecycle_state', 'updated_at'])
    return event


def _upsert_event(node: dict) -> Event:
    """Idempotent overwrite by external_id. Webhook always wins.

    Uses `update_or_create` with `defaults=` so:
      - Insertion path: new row, missing fields (like `tutorial_event`) default
        per the model definition (null).
      - Update path: only the keys present in `defaults` are overwritten —
        `tutorial_event` and any other field omitted by the mapper survive.
    """
    external_id = node['id']
    defaults = map_node_to_event_fields(node)
    defaults.pop('external_id', None)
    event, _created = Event.objects.update_or_create(
        external_id=external_id, defaults=defaults,
    )
    return event
