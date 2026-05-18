# MTI — Make the cart resolver subclass-aware

> Created 2026-05-18. Tracks the deferred refactor of the cart's
> generic `_resolve_product` path into subclass-aware resolvers after
> Phase 5 split store products by kind.

## Background

Phase 5 finalised the MTI split — `MaterialProduct`, `TutorialProduct`,
`MarkingProduct` each own their identifying FKs and code generation.
The cart code still resolves products through a single generic path
that takes a `store.Product` primary key and looks up the parent row.

## Current state

[`backend/django_Admin3/cart/services/cart_service.py:194-197`](../../backend/django_Admin3/cart/services/cart_service.py)

```python
def _resolve_product(self, product_id):
    return Product.objects.filter(
        materialproduct__product_product_variation_id=ppv_id,
    ).first()
```

Already partly Phase-5-aware (traverses
`materialproduct__product_product_variation_id` for the Material
case), but the surrounding code paths still treat all kinds the same
once a `Product` is in hand — they call `.product_product_variation`,
`.product`, `.product_variation` via the parent's backward-compat
properties.

For Tutorial/Marking rows those properties return `None`, so any cart
operation that needs variation/catalog data quietly fails open. This
hasn't bitten production yet because Tutorial/Marking add-to-cart goes
through different controller paths, but the shared resolver is a
latent foot-gun.

## What needs to be built

### 1. Audit cart entry points

```bash
rg -n "_resolve_product\b" --type py backend/django_Admin3/cart/
rg -n "cart_item\.product\." --type py backend/django_Admin3/cart/
```

For each consumer, classify:

| Pattern | Required action |
|---|---|
| Reads `cart_item.product.product_product_variation` | Branch on `kind` or downcast to `materialproduct` |
| Reads `cart_item.product.product` | Same — only meaningful for Material |
| Reads price / code / id | No change — these live on the parent and work for all kinds |

### 2. Add kind-specific resolvers

```python
def _resolve_material(self, ppv_id):
    return MaterialProduct.objects.get(product_product_variation_id=ppv_id)

def _resolve_tutorial(self, *, ess_id, format, tutorial_location_id):
    return TutorialProduct.objects.get(
        exam_session_subject_id=ess_id,
        format=format,
        tutorial_location_id=tutorial_location_id,
    )

def _resolve_marking(self, *, ess_id, marking_template_id):
    return MarkingProduct.objects.get(
        exam_session_subject_id=ess_id,
        marking_template_id=marking_template_id,
    )
```

The caller (controller / serializer) already knows which kind it's
adding, so dispatching to the right resolver is straightforward.

### 3. Decide what to do with the generic `_resolve_product`

Two options:

- **Keep it** as a low-level pk lookup that returns a typed subclass
  instance (via `select_related('materialproduct', 'tutorialproduct',
  'markingproduct')` + a `.specialize()` helper that returns the
  populated subclass), and have controllers use it.
- **Remove it** entirely once all controllers use the
  kind-specific resolvers.

## Acceptance criteria

- Cart add-to-cart works for all three kinds end-to-end.
- Cart serializer returns kind-appropriate metadata (variation for
  Material, format/location for Tutorial, template/papers for
  Marking).
- No remaining `cart_item.product.product_product_variation` accesses
  that assume non-null.

## Verification gates

- `python manage.py test cart` green.
- Pact consumer cart contracts still verify.
- E2E: add a tutorial to the cart in the React app, refresh, check the
  cart still displays correctly.

## Why this is deferred

Tutorial/Marking add-to-cart already uses dedicated controller paths
that don't crash. The generic resolver only kicks in for the legacy
shared path. Tightening this is value-added, not blocking.

## Related

- Phase 4d plan:
  [docs/superpowers/plans/2026-05-15-product-mti-specialization-phase-4d-cart-orders.md](../superpowers/plans/2026-05-15-product-mti-specialization-phase-4d-cart-orders.md)
- See also: [[mti-phase-6-remove-parent-ppv-scaffolding]]
