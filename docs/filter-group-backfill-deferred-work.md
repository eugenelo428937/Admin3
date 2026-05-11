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

### Suggested CSV shape

```csv
ppv_id,target_filter_group_code,rationale
3420,core_study_materials,"M1 Bronze Printed Book — primary study content"
3424,revision_materials,"Printed Textbook 2nd — revision booklet"
4383,mock_exam_marking,"Mock Exam Marking voucher"
...
```

The follow-up will read this CSV and produce a corresponding `backfill_material_filter_groups`
command (or extend the existing one with a `--csv` flag).

### How to produce the input list

```bash
cd backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development \
    python manage.py shell < diagnose_filter_group_hierarchy.py
```

The script's section 5 (Sample Orphans By variation_type) prints each
remaining PPV's id, product shortname, and variation_code — paste these
into the CSV with a target_filter_group_code per row.

## Related files

- Backfill command (done): `filtering/management/commands/backfill_tutorial_filter_groups.py`
- Tests: `filtering/tests/test_backfill_tutorial_filter_groups.py`
- Diagnostic scripts (kept for ops use):
  - `backend/django_Admin3/diagnose_filter_group_pipeline.py`
  - `backend/django_Admin3/diagnose_filter_group_hierarchy.py`
  - `backend/django_Admin3/diagnose_tutorial_variation_codes.py`
  - `backend/django_Admin3/clear_navigation_cache.py`
