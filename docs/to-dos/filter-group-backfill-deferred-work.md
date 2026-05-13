# Filter Group Backfill — Deferred Work

> Created 2026-05-11. Tracks the parts of the `filter_product_product_groups`
> data cleanup that need business input before they can be safely automated.

## Background

The navbar Product Group dropdown was rendering empty slots for
**Core Study Materials**, **Revision Materials**, and **Online Classroom Recording**
(typo for **Online Classroom**). Investigation traced this to three issues:

1. **Online Classroom Recording typo** — `catalog/views/navigation_views.py` asked
   for `'Online Classroom Recording'`, the DB had `'Online Classroom'`.
   ✅ **Fixed** in the same PR as this doc.
2. **Tutorial PPGs stranded at parent level** — 20 rows pointed at Tutorial (id=3)
   instead of leaf children Face-to-face / Live Online / Online Classroom.
   Plus 35 active Tutorial PPVs were orphaned (no row at all).
   ✅ **Fixed** by `python manage.py backfill_tutorial_filter_groups`.
3. **Silent fail-open in `_resolve_group_ids_with_hierarchy`** — unresolvable group
   names silently dropped the WHERE clause.
   ✅ **Mitigated** — Layer 3 emits a `WARNING` log; behavior unchanged
   pending stricter follow-up.

## Still deferred — needs business CSV

The remaining 122 orphaned PPVs and 65 stranded Material rows need to be
split between **Core Study Materials** (id=4) and **Revision Materials**
(id=5). The split is a *content-type* distinction (a course-notes booklet
vs. a revision summary), not a *format* distinction — it cannot be inferred
from `variation_type` or `variation_code`.

### What needs mapping

| Group | Source | Count | Target leaf options |
|---|---|---:|---|
| Material (id=1) | Existing rows stranded at parent | 65 | Core Study Materials, Revision Materials |
| eBook orphans (no row) | `variation_type='eBook'` PPVs | 89 | Core Study Materials, Revision Materials |
| Printed orphans (no row) | `variation_type='Printed'` PPVs | 32 | Core Study Materials, Revision Materials |
| Marking orphans + parent rows | `variation_type='Marking'` + Marking direct rows | 4 | Series Assignments Marking, Mock Exam Marking, Marking Vouchers |

### How to produce the input CSV

A dedicated management command writes a CSV with all rows that need a decision:

```bash
cd backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development \
    python manage.py export_filter_group_backfill_csv \
        --output ../../docs/filter-group-backfill-input.csv
```

The current export of the dev DB lives at
[`docs/filter-group-backfill-input.csv`](filter-group-backfill-input.csv)
(200 rows: 132 orphans + 68 rows stranded at Material/Marking parent).

### CSV shape

Columns (left = context, read-only; right = decision, fill in):

| Column | Meaning |
|---|---|
| `ppv_id` | ProductProductVariation.id (primary key — never change) |
| `kind` | `orphan` (no row in PPG) or `parent_tagged` (stranded at Material/Marking) |
| `product_id` / `product_code` / `product_shortname` / `product_fullname` | catalog.Product context |
| `variation_type` / `variation_code` / `variation_name` / `variation_description` | ProductVariation context |
| `current_group_code` / `current_group_name` | blank for orphans; `material` or `marking` for parent_tagged |
| **`target_filter_group_code`** | **← fill in: `core_study_materials`, `revision_materials`, `series_assignments_marking`, `mock_exam_marking`, or `marking_vouchers`** |
| `target_filter_group_name` | optional human-readable reference (not consumed by import) |
| `rationale` | optional free text — preserved for audit |

### Example filled rows

```csv
ppv_id,kind,...,target_filter_group_code,target_filter_group_name,rationale
3420,orphan,...,core_study_materials,Core Study Materials,"M1 Bronze Printed Book — primary study content"
3424,orphan,...,revision_materials,Revision Materials,"Printed Textbook 2nd ed. — revision booklet"
4383,orphan,...,mock_exam_marking,Mock Exam Marking,"Mock Exam Marking voucher"
```

### After the CSV comes back

A companion `backfill_filter_groups_from_csv` command (not yet written —
will be built once we have a returned CSV to test against) will read the
filled CSV and apply the assignments idempotently, mirroring the
`backfill_tutorial_filter_groups` shape (transactional, `--dry-run`).

## Related files

- Backfill command (done): `filtering/management/commands/backfill_tutorial_filter_groups.py`
- Tests: `filtering/tests/test_backfill_tutorial_filter_groups.py`
- Diagnostic scripts (kept for ops use):
  - `backend/django_Admin3/diagnose_filter_group_pipeline.py`
  - `backend/django_Admin3/diagnose_filter_group_hierarchy.py`
  - `backend/django_Admin3/diagnose_tutorial_variation_codes.py`
  - `backend/django_Admin3/clear_navigation_cache.py`
