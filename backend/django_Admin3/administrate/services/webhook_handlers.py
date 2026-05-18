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

from typing import Callable, Dict, List, Optional

from django.db import transaction
from django.utils import timezone

from administrate.exceptions import MissingDependencyError
from administrate.models import (
    Contact,
    CourseTemplate,
    CustomField,
    Event,
    Learner,
    Location,
    Session as AdmSession,
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
    # Phase 5b (2026-05-16): the legacy start_date/end_date columns were
    # dropped; the dual-write that used to live here is gone.
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


# NOTE: the original `_upsert_event` and `map_node_to_event_fields` —
# which targeted `adm.events` directly with a 20+ field write — were
# removed in Phase 5 of the tutorial-events-as-master refactor (2026-05-15).
# The bridge no longer carries those columns; all writes flow through
# `_upsert_tutorial_event` above, which updates `acted.tutorial_events`
# (the master) and upserts a thin `adm.events` row (external_id +
# tutorial_event_id only).


# ===========================================================================
# Session + Learner handlers (Phase 5 of session+learner webhook expansion,
# 2026-05-18). All six handlers share the master-row-as-source-of-truth
# philosophy: each writes to `acted.tutorial_*` and upserts the matching
# `adm.*` bridge. Missing dependencies (parent event not bridged yet,
# Student not found by middleName, etc.) raise MissingDependencyError so
# the dispatcher dead-letters the row and the operator's recovery
# workflow is: fix upstream data, then `administrate_webhooks_inbox replay`.
# ===========================================================================


# Custom field definition keys for Session payloads. Verified against UAT
# introspection 2026-05-18; if Administrate's admins rename a field's
# label, the key stays stable.
_SESSION_CF_URL_KEY = 'Q3VzdG9tRmllbGREZWZpbml0aW9uOjM5'  # "URL"
# Sequence (Q3VzdG9tRmllbGREZWZpbml0aW9uOjUx) and Recording links
# (Q3VzdG9tRmllbGREZWZpbml0aW9uOjYx) are fetched but not currently
# applied — the master's `sequence` is the canonical source (set by
# CSV import) and recordings have no destination column yet.


def _session_custom_field(node: dict, definition_key: str) -> Optional[str]:
    """Return the customFieldValues entry value for the given stable
    definition key, or None."""
    for cfv in node.get('customFieldValues') or []:
        if cfv.get('definitionKey') == definition_key:
            return cfv.get('value')
    return None


def _find_tutorial_session_by_title(tutorial_event, title: str):
    """Locate the master tutorials.TutorialSessions row by
    (tutorial_event, title). Title is the join key from Administrate's
    Session — it's expected to be unique within an event (set by CSV
    bulk import). If somehow not unique, lowest `sequence` wins for
    determinism."""
    from tutorials.models import TutorialSessions
    return TutorialSessions.objects.filter(
        tutorial_event=tutorial_event,
        title=title.strip(),
    ).order_by('sequence').first()


def _upsert_tutorial_session_from_node(node: dict, *, cancelled: bool):
    """Shared core for Session Created/Updated/Deleted.

    Created and Updated share field-sync semantics; Deleted is the same
    payload but with `cancelled=True` propagated to the master. We
    don't hard-delete — the bridge row references the master, and
    setting cancelled=True preserves audit trail while signalling
    the consumer.
    """
    external_id = node['id']

    title = (node.get('title') or '').strip()
    if not title:
        raise MissingDependencyError(
            'TutorialSessions', f'<empty title for session {external_id!r}>'
        )

    # The Session payload carries `event { id }` — added to the query
    # specifically so the handler can locate the parent tutorial_event.
    event_node = node.get('event') or {}
    adm_event_id = event_node.get('id')
    if not adm_event_id:
        raise MissingDependencyError(
            'Event', f'<missing event.id on session payload {external_id!r}>'
        )

    adm_event = _resolve_fk(Event, adm_event_id)
    tutorial_event = adm_event.tutorial_event
    if tutorial_event is None:
        # The adm.Event bridge exists but isn't linked to a master row.
        # Operator workflow: replay the parent Event Created webhook
        # (which links the bridge), then replay this Session row.
        raise MissingDependencyError(
            'TutorialEvents',
            f'<adm.Event {adm_event_id!r} has tutorial_event=NULL>',
        )

    tutorial_session = _find_tutorial_session_by_title(tutorial_event, title)
    if tutorial_session is None:
        raise MissingDependencyError(
            'TutorialSessions',
            f'<no master row matching ({tutorial_event.code}, title={title!r})>',
        )

    with transaction.atomic():
        # Sync the small set of fields the webhook is authoritative for.
        # `title` is the join key — never overwritten. `sequence`,
        # `start_date`, `end_date`, `instructors`, `venue`, `location`
        # are owned by CSV bulk import. The webhook contributes:
        #   - the URL custom-field (if present)
        #   - the cancelled flag (for Session Deleted)
        cf_url = _session_custom_field(node, _SESSION_CF_URL_KEY)
        if cf_url is not None:
            tutorial_session.url = cf_url
        tutorial_session.cancelled = cancelled
        tutorial_session.save()

        bridge, _ = AdmSession.objects.update_or_create(
            external_id=external_id,
            defaults={'tutorial_session': tutorial_session},
        )
    return bridge


@register('Session Created')
def handle_session_created(node: dict):
    return _upsert_tutorial_session_from_node(node, cancelled=False)


@register('Session Updated')
def handle_session_updated(node: dict):
    return _upsert_tutorial_session_from_node(node, cancelled=False)


@register('Session Deleted')
def handle_session_deleted(node: dict):
    # Soft-delete via `cancelled=True` rather than DELETE; preserves the
    # TutorialAttendance/Registration history pointing at this session.
    return _upsert_tutorial_session_from_node(node, cancelled=True)


# ---------------------------------------------------------------------------
# Learner handlers
# ---------------------------------------------------------------------------

def _resolve_student_from_contact_node(contact_node: dict):
    """Walk `contact.personalName.middleName` → Student.student_ref.

    This is a long-standing domain convention: Administrate stores our
    student_ref (an integer PK) in the contact's middleName field.
    Empty / non-numeric / no-such-student → dead-letter with a precise
    error message so the operator knows exactly what to fix.
    """
    from students.models import Student
    contact_id = contact_node.get('id', '<unknown>')
    middle = ((contact_node.get('personalName') or {}).get('middleName') or '').strip()
    if not middle:
        raise MissingDependencyError(
            'Student',
            f'<contact {contact_id!r} has empty personalName.middleName>',
        )
    try:
        student_ref = int(middle)
    except (TypeError, ValueError):
        raise MissingDependencyError(
            'Student',
            f'<contact {contact_id!r} has non-numeric middleName={middle!r}>',
        )
    try:
        return Student.objects.get(student_ref=student_ref)
    except Student.DoesNotExist:
        raise MissingDependencyError(
            'Student', f'student_ref={student_ref}',
        )


def _lazy_upsert_adm_contact(contact_node: dict) -> Contact:
    """Create-or-update the adm.Contact bridge from a learner payload.

    Lazy-resolution path documented in the to-do list (D-contact-gap):
    we don't have a separate `Contact Created` webhook in the registered
    set, so Learner Created upserts the bridge on first encounter.
    """
    contact_id = contact_node.get('id')
    if not contact_id:
        raise MissingDependencyError(
            'Contact', '<missing contact.id on learner payload>',
        )
    student = _resolve_student_from_contact_node(contact_node)
    bridge, _ = Contact.objects.update_or_create(
        external_id=contact_id,
        defaults={'student': student},
    )
    return bridge


def _iter_session_ids(node: dict):
    """Yield session ids from a Learner payload's attendance subtree.

    The Administrate payload nests session ids under
    `attendance.sessionDetail.edges[].node.session.id`. We use the
    subtree purely as an enumeration of "which sessions is this
    learner enrolled in"; attendanceMark and any other per-edge data
    is ignored (attendance state isn't webhook-driven).

    Tolerant of missing intermediate keys (`attendance` /
    `sessionDetail` / `edges` can each be None or absent) — yields
    nothing in those cases rather than raising.
    """
    attendance = node.get('attendance') or {}
    sd = attendance.get('sessionDetail') or {}
    for edge in sd.get('edges') or []:
        edge_node = edge.get('node') or {}
        session_node = edge_node.get('session') or {}
        session_id = session_node.get('id')
        if not session_id:
            continue
        yield session_id


@register('Learner Created')
def handle_learner_created(node: dict) -> List[Learner]:
    """Create one TutorialRegistration + adm.Learner bridge per session.

    An Administrate Learner spans N sessions (one Event with N Sessions).
    Per Option α (2026-05-18), one `adm.Learner` row per (Administrate-
    learner, our-registration) pair — composite unique on
    (external_id, tutorial_registration).
    """
    from tutorials.models import TutorialRegistration

    learner_id = node['id']
    contact_node = node.get('contact') or {}
    adm_contact = _lazy_upsert_adm_contact(contact_node)
    if adm_contact.student_id is None:
        raise MissingDependencyError(
            'Student', f'<adm.Contact {adm_contact.external_id!r} has student=NULL>',
        )

    event_node = node.get('event') or {}
    adm_event_id = event_node.get('id')
    if not adm_event_id:
        raise MissingDependencyError(
            'Event', f'<missing event.id on learner payload {learner_id!r}>',
        )
    adm_event = _resolve_fk(Event, adm_event_id)
    if adm_event.tutorial_event is None:
        raise MissingDependencyError(
            'TutorialEvents',
            f'<adm.Event {adm_event_id!r} has tutorial_event=NULL>',
        )

    created_bridges: List[Learner] = []
    with transaction.atomic():
        for session_id in _iter_session_ids(node):
            adm_session = _resolve_fk(AdmSession, session_id)
            tutorial_session = adm_session.tutorial_session
            if tutorial_session is None:
                raise MissingDependencyError(
                    'TutorialSessions',
                    f'<adm.Session {session_id!r} has tutorial_session=NULL>',
                )

            registration, _ = TutorialRegistration.objects_all.update_or_create(
                student=adm_contact.student,
                tutorial_session=tutorial_session,
                defaults={'is_active': True, 'deactivated_at': None},
            )
            bridge, _ = Learner.objects.update_or_create(
                external_id=learner_id,
                tutorial_registration=registration,
                defaults={},
            )
            created_bridges.append(bridge)
    return created_bridges


@register('Learner Cancelled')
def handle_learner_cancelled(node: dict) -> List[Learner]:
    """Deactivate all TutorialRegistration rows linked to this learner.

    Uses the bridge to find every (learner, session) pair, then soft-
    deletes each registration via the `is_active=False` /
    `deactivated_at` pattern. The bridge rows themselves survive so
    historical audit queries can still resolve learner_id → student.
    """
    learner_id = node['id']
    bridges = list(Learner.objects.filter(external_id=learner_id))
    if not bridges:
        raise MissingDependencyError(
            'Learner', f'<no adm.Learner rows for {learner_id!r}>',
        )
    now = timezone.now()
    with transaction.atomic():
        for bridge in bridges:
            reg = bridge.tutorial_registration
            if reg is None or not reg.is_active:
                continue
            reg.is_active = False
            reg.deactivated_at = now
            reg.save(update_fields=['is_active', 'deactivated_at', 'updated_at'])
    return bridges


# NOTE: the `Learner Attended Session` webhook handler and its
# attendanceMark → status mapping previously lived here. They were
# removed (2026-05-18) in favor of the existing TutorialAttendance
# write paths (CSV import, public-attendance views). Webhooks cover
# enrolment lifecycle (Created / Cancelled) only; attendance is owned
# by the master row.
