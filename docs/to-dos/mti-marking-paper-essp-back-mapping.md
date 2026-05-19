# MTI — Remove `MarkingPaper` ESSP back-mapping

> Created 2026-05-18. **Completed 2026-05-19.**
> Tracked removal of the legacy ESSP back-mapping property on
> `MarkingPaper` after Phase 5 finalised the MTI split.

## Outcome

The `@property exam_session_subject_product` on
`marking.models.MarkingPaper` has been deleted, along with its
dedicated test class `MarkingPaperBackwardCompatTestCase`.

## What the audit actually found

The original write-up flagged this as "cleanup-when-ESSP-retires" and
warned the property might be load-bearing for legacy order/cart code.
The 2026-05-19 audit (one ripgrep + targeted reads) showed otherwise:

```bash
rg -n "\.exam_session_subject_product\b" --type py backend/django_Admin3/
```

- Two hits, both in `marking/tests/test_models.py` — the property's
  own tests.
- Other matches (`catalog/serializers/bundle_serializers.py:170,194`
  and `catalog/tests/test_coverage_gaps.py:1765,1829`) reference
  `…essp_product_variation.exam_session_subject_product`, which is
  the FK on `catalog.ExamSessionSubjectProductVariation` pointing
  back to ESSP — **a different attribute on a different model**.
  The word-boundary regex matched both because `…product.` ends on
  a non-word char.
- Cart and orders apps: zero references.

So the property was already vestigial. Whatever legacy callers it
guarded against had been migrated by other Phase 5/Phase 6 work by
the time this to-do was filed.

## Changes

1. Removed the property block and its enclosing
   `# Backward-compatible properties for ESSP access` section header
   from
   [`backend/django_Admin3/marking/models/marking_paper.py`](../../backend/django_Admin3/marking/models/marking_paper.py).
2. Removed the "Backward Compatibility" paragraph from the
   `MarkingPaper` class docstring.
3. Deleted `MarkingPaperBackwardCompatTestCase` from
   [`backend/django_Admin3/marking/tests/test_models.py`](../../backend/django_Admin3/marking/tests/test_models.py).

The deleted class encoded a setUp scaffold that exercised the
`MarkingTemplate.pk == catalog.Product.pk` Phase-3.1 backfill
identity as a side-effect. That invariant is enforced by the
backfill migration itself; no replacement assertion was added
(scope kept tight per user direction).

## Verification

All gates green on 2026-05-19:

- `python -m pytest marking/` — 171 passed
- `python -m pytest cart/ --ignore=cart/management` — 293 passed,
  4 skipped (management dir excluded because pytest mistakenly
  collects `test_`-prefixed management commands; pre-existing
  unrelated issue tracked elsewhere)
- `python -m pytest orders/` — 190 passed, 4 skipped
- `python -m pytest pact_tests/` — 1 passed

## Related

- Marking general to-dos:
  [marking.md](marking.md)
- See also: [[mti-phase-6-remove-parent-ppv-scaffolding]]
