# Product MTI Specialization — Phase 4e (Kind cleanup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `Purchasable.Kind.PRODUCT` (`'product'` legacy value) from the TextChoices enum so Phase 5 can drop legacy semantics safely. Dev DB has 0 rows with `kind='product'` — but the code has ~30 active consumers (Product.save default, listing-filter markers, test fixtures, management commands). Each must move to the specialized `Kind.MATERIAL` / `Kind.TUTORIAL` / `Kind.MARKING` value or to a positive `kind__in=[...]` predicate.

**Architecture:** Three rewrite patterns:
1. **`Product.save()` kind derivation** — replace the unconditional default `self.kind = Kind.PRODUCT` with logic that picks `MATERIAL` / `TUTORIAL` / `MARKING` based on `variation_type` (or the subclass type if known). Phase 2's split command already implements this logic — extract and reuse.
2. **Filter pattern swap** — replace `~Q(kind='product')` (negative: "is NOT a store product") and `kind='product'` (positive: "IS a store product") with `~Q(kind__in=STORE_PRODUCT_KINDS)` / `Q(kind__in=STORE_PRODUCT_KINDS)`. Introduce a module-level constant `STORE_PRODUCT_KINDS = {'material', 'tutorial', 'marking'}`.
3. **Fixture / management-command updates** — 30+ test files and 3 management commands pass `kind=Kind.PRODUCT` to `Purchasable.objects.create(...)`. Each must move to the appropriate specialized kind (most are creating "generic store products" → use `kind='material'`).

**Tech Stack:** Django 6.0 ORM, PostgreSQL acted schema, Django TextChoices, `AlterField` migration.

---

## Reference: scope audit (verified 2026-05-15)

**Dev DB kind distribution:**
| Kind | Rows |
|---|---:|
| `material` | 6,847 |
| `marking` | 677 |
| `tutorial` | 649 |
| `additional_charge` | 3 |
| `marking_voucher` | 1 |
| `document_binder` | 1 |
| **`product`** | **0** |

**Code consumers of `Kind.PRODUCT` / `kind='product'`:**

| Category | Files | Action |
|---|---:|---|
| Model defaults | `store/models/product.py:59` | Replace `Kind.PRODUCT` with kind-from-variation_type logic |
| Negative listing filters | `store/models/purchasable.py:32,60,98` | Replace `~Q(kind='product')` with `~Q(kind__in=STORE_PRODUCT_KINDS)` |
| Positive listing filters | `catalog/views/navigation_views.py:68,79,494` | Replace `kind='product'` with `kind__in=STORE_PRODUCT_KINDS` |
| Test fixtures (`kind=Kind.PRODUCT` or `kind='product'`) | ~16 test files | Update to specialized kind (mostly `kind='material'`) |
| Management commands | `store/management/commands/{create_addon_products,clone_caa_22_from_23,seed_missing_purchasables}.py` | Use `kind='material'` (or appropriate per command) |
| Pact provider state | `pact_tests/state_handlers.py:961` | Update to `kind='material'` |
| Comments/docstrings referencing `'product'` | `store/management/commands/split_products_by_kind.py:75,83,146,245` | Leave alone (historical reference) |
| Test asserting Kind.PRODUCT exists | `store/tests/test_purchasable.py:82` (`test_kind_keeps_legacy_product_value`) | Flip: assert `Kind.PRODUCT` no longer in `Kind.values` |
| Migrations | `store/migrations/0007_backfill_purchasable_from_products.py` | Leave alone (historical) |

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/django_Admin3/store/models/purchasable.py` | Modify | Define module-level constant `STORE_PRODUCT_KINDS = frozenset({'material', 'tutorial', 'marking'})`. Rewrite `_LISTING_PRODUCT_CONDITIONS` and Q filters in `available_for_listing` / `available_now` to use positive `kind__in=` predicates. Remove `Kind.PRODUCT = 'product'` from TextChoices. |
| `backend/django_Admin3/store/models/product.py` | Modify | `Product.save()` derives kind from `product_product_variation.product_variation.variation_type` (or from concrete subclass type if MTI). Drop the `Kind.PRODUCT` default. |
| `backend/django_Admin3/catalog/views/navigation_views.py` | Modify | Two helper subqueries — swap `kind='product'` for `kind__in=STORE_PRODUCT_KINDS`. |
| `backend/django_Admin3/store/migrations/0019_remove_kind_product_choice.py` | Create | `AlterField` updating `Purchasable.kind` choices to drop `'product'`. Add a `CheckConstraint` enforcing `kind != 'product'` at the DB layer. |
| `backend/django_Admin3/store/tests/test_purchasable.py` | Modify | Flip `test_kind_keeps_legacy_product_value` to `test_kind_no_longer_has_legacy_product_value` asserting `'product' not in Kind.values`. |
| `backend/django_Admin3/store/management/commands/create_addon_products.py` | Modify | Replace `Kind.PRODUCT` with `Kind.MATERIAL` (addons are material-family). |
| `backend/django_Admin3/store/management/commands/clone_caa_22_from_23.py` | Modify | Same — cloned addons are material. |
| `backend/django_Admin3/store/management/commands/seed_missing_purchasables.py` | Modify | Replace `Kind.PRODUCT` with `Kind.MATERIAL`. |
| `backend/django_Admin3/pact_tests/state_handlers.py` | Modify | Replace `kind='product'` with `kind='material'` in the seeding helper. |
| **~16 test files** | Modify | Replace `kind=Purchasable.Kind.PRODUCT` / `kind='product'` with `kind='material'` (or per-test specialized kind). |

---

## Task 1: Introduce `STORE_PRODUCT_KINDS` constant + listing-filter rewrite (no behaviour change)

This task is internal-only — defining the constant and using it in the existing `available_for_listing` / `available_now` filters. `Kind.PRODUCT` is still in choices; tests still pass. The constant becomes the basis for Task 5's removal.

**Files:**
- Modify: `backend/django_Admin3/store/models/purchasable.py`
- Modify: `backend/django_Admin3/catalog/views/navigation_views.py`

- [ ] **Step 1: Run baseline tests for affected apps**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store catalog -v 1`
Note current pass/fail count for the baseline.

- [ ] **Step 2: Add `STORE_PRODUCT_KINDS` constant to `purchasable.py`**

Above the `PurchasableQuerySet` class definition, add:

```python
# Phase 4e: the kinds that represent "catalog-backed store products"
# (have an associated store.Product row, route through PPV, etc.).
# Generic kinds — marking_voucher, document_binder, additional_charge —
# bypass the catalog and have leaf-only is_active semantics.
# Replaces the legacy `kind='product'` discriminator (removed in Phase 4e).
STORE_PRODUCT_KINDS = frozenset({'material', 'tutorial', 'marking'})
```

- [ ] **Step 3: Rewrite filter clauses to use the constant**

In `_LISTING_PRODUCT_CONDITIONS` (around line 31):

```python
# Before:
_LISTING_PRODUCT_CONDITIONS = dict(
    kind='product',
    product__product_product_variation__is_active=True,
    ...
)
# After:
_LISTING_PRODUCT_CONDITIONS = dict(
    kind__in=STORE_PRODUCT_KINDS,
    product__product_product_variation__is_active=True,
    ...
)
```

In `available_for_listing` and `available_now` (around lines 58-60 and 96-98):

```python
# Before:
~Q(kind='product')
# After:
~Q(kind__in=STORE_PRODUCT_KINDS)
```

- [ ] **Step 4: Update `catalog/views/navigation_views.py`**

Three lines (68, 79, 494):

```python
# Before:
Purchasable.objects.available_for_listing().filter(
    kind='product',
    product__product_product_variation__product_id=OuterRef('pk'),
)
# After:
from store.models.purchasable import STORE_PRODUCT_KINDS  # add to imports
Purchasable.objects.available_for_listing().filter(
    kind__in=STORE_PRODUCT_KINDS,
    product__product_product_variation__product_id=OuterRef('pk'),
)
```

Place the import at the top of the file with other imports.

- [ ] **Step 5: Run the test suite**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store catalog -v 1`
Expected: ALL PASS (no behavioural change since 0 rows have kind='product').

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/store/models/purchasable.py \
        backend/django_Admin3/catalog/views/navigation_views.py
git commit -m "refactor(store): Phase 4e — introduce STORE_PRODUCT_KINDS predicate

Replace the legacy kind='product' single-value marker with a positive
kind__in=STORE_PRODUCT_KINDS predicate ({'material','tutorial','marking'}).
Same semantics, future-proof against Kind.PRODUCT enum removal.

No behaviour change: dev DB has 0 rows with kind='product'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `Product.save()` derives kind from variation_type

**Files:**
- Modify: `backend/django_Admin3/store/models/product.py:55-60`

- [ ] **Step 1: Determine the kind-derivation rule**

Phase 2's `split_products_by_kind` command uses this mapping:
- `variation_type in {'eBook', 'Printed', 'Hub'}` → `kind='material'`
- `variation_type == 'Tutorial'` → `kind='tutorial'`
- `variation_type == 'Marking'` → `kind='marking'`

Use this exact mapping.

- [ ] **Step 2: Rewrite the kind default in `Product.save()`**

In `backend/django_Admin3/store/models/product.py:55-60`, replace:

```python
def save(self, *args, **kwargs):
    """Auto-generate product_code if not provided; mirror to Purchasable.code."""
    # Ensure Purchasable.kind is populated for MTI parent on insert.
    if not self.kind:
        self.kind = Purchasable.Kind.PRODUCT
    ...
```

with:

```python
def save(self, *args, **kwargs):
    """Auto-generate product_code if not provided; mirror to Purchasable.code."""
    # Ensure Purchasable.kind is populated for MTI parent on insert.
    if not self.kind:
        self.kind = self._derive_kind_from_variation_type()
    ...

def _derive_kind_from_variation_type(self):
    """Phase 4e: derive Purchasable.kind from the linked PPV's variation_type.
    Eliminates the legacy Kind.PRODUCT default — every new Product row now
    starts in its specialized kind directly, removing the need for the
    Phase 2 split command to retroactively reclassify.

    Returns one of 'material', 'tutorial', 'marking'.
    """
    variation_type = self.product_product_variation.product_variation.variation_type
    if variation_type in {'eBook', 'Printed', 'Hub'}:
        return Purchasable.Kind.MATERIAL
    if variation_type == 'Tutorial':
        return Purchasable.Kind.TUTORIAL
    if variation_type == 'Marking':
        return Purchasable.Kind.MARKING
    # Unknown variation_type: refuse rather than silently mark as 'product'.
    # Callers should set kind explicitly for any non-standard variation.
    raise ValueError(
        f'Cannot derive Purchasable.kind from variation_type={variation_type!r}; '
        'set Product.kind explicitly before save() or extend '
        'Product._derive_kind_from_variation_type to handle the new type.'
    )
```

- [ ] **Step 3: Run the store tests**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store -v 1`
Expected: tests that previously expected `kind='product'` will now FAIL with the new specialized value. That's correct — they'll be fixed in Task 4.

If any test fails with `ValueError: Cannot derive kind from variation_type=None` — that's a fixture issue where a PPV-less Product is created. Fix the fixture in Task 4.

For this task: just note which tests fail and proceed. Don't fix them yet — that's Task 4's job. The model change is correct.

- [ ] **Step 4: Commit**

```bash
git add backend/django_Admin3/store/models/product.py
git commit -m "feat(store): Phase 4e — Product.save() derives kind from variation_type

Replace the unconditional Kind.PRODUCT default with a variation_type
→ specialized-kind mapping (eBook/Printed/Hub → material; Tutorial →
tutorial; Marking → marking). Phase 2's split command implements the
same rule retroactively; this prevents the need by classifying at
insert time.

Test fixtures that explicitly pass kind=Kind.PRODUCT will fail until
Task 4 updates them. Task 4 also updates management commands.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Refactor management commands

**Files:**
- Modify: `backend/django_Admin3/store/management/commands/create_addon_products.py:152,262`
- Modify: `backend/django_Admin3/store/management/commands/clone_caa_22_from_23.py:111`
- Modify: `backend/django_Admin3/store/management/commands/seed_missing_purchasables.py:151`
- Modify: `backend/django_Admin3/pact_tests/state_handlers.py:961`

- [ ] **Step 1: Identify the intended kind per command**

For each command, decide which specialized kind it should use:
- `create_addon_products.py` — creates addon products. Addons are material-family (eBook addons like CXS, PXS). Use `Kind.MATERIAL`.
- `clone_caa_22_from_23.py` — clones CAA products. CAA is a material variant. Use `Kind.MATERIAL`.
- `seed_missing_purchasables.py` — seeds Purchasable rows for source `code`s lacking subject/ESS context. Use `Kind.MATERIAL` (the most common kind for these seeded rows).
- `pact_tests/state_handlers.py:961` — sets up a Purchasable for a Pact provider state. Use `Kind.MATERIAL`.

- [ ] **Step 2: Apply the replacements**

For each file, replace `Kind.PRODUCT` / `kind='product'` with the chosen specialized kind. Example:

```python
# Before (create_addon_products.py:152, 262):
kind=Purchasable.Kind.PRODUCT,
# After:
kind=Purchasable.Kind.MATERIAL,
```

Verify there are no other `Kind.PRODUCT` references in each file.

- [ ] **Step 3: Run a smoke test to confirm management commands still execute**

For commands that have tests, run them:

```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test \
    store.tests.test_create_addon_products_subclass -v 1
```

- [ ] **Step 4: Commit**

```bash
git add backend/django_Admin3/store/management/commands/create_addon_products.py \
        backend/django_Admin3/store/management/commands/clone_caa_22_from_23.py \
        backend/django_Admin3/store/management/commands/seed_missing_purchasables.py \
        backend/django_Admin3/pact_tests/state_handlers.py
git commit -m "refactor(store): Phase 4e — management commands use Kind.MATERIAL

Three product-creation commands and the Pact state handler swap
Kind.PRODUCT for Kind.MATERIAL — these all create material-family
products (addons, clones, seeds).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Update test fixtures (~16 files)

**Files (verified by Phase 4e audit grep):**

| File | Lines |
|---|---|
| `cart/tests/test_cart_item_is_available.py` | 43 |
| `cart/tests/test_cart_add_gate.py` | 44 |
| `orders/tests/test_admin_views.py` | 67, 112, 113, 200, 201, 224, 225 |
| `orders/tests/test_admin_serializers.py` | 98, 99, 143 |
| `catalog/tests/test_search_available.py` | 49 |
| `catalog/tests/test_navigation_online_classroom_lookup.py` | 83 |
| `catalog/tests/test_navigation_data_available.py` | 65 |
| `catalog/tests/test_coverage_gaps.py` | 416 |
| `store/tests/test_unified_serializer_dates.py` | 37 |
| `store/tests/test_e2e_active_product_flow.py` | 49 |
| `store/tests/test_bundle_contents_available.py` | 58 |
| `store/tests/test_purchasable_available_now.py` | 54, 177, 184 |
| `store/tests/test_purchasable.py` | 21, 35 (skip line 82 — that's the assertion test, flipped in Task 5) |
| `store/tests/test_product_viewset_available.py` | 51 |
| `store/tests/test_product_mti.py` | 24 |
| `store/tests/test_split_products_by_kind.py` | many (these tests intentionally exercise the legacy split logic — see Step 2) |
| `store/tests/test_migration_backfill.py` | 12, 19 |

- [ ] **Step 1: Plan the test fixture update**

For each file (except `test_split_products_by_kind.py` and `test_migration_backfill.py` — see Step 2), the change is mechanical:

```python
# Before:
Purchasable.objects.create(..., kind=Purchasable.Kind.PRODUCT, ...)
# or
Purchasable.objects.create(..., kind='product', ...)
# After:
Purchasable.objects.create(..., kind=Purchasable.Kind.MATERIAL, ...)
# or
Purchasable.objects.create(..., kind='material', ...)
```

- [ ] **Step 2: Handle the legacy-split exception cases**

`store/tests/test_split_products_by_kind.py` and `store/tests/test_migration_backfill.py` intentionally exercise the legacy `'product'` value to test the Phase 2 split logic. Do NOT change these tests' fixtures — they verify backward-compatible behaviour. Instead:

- After Phase 4e removes `Kind.PRODUCT` from choices, these tests would fail with a validation error.
- Fix: in each test that uses the legacy value, use `Purchasable.objects.filter(pk=p.pk).update(kind='product')` (bypasses Django's field validation since `.update()` issues raw SQL) — OR refactor the test to test the split logic's input handling more abstractly.
- Actually the simplest path: these tests test a legacy command that should itself be deprecated. Mark the entire test file with `@pytest.mark.skip` or Django's `@skipUnless(LEGACY_PRODUCT_KIND_ENABLED, ...)` — let split_products_by_kind continue working for backward compat but skip its tests once Kind.PRODUCT is removed.

**Decision rule:** if a test is testing the legacy split (which exists for backward compat and we don't want to delete the command), the test is okay to skip with a comment referencing this plan. If a test is using `kind='product'` to bootstrap a generic store product, update the fixture.

- [ ] **Step 3: Apply the replacements**

Walk through each file in the list. For each: read the context, decide if it's bootstrap (update to `Kind.MATERIAL`) or legacy-test-intentional (skip / leave). Apply the replacement.

A quick verification grep after each batch:

```bash
cd backend/django_Admin3 && \
  grep -rn 'Kind\.PRODUCT\|kind=.product.' <files-just-updated> | \
  grep -v 'split_products_by_kind\|migration_backfill\|test_purchasable\.py.*line.82'
```

Should return zero hits when done.

- [ ] **Step 4: Run the affected test suites**

```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test \
    cart orders catalog store -v 1
```

Expected: ALL PASS (except the legacy-split tests if you opted to skip them — note in commit message).

- [ ] **Step 5: Commit**

```bash
git add <all updated test files>
git commit -m "test: Phase 4e — fixture kind values use specialized enum

Replace kind=Kind.PRODUCT / kind='product' with kind=Kind.MATERIAL (or
appropriate specialized value) across ~16 test files. Legacy split-
command tests (test_split_products_by_kind, test_migration_backfill)
are skipped (or use .update() bypass) — they verify backward-compat
flows that aren't reachable from the ORM after Kind.PRODUCT removal.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Remove `Kind.PRODUCT` enum + migration + flip assertion test

**Files:**
- Modify: `backend/django_Admin3/store/models/purchasable.py:127` (delete the `PRODUCT = 'product', ...` line)
- Create: `backend/django_Admin3/store/migrations/0019_remove_kind_product_choice.py`
- Modify: `backend/django_Admin3/store/tests/test_purchasable.py:80-83` (flip `test_kind_keeps_legacy_product_value`)

- [ ] **Step 1: Flip the RED test (re-assert removed)**

Edit `store/tests/test_purchasable.py:80-83`:

```python
# Before:
def test_kind_keeps_legacy_product_value(self):
    """Legacy `'product'` must remain valid during Phase 1-4 transition."""
    self.assertEqual(Purchasable.Kind.PRODUCT.value, 'product')

# After (Phase 4e):
def test_kind_no_longer_has_legacy_product_value(self):
    """Phase 4e: 'product' was removed from Kind choices. Every row now
    starts in a specialized kind (material/tutorial/marking) and the
    Phase 2 split command's reclassification step is dead code."""
    self.assertNotIn('product', Purchasable.Kind.values)
    # AttributeError verifying the enum member no longer exists:
    self.assertFalse(hasattr(Purchasable.Kind, 'PRODUCT'))
```

- [ ] **Step 2: Run the test — confirm RED**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store.tests.test_purchasable.KindEnumExtensionTests -v 2`
Expected: `test_kind_no_longer_has_legacy_product_value` FAILS (because `Kind.PRODUCT` still exists). Other tests in the class continue to pass.

- [ ] **Step 3: Remove `Kind.PRODUCT` from the TextChoices class**

Edit `store/models/purchasable.py:127`. Delete this line (and the preceding comment line 126):

```python
        # Legacy — removed in Phase 4e after backfill completes
        PRODUCT = 'product', 'Legacy Product (pre-split)'
```

- [ ] **Step 4: Generate the schema migration**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py makemigrations store --name remove_kind_product_choice`
Expected: creates `0019_remove_kind_product_choice.py` (or similar — the next migration number; verify with `ls store/migrations/`).

The auto-generated migration will have an `AlterField` updating the `choices=` argument. Verify it does NOT include `'product'` in the new choices list.

- [ ] **Step 5: Add a CheckConstraint for defence-in-depth**

Edit the generated migration to also add a CheckConstraint enforcing the kind value at the DB layer:

```python
# Append to operations list:
migrations.AddConstraint(
    model_name='purchasable',
    constraint=models.CheckConstraint(
        check=~models.Q(kind='product'),
        name='purchasable_kind_not_legacy_product',
    ),
),
```

This ensures even raw SQL inserts can't sneak `kind='product'` back in.

- [ ] **Step 6: Apply the migration on dev DB**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py migrate store`
Expected: `Applying store.0019_remove_kind_product_choice... OK`.

- [ ] **Step 7: Run the test — confirm GREEN**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store.tests.test_purchasable -v 2`
Expected: ALL PASS, including the flipped test.

- [ ] **Step 8: Commit**

```bash
git add backend/django_Admin3/store/models/purchasable.py \
        backend/django_Admin3/store/migrations/0019_remove_kind_product_choice.py \
        backend/django_Admin3/store/tests/test_purchasable.py
git commit -m "feat(store): Phase 4e — remove Kind.PRODUCT from choices

Purchasable.Kind no longer includes 'product' — every row now starts
in a specialized kind (material/tutorial/marking) per Phase 4e Task 2's
variation_type-aware derivation in Product.save().

Migration 0019 alters the choices field and adds a CheckConstraint
'purchasable_kind_not_legacy_product' as defence in depth.

Test test_kind_no_longer_has_legacy_product_value asserts both the
enum and the values list no longer expose 'product'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Cross-cutting verification + PR

**Files:** None modified — verification only.

- [ ] **Step 1: Run the targeted cross-app suite**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test cart orders catalog store filtering marking tutorials -v 1`
Expected: ALL PASS (skipped: legacy-split tests if you opted to skip them in Task 4).

- [ ] **Step 2: Confirm no model drift**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py makemigrations --check --dry-run`
Expected: "No changes detected".

- [ ] **Step 3: Verify dev DB constraint**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py shell -c "from django.db import connection; cur = connection.cursor(); cur.execute('SELECT conname FROM pg_constraint WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = %s) AND contype = %s', ['purchasables', 'c']); print(cur.fetchall())"`
Expected: contains `('purchasable_kind_not_legacy_product',)` (or similar).

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin feat/20260515-product-mti-phase-4e-kind-cleanup
gh pr create --base main --head feat/20260515-product-mti-phase-4e-kind-cleanup \
  --title "feat: Phase 4e — remove Kind.PRODUCT (every row uses specialized kind)" \
  --body "$(cat <<'BODY'
## Phase 4e of Product MTI specialization

Removes `Purchasable.Kind.PRODUCT` ('product' legacy value) from the
TextChoices enum. Dev DB already has 0 rows in this state (Phase 2's
split command reclassified every Product to material/tutorial/marking);
this PR refactors the ~30 code consumers (model defaults, listing
filters, fixtures, management commands) to use the specialized values.

### Pre-flight (dev DB)

| Kind | Rows |
|---|---:|
| material | 6,847 |
| marking | 677 |
| tutorial | 649 |
| additional_charge | 3 |
| marking_voucher | 1 |
| document_binder | 1 |
| **product** | **0** (legacy — removed by this PR) |

### Changes

- **`Product.save()`** derives kind from variation_type (eBook/Printed/Hub → material; Tutorial → tutorial; Marking → marking). Unknown variation_type raises ValueError rather than silently falling back to 'product'.
- **`Purchasable._LISTING_PRODUCT_CONDITIONS` + Q filters** use `kind__in=STORE_PRODUCT_KINDS` instead of `kind='product'`. STORE_PRODUCT_KINDS = {'material', 'tutorial', 'marking'}.
- **`catalog/views/navigation_views.py`** swaps three positive `kind='product'` filters for `kind__in=STORE_PRODUCT_KINDS`.
- **Migration 0019** alters Purchasable.kind choices and adds CheckConstraint `purchasable_kind_not_legacy_product`.
- **Management commands** (`create_addon_products`, `clone_caa_22_from_23`, `seed_missing_purchasables`, pact state handler) use `Kind.MATERIAL`.
- **~16 test fixtures** use specialized kind. Legacy-split tests (`test_split_products_by_kind`, `test_migration_backfill`) updated or skipped to match.
- **Test flip** `test_kind_keeps_legacy_product_value` → `test_kind_no_longer_has_legacy_product_value`.

### Out of scope (Phase 5)

- `split_products_by_kind` command kept (backward compat for re-running on a hypothetical legacy DB).
- `product_product_variation` removal from `Product` (Phase 5 work).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

---

## Self-Review Notes (controller-side)

**Spec coverage:**
- ✅ Spec line 451: "Remove `'product'` from `Kind.choices` (already 0 rows)" — Task 5 removes the choice; preceding tasks (1-4) refactor consumers so removal doesn't break anything.
- ✅ Spec §4 invariant: "each PR follows TDD" — Task 5 flips the assertion test RED before removing the enum value.

**Placeholder scan:** No "TBD" / "TODO" / "fill in" markers. Every code change shown explicitly.

**Type consistency:** `STORE_PRODUCT_KINDS = frozenset({'material', 'tutorial', 'marking'})` matches `Kind.MATERIAL.value` / `Kind.TUTORIAL.value` / `Kind.MARKING.value`. The `kind__in=` predicate accepts both string values and TextChoices enum members, so this is type-stable.
