# MTI Phase 6 — Remove backward-compat PPV scaffolding on `store.Product`

> Created 2026-05-18. Tracks the deferred cleanup of the
> backward-compat `product_product_variation` accessors on the parent
> `store.Product` model after Phase 5 dropped the FK column itself.

## Background

Phase 5 (commit `9a533549`) moved `product_product_variation` from the
parent `store.Product` model onto the `MaterialProduct` subclass. The
DB column on `acted.products` is dropped (migration
[0024_remove_product_ppv.py](../../backend/django_Admin3/store/migrations/0024_remove_product_ppv.py)).

What remains is a Python-level **backward-compat layer** on the parent
that lets older callers keep using `instance.product_product_variation`
as if the field were still there. It is intentional scaffolding —
removing it requires auditing every consumer first.

## What to remove

### 1. `Product.product_product_variation` @property + setter

[backend/django_Admin3/store/models/product.py:206-263](../../backend/django_Admin3/store/models/product.py)

```python
@property
def product_product_variation(self):
    pending = getattr(self, '_pending_ppv', None)
    if pending is not None:
        return pending
    try:
        return self.materialproduct.product_product_variation
    except Exception:
        return None

@product_product_variation.setter
def product_product_variation(self, value):
    self._pending_ppv = value
    ...
```

- **Getter** delegates to `MaterialProduct.product_product_variation`
  and returns `None` for Tutorial/Marking rows. Callers that branch on
  `kind` and accept `None` are fine; callers that assume non-null
  break.
- **Setter** stashes to `_pending_ppv` and flips `kind='material'` if
  unset, so legacy `Product(product_product_variation=ppv)` constructor
  calls land on a `MaterialProduct` row in `Product.save()`.

### 2. The "promote to MaterialProduct" branch in `Product.save()`

[backend/django_Admin3/store/models/product.py:75-110](../../backend/django_Admin3/store/models/product.py)

When `_pending_ppv` is set on a bare `Product` instance with
`kind='material'`, `Product.save()` re-instantiates as
`MaterialProduct` and saves through the subclass. This exists purely
to make legacy callers Just Work.

### 3. Backward-compat `product` / `product_variation` properties

[backend/django_Admin3/store/models/product.py:156-200](../../backend/django_Admin3/store/models/product.py)

```python
@property
def product(self):
    ppv = self.product_product_variation
    return ppv.product if ppv is not None else None

@property
def product_variation(self):
    ppv = self.product_product_variation
    return ppv.product_variation if ppv is not None else None
```

These are the older ESSP-era shims. Same removal criteria — audit
every consumer, switch them to MaterialProduct-specific access or
kind-aware branching.

## Consumer audit checklist

Before removing the scaffolding, run these greps and convert each hit:

```bash
# 1. Direct PPV access on bare Product references
rg -n "\.product_product_variation" --type py backend/django_Admin3/

# 2. Cart / orders code using item.product.product (ESSP-era)
rg -n "\.product\.product\b|\.product\.product_variation" --type py backend/django_Admin3/

# 3. Legacy constructor pattern
rg -n "Product\([^)]*product_product_variation" --type py backend/django_Admin3/

# 4. Serializers that pull PPV without kind-branching
rg -n "product_product_variation" backend/django_Admin3/*/serializers.py
```

Each match should be converted to one of:

- **Material-only path** — use
  `instance.materialproduct.product_product_variation` directly (raises
  `MaterialProduct.DoesNotExist` for non-material rows; that's the
  signal you wanted).
- **Polymorphic path** — branch on `instance.kind` and pull from the
  appropriate subclass FK (`tutorial_location`, `marking_template`,
  etc.).

## Verification gates

- All tests pass after removal (backend + pact + frontend).
- `manage.py verify_schema_placement` still green.
- Smoke test: create a `Product(product_product_variation=ppv)` in a
  REPL — should now fail with `TypeError: Product() got an unexpected
  keyword argument` (no setter to catch it).

## Why this is deferred

The cart, orders, and rules-engine code paths still use the older
ESSP-shaped access patterns in spots. The PR that landed Phase 5
deliberately kept the parent-level shims so the cross-app sweep
(commit `42ac71e0`) could stay surgical and not balloon into a
serializer/cart rewrite. Removing the scaffolding closes that loop.

## Related

- Phase 5 design doc:
  [docs/superpowers/plans/2026-05-15-product-mti-specialization-phase-5-drop-legacy.md](../superpowers/plans/2026-05-15-product-mti-specialization-phase-5-drop-legacy.md)
- Phase 4d (cart/orders):
  [docs/superpowers/plans/2026-05-15-product-mti-specialization-phase-4d-cart-orders.md](../superpowers/plans/2026-05-15-product-mti-specialization-phase-4d-cart-orders.md)
- See also: [[mti-phase-6-cart-resolver-subclass-aware]]
