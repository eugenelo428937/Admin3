# Purchasable Unification — Design Spec

- **Date**: 2026-04-20
- **Status**: Design approved, pending implementation plan
- **Scope**: Backend (Django models, migrations, services)
- **Stakeholders**: Store, Orders, Cart, Marking Vouchers

## 1. Problem

The Admin3 store assumes every purchasable item is an exam-session × subject × variation intersection. `store.Product` requires `exam_session_subject` and `product_product_variation` — both `NOT NULL`. This forces a square peg into a round hole for items that are not exam-session or subject specific.

Three such items exist or are imminent:

1. **Marking Voucher** — a prepaid credit the customer redeems against any available marking paper. Each issued voucher has a unique code and a 4-year expiry from the date of purchase.
2. **Document Binder** — a physical binder shipped to the customer. Not tied to any subject or exam session.
3. **Additional Charge** — a catalog-visible line item whose amount is set at order time (dynamic pricing), distinct from rule-applied fees (`CartFee`).

The current shape of the schema is also accumulating polymorphism debt:

- `cart.CartItem` and `orders.OrderItem` have nullable FKs (`product`, `marking_voucher`) gated by a check constraint. Adding Binders and Additional Charges would add two more nullable FKs and a longer constraint.
- `marking_vouchers.MarkingVoucher` conflates two unrelated concerns: the *catalog entry* (code, name, price, availability) and a *per-catalog-row expiry* that is not actually the per-issued-unit expiry real vouchers need.
- `store.Price` hangs off `store.Product`, so any new catalog type has to reinvent pricing.
- VAT, discount, reporting, and pricing code branches on `item_type` in multiple places.

## 2. Goals

- Represent non-exam-session purchasable items cleanly, without nullable FKs on cart/order.
- Provide a single catalog abstraction that supports future item types (subscriptions, merchandise, …) without schema churn.
- Track per-issued-unit state for vouchers (unique code, individual expiry) separate from the catalog.
- Keep cart/order FK IDs stable through the migration — no disruption to in-flight orders.
- Preserve the existing VAT rules, rules-engine integration, and cart/order API contracts.

## 3. Non-goals

- Redesigning `CartFee` (rule-applied dynamic charges). Those remain a parallel structure.
- Building a redemption workflow for vouchers. `IssuedVoucher.redeemed_at` is captured; the redemption endpoint and linkage to marking submissions is out of scope here.
- Expanding `store.Price` tiers beyond the existing four.
- Unifying catalog item definitions with external Administrate product data (separate concern).

## 4. Design

### 4.1 Unified catalog: `store.Purchasable`

A new parent table in the `acted` schema.

```
store.Purchasable (acted.purchasables)
──────────────────────────────────────
id                 PK
kind               enum: 'product' | 'marking_voucher' | 'document_binder' | 'additional_charge'
code               unique — human-readable SKU
name               string
description        text (blank ok)
is_active          bool
dynamic_pricing    bool (default False)
vat_classification string (nullable — used by VAT rules engine)
created_at, updated_at
```

`kind` is **denormalised** onto `Purchasable` so queries, VAT rules, and reporting can branch without joining to subclasses.

### 4.2 Subclasses (Django multi-table inheritance)

**`store.Product`** keeps its current semantics — an ESS × PPV intersection — but becomes a subclass of `Purchasable`. Structurally, the `purchasable_ptr` becomes its PK (see migration Variant A below).

```
store.Product (acted.products)  — existing table, now MTI subclass
───────────────────────────────
purchasable_ptr          OneToOne PK → store.Purchasable
exam_session_subject     FK → catalog.ExamSessionSubject
product_product_variation FK → catalog_products.ProductProductVariation
product_code             CharField unique (auto-generated, existing format)
```

**`store.GenericItem`** — new subclass for vouchers, binders, and additional charges.

```
store.GenericItem (acted.generic_items)
───────────────────────────────────────
purchasable_ptr        OneToOne PK → store.Purchasable
validity_period_days   int (nullable) — e.g. 1460 for vouchers
stock_tracked          bool (default False)
```

Kind-specific metadata that does not warrant a column goes into `Purchasable.description` or a JSONB on `GenericItem` if future needs arise. No JSONB added preemptively (YAGNI).

### 4.3 Pricing: `store.Price` generalised

`store.Price.product_id` is repointed to `purchasable_id`:

```
store.Price (acted.prices)
──────────────────────────
purchasable   FK → store.Purchasable  (was: product → store.Product)
price_type    enum: 'standard' | 'retaker' | 'reduced' | 'additional'
amount        decimal
(unchanged fields otherwise)
```

Pricing semantics per kind:

- `product` → typically `standard` + `retaker`, optionally `reduced` and `additional`.
- `marking_voucher`, `document_binder` → a single `standard` row.
- `additional_charge` → `dynamic_pricing=True`, **zero `Price` rows**. Amount captured per line in `CartItem.actual_price` → `OrderItem.actual_price`.

A single pricing lookup path in code:

```python
def resolve_price(item: CartItem | OrderItem) -> Decimal:
    if item.actual_price is not None:
        return item.actual_price
    if item.purchasable.dynamic_pricing:
        raise ValueError("dynamic pricing item missing actual_price")
    return item.purchasable.prices.get(price_type=item.price_type).amount
```

### 4.4 Cart / Order polymorphism

`cart.CartItem` and `orders.OrderItem` both replace their nullable FK pair with a single `purchasable` FK:

```
cart.CartItem (acted.cart_items)            orders.OrderItem (acted.order_items)
────────────────────────────────            ────────────────────────────────────
purchasable  FK → Purchasable (PROTECT)     purchasable  FK → Purchasable (PROTECT)
  NOT NULL                                    NOT NULL
— removed: product, marking_voucher         — removed: product, marking_voucher
— removed: item_type (derive from kind)     — removed: item_type
— removed: check constraints                — removed: check constraints
(unchanged: quantity, price_type,           (unchanged: quantity, price_type,
 actual_price, metadata, VAT fields, ...)    actual_price, metadata, VAT fields, ...)
```

Fees (`item_type='fee'`) — previously allowed with no FK — get represented as well-known `Purchasable` rows (e.g. code `FEE_GENERIC`) so every cart/order line has a non-null FK. `CartFee` (rule-applied booking fees, etc.) is untouched.

**Backward-compat shims** on `CartItem` / `OrderItem` for one release cycle:

```python
@property
def product(self):            # returns store.Product or None
    return getattr(self.purchasable, 'product', None)

@property
def marking_voucher(self):    # returns Purchasable-as-voucher shim
    if self.purchasable.kind == 'marking_voucher':
        return self.purchasable.genericitem
    return None
```

Marked deprecated. Consumers migrate to `item.purchasable.*` over time, then shims are removed.

### 4.5 Issued voucher instances

New table: `marking_vouchers.IssuedVoucher`.

```
marking_vouchers.IssuedVoucher (acted.issued_vouchers)
──────────────────────────────────────────────────────
id                  PK
voucher_code        unique, auto-generated
order_item          FK → orders.OrderItem (CASCADE)
purchasable         FK → store.Purchasable (PROTECT)
issued_at           datetime (auto_now_add)
expires_at          datetime NOT NULL
status              enum: 'active' | 'redeemed' | 'expired' | 'cancelled'
redeemed_at         datetime nullable
cancelled_at        datetime nullable
cancellation_reason text (blank ok)

Indexes: voucher_code, status, expires_at, order_item
```

**Lifecycle rules:**

| Event | Behaviour |
|-------|-----------|
| Created | At **order confirmation / payment success**, not at cart-add. One row per unit purchased (`OrderItem.quantity=5` → 5 rows). |
| Code generation | `IssuedVoucherService.issue()` produces codes of form `MV-<yyyymm>-<8-char base32>`. Format is centralised. |
| Expiry computed | `expires_at = issued_at + purchasable.genericitem.validity_period_days`. For vouchers this is 4 years (1460 days). |
| Redemption | Out of scope for this iteration. Schema captures `redeemed_at`; endpoint/logic designed separately. |
| Order-item cancellation | Linked `IssuedVoucher` rows transition to `status='cancelled'` via a signal or service call. |
| Expiry sweep | Scheduled job flips `active → expired` past `expires_at`. Redemption code (when built) always re-checks expiry at call time. |

`PROTECT` on `purchasable` ensures a catalog entry cannot be hard-deleted while issued vouchers reference it; staff soft-deactivates instead.

### 4.6 App ownership

- **`store`** — owns `Purchasable`, `Product`, `GenericItem`, `Price`, `Bundle`.
- **`marking_vouchers`** — owns `IssuedVoucher` and voucher-instance services (issuance, redemption, expiry jobs, admin UI).
- **`cart`**, **`orders`** — consume `Purchasable` via the new FK.
- The legacy `marking_vouchers.MarkingVoucher` model is **removed** (catalog data migrated to `Purchasable` + `GenericItem`).

## 5. Migration strategy

All phases run as Django migrations in the `acted` schema (double-quoted `db_table` as per project convention).

### Phase 1 — Create (non-destructive)

- Create `store.Purchasable`, `store.GenericItem`.
- Add nullable `purchasable_id` to `store.Price`, `cart.CartItem`, `orders.OrderItem`.

### Phase 2 — Backfill catalog (data migration, Variant A — idiomatic MTI)

Preserve `store.Product.id` as `Purchasable.id`. The data migration is written as a Python `RunPython` operation, not raw SQL — shown here in SQL-like form for clarity only:

```sql
-- ILLUSTRATIVE ONLY — actual migration uses Django RunPython
INSERT INTO acted.purchasables (id, kind, code, name, description, is_active,
                                dynamic_pricing, created_at, updated_at)
SELECT p.id,
       'product',
       p.product_code,
       cp.name,                                  -- from catalog.Product via PPV
       '',
       p.is_active,
       false,
       p.created_at,
       p.updated_at
FROM   acted.products p
JOIN   acted_products.product_product_variations ppv ON ppv.id = p.product_product_variation_id
JOIN   acted.products_master cp ON cp.id = ppv.product_id;
```

Then alter `store.Product` so its PK becomes `purchasable_ptr_id` (OneToOne with matching IDs).

For each `marking_vouchers.MarkingVoucher` row, insert a `Purchasable` + `GenericItem` pair (`kind='marking_voucher'`, `validity_period_days=1460`). New PKs — only `MarkingVoucher.id` had pointers, not `Purchasable.id`.

### Phase 3 — Backfill FKs (data migration)

```sql
-- Product-backed cart items: same id under Variant A
UPDATE acted.cart_items SET purchasable_id = product_id WHERE product_id IS NOT NULL;

-- Voucher-backed cart items: lookup new purchasable
UPDATE acted.cart_items ci
SET    purchasable_id = gi.purchasable_ptr_id
FROM   acted.generic_items gi
JOIN   acted.purchasables p ON p.id = gi.purchasable_ptr_id
WHERE  p.kind = 'marking_voucher'
  AND  ci.marking_voucher_id = <lookup from MarkingVoucher→Purchasable mapping table>;

-- Fee lines: point at well-known FEE_GENERIC purchasable
UPDATE acted.cart_items SET purchasable_id = <FEE_GENERIC.id>
WHERE  item_type = 'fee';
```

Same three updates repeated for `acted.order_items`.

### Phase 4 — Backfill issued vouchers (data migration)

For every `OrderItem` with `purchasable.kind = 'marking_voucher'`:

- Create `quantity` `IssuedVoucher` rows.
- Generate codes via the service.
- `issued_at` = the order's confirmation datetime (or `OrderItem.created_at` fallback).
- `expires_at` = `issued_at + 1460 days` (configurable per catalog row but defaults to 4y).
- `status = 'active'`, overridden to `'expired'` if `expires_at < now()`.

### Phase 5 — Flip + clean up (destructive)

- `purchasable_id` → `NOT NULL` on `CartItem`, `OrderItem`.
- Drop `product_id`, `marking_voucher_id`, `item_type`, and associated check constraints.
- Drop `marking_vouchers_marking_vouchers` table.
- `store.Price.purchasable_id` → `NOT NULL`, drop `product_id`.

### Soak + rollback

- Phases 1–4 ship first and soak on staging for at least one business day with production-shaped data.
- Phase 5 ships in a **separate release** after soak validates FK integrity and test suite passes.
- Immediate DB snapshot before Phase 5.
- Phases 1–4 are reversible (old columns still present). Phase 5 is the point of no return.

## 6. Test strategy

- **TDD for new models** — `Purchasable`, `GenericItem`, `IssuedVoucher` written test-first. Minimum 80% coverage per project standard.
- **Data-migration tests** — fixture with representative `Product`, `MarkingVoucher`, mixed `CartItem`/`OrderItem` rows (product, voucher, fee); run migration; assert row counts, FK integrity, preserved IDs.
- **Contract tests** on cart/order APIs — ensure response shapes unchanged for the React frontend.
- **Schema-placement** — `python manage.py verify_schema_placement` must pass for all new tables.
- **MIGRATION_ASSERT_MODE = True** in CI settings to make conditional migration ops raise, not silently skip.
- **IssuedVoucher lifecycle tests** — issue, expire, cancel; concurrency safety for code generation.

## 7. Open questions / deferred

- **Voucher redemption workflow** — endpoint, linkage to marking submissions, `redeemed_by_user`/`redeemed_for` fields. Deferred to a separate spec.
- **Backward-compat shim removal** — one release cycle after all known consumers migrated to `purchasable.*` access. Tracked separately.
- **Frontend cart/order rendering** — should work unchanged via backward-compat shims. If surface changes are desired (e.g. displaying voucher codes on order detail), that's a separate UI spec.
- **Bundle support** — `store.Bundle` already has `bundle_products` referencing `store.Product`. If bundles should be able to include generics, that's a follow-up.

## 8. Success criteria

- All existing cart/order FKs resolve after migration; no data loss.
- All API responses for `/api/cart/`, `/api/orders/` unchanged in shape.
- VAT calculations produce identical results for product and voucher lines pre- and post-migration.
- `store.Product` retains its `product_code` semantics and ESS-linked behaviour.
- New catalog rows for binders and additional charges can be created by staff via Django admin without code changes.
- Issued vouchers for existing historical orders are backfilled with correct expiries.
- Test suite passes with coverage ≥ 80% on changed modules.
