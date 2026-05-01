"""Parser for docs/misc/tutorial_orders.csv.

Each row maps a (student, subject, sitting) → (chosen tutorial event OR OC).
Per Q1=A (2026-05-01), OC rows are skipped — the orders backfill only writes
face-to-face TutorialChoice rows. The orchestrator groups parsed rows by
(student, subject, sitting) into Order/OrderItem/Choice triples.
"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from typing import List, Optional


# Matches the choice-row fullname text:
#   "1st Choice tutorial (CP2-17)" → rank=1, event_code=CP2-17
#   "2nd Choice tutorial (CP2-02)"
#   "3rd Choice tutorial (CP2-12)"
_CHOICE_RE = re.compile(
    r'^(?P<rank>\d+)(?:st|nd|rd|th)\s+Choice\s+tutorial\s+\((?P<event>[^)]+)\)\s*$',
    re.IGNORECASE,
)
# Matches the OC fullname text — kept for defensive detection when xname
# doesn't start with "OC-":
#   "CP2 Online Classroom (OC-CP2-24)"
_OC_FULLNAME_RE = re.compile(r'Online\s+Classroom', re.IGNORECASE)


@dataclass
class ParsedOrderRow:
    student_ref: int
    firstname: str
    lastname: str
    email: str
    subject_code: str
    choice_rank: int  # 1, 2, or 3
    event_code_xname: str  # e.g. "CP2-17"
    variation_code_xcode: str  # e.g. "CP2_LO_1" (legacy CSV Code)
    sitting_year: str  # e.g. "2024"


@dataclass
class OrdersParseResult:
    rows: List[ParsedOrderRow] = field(default_factory=list)
    total_rows: int = 0
    skipped_oc_count: int = 0
    skipped_unparseable_count: int = 0
    unparseable_details: List[dict] = field(default_factory=list)


def parse_orders_csv(file_obj) -> OrdersParseResult:
    reader = csv.DictReader(file_obj)
    result = OrdersParseResult()

    for row_num, raw in enumerate(reader, start=1):
        result.total_rows += 1

        xname = (raw.get('xname') or '').strip()
        fullname = (raw.get('fullname') or '').strip()

        # Skip OC entries (per Q1=A) — detected by either signal.
        if xname.startswith('OC-') or _OC_FULLNAME_RE.search(fullname):
            result.skipped_oc_count += 1
            continue

        # Parse choice rank from fullname.
        match = _CHOICE_RE.match(fullname)
        if not match:
            result.skipped_unparseable_count += 1
            result.unparseable_details.append({
                'row': row_num, 'fullname': fullname, 'reason': 'fullname pattern not recognised',
            })
            continue

        try:
            student_ref = int((raw.get('ref') or '').strip())
        except ValueError:
            result.skipped_unparseable_count += 1
            result.unparseable_details.append({
                'row': row_num, 'ref': raw.get('ref'), 'reason': 'student ref not an integer',
            })
            continue

        rank = int(match.group('rank'))
        event_from_text = match.group('event').strip()

        # If xname disagrees with the event code embedded in fullname, prefer xname
        # (it's the structured field) but record a soft warning in the report.
        event_code = xname or event_from_text

        result.rows.append(ParsedOrderRow(
            student_ref=student_ref,
            firstname=(raw.get('firstname') or '').strip(),
            lastname=(raw.get('lastname') or '').strip(),
            email=(raw.get('email') or '').strip(),
            subject_code=(raw.get('subject') or '').strip(),
            choice_rank=rank,
            event_code_xname=event_code,
            variation_code_xcode=(raw.get('xcode') or '').strip(),
            sitting_year=(raw.get('csitting') or '').strip(),
        ))

    return result
