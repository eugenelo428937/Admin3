# Active Product Availability — Design

**Date:** 2026-05-07
**Status:** Approved
**Scope:** Issue #2 only. Issue #1 (navbar empty links) is tracked as a separate diagnostic task.

## Problem

The products page currently displays **all** `store.Product` rows regardless of state. Three operational gaps:

1. There is no way to deactivate a whole exam session, a whole variation type (e.g., all eBooks), or a specific product+variation combo. The schema has `is_active` flags on some intermediate tables but not all.
2. Even an active product can be purchased outside its exam session's `start_date`–`end_date` window.
3. "Available for sale" is implicitly defined by ANDing flags scattered across 6+ tables. Every customer-facing query must remember to chain all of them, which is error-prone.

## Goals

- Add the missing `is_active` flags so admins can toggle availability at every meaningful level.
- Gate Add-to-cart on the exam session's date window.
- Centralise the "available for sale" predicate into one canonical place so callers cannot accidentally forget a condition.
- Customer-facing surfaces use the predicate; admin/internal surfaces do not.

## Non-Goals

- No effective-dating refactor (`available_from` / `available_to` across the chain). Booleans + the existing `ExamSession.start_date`/`end_date` are sufficient for current needs.
- No materialised view / cached `is_purchasable` column. The 8-condition AND is fast enough at our table sizes; a manager method is simpler.
- No auto-removal of cart items that become inactive after they were added.
- No changes to the navbar data-seed problem (separate task).

## Design Decisions Captured

| # | Decision | Choice |
|---|---|---|
| Q1 | Scope | (a) minimal — keep per-table flags, add the missing ones, no consolidation refactor |
| Q2 | Default for new flags | (c) `default=False`, no data migration — explicit blackout / audit gate |
| Q3 | Date-window UI | (a) leave card visible, disable Add-to-cart button + tooltip; **also** validate server-side |
| Q4 | Surface area | Apply on products list, search, navbar; bundle stays available with filtered contents; direct `/products/{id}` returns inactive too (order history); cart items kept + flagged |
| Q5 | Issue #1 (navbar) | (a) separate task |
| Q6 | Which tables get the new flag | (c) both `catalog_product_variations` and `catalog_product_product_variations` (plus `catalog_exam_sessions`) |

## Schema Changes

Three new boolean fields, all `default=False`. **No data migrations.** Operator activates rows post-deploy via the dry-run management command (see Rollout).

| Table | New field |
|---|---|
| `"acted"."catalog_exam_sessions"` | `is_active = BooleanField(default=False)` |
| `"acted"."catalog_product_variations"` | `is_active = BooleanField(default=False)` |
| `"acted"."catalog_product_product_variations"` | `is_active = BooleanField(default=False)` |

Existing flags are unchanged: `catalog_subjects.active`, `catalog_exam_session_subjects.is_active`, `catalog_products.is_active`, `purchasables.is_active`.

### Rationale for mixed defaults

Existing flags default to `True` because the data behind them is curated and live. Flipping those defaults retroactively would re-blackout everything. New fields with no curated data yet default to `False` so they require a deliberate activation pass — this is the audit gate the team asked for.

## The "Available Now" Predicate

A purchasable is considered available iff **all 8** conditions hold:

```
purchasable.is_active                                              ✓ existing
product_product_variation.is_active                                ⚡ NEW
product_product_variation.product.is_active                        ✓ existing
product_product_variation.product_variation.is_active              ⚡ NEW
exam_session_subject.is_active                                     ✓ existing
exam_session_subject.subject.active                                ✓ existing
exam_session_subject.exam_session.is_active                        ⚡ NEW
today() BETWEEN exam_session.start_date AND exam_session.end_date  ⚡ NEW
```

Non-`Product` Purchasables (vouchers, charges) check only `purchasable.is_active` — they don't have an exam-session chain to AND against. The `kind` discriminator on `Purchasable` selects the branch.

### Implementation: manager method on `Purchasable`

**File:** `backend/django_Admin3/store/models/purchasable.py`

```python
from django.db import models
from django.db.models import Q
from django.utils import timezone


class PurchasableQuerySet(models.QuerySet):
    def available_now(self, *, at=None):
        """
        Filter to purchasables currently available for sale.

        Customer-facing queries only. Admin/internal queries should NOT
        use this — they need to see inactive items.

        Args:
            at: datetime to evaluate against (defaults to timezone.now()).
                Used by tests to evaluate windows without freezing the clock.
        """
        now = at or timezone.now()

        return self.filter(
            Q(is_active=True) & (
                # Generic purchasables (vouchers, charges) — leaf flag only.
                ~Q(kind='product')
                |
                # Store products — full 8-condition chain.
                Q(
                    kind='product',
                    product__product_product_variation__is_active=True,
                    product__product_product_variation__product__is_active=True,
                    product__product_product_variation__product_variation__is_active=True,
                    product__exam_session_subject__is_active=True,
                    product__exam_session_subject__subject__active=True,
                    product__exam_session_subject__exam_session__is_active=True,
                    product__exam_session_subject__exam_session__start_date__lte=now,
                    product__exam_session_subject__exam_session__end_date__gte=now,
                )
            )
        )


class Purchasable(models.Model):
    # ... existing fields unchanged ...
    objects = PurchasableQuerySet.as_manager()

    def is_available_now(self, *, at=None):
        """Scalar form of `available_now()`. Used by cart-add validation
        and by the cart serializer's per-item `is_available` flag."""
        return type(self).objects.available_now(at=at).filter(pk=self.pk).exists()
```

### `store.Product` helper

`Product` inherits the manager via MTI, so `Product.objects.available_now()` works directly. A small wrapper keeps call sites clean:

```python
# backend/django_Admin3/store/models/product.py
class Product(Purchasable):
    # ... existing ...

    @classmethod
    def available_now(cls, *, at=None):
        return cls.objects.filter(
            pk__in=Purchasable.objects.available_now(at=at).values('pk')
        )
```

### Why on `Purchasable`, not `Product`?

Cart and order lines FK to `Purchasable`, not to `store.Product`. Putting the predicate on the parent means cart/checkout code can call `purchasable.is_available_now()` without downcasting. Non-product Purchasables also bypass the chain cleanly via the `kind` branch.

## Call Sites

Customer-facing queries route through the predicate. Admin queries do not.

| # | Surface | File | Change |
|---|---|---|---|
| 1 | Products list | `store/views/` (Product viewset) | Apply `.available_now()` to base queryset |
| 2 | Fuzzy search | `catalog/views/navigation_views.py::fuzzy_search` | Filter result `store.Product` IDs through `Product.available_now()` |
| 2 | Advanced search | `catalog/views/navigation_views.py::advanced_product_search` | Same |
| 3 | Navbar dropdowns | `catalog/views/navigation_views.py::navigation_data` | For Tutorial-Location products and Online-Classroom variations, include only those with at least one available `store.Product` (via `Exists()` subquery — keeps existing query shape) |
| 4 | Bundle list | `store/views/` (Bundle viewset) | Bundle visibility unchanged |
| 4 | Bundle contents | `store/views/` + bundle serializer | `bundle.bundle_products` returns only items where `Purchasable.is_available_now()` |
| 5 | Direct `/api/store/products/{id}` | `store/views/` | **Unchanged** — returns inactive products too (order history support) |
| 6 | Cart contents | `cart/serializers.py` | Each cart item gets a computed field `is_available: bool` |
| — | Cart-add | `cart/views.py` | Reject `POST /api/cart/add/` if `purchasable.is_available_now() == False` → 400 `{"error": "product_unavailable"}` |
| — | Admin endpoints | (admin viewsets) | **Unchanged** |

### Frontend changes

| File | Change |
|---|---|
| `MaterialProductCard.js` (and tutorial / marking variants) | Read `start_date` / `end_date` from product payload; if `today` outside window, disable Add-to-cart button + tooltip *"Sales for {session_code} are not currently open"* |
| Cart drawer / cart page | If `item.is_available === false`, render "no longer available — please remove" badge and styling |

### Bundle policy rationale

A bundle stays visible even if some contents are inactive — only its contents list is filtered. Hiding a bundle whenever any item goes inactive creates an intermittent disappearance pattern that confuses customers. Most marketplaces handle this the same way.

### Navbar filtering rationale

The navbar query already joins `catalog.Product → ProductProductVariation → ProductProductGroup → FilterGroup`. To filter to "items that have at least one available `store.Product`", we add an `Exists()` subquery rather than another JOIN. This avoids row multiplication from the store-side fan-out (multiple PPVs per Product, multiple ESS per Subject, etc.).

## Testing

TDD per CLAUDE.md, ≥80% coverage on new code.

| Layer | Test | Verifies |
|---|---|---|
| Schema | `makemigrations` + `migrate --check` adds 3 columns with `default=False` | Migration shape |
| QuerySet | `Purchasable.objects.available_now()` includes a fully-active product | Happy path |
| QuerySet | Each of 8 conditions individually false → product excluded (parametrized, 8 cases) | Every flag is wired in |
| QuerySet | `today < start_date` and `today > end_date` cases (uses `at=` arg) | Date-window logic |
| QuerySet | Non-product Purchasable with `is_active=True` is included even with no chain | Discriminator branch |
| Per-instance | `purchasable.is_available_now()` matches queryset on the same fixture | Helper consistency |
| API | `/api/store/products/` excludes inactive | Surface 1 |
| API | `/api/catalog/search/` and `/api/catalog/advanced-search/` exclude inactive | Surface 2 |
| API | `/api/catalog/navigation-data/` excludes navbar entries with no available `store.Product` | Surface 3 |
| API | `/api/store/bundles/{id}/products/` returns only available items | Surface 4 |
| API | `GET /api/store/products/{inactive_id}` returns 200 | Order-history exception |
| API | `POST /api/cart/add/` for inactive product → 400 `product_unavailable` | Server-side gate |
| API | Cart serializer sets `is_available: false` for items that became inactive after being added | Cart flag |
| Frontend | `MaterialProductCard` disables Add-to-cart when outside date window | UI gate |
| Frontend | Cart drawer renders "no longer available" badge for `is_available: false` | UX flag |
| Admin | Admin viewsets still return inactive items (no-regression) | Staff workflow |

## Rollout

The `default=False` blackout means this must be a staged deploy:

1. **Deploy schema migration.** At this moment the products page goes empty (intentional — audit gate).
2. **Dry-run activation command:** operator runs
   ```
   python manage.py activate_initial_catalog --dry-run
   ```
   which prints the rows it *would* flip to `is_active=True`. Per-table activation policy:

   - `catalog_exam_sessions`: activate every row whose `end_date >= today`. Past sessions stay inactive (still visible via direct fetch for order history).
   - `catalog_product_variations`: activate every row (all 5 variation types).
   - `catalog_product_product_variations`: activate every row whose related `catalog_products.is_active=True` and whose related `catalog_product_variations.is_active=True` (after the previous step runs).

   Operator reviews the diff before re-running without `--dry-run`. The command must be idempotent — running it twice produces the same result.
3. **Run for real:** operator drops `--dry-run`, or activates rows manually via Django admin if they want a slower, more selective rollout.
4. **Bust the navigation cache.** `navigation_data` caches under key `navigation_data_v2` for 5 minutes. Bump the key to `navigation_data_v3` in the same PR so the activation is visible immediately rather than after the cache expires.
5. **Verify** products page repopulates, navbar shows expected groups, search returns expected results.

### Why dry-run instead of admin-only?

The dry-run gives operators a reviewable diff — they see exactly which rows are about to change, can object, and re-run. For three new tables with hundreds of rows each, manual flipping in admin is tedious and error-prone. The dry-run preserves the blackout-as-audit-gate intent while keeping the activation operationally tractable.

## Open Questions / Future Work

- **Effective-dating across the chain** (Q1 option c) was deliberately deferred. If product-launch scheduling becomes a real workflow, revisit then.
- **Bundle-availability stricter mode** (hide bundle when any content is inactive) was rejected as a default but could become a per-bundle flag if a use case emerges.
- **Cart auto-cleanup** (vs the chosen "keep + flag" behavior) was rejected. If support sees confused customers, a one-click "remove unavailable items" UI affordance would be cheaper than auto-removal.
