# Legacy Product Data Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import ~37k rows of historical ActEd product data (1995–2026) from four legacy CSVs into `catalog_products`, `catalog_product_variations`, `catalog_product_product_variations`, and `store.products`, with only 2026 sessions active.

**Architecture:** Three idempotent Django management commands staged as (1) read-only profiler that emits review CSVs, (2) catalog template importer driven by the reviewed preview CSV, (3) store product importer with preloaded lookups and batched transactions. A shared helpers module (`_legacy_import_helpers.py`) holds pure, testable functions.

**Tech Stack:** Django 6.0 management commands, PostgreSQL (schema `acted`), Python `csv` + `re` stdlib, Django `TestCase` with synthetic CSV fixtures.

**Spec:** [docs/superpowers/specs/2026-04-08-legacy-product-migration-design.md](../specs/2026-04-08-legacy-product-migration-design.md)

---

## Prerequisites

- Working directory: `c:/Code/Admin3/backend/django_Admin3/`
- Virtual env activated: `.\.venv\Scripts\activate`
- Raw CSVs already exist at `c:/Code/Admin3/docs/misc/raw_prods{95-00,01-09,11-19,20-26}.csv`
- Target tables (`catalog_products`, `catalog_product_variations`, `catalog_product_product_variations`, `store.products`) are **all empty** — verified via [Bash command `python -c "from catalog.products.models import Product; print(Product.objects.count())"`]
- `ExamSession` (64 rows), `Subject` (129 rows), `ExamSessionSubject` (2,165 rows) are already populated

**Test runner:** `python manage.py test catalog.tests.test_<module> --keepdb -v 2`

**Important:** This codebase enforces TDD. Every task in this plan follows RED → GREEN → REFACTOR. Do not write implementation code before the failing test exists.

---

## File Structure

**New files (create):**

```
backend/django_Admin3/
├── catalog/management/commands/
│   ├── _legacy_import_helpers.py              [pure helpers: LegacyRow, normalize_fullname, classify_row, iter_legacy_csv_rows, build_template_key]
│   ├── profile_legacy_products.py             [Stage 1 command — read-only; emits 3 CSVs]
│   ├── import_legacy_templates.py             [Stage 2 command — writes catalog_* tables]
│   └── import_legacy_store_products.py        [Stage 3 command — writes products table]
├── catalog/tests/
│   ├── test_legacy_import_helpers.py          [unit tests for pure helpers]
│   ├── test_profile_legacy_products.py        [Stage 1 command tests]
│   ├── test_import_legacy_templates.py        [Stage 2 command tests]
│   ├── test_import_legacy_store_products.py   [Stage 3 command tests]
│   └── fixtures_legacy_csvs/                  [synthetic CSV fixtures for tests]
│       ├── mini_1995.csv                      [~10 normal rows for 1995 session]
│       ├── mini_2026.csv                      [~8 normal rows for 2026 session]
│       ├── mini_invalid.csv                   [wildcards, col2=E, unknown session]
│       └── mini_collisions.csv                [two rows same (subj, col2, col3, session), different normalized names]
└── store/migrations/
    └── 0004_add_legacy_product_name.py         [adds nullable TEXT field `legacy_product_name`]
```

**Output artifacts (written during execution, committed to repo):**

```
docs/misc/review/
├── template_preview.csv
├── invalid_rows.csv
└── normalization_trace.csv
```

---

## Tasks

## Phase A — Shared helpers (pure, DB-free)

### Task 1: Create `_legacy_import_helpers.py` with `LegacyRow` dataclass and CSV iterator

**Files:**
- Create: `backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py`
- Create: `backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py`
- Create: `backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/mini_1995.csv`

**Context:** The four raw CSVs have no header row, use `cp1252` encoding (per existing `import_product_product_variations.py`), and have 7 columns. This task introduces a `LegacyRow` dataclass and an iterator that streams rows from one or more CSV files, yielding `LegacyRow` instances.

- [ ] **Step 1: Create the test fixture CSV**

File: `backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/mini_1995.csv`

```
A,P,N,95,A/PN/95,Course Notes,Course Notes
A,P,C,95,A/PC/95,Combined Materials,Combined Materials
B,P,N,95,B/PN/95,Course Notes,Course Notes
B,P,X,95,B/PX/95,Series X Assignments,Assign X (Papers)
```

- [ ] **Step 2: Write the failing test for `LegacyRow` + `iter_legacy_csv_rows`**

(Tests assume the fixture CSVs directory exists with no `__init__.py` — Django test discovery only looks for `test_*.py` files, so the fixtures dir can be a plain directory.)

File: `backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py`

```python
"""Unit tests for _legacy_import_helpers.

These tests cover pure functions: no DB access, no filesystem writes beyond
reading the fixture CSVs checked into the repo.
"""
from pathlib import Path

from django.test import SimpleTestCase

from catalog.management.commands._legacy_import_helpers import (
    LegacyRow,
    iter_legacy_csv_rows,
)

FIXTURES_DIR = Path(__file__).parent / 'fixtures_legacy_csvs'


class TestLegacyRow(SimpleTestCase):
    def test_legacyrow_fields(self):
        row = LegacyRow(
            source_file='mini_1995.csv',
            source_line=1,
            subject='A',
            col2='P',
            col3='N',
            session='95',
            full_code='A/PN/95',
            raw_fullname='Course Notes',
            raw_shortname='Course Notes',
        )
        self.assertEqual(row.subject, 'A')
        self.assertEqual(row.col2, 'P')
        self.assertEqual(row.col3, 'N')
        self.assertEqual(row.raw_fullname, 'Course Notes')


class TestIterLegacyCsvRows(SimpleTestCase):
    def test_iter_yields_legacyrow_instances(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        self.assertEqual(len(rows), 4)
        self.assertIsInstance(rows[0], LegacyRow)

    def test_iter_populates_source_metadata(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        self.assertEqual(rows[0].source_file, 'mini_1995.csv')
        self.assertEqual(rows[0].source_line, 1)
        self.assertEqual(rows[3].source_line, 4)

    def test_iter_strips_whitespace(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        self.assertEqual(rows[0].subject, 'A')
        self.assertEqual(rows[0].raw_fullname, 'Course Notes')

    def test_iter_parses_all_seven_columns(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        r = rows[3]
        self.assertEqual(r.subject, 'B')
        self.assertEqual(r.col2, 'P')
        self.assertEqual(r.col3, 'X')
        self.assertEqual(r.session, '95')
        self.assertEqual(r.full_code, 'B/PX/95')
        self.assertEqual(r.raw_fullname, 'Series X Assignments')
        self.assertEqual(r.raw_shortname, 'Assign X (Papers)')
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `python manage.py test catalog.tests.test_legacy_import_helpers --keepdb -v 2`

Expected: `ModuleNotFoundError` for `catalog.management.commands._legacy_import_helpers`.

- [ ] **Step 4: Implement the helpers module (minimal — just `LegacyRow` + iterator)**

File: `backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py`

```python
"""Shared helpers for legacy product CSV import commands.

Every function in this module is pure: no DB access, no filesystem writes.
This makes them trivially unit-testable and safe to reuse across the three
staged management commands (profile, import_legacy_templates,
import_legacy_store_products).
"""
import csv
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `python manage.py test catalog.tests.test_legacy_import_helpers --keepdb -v 2`

Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py \
        backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py \
        backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/
git commit -m "chore(catalog): add LegacyRow dataclass and CSV iterator for legacy import"
```

---

### Task 2: Add `normalize_fullname` to helpers with full regex ruleset

**Files:**
- Modify: `backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py`
- Modify: `backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py`

**Context:** This is the heart of template deduplication. The function strips format-encoding suffixes (`eBook`, `CD-ROM`), session parentheticals (`(2014-2017 Papers)`), and version markers (`V2`), while preserving meaningful distinctions (`- Part 1`, `Assessment`, `Retaker`).

- [ ] **Step 1: Write the failing tests**

Append to `backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py`:

```python
from catalog.management.commands._legacy_import_helpers import normalize_fullname


class TestNormalizeFullname(SimpleTestCase):
    """Every case here is derived from real CSV data or the design spec."""

    def test_strips_ebook_suffix(self):
        self.assertEqual(normalize_fullname('Course Notes eBook'), 'Course Notes')

    def test_strips_cdrom_suffix(self):
        self.assertEqual(normalize_fullname('Exam Skills CD ROM'), 'Exam Skills')
        self.assertEqual(normalize_fullname('Exam Skills CD-ROM'), 'Exam Skills')

    def test_strips_online_suffix(self):
        self.assertEqual(
            normalize_fullname('Stats Refresher Online Tutorial'),
            'Stats Refresher',
        )

    def test_strips_booklet_suffix(self):
        self.assertEqual(
            normalize_fullname('CPD Financial Services Exam Booklet'),
            'CPD Financial Services Exam',
        )

    def test_strips_year_parenthetical(self):
        self.assertEqual(
            normalize_fullname('ASET (2014-2017 Papers)'),
            'ASET',
        )

    def test_strips_short_year_parenthetical(self):
        self.assertEqual(
            normalize_fullname('ASET (14-17 and 19-21 Papers)'),
            'ASET',
        )

    def test_strips_month_parenthetical(self):
        self.assertEqual(
            normalize_fullname('Revision Notes (April 2008 exams)'),
            'Revision Notes',
        )
        self.assertEqual(
            normalize_fullname('Mock Exam (September 2010 exams)'),
            'Mock Exam',
        )

    def test_strips_standalone_year(self):
        self.assertEqual(
            normalize_fullname('Mock Exam 2016'),
            'Mock Exam',
        )
        self.assertEqual(
            normalize_fullname('Mock Exam 2010 Marking'),
            'Mock Exam Marking',
        )

    def test_strips_version_marker(self):
        self.assertEqual(normalize_fullname('Revision Notes V2'), 'Revision Notes')
        self.assertEqual(normalize_fullname('Revision Notes V12'), 'Revision Notes')

    def test_strips_marking_parenthetical(self):
        self.assertEqual(
            normalize_fullname('Series X Assignments (Marking)'),
            'Series X Assignments',
        )

    def test_combined_ebook_and_parenthetical(self):
        self.assertEqual(
            normalize_fullname('ASET (14-17 Papers) eBook'),
            'ASET',
        )

    def test_preserves_part_suffix(self):
        """Part 1 / Part 2 are meaningful distinctions — keep them."""
        self.assertEqual(
            normalize_fullname('Course Notes - part 1'),
            'Course Notes - part 1',
        )
        self.assertEqual(
            normalize_fullname('Combined Materials Pack - Part 1'),
            'Combined Materials Pack - Part 1',
        )

    def test_preserves_assessment_suffix(self):
        self.assertEqual(
            normalize_fullname('Course Notes - Assessment'),
            'Course Notes - Assessment',
        )

    def test_preserves_retaker(self):
        self.assertEqual(
            normalize_fullname('Combined Materials (Part. Retaker) eBook'),
            'Combined Materials (Part. Retaker)',
        )

    def test_typo_fix_core_reading(self):
        self.assertEqual(normalize_fullname('Core REading'), 'Core Reading')

    def test_typo_fix_flashcards(self):
        self.assertEqual(normalize_fullname('Flashcards'), 'Flash Cards')

    def test_typo_fix_question_and_answer_bank(self):
        self.assertEqual(normalize_fullname('Question & Answer Bank'), 'Q&A Bank')

    def test_collapses_whitespace(self):
        self.assertEqual(
            normalize_fullname('Course  Notes  eBook'),
            'Course Notes',
        )

    def test_strips_leading_trailing_whitespace(self):
        self.assertEqual(normalize_fullname('  Course Notes  '), 'Course Notes')

    def test_empty_string(self):
        self.assertEqual(normalize_fullname(''), '')

    def test_idempotent(self):
        """Normalizing an already-normalized name is a no-op."""
        canonical = normalize_fullname('ASET (2014-2017 Papers) eBook')
        self.assertEqual(canonical, 'ASET')
        self.assertEqual(normalize_fullname(canonical), canonical)

    def test_ca2_map_year_stripping(self):
        self.assertEqual(
            normalize_fullname('CA2 MAP 2015 Marking Part 1'),
            'CA2 MAP Marking Part 1',
        )
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python manage.py test catalog.tests.test_legacy_import_helpers.TestNormalizeFullname --keepdb -v 2`

Expected: `ImportError: cannot import name 'normalize_fullname'`.

- [ ] **Step 3: Implement `normalize_fullname`**

Append to `backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py`:

```python
import re


_FORMAT_SUFFIX_RULES = [
    re.compile(r'\s+eBook\s*$', re.IGNORECASE),
    re.compile(r'\s+CD[\s\-]?ROM\s*$', re.IGNORECASE),
    re.compile(r'\s+Online(\s+Tutorial)?\s*$', re.IGNORECASE),
    re.compile(r'\s+Booklet\s*$', re.IGNORECASE),
]

_YEAR_PAREN_RULES = [
    # "(2014-2017 Papers)", "(April 2008 exams)" — any 4-digit year inside parens
    re.compile(r'\s*\((?:19|20)\d{2}[^)]*\)'),
    # "(14-17 and 19-21 Papers)" — any 2-digit year followed by dash/space
    re.compile(r'\s*\(\d{2}[-\s][^)]*\)'),
    # "(January exams)", "(April 2008 exams)" — month-prefixed parentheticals
    re.compile(
        r'\s*\((?:January|February|March|April|May|June|'
        r'July|August|September|October|November|December)[^)]*\)',
        re.IGNORECASE,
    ),
]

# Matches a standalone 4-digit year anywhere in the string (preceded by space,
# followed by word boundary). This catches "Mock Exam 2010 Marking" →
# "Mock Exam Marking".
_STANDALONE_YEAR_RULE = re.compile(r'\s+(?:19|20)\d{2}\b')

# "Revision Notes V2" → "Revision Notes". Only at end of string.
_VERSION_RULE = re.compile(r'\s+V\d+\s*$', re.IGNORECASE)

# "Series X Assignments (Marking)" → "Series X Assignments"
_MARKING_PAREN_RULE = re.compile(r'\s*\(Marking\)\s*$', re.IGNORECASE)

_TYPO_MAP = {
    'Core REading': 'Core Reading',
    'Question & Answer Bank': 'Q&A Bank',
    'Flashcards': 'Flash Cards',
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python manage.py test catalog.tests.test_legacy_import_helpers.TestNormalizeFullname --keepdb -v 2`

Expected: 22 tests pass.

- [ ] **Step 5: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py \
        backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py
git commit -m "chore(catalog): add normalize_fullname helper for legacy CSV import"
```

---

### Task 3: Add `classify_row` validation helper

**Files:**
- Modify: `backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py`
- Modify: `backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py`

**Context:** `classify_row` returns a reason code (string) if the row is invalid, or `None` if valid. The function is pure — no DB access. It covers only the checks that can be done from the CSV alone (wildcards, col2=E). DB-dependent checks (unknown session/subject/ESS/PPV) happen inside the Stage 3 command.

- [ ] **Step 1: Write the failing tests**

Append to `backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py`:

```python
from catalog.management.commands._legacy_import_helpers import classify_row


def _make_row(**overrides):
    defaults = dict(
        source_file='test.csv',
        source_line=1,
        subject='CM1',
        col2='P',
        col3='N',
        session='26',
        full_code='CM1/PN/26',
        raw_fullname='Course Notes',
        raw_shortname='Course Notes',
    )
    defaults.update(overrides)
    return LegacyRow(**defaults)


class TestClassifyRow(SimpleTestCase):
    def test_valid_row_returns_none(self):
        self.assertIsNone(classify_row(_make_row()))

    def test_wildcard_subject_rejected(self):
        row = _make_row(subject='*')
        self.assertEqual(classify_row(row), 'wildcard_subject')

    def test_col2_e_rejected(self):
        row = _make_row(col2='E')
        self.assertEqual(classify_row(row), 'unknown_col2')

    def test_col2_unknown_char_rejected(self):
        row = _make_row(col2='Z')
        self.assertEqual(classify_row(row), 'unknown_col2')

    def test_all_valid_col2_accepted(self):
        for c in ['P', 'C', 'M', 'T']:
            with self.subTest(col2=c):
                self.assertIsNone(classify_row(_make_row(col2=c)))

    def test_empty_subject_rejected(self):
        row = _make_row(subject='')
        self.assertEqual(classify_row(row), 'empty_subject')

    def test_empty_col3_rejected(self):
        row = _make_row(col3='')
        self.assertEqual(classify_row(row), 'empty_col3')

    def test_empty_session_rejected(self):
        row = _make_row(session='')
        self.assertEqual(classify_row(row), 'empty_session')
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python manage.py test catalog.tests.test_legacy_import_helpers.TestClassifyRow --keepdb -v 2`

Expected: `ImportError: cannot import name 'classify_row'`.

- [ ] **Step 3: Implement `classify_row`**

Append to `backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py`:

```python
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python manage.py test catalog.tests.test_legacy_import_helpers.TestClassifyRow --keepdb -v 2`

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py \
        backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py
git commit -m "chore(catalog): add classify_row validation helper for legacy CSV import"
```

---

### Task 4: Add `TemplateKey` dataclass and `build_template_key` helper

**Files:**
- Modify: `backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py`
- Modify: `backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py`

**Context:** `TemplateKey` is a frozen dataclass containing `(code, fullname)`. `build_template_key` computes the key for a given row (normalizes the fullname, copies col3 as the code). This is the grouping identity for `catalog.Product` rows.

- [ ] **Step 1: Write the failing tests**

Append to `backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py`:

```python
from catalog.management.commands._legacy_import_helpers import (
    TemplateKey,
    build_template_key,
)


class TestTemplateKey(SimpleTestCase):
    def test_is_frozen(self):
        key = TemplateKey(code='N', fullname='Course Notes')
        with self.assertRaises(Exception):
            key.code = 'X'  # type: ignore[misc]

    def test_is_hashable(self):
        key1 = TemplateKey(code='N', fullname='Course Notes')
        key2 = TemplateKey(code='N', fullname='Course Notes')
        self.assertEqual(hash(key1), hash(key2))
        self.assertEqual({key1, key2}, {key1})


class TestBuildTemplateKey(SimpleTestCase):
    def test_basic(self):
        row = _make_row(col3='N', raw_fullname='Course Notes')
        self.assertEqual(
            build_template_key(row),
            TemplateKey(code='N', fullname='Course Notes'),
        )

    def test_normalizes_fullname(self):
        row = _make_row(col3='N', raw_fullname='Course Notes eBook')
        self.assertEqual(
            build_template_key(row),
            TemplateKey(code='N', fullname='Course Notes'),
        )

    def test_preserves_col3(self):
        row = _make_row(col3='EX', raw_fullname='ASET (2014-2017 Papers) eBook')
        self.assertEqual(
            build_template_key(row),
            TemplateKey(code='EX', fullname='ASET'),
        )

    def test_different_col3_different_keys(self):
        row_n = _make_row(col3='N', raw_fullname='Course Notes')
        row_na = _make_row(col3='NA', raw_fullname='Course Notes')
        self.assertNotEqual(
            build_template_key(row_n),
            build_template_key(row_na),
        )
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python manage.py test catalog.tests.test_legacy_import_helpers.TestTemplateKey catalog.tests.test_legacy_import_helpers.TestBuildTemplateKey --keepdb -v 2`

Expected: `ImportError: cannot import name 'TemplateKey'`.

- [ ] **Step 3: Implement `TemplateKey` and `build_template_key`**

Append to `backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py`:

```python
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python manage.py test catalog.tests.test_legacy_import_helpers --keepdb -v 2`

Expected: all tests in the module pass (including previous tasks).

- [ ] **Step 5: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/catalog/management/commands/_legacy_import_helpers.py \
        backend/django_Admin3/catalog/tests/test_legacy_import_helpers.py
git commit -m "chore(catalog): add TemplateKey and build_template_key helpers"
```

---

## Phase B — Stage 1: Profile & preview command

### Task 5: Create `profile_legacy_products` command skeleton with CSV fixtures

**Files:**
- Create: `backend/django_Admin3/catalog/management/commands/profile_legacy_products.py`
- Create: `backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/mini_2026.csv`
- Create: `backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/mini_invalid.csv`
- Create: `backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/mini_collisions.csv`
- Create: `backend/django_Admin3/catalog/tests/test_profile_legacy_products.py`

**Context:** This task creates the minimum viable Stage 1 command that accepts a `--csv-dir` and `--output-dir`, reads CSVs, and emits an empty `normalization_trace.csv`. Subsequent tasks flesh out the template preview and invalid rows outputs.

- [ ] **Step 1: Create the 2026 fixture CSV**

File: `backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/mini_2026.csv`

```
CM1,P,N,26,CM1/PN/26,Course Notes,Course Notes
CM1,C,N,26,CM1/CN/26,Course Notes eBook,Course Notes eBook
CM1,P,C,26,CM1/PC/26,Combined Materials Pack,CMP
CM1,C,C,26,CM1/CC/26,Combined Materials Pack eBook,CMP eBook
CB1,P,N,26,CB1/PN/26,Course Notes,Course Notes
CB1,P,EX,26,CB1/PEX/26,ASET (2014-2017 Papers),ASET
CB1,M,X,26,CB1/MX/26,Series X Assignments (Marking),X Marking
CB1,T,F,26,CB1/TF/26,Tutorial - face-to-face,Tutorial F2F
```

- [ ] **Step 2: Create the invalid rows fixture CSV**

File: `backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/mini_invalid.csv`

```
*,M,V,26,*/MV/26,Marking Voucher,Marking Voucher
ROWS,E,N,95,A1/PN/95,Course Notes,Course Notes
CM1,P,N,95B,CM1/PN/95B,Course Notes,Course Notes
ZZZZ,P,N,26,ZZZZ/PN/26,Course Notes,Course Notes
```

Row meanings: (1) wildcard subject, (2) col2=E anomaly, (3) unknown session `95B`, (4) unknown subject `ZZZZ` (DB-dependent; Stage 1 won't catch this, only Stage 3 will).

- [ ] **Step 3: Create the collision fixture CSV**

File: `backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/mini_collisions.csv`

```
CM1,P,M,26,CM1/PM/26,Mock Exam 1,Mock 1
CM1,P,M,26,CM1/PM/26,Marked Assignment Project,MAP
```

Both rows target the same `(CM1, P, M, 26)` tuple but have different normalized template keys — a collision.

- [ ] **Step 4: Write the failing test**

File: `backend/django_Admin3/catalog/tests/test_profile_legacy_products.py`

```python
"""Tests for the profile_legacy_products Stage 1 management command."""
import csv
import shutil
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import SimpleTestCase


FIXTURES_DIR = Path(__file__).parent / 'fixtures_legacy_csvs'


class ProfileLegacyProductsTestBase(SimpleTestCase):
    """Each test runs against an isolated tmp directory with CSV inputs."""

    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.csv_dir = self.tmpdir / 'csvs'
        self.csv_dir.mkdir()
        self.output_dir = self.tmpdir / 'review'
        self.output_dir.mkdir()

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def copy_fixture(self, name: str):
        shutil.copy(FIXTURES_DIR / name, self.csv_dir / name)

    def run_command(self):
        call_command(
            'profile_legacy_products',
            csv_dir=str(self.csv_dir),
            output_dir=str(self.output_dir),
        )


class TestProfileLegacyProductsSkeleton(ProfileLegacyProductsTestBase):
    def test_command_runs_with_empty_input(self):
        self.run_command()
        self.assertTrue(
            (self.output_dir / 'normalization_trace.csv').exists()
        )

    def test_command_produces_normalization_trace(self):
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        trace_path = self.output_dir / 'normalization_trace.csv'
        self.assertTrue(trace_path.exists())
        with open(trace_path, newline='') as fh:
            rows = list(csv.DictReader(fh))
        # 8 rows in mini_2026.csv → 8 trace entries
        self.assertEqual(len(rows), 8)
        self.assertIn('raw_fullname', rows[0])
        self.assertIn('normalized_fullname', rows[0])
        self.assertIn('source_file', rows[0])
        self.assertIn('source_line', rows[0])
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `python manage.py test catalog.tests.test_profile_legacy_products --keepdb -v 2`

Expected: `CommandError: Unknown command: 'profile_legacy_products'`.

- [ ] **Step 6: Implement the Stage 1 command skeleton**

File: `backend/django_Admin3/catalog/management/commands/profile_legacy_products.py`

```python
"""Stage 1 of the legacy product migration: profile and preview.

This command is READ-ONLY. It reads all CSVs from --csv-dir, runs the
normalization rules, and emits three review artifacts to --output-dir:

  * normalization_trace.csv — every raw_fullname → normalized_fullname mapping
  * template_preview.csv    — grouped catalog.Product templates (Task 7)
  * invalid_rows.csv        — quarantined rows with reason codes (Task 8)

The DB is NEVER touched. Iterate normalization rules by editing
_legacy_import_helpers.py and re-running this command until the preview
CSVs look right.
"""
import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from catalog.management.commands._legacy_import_helpers import (
    iter_legacy_csv_rows,
    normalize_fullname,
)


class Command(BaseCommand):
    help = (
        'Stage 1 of legacy product migration: profile raw CSVs and emit '
        'review artifacts (read-only, no DB writes).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-dir',
            required=True,
            help='Directory containing raw_prods*.csv files',
        )
        parser.add_argument(
            '--output-dir',
            required=True,
            help='Directory to write the three review CSVs into',
        )

    def handle(self, *args, **options):
        csv_dir = Path(options['csv_dir'])
        output_dir = Path(options['output_dir'])

        if not csv_dir.is_dir():
            raise CommandError(f'csv_dir does not exist: {csv_dir}')
        output_dir.mkdir(parents=True, exist_ok=True)

        csv_paths = sorted(csv_dir.glob('*.csv'))
        self.stdout.write(f'Found {len(csv_paths)} CSV files in {csv_dir}')

        self._write_normalization_trace(csv_paths, output_dir)

    def _write_normalization_trace(self, csv_paths, output_dir):
        out_path = output_dir / 'normalization_trace.csv'
        with open(out_path, 'w', newline='', encoding='utf-8') as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    'source_file',
                    'source_line',
                    'raw_fullname',
                    'normalized_fullname',
                ],
            )
            writer.writeheader()
            count = 0
            for row in iter_legacy_csv_rows(csv_paths):
                writer.writerow({
                    'source_file': row.source_file,
                    'source_line': row.source_line,
                    'raw_fullname': row.raw_fullname,
                    'normalized_fullname': normalize_fullname(row.raw_fullname),
                })
                count += 1
        self.stdout.write(
            self.style.SUCCESS(
                f'  Wrote {count} trace rows to {out_path.name}'
            )
        )
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `python manage.py test catalog.tests.test_profile_legacy_products --keepdb -v 2`

Expected: 2 tests pass.

- [ ] **Step 8: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/catalog/management/commands/profile_legacy_products.py \
        backend/django_Admin3/catalog/tests/test_profile_legacy_products.py \
        backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/mini_2026.csv \
        backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/mini_invalid.csv \
        backend/django_Admin3/catalog/tests/fixtures_legacy_csvs/mini_collisions.csv
git commit -m "chore(catalog): add profile_legacy_products Stage 1 command skeleton"
```

---

### Task 6: Add `template_preview.csv` output with grouped templates

**Files:**
- Modify: `backend/django_Admin3/catalog/management/commands/profile_legacy_products.py`
- Modify: `backend/django_Admin3/catalog/tests/test_profile_legacy_products.py`

**Context:** Group rows by `TemplateKey`, aggregate the metadata, write `template_preview.csv`. This file is the main Stage 1 artifact for human review.

- [ ] **Step 1: Write the failing tests**

Append to `backend/django_Admin3/catalog/tests/test_profile_legacy_products.py`:

```python
from collections import Counter


class TestProfileLegacyProductsTemplatePreview(ProfileLegacyProductsTestBase):
    def _load_template_preview(self) -> list[dict]:
        preview_path = self.output_dir / 'template_preview.csv'
        self.assertTrue(preview_path.exists(), 'template_preview.csv was not created')
        with open(preview_path, newline='') as fh:
            return list(csv.DictReader(fh))

    def test_preview_has_expected_columns(self):
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        rows = self._load_template_preview()
        self.assertGreater(len(rows), 0)
        expected_cols = {
            'template_code',
            'canonical_fullname',
            'canonical_shortname',
            'raw_fullname_samples',
            'used_variations',
            'row_count',
            'distinct_subjects',
            'distinct_sessions',
        }
        self.assertEqual(set(rows[0].keys()), expected_cols)

    def test_course_notes_grouped_across_variations(self):
        """CM1 Course Notes appears as P and C in mini_2026.csv,
        plus CB1 Course Notes as P → all three rows share one template
        with used_variations = "C,P" and row_count = 3."""
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        rows = self._load_template_preview()
        course_notes = [
            r for r in rows
            if r['template_code'] == 'N'
            and r['canonical_fullname'] == 'Course Notes'
        ]
        self.assertEqual(len(course_notes), 1, f'Expected 1 N+Course Notes template, got {len(course_notes)}')
        template = course_notes[0]
        self.assertEqual(int(template['row_count']), 3)
        variations = set(template['used_variations'].split(','))
        self.assertEqual(variations, {'P', 'C'})
        subjects = int(template['distinct_subjects'])
        self.assertEqual(subjects, 2)  # CM1 + CB1
        self.assertEqual(int(template['distinct_sessions']), 1)  # just 26

    def test_aset_normalization_collapses_variants(self):
        """'ASET (2014-2017 Papers)' normalizes to 'ASET' → one template."""
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        rows = self._load_template_preview()
        asets = [r for r in rows if r['template_code'] == 'EX']
        self.assertEqual(len(asets), 1)
        self.assertEqual(asets[0]['canonical_fullname'], 'ASET')

    def test_preview_sorted_deterministically(self):
        """Rows must be sorted by (template_code, canonical_fullname)
        so preview diffs are reviewable."""
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        rows = self._load_template_preview()
        keys = [(r['template_code'], r['canonical_fullname']) for r in rows]
        self.assertEqual(keys, sorted(keys))
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python manage.py test catalog.tests.test_profile_legacy_products.TestProfileLegacyProductsTemplatePreview --keepdb -v 2`

Expected: `FileNotFoundError` for `template_preview.csv`.

- [ ] **Step 3: Implement template grouping and preview output**

Replace the `handle` method in `backend/django_Admin3/catalog/management/commands/profile_legacy_products.py`:

```python
from collections import Counter, defaultdict

from catalog.management.commands._legacy_import_helpers import (
    LegacyRow,
    TemplateKey,
    build_template_key,
    classify_row,
    iter_legacy_csv_rows,
    normalize_fullname,
)


class Command(BaseCommand):
    help = (
        'Stage 1 of legacy product migration: profile raw CSVs and emit '
        'review artifacts (read-only, no DB writes).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-dir',
            required=True,
            help='Directory containing raw_prods*.csv files',
        )
        parser.add_argument(
            '--output-dir',
            required=True,
            help='Directory to write the three review CSVs into',
        )

    def handle(self, *args, **options):
        csv_dir = Path(options['csv_dir'])
        output_dir = Path(options['output_dir'])

        if not csv_dir.is_dir():
            raise CommandError(f'csv_dir does not exist: {csv_dir}')
        output_dir.mkdir(parents=True, exist_ok=True)

        csv_paths = sorted(csv_dir.glob('*.csv'))
        self.stdout.write(f'Found {len(csv_paths)} CSV files in {csv_dir}')

        # Single pass: write trace + collect valid rows for grouping
        valid_rows: list[LegacyRow] = []
        self._write_normalization_trace(csv_paths, output_dir, valid_rows)
        self._write_template_preview(valid_rows, output_dir)

    def _write_normalization_trace(self, csv_paths, output_dir, valid_rows_out):
        out_path = output_dir / 'normalization_trace.csv'
        count = 0
        with open(out_path, 'w', newline='', encoding='utf-8') as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    'source_file',
                    'source_line',
                    'raw_fullname',
                    'normalized_fullname',
                ],
            )
            writer.writeheader()
            for row in iter_legacy_csv_rows(csv_paths):
                writer.writerow({
                    'source_file': row.source_file,
                    'source_line': row.source_line,
                    'raw_fullname': row.raw_fullname,
                    'normalized_fullname': normalize_fullname(row.raw_fullname),
                })
                count += 1
                # Skip CSV-invalid rows from the template grouping set,
                # but still trace them.
                if classify_row(row) is None:
                    valid_rows_out.append(row)
        self.stdout.write(
            self.style.SUCCESS(
                f'  Wrote {count} trace rows to {out_path.name}'
            )
        )

    def _write_template_preview(self, valid_rows, output_dir):
        # Group by TemplateKey
        groups: dict[TemplateKey, list[LegacyRow]] = defaultdict(list)
        for row in valid_rows:
            groups[build_template_key(row)].append(row)

        out_path = output_dir / 'template_preview.csv'
        with open(out_path, 'w', newline='', encoding='utf-8') as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    'template_code',
                    'canonical_fullname',
                    'canonical_shortname',
                    'raw_fullname_samples',
                    'used_variations',
                    'row_count',
                    'distinct_subjects',
                    'distinct_sessions',
                ],
            )
            writer.writeheader()

            sorted_keys = sorted(groups.keys(), key=lambda k: (k.code, k.fullname))
            for key in sorted_keys:
                rows_for_key = groups[key]
                shortname_counts = Counter(r.raw_shortname for r in rows_for_key)
                canonical_shortname = shortname_counts.most_common(1)[0][0]

                raw_fullnames = sorted({r.raw_fullname for r in rows_for_key})
                # Keep samples small so the CSV stays readable
                samples = '; '.join(raw_fullnames[:5])

                used_variations = ','.join(
                    sorted({r.col2 for r in rows_for_key})
                )
                distinct_subjects = len({r.subject for r in rows_for_key})
                distinct_sessions = len({r.session for r in rows_for_key})

                writer.writerow({
                    'template_code': key.code,
                    'canonical_fullname': key.fullname,
                    'canonical_shortname': canonical_shortname,
                    'raw_fullname_samples': samples,
                    'used_variations': used_variations,
                    'row_count': len(rows_for_key),
                    'distinct_subjects': distinct_subjects,
                    'distinct_sessions': distinct_sessions,
                })

        self.stdout.write(
            self.style.SUCCESS(
                f'  Wrote {len(groups)} templates to {out_path.name}'
            )
        )
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python manage.py test catalog.tests.test_profile_legacy_products --keepdb -v 2`

Expected: all Stage 1 tests pass (both skeleton and template preview).

- [ ] **Step 5: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/catalog/management/commands/profile_legacy_products.py \
        backend/django_Admin3/catalog/tests/test_profile_legacy_products.py
git commit -m "chore(catalog): add template_preview.csv output to profile command"
```

---

### Task 7: Add `invalid_rows.csv` with collision detection

**Files:**
- Modify: `backend/django_Admin3/catalog/management/commands/profile_legacy_products.py`
- Modify: `backend/django_Admin3/catalog/tests/test_profile_legacy_products.py`

**Context:** Emit `invalid_rows.csv` with three reason categories: CSV-only invalids (wildcard, col2=E), and `product_code_collision` when two rows in the same `(subject, col2, col3, session)` tuple resolve to different template keys.

- [ ] **Step 1: Write the failing tests**

Append to `backend/django_Admin3/catalog/tests/test_profile_legacy_products.py`:

```python
class TestProfileLegacyProductsInvalidRows(ProfileLegacyProductsTestBase):
    def _load_invalid_rows(self) -> list[dict]:
        path = self.output_dir / 'invalid_rows.csv'
        self.assertTrue(path.exists(), 'invalid_rows.csv was not created')
        with open(path, newline='') as fh:
            return list(csv.DictReader(fh))

    def test_invalid_rows_has_expected_columns(self):
        self.copy_fixture('mini_invalid.csv')
        self.run_command()
        rows = self._load_invalid_rows()
        self.assertGreater(len(rows), 0)
        expected = {'source_file', 'source_line', 'reason', 'raw_row', 'notes'}
        self.assertEqual(set(rows[0].keys()), expected)

    def test_wildcard_subject_quarantined(self):
        self.copy_fixture('mini_invalid.csv')
        self.run_command()
        reasons = [r['reason'] for r in self._load_invalid_rows()]
        self.assertIn('wildcard_subject', reasons)

    def test_col2_e_quarantined(self):
        self.copy_fixture('mini_invalid.csv')
        self.run_command()
        reasons = [r['reason'] for r in self._load_invalid_rows()]
        self.assertIn('unknown_col2', reasons)

    def test_collision_detected(self):
        self.copy_fixture('mini_collisions.csv')
        self.run_command()
        invalid = self._load_invalid_rows()
        collisions = [r for r in invalid if r['reason'] == 'product_code_collision']
        self.assertEqual(len(collisions), 2, f'Expected 2 collision rows, got: {invalid}')

    def test_collision_rows_excluded_from_preview(self):
        """Collided rows must NOT appear as templates."""
        self.copy_fixture('mini_collisions.csv')
        self.run_command()
        preview_path = self.output_dir / 'template_preview.csv'
        with open(preview_path, newline='') as fh:
            templates = list(csv.DictReader(fh))
        # Both collision rows share template_code='M' but different fullnames;
        # neither should be in the preview.
        m_templates = [t for t in templates if t['template_code'] == 'M']
        self.assertEqual(m_templates, [])

    def test_raw_row_preserved_verbatim(self):
        self.copy_fixture('mini_invalid.csv')
        self.run_command()
        rows = self._load_invalid_rows()
        wildcards = [r for r in rows if r['reason'] == 'wildcard_subject']
        self.assertEqual(len(wildcards), 1)
        self.assertIn('*,M,V,26', wildcards[0]['raw_row'])

    def test_normal_csv_produces_empty_invalid_file(self):
        """When input has zero invalid rows, the file should still be created
        (with just a header) — so Stage 3 can append to it."""
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        rows = self._load_invalid_rows()
        self.assertEqual(rows, [])
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python manage.py test catalog.tests.test_profile_legacy_products.TestProfileLegacyProductsInvalidRows --keepdb -v 2`

Expected: `FileNotFoundError` for `invalid_rows.csv`.

- [ ] **Step 3: Implement invalid rows output and collision detection**

Replace the `handle` method and add new methods in `backend/django_Admin3/catalog/management/commands/profile_legacy_products.py`:

```python
    INVALID_ROWS_FIELDNAMES = [
        'source_file',
        'source_line',
        'reason',
        'raw_row',
        'notes',
    ]

    def handle(self, *args, **options):
        csv_dir = Path(options['csv_dir'])
        output_dir = Path(options['output_dir'])

        if not csv_dir.is_dir():
            raise CommandError(f'csv_dir does not exist: {csv_dir}')
        output_dir.mkdir(parents=True, exist_ok=True)

        csv_paths = sorted(csv_dir.glob('*.csv'))
        self.stdout.write(f'Found {len(csv_paths)} CSV files in {csv_dir}')

        # Initialize invalid_rows.csv with header (always created,
        # so Stage 3 can append to it later).
        invalid_path = output_dir / 'invalid_rows.csv'
        with open(invalid_path, 'w', newline='', encoding='utf-8') as fh:
            csv.DictWriter(
                fh, fieldnames=self.INVALID_ROWS_FIELDNAMES
            ).writeheader()

        # Pass 1: trace + classify + collect valid rows
        valid_rows: list[LegacyRow] = []
        invalid_records: list[dict] = []
        self._pass_one(csv_paths, output_dir, valid_rows, invalid_records)

        # Pass 2: detect collisions among valid rows (same subject+col2+col3+session
        # but different TemplateKey).
        non_colliding = self._detect_collisions(valid_rows, invalid_records)

        # Append invalid records now that we have everything
        with open(invalid_path, 'a', newline='', encoding='utf-8') as fh:
            writer = csv.DictWriter(
                fh, fieldnames=self.INVALID_ROWS_FIELDNAMES
            )
            for rec in invalid_records:
                writer.writerow(rec)

        # Pass 3: write template preview from non-colliding rows only
        self._write_template_preview(non_colliding, output_dir)

        self.stdout.write(
            self.style.SUCCESS(
                f'\nStage 1 complete: {len(non_colliding)} valid rows, '
                f'{len(invalid_records)} quarantined to {invalid_path.name}'
            )
        )

    def _pass_one(self, csv_paths, output_dir, valid_rows_out, invalid_records_out):
        trace_path = output_dir / 'normalization_trace.csv'
        count = 0
        with open(trace_path, 'w', newline='', encoding='utf-8') as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    'source_file',
                    'source_line',
                    'raw_fullname',
                    'normalized_fullname',
                ],
            )
            writer.writeheader()
            for row in iter_legacy_csv_rows(csv_paths):
                writer.writerow({
                    'source_file': row.source_file,
                    'source_line': row.source_line,
                    'raw_fullname': row.raw_fullname,
                    'normalized_fullname': normalize_fullname(row.raw_fullname),
                })
                count += 1

                reason = classify_row(row)
                if reason is not None:
                    invalid_records_out.append({
                        'source_file': row.source_file,
                        'source_line': row.source_line,
                        'reason': reason,
                        'raw_row': ','.join([
                            row.subject, row.col2, row.col3, row.session,
                            row.full_code, row.raw_fullname, row.raw_shortname,
                        ]),
                        'notes': '',
                    })
                else:
                    valid_rows_out.append(row)
        self.stdout.write(
            self.style.SUCCESS(
                f'  Wrote {count} trace rows to {trace_path.name}'
            )
        )

    def _detect_collisions(
        self,
        valid_rows: list[LegacyRow],
        invalid_records_out: list[dict],
    ) -> list[LegacyRow]:
        """Detect rows that share (subject, col2, col3, session) but resolve
        to different template keys.

        Such rows would generate duplicate store.Product.product_code values
        at Stage 3 save time. Quarantine them here before templates are written.
        """
        groups: dict[tuple, list[LegacyRow]] = defaultdict(list)
        for row in valid_rows:
            key = (row.subject, row.col2, row.col3, row.session)
            groups[key].append(row)

        non_colliding: list[LegacyRow] = []
        for group_key, rows in groups.items():
            template_keys = {build_template_key(r) for r in rows}
            if len(template_keys) > 1:
                # Collision — quarantine every row in the group
                for r in rows:
                    invalid_records_out.append({
                        'source_file': r.source_file,
                        'source_line': r.source_line,
                        'reason': 'product_code_collision',
                        'raw_row': ','.join([
                            r.subject, r.col2, r.col3, r.session,
                            r.full_code, r.raw_fullname, r.raw_shortname,
                        ]),
                        'notes': (
                            f'{len(template_keys)} distinct templates for '
                            f'tuple={group_key}'
                        ),
                    })
            else:
                non_colliding.extend(rows)

        return non_colliding
```

Also remove the old `_write_normalization_trace` method (it's now inlined in `_pass_one`).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python manage.py test catalog.tests.test_profile_legacy_products --keepdb -v 2`

Expected: all Stage 1 tests pass.

- [ ] **Step 5: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/catalog/management/commands/profile_legacy_products.py \
        backend/django_Admin3/catalog/tests/test_profile_legacy_products.py
git commit -m "chore(catalog): add invalid_rows and collision detection to profile command"
```

---

## Phase C — Stage 2: Template import command

### Task 8: Create `import_legacy_templates` command — seed `ProductVariation` rows

**Files:**
- Create: `backend/django_Admin3/catalog/management/commands/import_legacy_templates.py`
- Create: `backend/django_Admin3/catalog/tests/test_import_legacy_templates.py`

**Context:** Stage 2 requires `catalog.ProductVariation` to exist with codes `P`, `C`, `M`, `T`. This first sub-task creates the command and implements variation seeding. Template + PPV insertion is Task 9.

- [ ] **Step 1: Write the failing test**

File: `backend/django_Admin3/catalog/tests/test_import_legacy_templates.py`

```python
"""Tests for the import_legacy_templates Stage 2 management command."""
import csv
import shutil
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from catalog.products.models import Product, ProductVariation, ProductProductVariation


class ImportLegacyTemplatesTestBase(TestCase):
    """Stage 2 writes to catalog_* tables, so we need TestCase (not SimpleTestCase)."""

    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.preview_path = self.tmpdir / 'template_preview.csv'

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def write_preview(self, templates: list[dict]):
        fieldnames = [
            'template_code',
            'canonical_fullname',
            'canonical_shortname',
            'raw_fullname_samples',
            'used_variations',
            'row_count',
            'distinct_subjects',
            'distinct_sessions',
        ]
        with open(self.preview_path, 'w', newline='', encoding='utf-8') as fh:
            writer = csv.DictWriter(fh, fieldnames=fieldnames)
            writer.writeheader()
            for t in templates:
                writer.writerow(t)

    def run_command(self):
        call_command(
            'import_legacy_templates',
            preview_csv=str(self.preview_path),
        )


class TestImportLegacyTemplatesVariationSeed(ImportLegacyTemplatesTestBase):
    def test_four_variations_created(self):
        self.write_preview([])  # empty preview is allowed
        self.run_command()
        self.assertEqual(ProductVariation.objects.count(), 4)

    def test_variation_codes_are_PCMT(self):
        self.write_preview([])
        self.run_command()
        codes = set(ProductVariation.objects.values_list('code', flat=True))
        self.assertEqual(codes, {'P', 'C', 'M', 'T'})

    def test_variation_types_correct(self):
        self.write_preview([])
        self.run_command()
        expected = {
            'P': 'Printed',
            'C': 'eBook',
            'M': 'Marking',
            'T': 'Tutorial',
        }
        for code, var_type in expected.items():
            pv = ProductVariation.objects.get(code=code)
            self.assertEqual(pv.variation_type, var_type, f'code {code}')

    def test_variation_seed_is_idempotent(self):
        self.write_preview([])
        self.run_command()
        self.run_command()  # second run
        self.assertEqual(ProductVariation.objects.count(), 4)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python manage.py test catalog.tests.test_import_legacy_templates --keepdb -v 2`

Expected: `CommandError: Unknown command: 'import_legacy_templates'`.

- [ ] **Step 3: Implement the Stage 2 command with variation seeding only**

File: `backend/django_Admin3/catalog/management/commands/import_legacy_templates.py`

```python
"""Stage 2 of the legacy product migration: import templates.

Reads the reviewed template_preview.csv (produced by Stage 1) and writes:
  * catalog_product_variations (4 fixed rows: P, C, M, T)
  * catalog_products (one row per preview template)
  * catalog_product_product_variations (one row per template × used variation)

Wrapped in a single transaction. Idempotent — re-runs compare on natural
keys before inserting.
"""
import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.products.models import (
    Product,
    ProductProductVariation,
    ProductVariation,
)


# Fixed variation seed — matches col2 codes in the legacy CSVs
VARIATION_SEED = [
    {'variation_type': 'Printed',  'name': 'Printed',  'code': 'P',
     'description': 'Physical printed materials'},
    {'variation_type': 'eBook',    'name': 'eBook',    'code': 'C',
     'description': 'Digital eBook (and legacy CD-ROM)'},
    {'variation_type': 'Marking',  'name': 'Marking',  'code': 'M',
     'description': 'Marking services'},
    {'variation_type': 'Tutorial', 'name': 'Tutorial', 'code': 'T',
     'description': 'Live tutorial sessions'},
]


class Command(BaseCommand):
    help = (
        'Stage 2 of legacy product migration: seed ProductVariations and '
        'import templates + PPVs from a reviewed template_preview.csv.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--preview-csv',
            required=True,
            help='Path to the reviewed template_preview.csv from Stage 1',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        preview_path = Path(options['preview_csv'])
        if not preview_path.exists():
            raise CommandError(f'preview_csv does not exist: {preview_path}')

        self._seed_variations()
        self.stdout.write(self.style.SUCCESS('Stage 2 complete.'))

    def _seed_variations(self):
        created = 0
        for spec in VARIATION_SEED:
            _, was_created = ProductVariation.objects.get_or_create(
                variation_type=spec['variation_type'],
                name=spec['name'],
                defaults={
                    'code': spec['code'],
                    'description': spec['description'],
                },
            )
            if was_created:
                created += 1
        self.stdout.write(
            f'  Seeded ProductVariations: {created} new, '
            f'{ProductVariation.objects.count()} total'
        )
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python manage.py test catalog.tests.test_import_legacy_templates.TestImportLegacyTemplatesVariationSeed --keepdb -v 2`

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/catalog/management/commands/import_legacy_templates.py \
        backend/django_Admin3/catalog/tests/test_import_legacy_templates.py
git commit -m "chore(catalog): add import_legacy_templates command with variation seed"
```

---

### Task 9: Add template + PPV creation from preview CSV

**Files:**
- Modify: `backend/django_Admin3/catalog/management/commands/import_legacy_templates.py`
- Modify: `backend/django_Admin3/catalog/tests/test_import_legacy_templates.py`

**Context:** Extend Stage 2 to read `template_preview.csv`, create one `catalog.Product` per row, and one `ProductProductVariation` per (template, variation) pair in the `used_variations` column.

- [ ] **Step 1: Write the failing tests**

Append to `backend/django_Admin3/catalog/tests/test_import_legacy_templates.py`:

```python
class TestImportLegacyTemplatesPreview(ImportLegacyTemplatesTestBase):
    def _preview_row(self, **overrides):
        defaults = dict(
            template_code='N',
            canonical_fullname='Course Notes',
            canonical_shortname='Course Notes',
            raw_fullname_samples='Course Notes; Course Notes eBook',
            used_variations='P,C',
            row_count='10',
            distinct_subjects='5',
            distinct_sessions='3',
        )
        defaults.update(overrides)
        return defaults

    def test_single_template_creates_one_product(self):
        self.write_preview([self._preview_row()])
        self.run_command()
        self.assertEqual(Product.objects.count(), 1)
        product = Product.objects.first()
        self.assertEqual(product.code, 'N')
        self.assertEqual(product.fullname, 'Course Notes')
        self.assertEqual(product.shortname, 'Course Notes')
        self.assertTrue(product.is_active)
        self.assertFalse(product.buy_both)

    def test_used_variations_creates_ppvs(self):
        self.write_preview([self._preview_row(used_variations='P,C')])
        self.run_command()
        product = Product.objects.get(code='N')
        ppvs = ProductProductVariation.objects.filter(product=product)
        self.assertEqual(ppvs.count(), 2)
        variation_codes = set(
            ppvs.values_list('product_variation__code', flat=True)
        )
        self.assertEqual(variation_codes, {'P', 'C'})

    def test_single_variation_creates_one_ppv(self):
        self.write_preview([self._preview_row(used_variations='T')])
        self.run_command()
        self.assertEqual(ProductProductVariation.objects.count(), 1)
        ppv = ProductProductVariation.objects.first()
        self.assertEqual(ppv.product_variation.code, 'T')

    def test_multiple_templates_same_code(self):
        """catalog.Product.code is NOT unique — two templates with code='M'
        but different fullnames must both be created."""
        self.write_preview([
            self._preview_row(
                template_code='M',
                canonical_fullname='Mock Exam',
                canonical_shortname='Mock',
                used_variations='P',
            ),
            self._preview_row(
                template_code='M',
                canonical_fullname='Marked Assignment Project',
                canonical_shortname='MAP',
                used_variations='M',
            ),
        ])
        self.run_command()
        self.assertEqual(Product.objects.filter(code='M').count(), 2)

    def test_empty_used_variations_raises(self):
        self.write_preview([self._preview_row(used_variations='')])
        with self.assertRaises(Exception) as cm:
            self.run_command()
        self.assertIn('used_variations', str(cm.exception).lower())

    def test_idempotent_on_rerun(self):
        rows = [
            self._preview_row(),
            self._preview_row(
                template_code='C',
                canonical_fullname='Combined Materials Pack',
                canonical_shortname='CMP',
                used_variations='P,C',
            ),
        ]
        self.write_preview(rows)
        self.run_command()
        product_count_after_first = Product.objects.count()
        ppv_count_after_first = ProductProductVariation.objects.count()
        self.run_command()
        self.assertEqual(Product.objects.count(), product_count_after_first)
        self.assertEqual(
            ProductProductVariation.objects.count(),
            ppv_count_after_first,
        )
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python manage.py test catalog.tests.test_import_legacy_templates.TestImportLegacyTemplatesPreview --keepdb -v 2`

Expected: failures because templates aren't created yet.

- [ ] **Step 3: Extend the command to read preview CSV and create templates + PPVs**

Replace the `handle` method in `backend/django_Admin3/catalog/management/commands/import_legacy_templates.py`:

```python
    @transaction.atomic
    def handle(self, *args, **options):
        preview_path = Path(options['preview_csv'])
        if not preview_path.exists():
            raise CommandError(f'preview_csv does not exist: {preview_path}')

        self._seed_variations()

        # Reload after seed — use code as key
        variation_by_code = {
            pv.code: pv for pv in ProductVariation.objects.filter(
                code__in=['P', 'C', 'M', 'T']
            )
        }

        created_products = 0
        created_ppvs = 0
        with open(preview_path, 'r', encoding='utf-8', newline='') as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                used_variations = row['used_variations'].strip()
                if not used_variations:
                    raise CommandError(
                        f'Template {row["template_code"]}/'
                        f'{row["canonical_fullname"]} has empty used_variations '
                        f'column. Fix the preview CSV before retrying.'
                    )

                product, product_was_created = Product.objects.get_or_create(
                    code=row['template_code'],
                    fullname=row['canonical_fullname'],
                    defaults={
                        'shortname': row['canonical_shortname'],
                        'description': None,
                        'is_active': True,
                        'buy_both': False,
                    },
                )
                if product_was_created:
                    created_products += 1

                for var_code in [c.strip() for c in used_variations.split(',')]:
                    if var_code not in variation_by_code:
                        raise CommandError(
                            f'Template {row["template_code"]}/'
                            f'{row["canonical_fullname"]} references unknown '
                            f'variation code "{var_code}"'
                        )
                    _, ppv_was_created = ProductProductVariation.objects.get_or_create(
                        product=product,
                        product_variation=variation_by_code[var_code],
                    )
                    if ppv_was_created:
                        created_ppvs += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'  Created {created_products} new products, '
                f'{created_ppvs} new PPVs'
            )
        )
        self.stdout.write(self.style.SUCCESS('Stage 2 complete.'))
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python manage.py test catalog.tests.test_import_legacy_templates --keepdb -v 2`

Expected: all Stage 2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/catalog/management/commands/import_legacy_templates.py \
        backend/django_Admin3/catalog/tests/test_import_legacy_templates.py
git commit -m "chore(catalog): add template + PPV import from preview CSV"
```

---

## Phase D — Schema migration for `store.Product.legacy_product_name`

### Task 10: Add `legacy_product_name` field to `store.Product` model

**Files:**
- Modify: `backend/django_Admin3/store/models/product.py:46`
- Create: `backend/django_Admin3/store/migrations/0004_add_legacy_product_name.py`

**Context:** Add a nullable `TEXT` field to `store.Product` to preserve the original raw CSV fullname per row. The existing table is empty, so no backfill is needed.

- [ ] **Step 1: Add the field to the model**

Modify `backend/django_Admin3/store/models/product.py`. Find this section (around line 42-47):

```python
    is_active = models.BooleanField(
        default=True,
        help_text='Whether product is available for purchase'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

Insert the `legacy_product_name` field just before `created_at`:

```python
    is_active = models.BooleanField(
        default=True,
        help_text='Whether product is available for purchase'
    )
    legacy_product_name = models.TextField(
        blank=True,
        null=True,
        help_text='Original CSV fullname / free-form historical notes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

- [ ] **Step 2: Generate the migration**

Run: `python manage.py makemigrations store`

Expected output mentions `0004_product_legacy_product_name` or similar. Open the generated file and verify it contains one `AddField` operation for `legacy_product_name`.

- [ ] **Step 3: Apply the migration**

Run: `python manage.py migrate store`

Expected: migration applies cleanly.

- [ ] **Step 4: Verify the column exists**

Run:
```bash
python manage.py dbshell -- -c '\d "acted"."products"'
```

Expected: the `legacy_product_name` column appears in the table description as `text` nullable.

- [ ] **Step 5: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/store/models/product.py \
        backend/django_Admin3/store/migrations/0004_*.py
git commit -m "feat(store): add legacy_product_name field to Product for legacy import history"
```

---

## Phase E — Stage 3: Store product import command

### Task 11: Create `import_legacy_store_products` command with preloaded lookups

**Files:**
- Create: `backend/django_Admin3/catalog/management/commands/import_legacy_store_products.py`
- Create: `backend/django_Admin3/catalog/tests/test_import_legacy_store_products.py`

**Context:** Stage 3 creates `store.Product` rows by joining raw CSV rows to `ExamSessionSubject` and `ProductProductVariation`. To avoid N×4 queries for 37k rows, it preloads four lookup dictionaries up front. This task creates the command skeleton and verifies preloading works on a small fixture.

- [ ] **Step 1: Write the failing test**

File: `backend/django_Admin3/catalog/tests/test_import_legacy_store_products.py`

```python
"""Tests for the import_legacy_store_products Stage 3 management command."""
import csv
import shutil
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from catalog.models import (
    ExamSession,
    ExamSessionSubject,
    Product,
    ProductProductVariation,
    ProductVariation,
    Subject,
)
from store.models.product import Product as StoreProduct


FIXTURES_DIR = Path(__file__).parent / 'fixtures_legacy_csvs'


class ImportLegacyStoreProductsTestBase(TestCase):
    """Stage 3 depends on DB state from Stages 1-2 — set it up manually here."""

    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.csv_dir = self.tmpdir / 'csvs'
        self.csv_dir.mkdir()
        self.review_dir = self.tmpdir / 'review'
        self.review_dir.mkdir()
        # Pre-create invalid_rows.csv with header so Stage 3 can append
        with open(self.review_dir / 'invalid_rows.csv', 'w', newline='') as fh:
            csv.DictWriter(fh, fieldnames=[
                'source_file', 'source_line', 'reason', 'raw_row', 'notes',
            ]).writeheader()

        # Variations
        self.pv_printed = ProductVariation.objects.create(
            variation_type='Printed', name='Printed', code='P',
        )
        self.pv_ebook = ProductVariation.objects.create(
            variation_type='eBook', name='eBook', code='C',
        )
        self.pv_marking = ProductVariation.objects.create(
            variation_type='Marking', name='Marking', code='M',
        )
        self.pv_tutorial = ProductVariation.objects.create(
            variation_type='Tutorial', name='Tutorial', code='T',
        )

        # Catalog templates (as if Stage 2 ran)
        from django.utils import timezone
        from datetime import timedelta
        self.subject_cm1 = Subject.objects.create(code='CM1', active=True)
        self.subject_cb1 = Subject.objects.create(code='CB1', active=True)
        now = timezone.now()
        self.session_26 = ExamSession.objects.create(
            session_code='26', start_date=now, end_date=now + timedelta(days=30),
        )
        self.session_25 = ExamSession.objects.create(
            session_code='25', start_date=now - timedelta(days=365),
            end_date=now - timedelta(days=335),
        )
        self.ess_cm1_26 = ExamSessionSubject.objects.create(
            exam_session=self.session_26, subject=self.subject_cm1,
        )
        self.ess_cb1_26 = ExamSessionSubject.objects.create(
            exam_session=self.session_26, subject=self.subject_cb1,
        )
        self.ess_cm1_25 = ExamSessionSubject.objects.create(
            exam_session=self.session_25, subject=self.subject_cm1,
        )

        self.prod_notes = Product.objects.create(
            code='N', fullname='Course Notes', shortname='Course Notes',
            is_active=True,
        )
        self.prod_combined = Product.objects.create(
            code='C', fullname='Combined Materials Pack', shortname='CMP',
            is_active=True,
        )
        self.prod_aset = Product.objects.create(
            code='EX', fullname='ASET', shortname='ASET',
            is_active=True,
        )
        self.prod_series_x = Product.objects.create(
            code='X', fullname='Series X Assignments', shortname='X',
            is_active=True,
        )
        self.prod_tut_f = Product.objects.create(
            code='F', fullname='Tutorial - face-to-face', shortname='Tutorial F2F',
            is_active=True,
        )

        # PPVs — one per (template, variation) pair used in fixtures
        self.ppv_notes_printed = ProductProductVariation.objects.create(
            product=self.prod_notes, product_variation=self.pv_printed,
        )
        self.ppv_notes_ebook = ProductProductVariation.objects.create(
            product=self.prod_notes, product_variation=self.pv_ebook,
        )
        self.ppv_combined_printed = ProductProductVariation.objects.create(
            product=self.prod_combined, product_variation=self.pv_printed,
        )
        self.ppv_combined_ebook = ProductProductVariation.objects.create(
            product=self.prod_combined, product_variation=self.pv_ebook,
        )
        self.ppv_aset_printed = ProductProductVariation.objects.create(
            product=self.prod_aset, product_variation=self.pv_printed,
        )
        self.ppv_series_marking = ProductProductVariation.objects.create(
            product=self.prod_series_x, product_variation=self.pv_marking,
        )
        self.ppv_tut_tutorial = ProductProductVariation.objects.create(
            product=self.prod_tut_f, product_variation=self.pv_tutorial,
        )

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def copy_fixture(self, name: str):
        shutil.copy(FIXTURES_DIR / name, self.csv_dir / name)

    def run_command(self):
        call_command(
            'import_legacy_store_products',
            csv_dir=str(self.csv_dir),
            output_dir=str(self.review_dir),
        )


class TestImportLegacyStoreProductsSkeleton(ImportLegacyStoreProductsTestBase):
    def test_command_runs_with_empty_csv_dir(self):
        self.run_command()
        self.assertEqual(StoreProduct.objects.count(), 0)

    def test_imports_mini_2026(self):
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        # mini_2026.csv has 8 rows → 8 store.Product rows
        self.assertEqual(StoreProduct.objects.count(), 8)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python manage.py test catalog.tests.test_import_legacy_store_products --keepdb -v 2`

Expected: `CommandError: Unknown command: 'import_legacy_store_products'`.

- [ ] **Step 3: Implement the Stage 3 command skeleton**

File: `backend/django_Admin3/catalog/management/commands/import_legacy_store_products.py`

```python
"""Stage 3 of the legacy product migration: import store.Products.

Reads raw CSVs and creates one store.Product row per valid CSV row,
joining to ExamSessionSubject and ProductProductVariation via preloaded
lookup dictionaries.

Batched transactions (1000 rows each). Idempotent via a preloaded set of
existing (ESS_id, PPV_id) pairs. Invalid rows are appended to
invalid_rows.csv with a reason code.

is_active=True only for rows in sessions 26 and 26S. Everything else
gets is_active=False.
"""
import csv
from pathlib import Path
from typing import Iterable

from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction

from catalog.models import (
    ExamSession,
    ExamSessionSubject,
    ProductProductVariation,
    ProductVariation,
    Subject,
)
from catalog.management.commands._legacy_import_helpers import (
    LegacyRow,
    classify_row,
    iter_legacy_csv_rows,
    normalize_fullname,
)
from store.models.product import Product as StoreProduct


ACTIVE_SESSIONS = frozenset({'26', '26S'})
BATCH_SIZE = 1000

INVALID_ROWS_FIELDNAMES = [
    'source_file', 'source_line', 'reason', 'raw_row', 'notes',
]


class Command(BaseCommand):
    help = (
        'Stage 3 of legacy product migration: create store.Product rows '
        'from raw CSVs using preloaded catalog lookups.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-dir',
            required=True,
            help='Directory containing raw_prods*.csv files',
        )
        parser.add_argument(
            '--output-dir',
            required=True,
            help='Directory containing invalid_rows.csv (will be appended to)',
        )

    def handle(self, *args, **options):
        csv_dir = Path(options['csv_dir'])
        output_dir = Path(options['output_dir'])
        invalid_path = output_dir / 'invalid_rows.csv'

        if not csv_dir.is_dir():
            raise CommandError(f'csv_dir does not exist: {csv_dir}')
        if not invalid_path.exists():
            raise CommandError(
                f'invalid_rows.csv not found in {output_dir}. '
                f'Run profile_legacy_products first.'
            )

        # Preload lookups (one query each)
        lookups = self._preload_lookups()

        csv_paths = sorted(csv_dir.glob('*.csv'))
        self.stdout.write(f'Found {len(csv_paths)} CSV files in {csv_dir}')

        invalid_file = open(invalid_path, 'a', newline='', encoding='utf-8')
        invalid_writer = csv.DictWriter(
            invalid_file, fieldnames=INVALID_ROWS_FIELDNAMES
        )

        try:
            self._import_rows(csv_paths, lookups, invalid_writer)
        finally:
            invalid_file.close()

        self.stdout.write(self.style.SUCCESS('Stage 3 complete.'))

    def _preload_lookups(self) -> dict:
        subject_by_code = {
            s.code: s for s in Subject.objects.all()
        }
        session_by_code = {
            e.session_code: e for e in ExamSession.objects.all()
        }
        ess_by_pair = {
            (e.exam_session_id, e.subject_id): e
            for e in ExamSessionSubject.objects.all()
        }
        variation_by_col2 = {
            pv.code: pv
            for pv in ProductVariation.objects.filter(code__in=['P', 'C', 'M', 'T'])
        }
        ppv_by_triple = {
            (ppv.product.code, ppv.product.fullname, ppv.product_variation.code): ppv
            for ppv in ProductProductVariation.objects.select_related(
                'product', 'product_variation'
            )
        }
        existing_store_keys = set(
            StoreProduct.objects.values_list(
                'exam_session_subject_id', 'product_product_variation_id',
            )
        )
        return dict(
            subject_by_code=subject_by_code,
            session_by_code=session_by_code,
            ess_by_pair=ess_by_pair,
            variation_by_col2=variation_by_col2,
            ppv_by_triple=ppv_by_triple,
            existing_store_keys=existing_store_keys,
        )

    def _import_rows(
        self,
        csv_paths: Iterable[Path],
        lookups: dict,
        invalid_writer: csv.DictWriter,
    ):
        buffer: list[tuple[LegacyRow, StoreProduct]] = []
        total_created = 0
        total_skipped = 0

        for row in iter_legacy_csv_rows(csv_paths):
            outcome = self._build_store_product(row, lookups)
            if isinstance(outcome, str):
                # outcome is a reason string — quarantine
                self._write_invalid(invalid_writer, row, outcome)
                total_skipped += 1
                continue

            buffer.append((row, outcome))
            if len(buffer) >= BATCH_SIZE:
                total_created += self._flush_batch(
                    buffer, lookups, invalid_writer
                )
                buffer.clear()

        total_created += self._flush_batch(buffer, lookups, invalid_writer)
        buffer.clear()

        self.stdout.write(
            self.style.SUCCESS(
                f'  Created {total_created} store.Product rows, '
                f'{total_skipped} quarantined'
            )
        )

    def _build_store_product(self, row: LegacyRow, lookups: dict):
        """Return a built (unsaved) StoreProduct or a reason string."""
        reason = classify_row(row)
        if reason is not None:
            return reason

        session = lookups['session_by_code'].get(row.session)
        if session is None:
            return 'unknown_session'

        subject = lookups['subject_by_code'].get(row.subject)
        if subject is None:
            return 'unknown_subject'

        ess = lookups['ess_by_pair'].get((session.id, subject.id))
        if ess is None:
            return 'no_ess_for_subject_session'

        normalized = normalize_fullname(row.raw_fullname)
        ppv = lookups['ppv_by_triple'].get((row.col3, normalized, row.col2))
        if ppv is None:
            return 'no_ppv_match'

        is_active = row.session in ACTIVE_SESSIONS

        return StoreProduct(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='',  # generated in save()
            is_active=is_active,
            legacy_product_name=row.raw_fullname,
        )

    @transaction.atomic
    def _flush_batch(
        self,
        buffer: list[tuple[LegacyRow, StoreProduct]],
        lookups: dict,
        invalid_writer: csv.DictWriter,
    ) -> int:
        created = 0
        for row, product in buffer:
            key = (
                product.exam_session_subject_id,
                product.product_product_variation_id,
            )
            if key in lookups['existing_store_keys']:
                continue
            try:
                product.save()
                lookups['existing_store_keys'].add(key)
                created += 1
            except IntegrityError:
                self._write_invalid(
                    invalid_writer, row, 'product_code_duplicate_at_save'
                )
        return created

    def _write_invalid(
        self, writer: csv.DictWriter, row: LegacyRow, reason: str,
    ):
        writer.writerow({
            'source_file': row.source_file,
            'source_line': row.source_line,
            'reason': reason,
            'raw_row': ','.join([
                row.subject, row.col2, row.col3, row.session,
                row.full_code, row.raw_fullname, row.raw_shortname,
            ]),
            'notes': '',
        })
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python manage.py test catalog.tests.test_import_legacy_store_products.TestImportLegacyStoreProductsSkeleton --keepdb -v 2`

Expected: 2 tests pass (skeleton and mini_2026 import).

- [ ] **Step 5: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/catalog/management/commands/import_legacy_store_products.py \
        backend/django_Admin3/catalog/tests/test_import_legacy_store_products.py
git commit -m "chore(catalog): add import_legacy_store_products Stage 3 command"
```

---

### Task 12: Add tests for `is_active`, `legacy_product_name`, `product_code`, idempotency, and invalid row handling

**Files:**
- Modify: `backend/django_Admin3/catalog/tests/test_import_legacy_store_products.py`

**Context:** The Stage 3 command already implements all behaviors from Task 11, but only the happy path is tested. This task adds the remaining TDD assertions to lock in the nuanced behaviors.

- [ ] **Step 1: Write the additional tests**

Append to `backend/django_Admin3/catalog/tests/test_import_legacy_store_products.py`:

```python
class TestImportLegacyStoreProductsBehavior(ImportLegacyStoreProductsTestBase):
    def test_session_26_is_active(self):
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        products_26 = StoreProduct.objects.filter(
            exam_session_subject__exam_session__session_code='26'
        )
        self.assertEqual(products_26.count(), 8)
        for p in products_26:
            self.assertTrue(p.is_active, f'{p.product_code} should be active')

    def test_legacy_product_name_preserved_verbatim(self):
        """Test that the RAW fullname (including ' eBook' etc) is stored in legacy_product_name."""
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        cm1_ebook_notes = StoreProduct.objects.get(
            exam_session_subject=self.ess_cm1_26,
            product_product_variation=self.ppv_notes_ebook,
        )
        self.assertEqual(cm1_ebook_notes.legacy_product_name, 'Course Notes eBook')

    def test_product_code_generated(self):
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        cm1_printed_notes = StoreProduct.objects.get(
            exam_session_subject=self.ess_cm1_26,
            product_product_variation=self.ppv_notes_printed,
        )
        # Format: {subject}/{variation_code}{product_code}/{session}
        self.assertEqual(cm1_printed_notes.product_code, 'CM1/PN/26')

    def test_product_code_tutorial_has_pk_suffix(self):
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        tutorial = StoreProduct.objects.get(
            product_product_variation=self.ppv_tut_tutorial,
        )
        # Tutorial format: {subject}/{prefix}{product_code}{variation_code}/{session}-{pk}
        self.assertTrue(tutorial.product_code.startswith('CB1/TFT/26-'))
        self.assertTrue(tutorial.product_code.endswith(str(tutorial.pk)))

    def test_old_session_is_inactive(self):
        # Write a one-row CSV with session=25 (not in ACTIVE_SESSIONS)
        csv_file = self.csv_dir / 'old.csv'
        with open(csv_file, 'w', encoding='cp1252', newline='') as fh:
            csv.writer(fh).writerow([
                'CM1', 'P', 'N', '25', 'CM1/PN/25', 'Course Notes', 'Course Notes',
            ])
        self.run_command()
        old = StoreProduct.objects.get(
            exam_session_subject=self.ess_cm1_25,
        )
        self.assertFalse(old.is_active)

    def test_invalid_rows_written_to_review_csv(self):
        self.copy_fixture('mini_invalid.csv')
        self.run_command()
        with open(self.review_dir / 'invalid_rows.csv', newline='') as fh:
            invalid = list(csv.DictReader(fh))
        reasons = [r['reason'] for r in invalid]
        self.assertIn('wildcard_subject', reasons)
        self.assertIn('unknown_col2', reasons)
        self.assertIn('unknown_session', reasons)  # 95B
        self.assertIn('unknown_subject', reasons)  # ZZZZ
        # No store.Product rows from mini_invalid.csv should exist
        self.assertEqual(StoreProduct.objects.count(), 0)

    def test_rerun_is_idempotent(self):
        self.copy_fixture('mini_2026.csv')
        self.run_command()
        count_after_first = StoreProduct.objects.count()
        self.run_command()
        self.assertEqual(StoreProduct.objects.count(), count_after_first)

    def test_no_ppv_match_quarantined(self):
        """If Stage 2 didn't produce a PPV matching a CSV row's
        (col3, normalized, col2), it must be quarantined, not crashed on."""
        # Add a CSV row whose template doesn't exist in catalog
        csv_file = self.csv_dir / 'orphan.csv'
        with open(csv_file, 'w', encoding='cp1252', newline='') as fh:
            csv.writer(fh).writerow([
                'CM1', 'P', 'ZZZ', '26', 'CM1/PZZZ/26',
                'Nonexistent Template', 'Ghost',
            ])
        self.run_command()
        with open(self.review_dir / 'invalid_rows.csv', newline='') as fh:
            invalid = list(csv.DictReader(fh))
        reasons = [r['reason'] for r in invalid]
        self.assertIn('no_ppv_match', reasons)
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `python manage.py test catalog.tests.test_import_legacy_store_products --keepdb -v 2`

Expected: all tests pass. If any fail, the Stage 3 implementation in Task 11 needs adjustment (most likely in `_build_store_product`).

- [ ] **Step 3: Commit**

```bash
cd c:/Code/Admin3
git add backend/django_Admin3/catalog/tests/test_import_legacy_store_products.py
git commit -m "chore(catalog): add behavior tests for Stage 3 store product import"
```

---

## Phase F — End-to-end execution and review artifact commit

### Task 13: Run all three stages against real CSVs and commit review artifacts

**Files:**
- Create: `docs/misc/review/template_preview.csv` (generated)
- Create: `docs/misc/review/invalid_rows.csv` (generated)
- Create: `docs/misc/review/normalization_trace.csv` (generated)

**Context:** The three commands are now tested and working. This task runs them against the real CSVs, verifies expected row counts, and commits the generated review artifacts as audit records.

- [ ] **Step 1: Ensure the review output directory exists**

Run:
```bash
mkdir -p c:/Code/Admin3/docs/misc/review
```

- [ ] **Step 2: Run Stage 1 (profiling) against the real CSVs**

```bash
cd c:/Code/Admin3/backend/django_Admin3
python manage.py profile_legacy_products \
    --csv-dir c:/Code/Admin3/docs/misc \
    --output-dir c:/Code/Admin3/docs/misc/review
```

Expected output includes:
- `Found 4 CSV files in ...` (the four raw_prods*.csv files)
- `Wrote 37063 trace rows to normalization_trace.csv`
- A summary line showing template count (expected ~500–800) and quarantined count (expected ~140–200)

- [ ] **Step 3: Review the generated `template_preview.csv`**

Open `c:/Code/Admin3/docs/misc/review/template_preview.csv` and visually spot-check:
- Top rows should include `C` (Combined Materials Pack), `N` (Course Notes), `X` (Series X Assignments), `EX` (ASET)
- `row_count` values should look reasonable (matches Section 6 volumes from spec)
- If any `canonical_fullname` looks like it merged unrelated products, the normalization rules need tweaking — go back to Task 2 and add a new case

- [ ] **Step 4: Review the generated `invalid_rows.csv`**

Open `c:/Code/Admin3/docs/misc/review/invalid_rows.csv` and verify:
- Wildcard rows present (~130 with `reason=wildcard_subject`)
- 1 row with `reason=unknown_col2` (the `E` anomaly)
- ~4 rows with session `95A`/`95B`/`95C`/`OOS` — these will be `unknown_session` after Stage 3, but at Stage 1 they may not appear yet (Stage 1 only catches CSV-level invalids)
- Any `product_code_collision` rows — must be zero or investigated

- [ ] **Step 5: Run Stage 2 (template import)**

```bash
python manage.py import_legacy_templates \
    --preview-csv c:/Code/Admin3/docs/misc/review/template_preview.csv
```

Expected output: counts of created products, PPVs. Templates should be in the range 500–800.

- [ ] **Step 6: Verify Stage 2 counts**

```bash
python manage.py shell -c "
from catalog.products.models import Product, ProductVariation, ProductProductVariation
print(f'ProductVariation: {ProductVariation.objects.count()}')
print(f'Product: {Product.objects.count()}')
print(f'ProductProductVariation: {ProductProductVariation.objects.count()}')
"
```

Expected:
- `ProductVariation: 4`
- `Product: ~500–800`
- `ProductProductVariation: ~800–1200`

- [ ] **Step 7: Verify schema placement**

```bash
python manage.py verify_schema_placement
```

Expected: no errors reported for any of the newly-populated tables.

- [ ] **Step 8: Run Stage 3 (store product import)**

```bash
python manage.py import_legacy_store_products \
    --csv-dir c:/Code/Admin3/docs/misc \
    --output-dir c:/Code/Admin3/docs/misc/review
```

Expected output: `Created ~36,800 store.Product rows, ~200 quarantined`.

- [ ] **Step 9: Verify Stage 3 counts and `is_active` distribution**

```bash
python manage.py shell -c "
from store.models.product import Product as StoreProduct
print(f'Total store.Product: {StoreProduct.objects.count()}')
print(f'Active: {StoreProduct.objects.filter(is_active=True).count()}')
print(f'Inactive: {StoreProduct.objects.filter(is_active=False).count()}')
print()
active_sessions = StoreProduct.objects.filter(is_active=True).values_list(
    'exam_session_subject__exam_session__session_code', flat=True
).distinct()
print(f'Active session codes: {sorted(set(active_sessions))}')
"
```

Expected:
- Total: ~36,800
- Active session codes: `['26', '26S']` only
- Active count: depends on how many subjects have rows in 2026, probably ~200–500

- [ ] **Step 10: Spot-check `legacy_product_name` field**

```bash
python manage.py shell -c "
from store.models.product import Product as StoreProduct
samples = StoreProduct.objects.exclude(legacy_product_name__isnull=True).order_by('?')[:5]
for p in samples:
    print(f'{p.product_code}: legacy_product_name={p.legacy_product_name!r}')
"
```

Expected: 5 random store.Products showing different raw fullnames in `legacy_product_name`.

- [ ] **Step 11: Commit the review artifacts**

```bash
cd c:/Code/Admin3
git add docs/misc/review/template_preview.csv \
        docs/misc/review/invalid_rows.csv \
        docs/misc/review/normalization_trace.csv
git commit -m "chore(catalog): commit reviewed legacy import artifacts

Snapshot of template_preview.csv, invalid_rows.csv, and
normalization_trace.csv emitted by the Stage 1 and Stage 3 commands
against the real legacy CSVs. Committed as an audit trail for
the one-shot 1995-2026 product migration."
```

- [ ] **Step 12: Final verification**

```bash
cd c:/Code/Admin3/backend/django_Admin3
python manage.py test catalog.tests.test_legacy_import_helpers \
                      catalog.tests.test_profile_legacy_products \
                      catalog.tests.test_import_legacy_templates \
                      catalog.tests.test_import_legacy_store_products \
                      --keepdb -v 2
```

Expected: all tests across all four test modules pass.

---

## Plan Summary

| Phase | Tasks | What it produces |
|-------|-------|------------------|
| **A** — Shared helpers | 1–4 | `_legacy_import_helpers.py` with `LegacyRow`, `iter_legacy_csv_rows`, `normalize_fullname`, `classify_row`, `TemplateKey`, `build_template_key` + ~35 unit tests |
| **B** — Stage 1 command | 5–7 | `profile_legacy_products` command emitting 3 review CSVs + ~15 integration tests |
| **C** — Stage 2 command | 8–9 | `import_legacy_templates` command writing catalog tables + ~10 tests |
| **D** — Schema migration | 10 | `store.Product.legacy_product_name` field |
| **E** — Stage 3 command | 11–12 | `import_legacy_store_products` command writing store table + ~10 tests |
| **F** — Execution | 13 | Committed review artifacts + verified counts in DB |

**Commit graph (13 commits total):**

```
1. chore(catalog): add LegacyRow dataclass and CSV iterator for legacy import
2. chore(catalog): add normalize_fullname helper for legacy CSV import
3. chore(catalog): add classify_row validation helper for legacy CSV import
4. chore(catalog): add TemplateKey and build_template_key helpers
5. chore(catalog): add profile_legacy_products Stage 1 command skeleton
6. chore(catalog): add template_preview.csv output to profile command
7. chore(catalog): add invalid_rows and collision detection to profile command
8. chore(catalog): add import_legacy_templates command with variation seed
9. chore(catalog): add template + PPV import from preview CSV
10. feat(store): add legacy_product_name field to Product for legacy import history
11. chore(catalog): add import_legacy_store_products Stage 3 command
12. chore(catalog): add behavior tests for Stage 3 store product import
13. chore(catalog): commit reviewed legacy import artifacts
```

**Rollback (if needed mid-execution):**
- Stage 3 rollback: `TRUNCATE "acted"."products" CASCADE`
- Stage 2 rollback: `TRUNCATE "acted"."catalog_product_product_variations", "acted"."catalog_products", "acted"."catalog_product_variations" CASCADE`
- Schema migration rollback: `python manage.py migrate store 0003_add_is_active_to_price`
- All Stage 1 artifacts can be deleted from `docs/misc/review/` — no DB effect

---

## Design Spec Coverage

Every requirement in the [design spec](../specs/2026-04-08-legacy-product-migration-design.md) is implemented by a task:

| Spec Section | Implemented By |
|--------------|----------------|
| §3 Decisions (template dedup) | Task 2 (normalize_fullname), Task 4 (build_template_key), Task 6 (template_preview.csv grouping) |
| §3 Decisions (wildcard handling) | Task 3 (classify_row), Task 7 (invalid_rows.csv output) |
| §3 Decisions (col2 mapping) | Task 3 (VALID_COL2_CODES), Task 8 (VARIATION_SEED) |
| §3 Decisions (legacy_product_name field) | Task 10 (schema migration), Task 11 (`_build_store_product`), Task 12 (test_legacy_product_name_preserved_verbatim) |
| §3 Decisions (is_active policy) | Task 11 (ACTIVE_SESSIONS constant), Task 12 (test_session_26_is_active, test_old_session_is_inactive) |
| §4 Architecture (3 stages) | Tasks 5–7 (Stage 1), Tasks 8–9 (Stage 2), Tasks 11–12 (Stage 3) |
| §5 Normalization rules | Task 2 (all 22 test cases) |
| §5 Collision detection | Task 7 (`_detect_collisions`) |
| §5 Template preview CSV format | Task 6 (fieldnames match spec) |
| §5 Invalid rows CSV format | Task 7 (INVALID_ROWS_FIELDNAMES) |
| §6 Variation seed (P/C/M/T) | Task 8 (VARIATION_SEED constant) |
| §6 PPV generation from preview | Task 9 (extended `handle`) |
| §6 Empty used_variations error | Task 9 (test_empty_used_variations_raises) |
| §7 Schema change (legacy_product_name field) | Task 10 |
| §7 Preloaded lookups | Task 11 (`_preload_lookups`) |
| §7 Batched transactions | Task 11 (`_flush_batch`, `BATCH_SIZE=1000`) |
| §7 Idempotent via existing_store_keys set | Task 11 (`_flush_batch`), Task 12 (test_rerun_is_idempotent) |
| §7 Tutorial product_code quirk | Task 12 (test_product_code_tutorial_has_pk_suffix) |
| §8 File layout | All Tasks — exact paths documented |
| §9 Testing strategy (TDD) | Every task uses RED → GREEN → REFACTOR |
| §10 Execution order | Task 13 (steps 1-12 map to spec steps 1-12) |
| §11 Rollback plan | Plan Summary (rollback commands) |
| §12 Commit strategy | Plan Summary (13-commit graph) |
