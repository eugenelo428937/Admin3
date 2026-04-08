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

# "Revision Notes V2" → "Revision Notes". Only at end of string.
_VERSION_RULE = re.compile(r'\s+V\d+\s*$', re.IGNORECASE)

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


def normalize_fullname(raw: str, col2: str = '', col3: str = '') -> str:
    """Normalize a raw CSV fullname to its canonical template name.

    Applies an aggressive ruleset that trades semantic fidelity for
    collision reduction: the raw fullname is preserved separately in
    store.Product.remarks so nothing is truly lost.

    Tutorial special case (col2='T' and col3 in {'B','D'}):
        Only strips parenthesized content. Tutorial fullnames encode
        instance-specific info (location, duration) inside parens;
        stripping that gives a template name shared across instances.

    General rules (all case-insensitive where applicable):
        1. Legacy trailing-suffix rules: strip eBook, CD-ROM, Online
           (Tutorial), Booklet, V\\d+
        2. Remove ALL parenthesized content
        3. Remove 'paper 1/2/3'
        4. Remove 'part 1/2/3'
        5. Remove standalone 'eBook' and 'Paper' (word-boundary;
           'Papers' plural is preserved)
        6. Replace dashes with spaces
        7. Remove ALL 2-digit number sequences (strips 2-digit + 4-digit
           years since \\d\\d matches twice in a 4-digit year)
        8. Collapse whitespace
        9. Apply curated typo map (Core REading → Core Reading, etc.)
    """
    name = raw.strip()

    # Tutorial special case: only strip parenthesized content
    if col2 == 'T' and col3 in ('B', 'D'):
        name = re.sub(r'\s*\([^)]*\)', '', name)
        name = re.sub(r'\s+', ' ', name).strip()
        return name

    # Legacy trailing-suffix rules (eBook, CD-ROM, Online, Booklet)
    for rule in _FORMAT_SUFFIX_RULES:
        name = rule.sub('', name)

    # Legacy version suffix
    name = _VERSION_RULE.sub('', name)

    # Aggressive general rules (Task 2.6)
    # Remove ALL parenthesized content
    name = re.sub(r'\s*\([^)]*\)', '', name)
    # Remove 'paper 1|2|3'
    name = re.sub(r'\bpaper\s+[123]\b', '', name, flags=re.IGNORECASE)
    # Remove 'part 1|2|3'
    name = re.sub(r'\bpart\s+[123]\b', '', name, flags=re.IGNORECASE)
    # Remove 'eBook' anywhere (word-boundary)
    name = re.sub(r'\bebook\b', '', name, flags=re.IGNORECASE)
    # Remove standalone 'Paper' (singular only; 'Papers' has trailing s)
    name = re.sub(r'\bpaper\b', '', name, flags=re.IGNORECASE)
    # Replace dashes with space (preserve word boundaries)
    name = name.replace('-', ' ')
    # Remove 2-digit number pairs (strips years: "2014" → "" via two matches)
    name = re.sub(r'\d\d', '', name)

    # Collapse whitespace
    name = re.sub(r'\s+', ' ', name).strip()

    # Apply curated typo map
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

    Combines col3 (unchanged) with the normalized fullname. The
    col2 and col3 values are passed to normalize_fullname so it
    can apply the tutorial special case.
    """
    return TemplateKey(
        code=row.col3,
        fullname=normalize_fullname(
            row.raw_fullname, col2=row.col2, col3=row.col3,
        ),
    )
