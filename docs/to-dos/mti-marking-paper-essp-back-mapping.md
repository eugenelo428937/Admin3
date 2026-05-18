# MTI — Remove `MarkingPaper` ESSP back-mapping

> Created 2026-05-18. Tracks removal of the legacy ESSP back-mapping
> property on `MarkingPaper` after Phase 5 finalised the MTI split.

## Background

Phase 5 of the Product MTI specialisation moved
`product_product_variation` off the parent `store.Product` onto the
`MaterialProduct` subclass, and gave `MarkingProduct` its own
`marking_template` FK with `MarkingPaper.marking_template` made NOT
NULL (migration `marking/migrations/0021_alter_markingpaper_template_not_null.py`).

But [`marking/models/marking_paper.py:80-109`](../../backend/django_Admin3/marking/models/marking_paper.py)
still has an `@property exam_session_subject_product` that walks the
**legacy ESSP-shaped path** to compute a backward-compatible
`ExamSessionSubjectProduct` reference:

```python
@property
def exam_session_subject_product(self):
    """Backward-compat: returns the ESSP that legacy code expected.

    Phase 5: branches on kind because Tutorial/Marking subclasses no
    longer carry product_product_variation.
    """
    sp = self.store_product
    if sp is None:
        return None
    if sp.kind == 'material':
        ppv = sp.product_product_variation         # MaterialProduct path
        ...
    elif sp.kind == 'marking':
        template = sp.markingproduct.marking_template  # MarkingProduct path
        ...
```

This is the only spot left in the marking app that branches on
`kind` to fan out into per-subclass FK paths.

## Why it's still there

It's a **backward-compat shim** for legacy code that called
`marking_paper.exam_session_subject_product` expecting an ESSP. The
audit at the time of Phase 5 flagged it as cleanup-when-ESSP-retires,
not Phase 5 scope.

## What to do

### Step 1 — find every consumer of the property

```bash
rg -n "\.exam_session_subject_product\b" --type py backend/django_Admin3/
```

Likely hits: legacy order/cart code, marking submission services,
maybe a serializer.

### Step 2 — for each consumer, decide

- **Does it actually need an ESSP?** Then this property is
  load-bearing; can't be removed until ESSP itself retires (separate
  initiative).
- **Does it just need the paper's subject / session / template?**
  Replace with direct access on `MarkingPaper` or
  `store_product.markingproduct.marking_template`.

### Step 3 — once consumers are migrated, delete the property

The property has no DB-state; removal is pure Python deletion plus a
test sweep.

## Verification gates

- `python manage.py test marking` green.
- `python manage.py test cart orders` green (these are the most likely
  consumers).
- Pact provider tests green (the marking-related state handlers don't
  touch this property, but worth confirming).

## Why this is deferred

ESSP is still the canonical "what did the user order" reference in
several order-history and reporting paths. Killing this property
requires ESSP itself to retire — that's a larger initiative not on the
Phase 5 roadmap.

## Related

- Phase 4c plan:
  [docs/superpowers/plans/2026-05-14-product-mti-specialization-phase-4c-marking.md](../superpowers/plans/2026-05-14-product-mti-specialization-phase-4c-marking.md)
- Marking general to-dos:
  [marking.md](marking.md)
- See also: [[mti-phase-6-remove-parent-ppv-scaffolding]]
