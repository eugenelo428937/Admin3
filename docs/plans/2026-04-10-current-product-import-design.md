# Current Product Import Design

**Date:** 2026-04-10
**Branch:** `feat/20260410-migrate-current-product`
**Source:** `docs/misc/products_26.csv` (712 rows, session 26)

## Goal

Import current exam session products from CSV into the full catalog/store pipeline:
`catalog.Product` → `catalog.ProductProductVariation` → `store.Product`

## Data Transformation Rules

### Filtering
- Skip wildcard (`*`) subject rows (16 rows) — no ESS to link to
- Process 696 subject-specific rows

### Canonical Name Derivation
1. Strip trailing ` eBook` suffix (case-insensitive)
2. Group "Mock Exam Marking", "Mock Exam 2 Marking", "Mock Exam 3 Marking" → "Mock Exam Marking"
3. All other names used as-is
4. "(Marking)" suffix is NOT stripped — treated as separate products

### Product Deduplication
- Group by `(template_code, canonical_name)` → one `catalog.Product` per unique pair
- Expected: ~90 products (down from 147)

### Variation Mapping
- `P` → ProductVariation "Printed"
- `C` → ProductVariation "eBook"
- `M` → ProductVariation "Marking"

## Pipeline Steps

All steps in a single management command, wrapped in `transaction.atomic()`.

### Step 1: Seed ProductVariations
- `get_or_create` for P (Printed), C (eBook), M (Marking)

### Step 2: Create catalog.Products
- For each unique `(template_code, canonical_name)`:
  - `code` = template_code (col3)
  - `fullname` = canonical_name
  - `shortname` = from first CSV row in group (prefer P, then C, then M)
- `get_or_create` by `(code, fullname)`

### Step 3: Create ProductProductVariations
- For each `(product, variation)` pair found in CSV rows
- `get_or_create` by `(product, product_variation)` (unique_together enforced)

### Step 4: Create store.Products
- For each non-wildcard row: look up ESS (session + subject) + PPV from step 3
- Deduplicate: mock exam grouping means multiple rows → same (ESS, PPV)
- `get_or_create` by `(exam_session_subject, product_product_variation)`
- `store.Product.save()` auto-generates `product_code`

## Command Interface

```bash
python manage.py import_current_products <file_path> --session-code 26
```

### Arguments
- `file_path` (positional) — path to CSV
- `--session-code` (required) — exam session code
- `--dry-run` — preview without writing
- `--output` — path for skipped/unmatched report CSV

### Error Handling
- Missing subject ESS → warning + skip + report
- Invalid session code → hard fail (CommandError)
- CSV encoding: cp1252

### File Location
`backend/django_Admin3/catalog/management/commands/import_current_products.py`

## Testing

**File:** `catalog/tests/test_import_current_products.py`
**Fixture:** New `mini_current.csv` with ~15 controlled rows

### Test Cases
1. Happy path — correct counts for Products, PPVs, store.Products
2. Canonical name merging — P/C pairs → one Product with 2 PPVs
3. Mock exam grouping — 3 rows → one Product, one PPV, one store.Product
4. Wildcard skipping — `*` rows excluded
5. Missing ESS — subject skipped with warning
6. Idempotency — re-run produces no duplicates
7. Dry run — no records created
8. Invalid session — raises CommandError
9. ProductVariation seeding — creates P/C/M if absent
