"""Parser for docs/misc/tutorial_registrations.csv.

CSV header (real, 2026-05-05):
    "Title","Subject","Is Cancelled","Sitting","Enrolled",
    "ActEd Student Numbers","Swaps In ActEd Student Numbers",
    "Swaps out","Custom: Swaps out ActEd Student Numbers (Event)"

Each row enrols students into ONE TutorialSessions row, looked up by
``Title`` (which equals ``TutorialSessions.title`` in real data, format
``{event.code}-{sequence}``).

Design decisions resolved against real data:
- Q1: Title is the session title — direct lookup.
- Q2=B: Refs with paren suffixes (e.g. ``78519 (2)``) are SKIPPED with a
  per-ref warning. Conservative — meaning of the suffix is unclear.
- Q3=A: ``Swaps In`` / ``Swaps out`` / ``Custom: Swaps out…`` columns are
  ignored in this phase. The TutorialSessionSwap model lands later.
- Cancelled rows (``Is Cancelled = True``) are skipped — cancelled events
  should not have active registrations.

The parser does NOT raise on bad rows. It counts and reports them so the
operator can decide whether to fix the source file.
"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from typing import List

from students.models import Student
from tutorials.models import TutorialSessions


# Matches a student ref token: bare integer, or integer with paren suffix
# like "78519 (2)". The paren-suffixed variant is SKIPPED per Q2=B.
_REF_RE = re.compile(r'^\s*(?P<ref>\d+)\s*(?P<suffix>\([^)]*\))?\s*$')


@dataclass
class ParsedRegistrationRow:
    session_id: int
    session_title: str
    student_refs: List[int]


@dataclass
class RegistrationsParseResult:
    rows: List[ParsedRegistrationRow] = field(default_factory=list)
    unmatched: List[dict] = field(default_factory=list)
    total_rows: int = 0
    skipped_cancelled: int = 0
    skipped_unknown_session: int = 0
    skipped_unknown_student: int = 0
    skipped_paren_suffix: int = 0
    skipped_empty: int = 0


def _is_truthy_cancelled(value: str) -> bool:
    return (value or '').strip().lower() in {'true', '1', 'yes', 'y'}


def parse_registrations_csv(file_obj) -> RegistrationsParseResult:
    """Parse a registrations CSV stream into resolved rows.

    Returns a :class:`RegistrationsParseResult`. Bad rows are recorded in
    ``unmatched`` and the corresponding skip counter is incremented.
    """
    reader = csv.DictReader(file_obj)
    result = RegistrationsParseResult()

    for raw in reader:
        result.total_rows += 1
        row_num = result.total_rows

        title = (raw.get('Title') or '').strip()
        cancelled_raw = raw.get('Is Cancelled') or ''
        refs_field = (raw.get('ActEd Student Numbers') or '').strip()

        if _is_truthy_cancelled(cancelled_raw):
            result.skipped_cancelled += 1
            continue

        if not refs_field:
            result.skipped_empty += 1
            continue

        session = TutorialSessions.objects.filter(title=title).first()
        if session is None:
            result.skipped_unknown_session += 1
            result.unmatched.append({
                'row': row_num,
                'session_title': title,
                'reason': f"unknown session_title: {title!r}",
            })
            continue

        # Tokenise refs (comma-delimited, possibly with paren suffix or
        # whitespace).
        ref_ints: List[int] = []
        for token in refs_field.split(','):
            token = token.strip()
            if not token:
                continue
            m = _REF_RE.match(token)
            if not m:
                # Garbage token — record and skip.
                result.unmatched.append({
                    'row': row_num,
                    'session_title': title,
                    'reason': f"unparseable ref token: {token!r}",
                })
                continue
            if m.group('suffix'):
                result.skipped_paren_suffix += 1
                result.unmatched.append({
                    'row': row_num,
                    'session_title': title,
                    'reason': f"paren-suffixed ref skipped: {token!r}",
                })
                continue
            ref_ints.append(int(m.group('ref')))

        # Dedup while preserving order.
        seen = set()
        unique_refs = []
        for r in ref_ints:
            if r not in seen:
                seen.add(r)
                unique_refs.append(r)

        if not unique_refs:
            # All tokens were skipped/garbage — count as empty after filter.
            result.skipped_empty += 1
            continue

        existing = set(
            Student.objects.filter(student_ref__in=unique_refs)
            .values_list('student_ref', flat=True)
        )
        for r in unique_refs:
            if r not in existing:
                result.skipped_unknown_student += 1
                result.unmatched.append({
                    'row': row_num,
                    'session_title': title,
                    'reason': f"unknown student_ref: {r}",
                })

        valid = [r for r in unique_refs if r in existing]
        if valid:
            result.rows.append(ParsedRegistrationRow(
                session_id=session.id,
                session_title=title,
                student_refs=valid,
            ))

    return result
