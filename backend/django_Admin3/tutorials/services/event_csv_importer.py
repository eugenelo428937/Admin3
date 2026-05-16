"""Orchestrator for the tutorial events/sessions CSV import.

Workflow (per Decision 2026-05-01):
1. Truncate ``tutorial_session_instructors``, ``tutorial_sessions``,
   ``tutorial_events`` (in that order — FK-safe). Locations, venues, and
   instructor records survive across imports so subsequent runs reuse them.
2. For each ParsedEvent in the input ParseResult:
   - Skip if cancelled (Q2026-05-01 Q1=B).
   - Resolve dependencies via ``resolve_event_dependencies``.
   - On resolution errors → record in report and skip.
   - Otherwise insert TutorialEvents + TutorialSessions and attach
     instructors via the M2M.
3. Wrap everything in a transaction. If ``dry_run=True``, set rollback so
   no DB writes persist while still returning populated report counts.

The report is a typed dataclass the management command serialises for the
operator.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time
from typing import List, Optional
from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone


# Phase 5b (2026-05-16): the legacy Date columns on tutorial_events were
# replaced by DateTime equivalents. CSV input is still date-only; the
# canonical conversion is midnight Europe/London (matches the
# tutorial_events.timezone field default and the webhook handler's
# Date->DateTime conversion in administrate.management.commands.
# migrate_adm_events_to_tutorial_events / sync_events).
_LONDON = ZoneInfo('Europe/London')


def _to_datetime_midnight_london(value: Optional[date]) -> Optional[datetime]:
    """Convert a date to a tz-aware datetime at midnight Europe/London.

    Returns None unchanged. Already-datetime inputs pass through (defensive
    for callers that resolve the value via DateTime helpers)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.combine(value, time(0, 0), tzinfo=_LONDON)

from tutorials.models import (
    TutorialEvents, TutorialSessions,
)
from tutorials.services.event_csv_parser import (
    ParsedEvent, ParsedSession, ParseResult,
)
from tutorials.services.event_csv_resolver import resolve_event_dependencies


@dataclass
class ImportReport:
    dry_run: bool = False
    events_created: int = 0
    sessions_created: int = 0
    sessions_skipped_duplicate_sequence: int = 0
    events_skipped_cancelled: int = 0
    events_skipped_errors: int = 0
    truncated_events: int = 0
    truncated_sessions: int = 0
    event_errors: List[dict] = field(default_factory=list)


def import_parsed_events(parsed: ParseResult, *, dry_run: bool) -> ImportReport:
    """Truncate-and-replace TutorialEvents / TutorialSessions / session
    instructors from a parsed CSV result. Returns an ImportReport.
    """
    report = ImportReport(dry_run=dry_run)

    with transaction.atomic():
        # Capture pre-truncate counts for the report.
        report.truncated_events = TutorialEvents.objects.count()
        report.truncated_sessions = TutorialSessions.objects.count()

        # Truncate events; CASCADE on the FK from TutorialSessions →
        # TutorialEvents removes sessions, and the M2M
        # tutorial_session_instructors junction is cleared automatically.
        TutorialEvents.objects.all().delete()

        for parsed_event in parsed.events:
            if parsed_event.cancelled:
                report.events_skipped_cancelled += 1
                continue

            resolution = resolve_event_dependencies(parsed_event)
            if resolution.errors or resolution.store_product is None:
                report.events_skipped_errors += 1
                report.event_errors.append({
                    'title': parsed_event.title,
                    'errors': resolution.errors,
                })
                continue

            # Phase 5b (2026-05-16): write DateTime columns directly. Parser
            # produces date objects; combine with midnight Europe/London so
            # the timezone matches the canonical conversion used by the
            # webhook handler / sync command.
            event = TutorialEvents.objects.create(
                code=parsed_event.title,
                store_product=resolution.store_product,
                lms_start_date=_to_datetime_midnight_london(parsed_event.start_date),
                lms_end_date=_to_datetime_midnight_london(parsed_event.end_date),
                venue=resolution.tutorial_venue,
                location=resolution.tutorial_location,
                is_soldout=parsed_event.is_soldout,
                finalisation_date=_to_datetime_midnight_london(parsed_event.finalisation_date),
                remain_space=parsed_event.remain_space,
                main_instructor=resolution.instructors[0] if resolution.instructors else None,
            )
            report.events_created += 1

            # De-dup sessions within an event by sequence (source-data quirk:
            # a few events have multiple rows sharing the same sequence number,
            # which would violate unique_together(event, sequence)).
            seen_sequences = set()
            for parsed_session in parsed_event.sessions:
                if parsed_session.sequence in seen_sequences:
                    report.sessions_skipped_duplicate_sequence += 1
                    continue
                seen_sequences.add(parsed_session.sequence)
                _create_session(parsed_session, event)
                report.sessions_created += 1

        if dry_run:
            transaction.set_rollback(True)

    return report


def _create_session(parsed_session: ParsedSession, event: TutorialEvents) -> None:
    """Resolve session-level dependencies (venue/location/instructors) and
    create the TutorialSessions row + M2M attachments.

    Sessions reuse the event's location/venue if they aren't separately
    specified (real CSVs typically duplicate the event's values onto each
    session row, so this just looks them up cheaply).
    """
    from tutorials.services.event_csv_resolver import (
        _get_or_create_tutorial_location,
        _get_or_create_tutorial_venue,
        _get_or_create_instructor,
    )

    location = _get_or_create_tutorial_location(parsed_session.location_name) \
        if parsed_session.location_name else event.location
    venue = (
        _get_or_create_tutorial_venue(parsed_session.venue_name, location)
        if parsed_session.venue_name and location else event.venue
    )

    session = TutorialSessions.objects.create(
        tutorial_event=event,
        title=parsed_session.title,
        sequence=parsed_session.sequence,
        start_date=_aware(parsed_session.start_dt),
        end_date=_aware(parsed_session.end_dt),
        venue=venue,
        location=location,
    )
    instructors = [
        _get_or_create_instructor(name) for name in parsed_session.instructor_names if name.strip()
    ]
    if instructors:
        session.instructors.set(instructors)


def _aware(dt: datetime) -> datetime:
    """Convert a naive datetime to an aware one in the project's TZ."""
    if timezone.is_naive(dt):
        return timezone.make_aware(dt)
    return dt
