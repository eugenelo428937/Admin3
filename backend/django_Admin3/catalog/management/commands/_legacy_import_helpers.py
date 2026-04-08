"""Shared helpers for legacy product CSV import commands.

Every function in this module is pure: no DB access, no filesystem writes.
This makes them trivially unit-testable and safe to reuse across the three
staged management commands (profile, import_legacy_templates,
import_legacy_store_products).
"""
import csv
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, List, Optional


@dataclass(frozen=True)
class LegacyRow:
    """One row from a legacy product CSV.

    source_file and source_line are tracked so invalid rows can be reported
    back to the exact origin for human review.
    """
    source_file: str
    source_line: int
    subject: str
    col2: str
    col3: str
    session: str
    full_code: str
    raw_fullname: str
    raw_shortname: str


def iter_legacy_csv_rows(paths: Iterable[Path]) -> Iterator[LegacyRow]:
    """Stream rows from one or more legacy CSVs.

    The legacy CSVs have no header, use cp1252 encoding (legacy Windows
    export), and have 7 columns. Rows with fewer than 7 columns are skipped.
    """
    for path in paths:
        path = Path(path)
        with open(path, 'r', encoding='cp1252', newline='') as fh:
            reader = csv.reader(fh)
            for line_num, raw_row in enumerate(reader, start=1):
                if len(raw_row) < 7:
                    continue
                fields = [c.strip() for c in raw_row[:7]]
                yield LegacyRow(
                    source_file=path.name,
                    source_line=line_num,
                    subject=fields[0],
                    col2=fields[1],
                    col3=fields[2],
                    session=fields[3],
                    full_code=fields[4],
                    raw_fullname=fields[5],
                    raw_shortname=fields[6],
                )


_FORMAT_SUFFIX_RULES = [
    re.compile(r'\s+eBook\s*$', re.IGNORECASE),
    re.compile(r'\s+CD[\s\-]?ROM\s*$', re.IGNORECASE),
    re.compile(r'\s+Online(\s+Tutorial)?\s*$', re.IGNORECASE),
    re.compile(r'\s+Booklet\s*$', re.IGNORECASE),
]

_YEAR_PAREN_RULES = [
    # Any parenthetical containing a 4-digit year (19xx or 20xx) anywhere
    # inside it. Catches "(2014-2017 Papers)", "(April 2008 exams)",
    # "(inc April 2005)", and "(inc. April 2006)".
    re.compile(r'\s*\([^)]*(?:19|20)\d{2}[^)]*\)'),
    # "(14-17 and 19-21 Papers)" — any 2-digit year followed by dash/space
    re.compile(r'\s*\(\d{2}[-\s][^)]*\)'),
    # "(January exams)", "(April 2008 exams)" — month-prefixed parentheticals
    re.compile(
        r'\s*\((?:January|February|March|April|May|June|'
        r'July|August|September|October|November|December)[^)]*\)',
        re.IGNORECASE,
    ),
]

# Matches a standalone 4-digit year anywhere in the string, preceded by
# either whitespace OR a hyphen (so year ranges like "2014-2017" get
# stripped in one pass: the first year matches " 2014", leaving "-2017",
# and the dash case catches the trailing half).
_STANDALONE_YEAR_RULE = re.compile(r'[\s\-](?:19|20)\d{2}\b')

# "Revision Notes V2" → "Revision Notes". Only at end of string.
_VERSION_RULE = re.compile(r'\s+V\d+\s*$', re.IGNORECASE)

# "Series X Assignments (Marking)" → "Series X Assignments"
_MARKING_PAREN_RULE = re.compile(r'\s*\(Marking\)\s*$', re.IGNORECASE)

_TYPO_MAP = {
    'Core REading': 'Core Reading',
    'Question & Answer Bank': 'Q&A Bank',
    'Flashcards': 'Flash Cards',
    # Consolidate "Series X Marking" (modern CSVs, 2010+) with
    # "Series X Assignments" (the template that older CSVs derive via
    # the (Marking) paren strip rule).
    'Series X Marking': 'Series X Assignments',
    'Series Y Marking': 'Series Y Assignments',
    'Series Z Marking': 'Series Z Assignments',
    # Mock exam marking aliases: in modern CSVs the marking service is
    # encoded as "<mock exam name> Marking"; in older CSVs it was the
    # same name with "(Marking)" stripped. These entries align them.
    'Mock Exam Marking': 'Mock Exam',
    'Mock Exam A Marking': 'Mock Exam A',
    'Mock Exam B Marking': 'Mock Exam B',
    'Mock Exam C Marking': 'Mock Exam C',
    'Mock Exam 1 Marking': 'Mock Exam 1',
    'Mock Exam 2 Marking': 'Mock Exam 2',
    'Mock Exam 3 Marking': 'Mock Exam 3',
}


def normalize_fullname(raw: str) -> str:
    """Normalize a raw CSV fullname to its canonical template name.

    Rules (applied in order):
      1. Strip format-encoding suffixes: eBook, CD-ROM, Online, Booklet
      2. Strip year/session parenthetical annotations
      3. Strip naked years anywhere in the string
      4. Strip trailing version markers (V1, V2, etc.)
      5. Strip trailing "(Marking)"
      6. Collapse whitespace and apply pre-approved typo fixes

    Deliberately preserves: "- part 1", "- Assessment", "Retaker", "Mini",
    subject-specific prefixes like "CA2 MAP".
    """
    name = raw.strip()

    for rule in _FORMAT_SUFFIX_RULES:
        name = rule.sub('', name)

    for rule in _YEAR_PAREN_RULES:
        name = rule.sub('', name)

    name = _STANDALONE_YEAR_RULE.sub('', name)
    name = _VERSION_RULE.sub('', name)
    name = _MARKING_PAREN_RULE.sub('', name)

    # Collapse any whitespace (including runs created by year stripping)
    name = re.sub(r'\s+', ' ', name).strip()

    # Apply pre-approved typo fixes
    name = _TYPO_MAP.get(name, name)

    return name


VALID_COL2_CODES = frozenset({'P', 'C', 'M', 'T'})


def classify_row(row: LegacyRow) -> Optional[str]:
    """Return a reason code if the row is invalid, else None.

    This function only checks things that can be determined from the CSV
    alone. DB-dependent checks (unknown session/subject/no PPV match)
    happen in the Stage 3 command where the preloaded lookups exist.
    """
    if not row.subject:
        return 'empty_subject'
    if row.subject == '*':
        return 'wildcard_subject'
    if not row.col3:
        return 'empty_col3'
    if not row.session:
        return 'empty_session'
    if row.col2 not in VALID_COL2_CODES:
        return 'unknown_col2'
    return None


@dataclass(frozen=True)
class TemplateKey:
    """Identity for a catalog.Product template.

    Two rows share a template iff they have the same col3 code AND
    normalize_fullname() produces the same canonical name.
    """
    code: str
    fullname: str


def build_template_key(row: LegacyRow) -> TemplateKey:
    """Compute the template key for a legacy CSV row.

    Combines col3 (unchanged) with the normalized fullname.
    """
    return TemplateKey(
        code=row.col3,
        fullname=normalize_fullname(row.raw_fullname),
    )
