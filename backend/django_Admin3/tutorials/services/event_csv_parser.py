"""Parser for docs/misc/tutorial_import.csv.

Turns a CSV stream into a list of typed ``ParsedEvent`` records (each carrying
its sessions). Performs all string→date/int/bool conversions here so downstream
code consumes typed data only.

Format:
  Code, Title, Start Date, Start Time, End Date, End Time, Venue, Sold Out,
  Finalisation date, remain_space, Location, main instructor, Instructors, Sequence

Rows alternate between **event headers** (Sequence empty) and **session rows**
(Sequence 1..N). Session Title must start with the parent event Title.
"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List, Optional


# Valid sitting segment: 1-4 digits, optionally followed by A or S.
# Examples that match: "24", "24A", "24S", "2024", "26A".
# Examples rejected (malformed/test data): "TEST", "ELO", "FOO", "".
_VALID_SITTING_RE = re.compile(r"^\d{1,4}[AS]?$")


class ParseError(ValueError):
    """Raised when CSV parsing or validation fails. Message includes row number."""


CANC_SUFFIX_LOWER = " - canc"  # case-insensitive: matches " - CANC", " - canc", etc.
OC_MARKER = "-OC-"
IGNORE_TITLE = "IGNORE"
# Per Q (2026-05-01): rows whose Title contains the literal substring " cancelled"
# are skipped — they appear in irregular format (no Sequence, repeated titles)
# that doesn't survive structured import. Use the canonical " - CANC" suffix
# (handled separately) for cancelled events you want preserved.
CANCELLED_LOWER_SUBSTRING = " cancelled"


@dataclass
class ParsedSession:
    title: str
    sequence: int
    start_dt: datetime
    end_dt: datetime
    venue_name: str
    location_name: str
    is_soldout: bool
    instructor_names: List[str]
    cancelled: bool = False


@dataclass
class ParsedEvent:
    code: str  # legacy compound code (CSV "Code" column), e.g. "CB1_LO_6"
    title: str
    subject_code: str  # from CSV "Subject" column (preferred) or Title prefix
    product_variation_code: str  # from CSV "product variations" column, e.g. "F2F_6H"
    sitting_short: str  # e.g. "24A", "24S"
    session_code: str  # ExamSession.session_code: "24A"→"24", "24S"→"24S"
    start_date: date
    end_date: date
    venue_name: str
    location_name: str
    is_soldout: bool
    finalisation_date: Optional[date]
    remain_space: int
    main_instructor_name: str
    instructor_names: List[str]
    cancelled: bool = False
    sessions: List[ParsedSession] = field(default_factory=list)


@dataclass
class ParseResult:
    events: List[ParsedEvent] = field(default_factory=list)
    skipped_oc_count: int = 0
    skipped_ignore_count: int = 0
    skipped_cancelled_count: int = 0
    skipped_malformed_count: int = 0  # rows with non-real sitting segment (TEST, etc.)
    skipped_duplicate_count: int = 0  # session-like rows with title already seen as event
    skipped_orphan_count: int = 0  # session rows whose parent event wasn't registered


def parse_events_csv(file_obj) -> ParseResult:
    """Parse the CSV in a single pass.

    Event headers and session rows can be interleaved. We maintain an
    index ``events_by_title`` so each session row is routed to its parent
    event by deriving ``parent_title = title.rsplit('-', 1)[0]``.
    """
    reader = csv.DictReader(file_obj)
    result = ParseResult()
    events_by_title: dict[str, ParsedEvent] = {}

    for row_num, raw in enumerate(reader, start=1):
        title_raw = (raw.get("Title") or "").strip()

        # Skip rows explicitly marked to be ignored (Title == 'IGNORE').
        if title_raw == IGNORE_TITLE:
            result.skipped_ignore_count += 1
            continue

        # Skip irregular-format cancelled rows (Title contains ' cancelled').
        # The canonical ' - CANC' suffix is handled below as a real cancelled event.
        if CANCELLED_LOWER_SUBSTRING in title_raw.lower():
            result.skipped_cancelled_count += 1
            continue

        # Q1=A: skip Online Classroom rows entirely.
        if OC_MARKER in title_raw:
            result.skipped_oc_count += 1
            continue

        # Strip cancellation suffix from Title before any further parsing.
        # Case-insensitive: handles " - CANC", " - canc", " - Canc", etc.
        cancelled = False
        title = title_raw
        if title.lower().endswith(CANC_SUFFIX_LOWER):
            cancelled = True
            title = title[: -len(CANC_SUFFIX_LOWER)].rstrip()

        # Reject titles whose sitting segment isn't a valid year+letter.
        # Catches test markers like 'TEST' that slip past explicit blacklists.
        sitting_segment = _sitting_segment_from_title(title)
        if sitting_segment is None or not _VALID_SITTING_RE.match(sitting_segment):
            result.skipped_malformed_count += 1
            continue

        # Reject titles whose overall shape doesn't match expectations:
        # - event header: exactly 3 segments  (CB1-01-24A)
        # - session row:  exactly 4 segments  (CB1-01-24A-1)
        # Catches tags like '-old', '-OLD', '-replacement' on the end.
        parts = title.split("-")
        is_session = _is_session_title(title)
        expected_segments = 4 if is_session else 3
        if len(parts) != expected_segments:
            result.skipped_malformed_count += 1
            continue

        try:
            # Q3=A: discriminate by Title shape — last '-' segment as positive int → session.
            if is_session:
                parent_title = title.rsplit("-", 1)[0]
                parent = events_by_title.get(parent_title)
                if parent is None:
                    # Orphan: parent event was skipped or never present in CSV.
                    # Skip with counter (fault-tolerant) rather than raising.
                    result.skipped_orphan_count += 1
                    continue
                # Sessions inherit cancellation from their parent event.
                session_cancelled = cancelled or parent.cancelled
                session = _parse_session_row(raw, row_num, title, session_cancelled)
                parent.sessions.append(session)
            else:
                event = _parse_event_row(raw, row_num, title, cancelled)
                if event.title in events_by_title:
                    # Source data sometimes has session-like rows that share the
                    # parent's title and have no Sequence (e.g. Mod1-A-24S series,
                    # SA4 cancelled rows). They can't be reliably attached to a
                    # session number — drop them rather than crash.
                    result.skipped_duplicate_count += 1
                    continue
                events_by_title[event.title] = event
                result.events.append(event)
        except ParseError:
            raise
        except Exception as exc:
            raise ParseError(f"row {row_num}: {exc}") from exc

    return result


def _is_session_title(title: str) -> bool:
    """A session title's final '-' segment is a positive integer (e.g. ...-24A-1)."""
    if "-" not in title:
        return False
    last = title.rsplit("-", 1)[-1]
    return last.isdigit()


def _sitting_segment_from_title(title: str) -> Optional[str]:
    """Return the third '-' segment of the title (the sitting), or None if absent.

    Works for both event titles ('CB1-01-24A') and session titles ('CB1-01-24A-1')
    since the sitting is at index 2 in both cases.
    """
    parts = title.split("-")
    if len(parts) < 3:
        return None
    return parts[2]


def _parse_event_row(raw: dict, row_num: int, title: str, cancelled: bool) -> ParsedEvent:
    title_subject_code, sitting_short = _split_title(title, row_num)
    # Prefer explicit Subject column when present; fall back to title prefix.
    subject_code = (raw.get("Subject") or "").strip() or title_subject_code
    product_variation_code = (raw.get("product variations") or "").strip()
    return ParsedEvent(
        code=(raw.get("Code") or "").strip(),
        title=title,
        subject_code=subject_code,
        product_variation_code=product_variation_code,
        sitting_short=sitting_short,
        session_code=_sitting_to_session_code(sitting_short),
        start_date=_parse_date(raw.get("Start Date"), "Start Date", row_num),
        end_date=_parse_date(raw.get("End Date"), "End Date", row_num),
        venue_name=(raw.get("Venue") or "").strip(),
        location_name=(raw.get("Location") or "").strip(),
        is_soldout=_parse_bool(raw.get("Sold Out")),
        finalisation_date=_parse_date_optional(raw.get("Finalisation date"), "Finalisation date", row_num),
        remain_space=_parse_int_default(raw.get("remain_space"), default=0),
        main_instructor_name=(raw.get("main instructor") or "").strip(),
        instructor_names=_split_instructors(raw.get("Instructors")),
        cancelled=cancelled,
    )


def _parse_session_row(raw: dict, row_num: int, title: str, cancelled: bool) -> ParsedSession:
    # Sequence is the trailing integer segment of the title, by definition.
    sequence = int(title.rsplit("-", 1)[-1])
    return ParsedSession(
        title=title,
        sequence=sequence,
        start_dt=_parse_datetime(raw.get("Start Date"), raw.get("Start Time"), "Start Date", row_num),
        end_dt=_parse_datetime(raw.get("End Date"), raw.get("End Time"), "End Date", row_num),
        venue_name=(raw.get("Venue") or "").strip(),
        location_name=(raw.get("Location") or "").strip(),
        is_soldout=_parse_bool(raw.get("Sold Out")),
        instructor_names=_split_instructors(raw.get("Instructors")),
        cancelled=cancelled,
    )


def _split_title(title: str, row_num: int) -> tuple[str, str]:
    parts = title.split("-")
    if len(parts) < 3:
        raise ParseError(
            f"row {row_num}: cannot derive subject + sitting from title {title!r}"
        )
    return parts[0], parts[2]


def _sitting_to_session_code(sitting_short: str) -> str:
    """24A → '24', 24S → '24S'. General: trailing 'A' stripped, trailing 'S' kept."""
    if sitting_short.endswith("A"):
        return sitting_short[:-1]
    return sitting_short


def _parse_date(value, field_name: str, row_num: int) -> date:
    parsed = _parse_date_optional(value, field_name, row_num)
    if parsed is None:
        raise ParseError(f"row {row_num}: missing {field_name}")
    return parsed


def _parse_date_optional(value, field_name: str, row_num: int) -> Optional[date]:
    s = (value or "").strip()
    if not s:
        return None
    try:
        return datetime.strptime(s, "%d/%m/%Y").date()
    except ValueError as exc:
        raise ParseError(f"row {row_num}: invalid {field_name} {s!r}") from exc


def _parse_datetime(date_value, time_value, field_name: str, row_num: int) -> datetime:
    d = _parse_date(date_value, field_name, row_num)
    t_str = (time_value or "").strip() or "00:00"
    try:
        t = datetime.strptime(t_str, "%H:%M").time()
    except ValueError as exc:
        raise ParseError(f"row {row_num}: invalid time {t_str!r}") from exc
    return datetime.combine(d, t)


def _parse_bool(value) -> bool:
    return (value or "").strip().upper() in ("TRUE", "T", "Y", "YES", "1")


def _parse_int_default(value, default: int) -> int:
    s = (value or "").strip()
    if not s:
        return default
    try:
        return int(s)
    except ValueError:
        return default


def _split_instructors(value) -> List[str]:
    s = (value or "").strip()
    if not s:
        return []
    return [n.strip() for n in s.split(";") if n.strip()]
