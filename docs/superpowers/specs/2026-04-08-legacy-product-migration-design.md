# Legacy Product Data Migration — Design

**Status:** Approved
**Date:** 2026-04-08
**Author:** Brainstorming session (Claude + eugenelo428937)
**Scope:** Import historical ActEd product catalog (1995–2026) from four legacy CSVs into `catalog_products`, `catalog_product_variations`, `catalog_product_product_variations`, and `store.products`.

---

## 1. Goals

Populate four currently-empty catalog/store tables from ~37,063 rows in four legacy CSV exports (`raw_prods95-00.csv`, `raw_prods01-09.csv`, `raw_prods11-19.csv`, `raw_prods20-26.csv`) as a **full historical import**. Historical rows are preserved for audit and future reactivation, but only the 2026 sessions (`26`, `26S`) are marked active.

### Non-goals

- Migrating cross-subject products (wildcard subject `*`) — quarantined for separate workstream
- Backfilling prices (`store.Price`) — separate migration
- Historical subject/session import — already completed
- Fixing legacy data quality issues beyond a fixed normalization ruleset

---

## 2. Source data overview

| File                  | Rows   | Era           |
|-----------------------|--------|---------------|
| `raw_prods95-00.csv`  | 5,293  | 1995–2000     |
| `raw_prods01-09.csv`  | 9,126  | 2001–2009     |
| `raw_prods11-19.csv`  | 13,342 | 2010–2019     |
| `raw_prods20-26.csv`  | 9,302  | 2020–2026     |
| **Total**             | **37,063** |           |

**CSV column layout** (no header row):

| Column | Meaning | Example |
|--------|---------|---------|
| 1 | Subject code | `CM2`, `101`, `*` (wildcard) |
| 2 | Delivery format | `P`=Printed, `C`=eBook (or legacy CD-ROM), `M`=Marking, `T`=Tutorial |
| 3 | Product template code | `N` (Notes), `C` (Combined), `X` (Series X), etc. |
| 4 | Exam session code | `95`, `01`, `10`, `20`, `26S` |
| 5 | Full product code (derived) | `CM2/PC/20` |
| 6 | Full name | `Combined Materials Pack eBook` |
| 7 | Short name | `CMP eBook` |

### Column distribution

- **Col 2**: `P`=20,523, `C`=7,497, `M`=6,279, `T`=2,763, `E`=1 (anomaly)
- **Col 3**: 177 distinct template codes; top: `X` (2,945), `C` (2,415), `N` (2,091), `M` (1,847), `EX` (1,787)
- **Session codes in CSV but not in DB**: `95A`, `95B`, `95C`, `OOS` (likely typo of `00S`)
- **Subjects in CSV but not in DB**: `*` (wildcard only)
- **Text drift**: common — e.g., `EX` has 33 distinct fullnames (`ASET`, `ASET (14-17 Papers) eBook`, etc.)

### Existing DB state

- `catalog_exam_sessions`: 64 rows (includes April and September variants, e.g., `25`, `25S`)
- `catalog_subjects`: 129 rows
- `catalog_exam_session_subjects`: 2,165 rows
- `catalog_products`, `catalog_product_variations`, `catalog_product_product_variations`, `store.products`: **all empty** — fresh import

---

## 3. Design decisions summary

| Decision | Chosen option | Rationale |
|----------|---------------|-----------|
| **Scope** | Full historical import (all 37k rows) | Preserves audit trail; activation flag controls visibility |
| **Template dedup key** | `(col3_code, normalized_fullname)` | Subject/session/variation-agnostic — matches store model design |
| **Preserving raw fullnames** | Add `legacy_product_name TEXT NULL` field to `store.Product` | Per-row original text retained without polluting templates |
| **Wildcard `*` subject** | Skip, write to `invalid_rows.csv` for separate workstream | Avoids fan-out inflation and semantic contortions |
| **Col2 mapping** | `P`→Printed, `C`→eBook (all eras), `M`→Marking, `T`→Tutorial | Simplicity; CD-ROM history preserved via `legacy_product_name` |
| **Col2=`E` anomaly** (1 row) | Skip, write to `invalid_rows.csv` | Data quality issue — quarantine for manual review |
| **Unknown sessions** (`95A`, `95B`, `95C`, `OOS`) | Skip, write to `invalid_rows.csv` | Data quality issue — quarantine |
| **Execution pattern** | 3-stage idempotent management commands with preview CSVs | Audit-friendly; decouples normalization judgment from DB writes |
| **`is_active` policy** | `True` only for sessions `26` and `26S`; everything else `False` | Matches business reality; browsing stays clean |

---

## 4. Architecture

Three Django management commands in `backend/django_Admin3/catalog/products/management/commands/`, each with a clear input/output contract. Each stage is idempotent and can be re-run independently.

```
┌─────────────────────────────────────────────────────────────────┐
│  Stage 1: profile_legacy_products (READ-ONLY, emits 3 CSVs)    │
│  ───────────────────────────────────────────────────────────    │
│  IN:  docs/misc/raw_prods{95-00,01-09,11-19,20-26}.csv         │
│  OUT: docs/misc/review/template_preview.csv                     │
│       docs/misc/review/invalid_rows.csv                         │
│       docs/misc/review/normalization_trace.csv                  │
│                                                                 │
│  Does NOT touch the database.                                   │
│  Iterate normalization rules until template_preview.csv looks   │
│  right. Commit the reviewed CSVs alongside the code.            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 2: import_legacy_templates (WRITES catalog_* tables)    │
│  ───────────────────────────────────────────────────────────    │
│  IN:  reviewed template_preview.csv                             │
│  OUT: catalog_product_variations  (4 rows, fixed seed)          │
│       catalog_products            (~500–800 rows)               │
│       catalog_product_product_variations (~800–1200 rows)      │
│                                                                 │
│  One transaction. Idempotent (natural-key lookups).             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 3: import_legacy_store_products (WRITES products table) │
│  ───────────────────────────────────────────────────────────    │
│  PREREQUISITE: migration adds `legacy_product_name TEXT NULL` to products   │
│                                                                 │
│  IN:  raw CSVs + catalog_* state from Stage 2                   │
│  OUT: products (~36,800 rows, minus quarantined)                │
│                                                                 │
│  Batches of 1000 rows, transaction per batch.                   │
│  Skips + appends to invalid_rows.csv on any validation failure. │
│  is_active=True only for sessions 26 and 26S.                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Stage 1: Profile & preview (read-only)

### Command: `python manage.py profile_legacy_products`

Reads all four raw CSVs, runs normalization, and emits three review artifacts under `docs/misc/review/`. The database is never touched.

### Normalization function

A pure function `normalize_fullname(raw: str) -> str` in `_legacy_import_helpers.py`, applied to col6 from every CSV row.

**Rules, applied in order:**

```python
def normalize_fullname(raw: str) -> str:
    name = raw.strip()

    # 1. Strip format-encoding suffixes (captured by ProductVariation instead)
    name = re.sub(r'\s+eBook\s*$', '', name, flags=re.I)
    name = re.sub(r'\s+CD[\s\-]?ROM\s*$', '', name, flags=re.I)
    name = re.sub(r'\s+Online(\s+Tutorial)?\s*$', '', name, flags=re.I)
    name = re.sub(r'\s+Booklet\s*$', '', name, flags=re.I)

    # 2. Strip year/session parenthetical annotations
    name = re.sub(r'\s*\((?:19|20)\d{2}[^)]*\)', '', name)
    name = re.sub(r'\s*\(\d{2}[-\s][^)]*\)', '', name)
    name = re.sub(r'\s*\((?:January|April|September|March|October)[^)]*\)', '', name, flags=re.I)

    # 3. Strip naked years and session qualifiers
    name = re.sub(r'\s+(?:19|20)\d{2}\b', '', name)

    # 4. Strip version markers V1/V2/V3 at end
    name = re.sub(r'\s+V\d+\s*$', '', name, flags=re.I)

    # 5. Strip "(Marking)" suffix (captured by variation, not template)
    name = re.sub(r'\s*\(Marking\)\s*$', '', name, flags=re.I)

    # 6. Collapse whitespace and fix canonical typos (pre-approved list only)
    name = re.sub(r'\s+', ' ', name).strip()
    typo_map = {
        'Core REading': 'Core Reading',
        'Question & Answer Bank': 'Q&A Bank',
        'Flashcards': 'Flash Cards',
    }
    name = typo_map.get(name, name)

    return name
```

**Deliberately NOT stripped** (these distinguish real products):
- `- part 1`, `- Part 2`, `- Assessment`
- `Retaker`, `Mini`, `Revision`, `Core`
- Subject-specific prefixes like `CA2 MAP`

### Template grouping

Every unique `(col3_code, normalized_fullname)` pair becomes one `catalog.Product` row.

```python
@dataclass(frozen=True)
class TemplateKey:
    code: str            # col3 — e.g., "N", "C", "M", "X"
    fullname: str        # normalized — e.g., "Course Notes"
```

**Template fields derived from grouped rows:**

| Field        | Source                                                                    |
|--------------|---------------------------------------------------------------------------|
| `fullname`   | `normalized_fullname` (the one in the key)                                |
| `shortname`  | Most-common `col7` (raw shortname) across rows in this group              |
| `description`| `NULL`                                                                    |
| `code`       | `col3` (the one in the key)                                               |
| `is_active`  | `True` (templates always active; per-row activation on `store.Product`)   |
| `buy_both`   | `False` (default; toggled manually later)                                 |

### Product-code collision detection

Group raw CSV rows by `(subject, col2, col3, session)`. If a group contains **two or more rows mapping to different template keys**, that's a collision — those rows are quarantined to `invalid_rows.csv` with reason `product_code_collision`. They are NOT imported.

Example:
```
CM1, P, M, 20, CM1/PM/20, "Mock Exam 1", "Mock 1"
CM1, P, M, 20, CM1/PM/20, "Marked Assignment Project", "MAP"
```
Both would generate the same `store.Product.product_code` = `CM1/PM/20`, but are different products. Manual resolution required.

### Output artifacts

**`template_preview.csv`** — the generated template list:

| template_code | canonical_fullname | canonical_shortname | raw_fullname_samples | used_variations | row_count | distinct_subjects | distinct_sessions |
|---------------|--------------------|---------------------|----------------------|-----------------|-----------|-------------------|-------------------|
| `N` | Course Notes | Course Notes | Course Notes; Course Notes eBook | P, C | 2091 | 64 | 32 |
| `C` | Combined Materials Pack | CMP | Combined Materials Pack; CMP eBook | P, C | 2415 | 66 | 32 |
| `EX` | ASET | ASET | ASET; ASET (14-17 Papers) eBook | P, C | 1787 | 58 | 28 |
| `X` | Series X Assignments | Assign X (Papers) | Series X Assignments; Series X Assignments (Q+A) | P, M | 2945 | 62 | 30 |

**`invalid_rows.csv`** — quarantined rows:

| Column | Description |
|--------|-------------|
| `source_file` | Which raw CSV the row came from |
| `source_line` | Line number in that file |
| `reason` | `wildcard_subject`, `unknown_col2`, `unknown_session`, `unknown_subject`, `no_ess_for_subject_session`, `no_ppv_match`, `product_code_collision`, `product_code_duplicate_at_save` |
| `raw_row` | Full original CSV line (verbatim, quoted) |
| `notes` | Optional human-readable detail |

**`normalization_trace.csv`** — audit of every mapping:

| raw_fullname | normalized_fullname | rule_applied |
|--------------|---------------------|--------------|

---

## 6. Stage 2: Template migration

### Command: `python manage.py import_legacy_templates`

Reads the reviewed `template_preview.csv` and writes to `catalog_product_variations`, `catalog_products`, and `catalog_product_product_variations`. One transaction.

### Fixed variation seed (inserted first)

```python
VARIATIONS = [
    {'variation_type': 'Printed',  'name': 'Printed',  'code': 'P'},
    {'variation_type': 'eBook',    'name': 'eBook',    'code': 'C'},
    {'variation_type': 'Marking',  'name': 'Marking',  'code': 'M'},
    {'variation_type': 'Tutorial', 'name': 'Tutorial', 'code': 'T'},
]
```

Inserted idempotently via `get_or_create` on `(variation_type, name)`.

**Note:** `Hub` is in `VARIATION_TYPE_CHOICES` but no CSV row maps to it — skipped. Add later when Hub products exist.

### Template + PPV generation

```python
# Pseudocode for Stage 2 PPV generation
for template_row in reviewed_template_preview_csv:
    product, _ = Product.objects.get_or_create(
        code=template_row['template_code'],
        fullname=template_row['canonical_fullname'],
        defaults={
            'shortname': template_row['canonical_shortname'],
            'is_active': True,
            'buy_both': False,
        },
    )
    for col2_code in template_row['used_variations'].split(','):
        variation = variation_by_col2_code[col2_code.strip()]
        ProductProductVariation.objects.get_or_create(
            product=product,
            product_variation=variation,
        )
```

### Expected volumes

| Table | Estimated rows | Reasoning |
|-------|---------------|-----------|
| `catalog_product_variations` | **4** | Fixed seed list |
| `catalog_products` | **~500–800** | 177 distinct col3 codes × avg ~3 normalized fullname groups per code |
| `catalog_product_product_variations` | **~800–1200** | Each template used in 1–3 variations on average |
| `products` (store) | **~36,800** | 37,063 CSV rows minus quarantined |

### Edge cases

- **Empty `used_variations` cell** → raise error and abort. Silently skipping would create orphan templates with no PPVs.
- **Natural-key idempotency caveat:** `catalog.Product` has **no DB unique constraint** on `(code, fullname)`. Stage 2's idempotency relies on `get_or_create(code=, fullname=)` matching on these fields at the ORM level. This is safe as long as Stage 2 is the only writer — if templates were concurrently inserted from another source, duplicates could creep in. Not a concern for this one-shot migration, but worth noting before reusing this command.

---

## 7. Stage 3: Store product migration

### Prerequisite: schema change

```python
# store/migrations/00XX_add_legacy_product_name.py
operations = [
    migrations.AddField(
        model_name='product',
        name='legacy_product_name',
        field=models.TextField(
            blank=True,
            null=True,
            help_text='Original CSV fullname / free-form historical notes',
        ),
    ),
]
```

One nullable `TEXT` column added to `"acted"."products"`. Reversible.

### Command: `python manage.py import_legacy_store_products`

### Algorithm

```python
# Pseudocode
BATCH_SIZE = 1000
ACTIVE_SESSIONS = {'26', '26S'}

# Preload lookup tables (one query each, held in memory)
subject_by_code      = {s.code: s for s in Subject.objects.all()}
session_by_code      = {e.session_code: e for e in ExamSession.objects.all()}
ess_by_pair          = {(e.exam_session_id, e.subject_id): e
                        for e in ExamSessionSubject.objects.all()}
variation_by_col2    = {'P': printed, 'C': ebook, 'M': marking, 'T': tutorial}
ppv_by_template_and_variation = {
    (ppv.product.code, ppv.product.fullname, ppv.product_variation.code): ppv
    for ppv in ProductProductVariation.objects.select_related(
        'product', 'product_variation')
}

# Preload existing store.Product (ESS_id, PPV_id) pairs for idempotency.
# Without this, idempotency would require N queries across the batch.
existing_store_keys = set(
    StoreProduct.objects
    .values_list('exam_session_subject_id', 'product_product_variation_id')
)

invalid_rows_writer = open_csv('docs/misc/review/invalid_rows.csv', 'a')
buffer = []

for csv_row in stream_all_csv_rows():
    subj, col2, col3, sess, full_code, raw_fullname, raw_shortname = csv_row

    # --- Validation ---
    if subj == '*':
        invalid_rows_writer.write(csv_row, reason='wildcard_subject'); continue
    if col2 == 'E':
        invalid_rows_writer.write(csv_row, reason='unknown_col2'); continue
    if sess not in session_by_code:
        invalid_rows_writer.write(csv_row, reason='unknown_session'); continue
    if subj not in subject_by_code:
        invalid_rows_writer.write(csv_row, reason='unknown_subject'); continue

    # --- Lookups ---
    ess = ess_by_pair.get((session_by_code[sess].id, subject_by_code[subj].id))
    if ess is None:
        invalid_rows_writer.write(csv_row, reason='no_ess_for_subject_session'); continue

    normalized = normalize_fullname(raw_fullname)
    ppv = ppv_by_template_and_variation.get((col3, normalized, col2))
    if ppv is None:
        invalid_rows_writer.write(csv_row, reason='no_ppv_match'); continue

    # --- Build store.Product ---
    is_active = sess in ACTIVE_SESSIONS
    buffer.append(StoreProduct(
        exam_session_subject=ess,
        product_product_variation=ppv,
        product_code='',           # generated in save()
        is_active=is_active,
        legacy_product_name=raw_fullname,      # preserve original text
    ))

    if len(buffer) >= BATCH_SIZE:
        flush_batch(buffer)
        buffer.clear()

flush_batch(buffer)
```

### Batching + idempotency

```python
@transaction.atomic
def flush_batch(buffer):
    for product in buffer:
        # Idempotent: skip if (ESS_id, PPV_id) pair already in preloaded set
        key = (product.exam_session_subject_id, product.product_product_variation_id)
        if key in existing_store_keys:
            continue
        try:
            product.save()  # triggers product_code generation
            existing_store_keys.add(key)  # keep set fresh for re-entrant batches
        except IntegrityError:
            write_to_invalid_rows(product, reason='product_code_duplicate_at_save')
```

**Why per-row `save()` and not `bulk_create`:**
- `store.Product.save()` auto-generates `product_code` in two phases for tutorials (needs PK first)
- `bulk_create` bypasses `save()`, breaking code generation
- Transaction per batch (≤ 1000 rows) amortizes commit cost without sacrificing save() semantics

### Tutorial product_code quirk

From `store/models/product.py:73-100`:

```python
if variation.variation_type in ('eBook', 'Printed', 'Marking'):
    return f"{subject_code}/{variation_code}{product_code}/{exam_code}"
# Tutorial: save twice (first for PK, then for final code)
prefix = variation.variation_type[0].upper()
return f"{subject_code}/{prefix}{product_code}{variation_code}/{exam_code}-{self.pk}"
```

~2,763 Tutorial rows trigger double-saves. Effective write count: ~39,600 row-saves. Acceptable on dev DB.

### Performance optimization: preloaded lookup tables

Naive per-row `.get()` would issue ~200k queries. Preloading into dicts reduces to **4 queries total** for the entire run.

---

## 8. File layout

```
backend/django_Admin3/
├── store/
│   └── migrations/
│       └── 00XX_add_legacy_product_name.py           [new]
│
└── catalog/products/management/commands/
    ├── profile_legacy_products.py                   [Stage 1 — new]
    ├── import_legacy_templates.py                   [Stage 2 — new]
    ├── import_legacy_store_products.py              [Stage 3 — new]
    └── _legacy_import_helpers.py                    [shared helpers — new]

backend/django_Admin3/catalog/products/tests/
├── test_normalize_fullname.py                       [unit tests, pure function]
├── test_profile_legacy_products.py                  [Stage 1 command tests]
├── test_import_legacy_templates.py                  [Stage 2 command tests]
└── test_import_legacy_store_products.py             [Stage 3 command tests]

docs/misc/review/                                    [review artifacts — committed]
├── template_preview.csv                             [Stage 1 output, reviewed & committed]
├── invalid_rows.csv                                 [Stage 1+3 output, committed for audit]
└── normalization_trace.csv                          [Stage 1 output, committed]
```

### `_legacy_import_helpers.py` — shared, pure, testable

```python
# Exports:
def normalize_fullname(raw: str) -> str: ...
def iter_legacy_csv_rows(csv_dir: Path) -> Iterator[LegacyRow]: ...
def classify_row(row: LegacyRow) -> Optional[str]: ...  # reason code if invalid else None
def build_template_key(row: LegacyRow) -> TemplateKey: ...
```

Nothing in this module touches the DB. Every function is a pure transformation.

---

## 9. Testing strategy (TDD mandatory per CLAUDE.md)

### `test_normalize_fullname.py`

25+ assertions covering every rule from Section 5. Representative cases:

| Input | Expected output |
|-------|-----------------|
| `"Course Notes eBook"` | `"Course Notes"` |
| `"ASET (14-17 Papers) eBook"` | `"ASET"` |
| `"ASET (2014-2017 Papers)"` | `"ASET"` |
| `"Mock Exam 2010 Marking"` | `"Mock Exam Marking"` |
| `"Mock Exam 2016"` | `"Mock Exam"` |
| `"Revision Notes V2"` | `"Revision Notes"` |
| `"Revision Notes (April 2008 exams)"` | `"Revision Notes"` |
| `"Course Notes - part 1"` | `"Course Notes - part 1"` (NOT stripped) |
| `"Course Notes - Assessment"` | `"Course Notes - Assessment"` (NOT stripped) |
| `"Core REading"` | `"Core Reading"` (typo fix) |
| `"Question & Answer Bank"` | `"Q&A Bank"` |
| `"Flashcards"` | `"Flash Cards"` |
| `"Combined Materials Pack - Part 1"` | `"Combined Materials Pack - Part 1"` (NOT stripped) |
| `"CA2 MAP 2015 Marking Part 1"` | `"CA2 MAP Marking Part 1"` |

### `test_profile_legacy_products.py`

- **Fixtures:** small synthetic CSVs in `tests/fixtures/legacy_csvs/` (~20 rows covering normal rows, wildcards, col2=E, unknown session, unknown subject, collisions)
- **Assertions:**
  - Correct row count in `template_preview.csv`
  - Wildcards appear in `invalid_rows.csv` with `reason=wildcard_subject`
  - Col2=E appears with `reason=unknown_col2`
  - Collisions appear with `reason=product_code_collision`
  - `used_variations` aggregates correctly (`N` used with both `P` and `C` → `"P,C"`)
  - Stage 1 creates zero DB rows

### `test_import_legacy_templates.py`

- **Fixture:** hand-written `template_preview.csv` with ~5 templates
- **Assertions:**
  - 4 `ProductVariation` rows exist after run (P/C/M/T)
  - Correct number of `Product` rows
  - `ProductProductVariation` rows match `used_variations` column
  - Re-run creates zero additional rows (idempotent)
  - Error raised when `used_variations` is empty

### `test_import_legacy_store_products.py`

- **Fixture:** synthetic CSVs + DB state from Stage 2
- **Assertions:**
  - Correct `store.Product` row count after run
  - `is_active=True` only for rows with session_code in `{'26', '26S'}`
  - `is_active=False` for 1995–2025S rows
  - `legacy_product_name` field holds raw CSV fullname verbatim
  - Auto-generated `product_code` matches expected pattern
  - Tutorial rows get `-{pk}` suffix
  - Re-run creates zero additional rows (idempotent)
  - Failed lookups append to `invalid_rows.csv` without crashing

---

## 10. Execution order

```
1.  pytest backend/django_Admin3/catalog/products/tests/           # all tests green
2.  python manage.py profile_legacy_products                       # Stage 1 — review CSVs emitted
3.  [human] review docs/misc/review/template_preview.csv           # iterate on rules if wrong
4.  [human] review docs/misc/review/invalid_rows.csv               # confirm quarantines
5.  git add docs/misc/review/*.csv && git commit                   # snapshot the approved state
6.  python manage.py makemigrations store                          # generate legacy_product_name field migration
7.  python manage.py migrate                                       # apply it
8.  python manage.py import_legacy_templates                       # Stage 2 — catalog tables populated
9.  python manage.py verify_schema_placement                       # confirm rows in acted schema
10. python manage.py import_legacy_store_products                  # Stage 3 — store.Product populated
11. [verify] SELECT COUNT(*) per expected volume from Section 6
12. git commit all code + final invalid_rows.csv                   # ship it
```

---

## 11. Rollback plan

Each stage is cleanly reversible:

- **Stage 3 rollback:** `TRUNCATE "acted"."products" CASCADE`
- **Stage 2 rollback:** `TRUNCATE "acted"."catalog_product_product_variations", "acted"."catalog_products", "acted"."catalog_product_variations" CASCADE`
- **Migration rollback:** `python manage.py migrate store 00XX-1` (drops `legacy_product_name` column)
- **Stage 1 rollback:** delete `docs/misc/review/*.csv` (no DB effect)

**Normalization-error recovery:** if Stage 3 reveals systemic normalization errors, truncate `products`, fix rules, re-run Stages 1-3. Stage 2 is idempotent on `(code, fullname)` natural key — if the fix doesn't affect templates, `catalog_products` can stay intact.

---

## 12. Commit strategy

Conventional commits, one commit per stage:

1. `chore(catalog): add legacy product CSV profiling command` — Stage 1 + tests + fixtures
2. `chore(catalog): add legacy template import command` — Stage 2 + tests
3. `feat(store): add legacy_product_name field to Product` — schema migration
4. `chore(store): add legacy store product import command` — Stage 3 + tests
5. `chore(catalog): commit reviewed legacy import artifacts` — the approved review CSVs

Each commit: builds, tests pass, migration is functional at that point.
