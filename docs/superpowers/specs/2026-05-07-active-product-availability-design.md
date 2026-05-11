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

## The Listing vs Purchase Predicate Split

Two predicates expose **different views of "available"** depending on use:

### Listing predicate — `available_for_listing()` (7 conditions)

A purchasable is **listing-visible** iff:

```
purchasable.is_active                                              ✓ existing
product_product_variation.is_active                                ⚡ NEW
product_product_variation.product.is_active                        ✓ existing
product_product_variation.product_variation.is_active              ⚡ NEW
exam_session_subject.is_active                                     ✓ existing
exam_session_subject.subject.active                                ✓ existing
exam_session_subject.exam_session.is_active                        ⚡ NEW
```

Used by every customer-facing **list/search/navbar** surface. The exam-session date window is intentionally **NOT** part of this predicate so customers can browse products from upcoming and recently-closed sessions.

### Purchase predicate — `available_now()` (8 conditions)

A purchasable is **purchasable now** iff it is listing-visible **AND**:

```
today() BETWEEN exam_session.start_date AND exam_session.end_date  ⚡ NEW
```

Used by the **cart-add server-side gate** and the per-cart-item `is_available` flag. The frontend independently checks the same date window to disable the Add-to-cart button (UX), but the server is authoritative.

Non-`Product` Purchasables (vouchers, charges) check only `purchasable.is_active` in both predicates — they don't have an exam-session chain to AND against. The `kind` discriminator on `Purchasable` selects the branch.

### Why split, not a single 8-condition predicate?

A single 8-condition predicate would hide products from upcoming sessions entirely — customers wouldn't even know the materials exist. Splitting puts the date window where it actually drives UX (button disable + cart gate) while keeping the broader list available to browse.

### Implementation: manager method on `Purchasable`

**File:** `backend/django_Admin3/store/models/purchasable.py`

```python
from django.db import models
from django.db.models import Q
from django.utils import timezone


class PurchasableQuerySet(models.QuerySet):
    # Listing-side conditions for store products. Date window NOT included
    # — that's the listing/purchase split.
    _LISTING_PRODUCT_CONDITIONS = dict(
        kind='product',
        product__product_product_variation__is_active=True,
        product__product_product_variation__product__is_active=True,
        product__product_product_variation__product_variation__is_active=True,
        product__exam_session_subject__is_active=True,
        product__exam_session_subject__subject__active=True,
        product__exam_session_subject__exam_session__is_active=True,
    )

    def available_for_listing(self):
        """7-condition listing predicate. Used by all list/search/navbar
        surfaces. Out-of-window products are kept visible — the frontend
        disables Add-to-cart and the server cart-add gate uses the
        purchase predicate to reject direct purchases."""
        return self.filter(
            Q(is_active=True) & (
                ~Q(kind='product')
                |
                Q(**self._LISTING_PRODUCT_CONDITIONS)
            )
        )

    def available_now(self, *, at=None):
        """8-condition purchase predicate (listing + date window). Used
        by the cart-add server-side gate and the per-item is_available
        flag. NOT used for listing — see `available_for_listing()`."""
        now = at or timezone.now()
        return self.filter(
            Q(is_active=True) & (
                ~Q(kind='product')
                |
                Q(
                    **self._LISTING_PRODUCT_CONDITIONS,
                    product__exam_session_subject__exam_session__start_date__lte=now,
                    product__exam_session_subject__exam_session__end_date__gte=now,
                )
            )
        )


class Purchasable(models.Model):
    # ... existing fields unchanged ...
    objects = PurchasableQuerySet.as_manager()

    def is_available_now(self, *, at=None):
        """Scalar form of `available_now()` (purchase predicate). Used
        by cart-add validation and by the cart serializer's per-item
        `is_available` flag."""
        return type(self).objects.available_now(at=at).filter(pk=self.pk).exists()
```

### `store.Product` helper

`Product` inherits the manager via MTI. Two thin wrappers keep call sites typed and clean:

```python
# backend/django_Admin3/store/models/product.py
class Product(Purchasable):
    # ... existing ...

    @classmethod
    def available_for_listing(cls):
        return cls.objects.filter(
            pk__in=Purchasable.objects.available_for_listing().values('pk')
        )

    @classmethod
    def available_now(cls, *, at=None):
        return cls.objects.filter(
            pk__in=Purchasable.objects.available_now(at=at).values('pk')
        )
```

### Why on `Purchasable`, not `Product`?

Cart and order lines FK to `Purchasable`, not to `store.Product`. Putting the predicate on the parent means cart/checkout code can call `purchasable.is_available_now()` without downcasting. Non-product Purchasables also bypass the chain cleanly via the `kind` branch.

## Call Sites

Customer-facing queries route through one of the two predicates. Admin queries do not.

**Listing surfaces** use `available_for_listing()` (7 conditions).
**Purchase surfaces** use `available_now()` / `is_available_now()` (8 conditions).

| # | Surface | File | Predicate |
|---|---|---|---|
| 1 | Products list | `store/views/product.py::ProductViewSet.list` | `Product.available_for_listing()` |
| 2 | Fuzzy search (catalog) | `catalog/views/navigation_views.py::fuzzy_search` | `StoreProduct.available_for_listing()` |
| 2 | Advanced search (catalog) | `catalog/views/navigation_views.py::advanced_product_search` | `Purchasable.objects.available_for_listing()` (Exists subquery) |
| 2 | Unified search + fuzzy/advanced/default-data (search app) | `search/services/search_service.py::_build_optimized_queryset` | `StoreProduct.available_for_listing()` |
| 2 | Search-side bundle helpers | `search/services/search_service.py::_get_bundles`, `_get_bundle_matching_product_ids`, `_get_filtered_bundle_count` | `Purchasable.objects.available_for_listing()` |
| 3 | Navbar dropdowns | `catalog/views/navigation_views.py::navigation_data` | `Purchasable.objects.available_for_listing()` (Exists subquery, no row multiplication) |
| 4 | Bundle list | `store/views/bundle.py` (Bundle viewset list) | Bundle visibility unchanged (`is_active` only) |
| 4 | Bundle contents | `store/views/bundle.py::products` action + `store/serializers/unified.py::get_components` | `Purchasable.objects.available_for_listing()` |
| 5 | Direct `/api/store/products/{id}` | `store/views/product.py::ProductViewSet.retrieve` | **Unchanged** — returns inactive products too (order history support) |
| 6 | Cart contents | `cart/serializers.py` | Each cart item gets `is_available: bool` via `purchasable.is_available_now()` (purchase predicate) |
| — | Cart-add | `cart/services/cart_service.py` | Reject `POST /api/cart/add/` if `product.is_available_now() == False` (purchase predicate) → 400 `{"error": "product_unavailable"}` |
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
| QuerySet | `Purchasable.objects.available_for_listing()` includes a fully-active product | Listing happy path |
| QuerySet | Each of the 7 listing-side `is_active` flags individually false → product excluded | Listing flag wiring |
| QuerySet | `available_for_listing()` **includes** out-of-window products | Listing/purchase split — listing side |
| QuerySet | `Purchasable.objects.available_now()` (purchase) **excludes** out-of-window products | Listing/purchase split — purchase side |
| QuerySet | `today < start_date` and `today > end_date` excluded only by `available_now()`, not `available_for_listing()` | Date-window logic & split |
| QuerySet | Non-product Purchasable with `is_active=True` is included by both predicates | Discriminator branch |
| Per-instance | `purchasable.is_available_now()` (purchase) matches queryset on the same fixture | Helper consistency |
| API | `/api/store/products/` excludes inactive but **includes** out-of-window products | Surface 1 (listing) |
| API | `/api/catalog/search/` and `/api/catalog/advanced-search/` exclude inactive but include out-of-window | Surface 2 (listing) |
| API | `/api/search/unified/` (search app) excludes inactive but includes out-of-window | Surface 2 (listing — search app) |
| API | `/api/catalog/navigation-data/` excludes navbar entries with no listing-visible `store.Product` | Surface 3 (listing) |
| API | `/api/store/bundles/{id}/products/` returns only listing-visible components | Surface 4 (listing) |
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
