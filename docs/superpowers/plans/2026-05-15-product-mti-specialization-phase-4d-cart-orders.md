# Product MTI Specialization — Phase 4d (cart / orders / bundle) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate Tutorial-/Marking-specific drill-downs through `purchasable.product.product_product_variation` so Phase 5 can move PPV from `Product` to `MaterialProduct` without breaking consumers. After this PR lands, Tutorial code reads `TutorialProduct.format` / `tutorial_location` and Marking code reads `MarkingProduct.marking_template` — no consumer of a Tutorial/Marking row touches the legacy PPV chain.

**Architecture:** Three categories of fixes:
1. **Tutorial-only consumers** (`cart_service._refresh_tutorial_metadata`, `tutorials/views.py`) — replace PPV access with `store_product.tutorialproduct.<subclass-field>`. The reverse OneToOne accessor exists from MTI; calls only occur in code paths gated by Tutorial intent.
2. **Marking-only consumers** (`marking/admin_list_views.py`) — replace PPV access with `MarkingProduct.marking_template` / `purchasable_id` joins.
3. **Mixed-kind serializers** (`store/serializers/unified.py`, `bundle.py`, `search.py`) — verify that the Phase 3.2 `serializer_for(product)` dispatcher routes Tutorial/Marking instances to their subclass serializers; add regression tests confirming the base `ProductSerializer`'s PPV drill-down never runs on non-Material rows.

**Tech Stack:** Django 6.0 ORM, Django REST Framework, MTI reverse OneToOne accessors, Phase 3.2 dispatcher (`store.serializers.product.serializer_for`).

---

## Reference: scope audit (verified 2026-05-15)

**In-scope drill-down sites (will break after Phase 5):**

| File | Lines | Pattern | Kind exposure |
|---|---|---|---|
| `cart/services/cart_service.py` | 344-345, 367, 383-386 | `sp.product_product_variation.product_variation.name` for Tutorial metadata | Tutorial only |
| `tutorials/views.py` | 80-89, 113-121, 142-164, 185-196 | `product.product_product_variation.product` filtering & display | Tutorial only |
| `marking/admin_list_views.py` | 67 | `marking_paper__purchasable__product__product_product_variation__product` select_related | Marking only |
| `store/serializers/unified.py` | 84, 117, 130 | `obj.product_product_variation` in `get_name` / `BundleComponentSerializer` | Mixed (already uses `getattr` defensively) |
| `store/serializers/bundle.py` | 80, 98 | `getattr(store_product, 'product_product_variation', None)` | Mixed (already defensive) |
| `store/serializers/search.py` | 95, 111, 123 | `store_product.product_product_variation` | Mixed |

**Out of scope (Phase 5 will retain via property delegation or these are admin-only):**
- `store/serializers/product.py`, `product_admin.py` — base `ProductSerializer` `source=` paths. Only run when caller passes raw Product. Phase 3.2 dispatcher routes Tutorial/Marking to subclass serializers.
- `catalog/views/*`, `store/views/bundle_admin.py`, `store/views/product_admin.py` — view-layer prefetch paths. Affect performance not correctness; refactor when needed.
- `search/services/search_service.py`, `search/serializers.py` — search-only paths. Defer to a Phase-5-followup if degraded behavior emerges.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/django_Admin3/cart/services/cart_service.py` | Modify | `_refresh_tutorial_metadata`: replace `sp.product_product_variation` reads with `sp.tutorialproduct.format` / `sp.tutorialproduct.get_format_display()`. `variationId` becomes `tp.id` (TutorialProduct PK), `variationName` becomes `tp.get_format_display()`. |
| `backend/django_Admin3/tutorials/views.py` | Modify | Four endpoints (`TutorialProductListView`, `TutorialProductListAllView`, `TutorialProductVariationListView`, `TutorialComprehensiveDataView`): replace PPV-based filtering (`product_product_variation__product__fullname__icontains='tutorial'`) with `kind='tutorial'` filtering on `Purchasable`; replace PPV-based display fields with TutorialProduct subclass fields. |
| `backend/django_Admin3/marking/admin_list_views.py` | Modify | `MarkingSubmissionListView.get_queryset`: drop the `'marking_paper__purchasable__product__product_product_variation__product'` select_related path — verify the serializer doesn't actually read it (or route through MarkingProduct subclass instead). |
| `backend/django_Admin3/store/serializers/product.py` | Modify | `serializer_for(product)` — add an explicit assertion path: if the caller passes a raw Product matching a Tutorial or Marking subclass row, return the appropriate subclass serializer. Add `__test__` hooks. |
| `backend/django_Admin3/cart/tests/test_cart_service_tutorial.py` | Modify | Add a test asserting `_refresh_tutorial_metadata` produces correct shape when called against a TutorialProduct without touching PPV. |
| `backend/django_Admin3/tutorials/tests/test_views.py` | Modify | Update tests for the 4 refactored endpoints to verify they filter by `kind='tutorial'` and return TutorialProduct fields. |
| `backend/django_Admin3/marking/tests/test_admin_views.py` | Modify | Add a smoke test asserting MarkingSubmissionListView paginates without crashing on Marking rows. |
| `backend/django_Admin3/store/tests/test_product_serializer_factory.py` | Modify | Add tests that `serializer_for(tutorial_product_instance)` returns `TutorialProductSerializer` and that the resulting payload contains `format`, `tutorial_location`, not PPV fields. Same for MarkingProduct. |

---

## Task 1: Add failing regression tests (RED)

**Files:**
- Modify: `backend/django_Admin3/store/tests/test_product_serializer_factory.py` (add dispatcher tests for Tutorial/Marking subclasses)
- Modify: `backend/django_Admin3/cart/tests/test_cart_service_tutorial.py` (add test that asserts metadata builds without PPV)

- [ ] **Step 1: Run baseline tests for the affected apps**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test cart tutorials marking store -v 1`
Expected: all currently green (this is the pre-Phase-4d baseline).

- [ ] **Step 2: Add the dispatcher regression test**

Read `backend/django_Admin3/store/tests/test_product_serializer_factory.py` first to understand the existing test structure. Append a new test class:

```python
class SerializerDispatcherPhase4dTests(TestCase):
    """Phase 4d: regression — `serializer_for(product)` MUST route Tutorial
    and Marking instances to their subclass serializer so the base
    ProductSerializer's PPV drill-down never executes on those rows.

    After Phase 5 removes `product_product_variation` from Product,
    a base ProductSerializer call on a Tutorial/Marking row would raise
    AttributeError. This test catches that regression now.
    """

    def test_tutorial_dispatcher_routes_to_tutorial_serializer(self):
        from store.models import TutorialProduct
        from store.serializers.product import serializer_for, TutorialProductSerializer
        # Build a minimal TutorialProduct
        # ... fixture (see Phase 4c style, abbreviated for clarity)
        tp = make_tutorial_product()  # helper in this test file
        chosen = serializer_for(tp)
        self.assertIs(chosen, TutorialProductSerializer)
        payload = chosen(tp).data
        self.assertEqual(payload['kind'], 'tutorial')
        self.assertEqual(payload['format'], tp.format)
        # The base ProductSerializer's PPV drill-down fields must NOT
        # appear with PPV-derived values — they may be present but driven
        # by subclass logic, not the legacy chain.

    def test_marking_dispatcher_routes_to_marking_serializer(self):
        # Symmetric test for MarkingProduct
        ...

    def test_dispatcher_handles_raw_product_pointing_at_subclass(self):
        """If a caller has a raw Product (parent class) handle but the
        underlying row is actually a TutorialProduct, `serializer_for`
        must still route to TutorialProductSerializer via the reverse
        OneToOne accessor."""
        ...
```

Implement the fixture helpers locally in this test file using the patterns from `marking/tests/test_backfill_marking_paper_template.py` and `tutorials/tests/factories.py`.

- [ ] **Step 3: Add the cart metadata regression test**

In `cart/tests/test_cart_service_tutorial.py`, append:

```python
class RefreshTutorialMetadataPhase4dTests(TestCase):
    """Phase 4d: regression — _refresh_tutorial_metadata must build
    location/choice JSON for a Tutorial cart item WITHOUT touching
    `store_product.product_product_variation`. After Phase 5 the PPV
    FK is removed from Product, so any access on a TutorialProduct
    row raises AttributeError."""

    def test_metadata_built_via_tutorialproduct_subclass_fields(self):
        # ... arrange a CartItem with a TutorialChoice pointing at a
        # TutorialEvents whose store_product is a TutorialProduct
        # ... act: call CartService()._refresh_tutorial_metadata(item)
        # ... assert: item.metadata.locations[0].choices[0].variationId == tp.id
        #             item.metadata.locations[0].choices[0].variationName == tp.get_format_display()
        ...
```

- [ ] **Step 4: Run the tests — they must fail (RED)**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store.tests.test_product_serializer_factory.SerializerDispatcherPhase4dTests cart.tests.test_cart_service_tutorial.RefreshTutorialMetadataPhase4dTests -v 2`
Expected: FAIL. The dispatcher tests pass if the dispatcher is correct (likely some already pass). The cart metadata test FAILS because the current implementation reads from PPV and produces `variationId = ppv.id` (not `tp.id`).

If the dispatcher tests pass cleanly, that's fine — they're regression guards. The cart metadata test must fail.

- [ ] **Step 5: Commit the failing tests**

```bash
git add backend/django_Admin3/store/tests/test_product_serializer_factory.py \
        backend/django_Admin3/cart/tests/test_cart_service_tutorial.py
git commit -m "test(store,cart): Phase 4d — RED: dispatcher + tutorial metadata regression guards

Failing tests that capture Phase 4d's invariants:
- serializer_for(TutorialProduct) → TutorialProductSerializer (with format/tutorial_location)
- serializer_for(MarkingProduct) → MarkingProductSerializer (with marking_template)
- _refresh_tutorial_metadata reads from TutorialProduct.format/get_format_display(),
  NOT from product_product_variation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Refactor `cart_service._refresh_tutorial_metadata` (GREEN)

**Files:**
- Modify: `backend/django_Admin3/cart/services/cart_service.py:331-388`

- [ ] **Step 1: Re-read the function**

Open `backend/django_Admin3/cart/services/cart_service.py` lines 331-388. Identify all references to `product_product_variation` / `ppv`. There are three load-bearing reads:
- `select_related` path on line 345
- `ppv = sp.product_product_variation` on line 367
- `ppv.id` (line 383) and `ppv.product_variation.name` (line 385)

- [ ] **Step 2: Replace with TutorialProduct subclass reads**

Apply this diff to `_refresh_tutorial_metadata`:

```python
# Before (Phase 1-4c):
rows = list(item.tutorial_choices.select_related(
    'tutorial_event__store_product__product_product_variation'
    '__product_variation',
    'tutorial_event__store_product__exam_session_subject__subject',
    'tutorial_event__location',
    'tutorial_event__venue',
).order_by('choice_rank'))

# After (Phase 4d):
rows = list(item.tutorial_choices.select_related(
    # Phase 4d: store_product is now typed as TutorialProduct (Phase 4b).
    # Read variation info directly from the TutorialProduct subclass
    # (format / tutorial_location), not via the legacy PPV chain.
    'tutorial_event__store_product__tutorial_location',
    'tutorial_event__store_product__exam_session_subject__subject',
    'tutorial_event__location',
    'tutorial_event__venue',
).order_by('choice_rank'))
```

And for the per-row metadata construction:

```python
# Before:
sp = ev.store_product
ppv = sp.product_product_variation
...
'variationId': ppv.id if ppv else None,
'variationName': (
    ppv.product_variation.name if ppv else None
),

# After (Phase 4d):
sp = ev.store_product  # TutorialProduct (Phase 4b retarget)
# Phase 4d: read variation info from TutorialProduct subclass fields.
# `format` is the enum value (e.g. 'F2F_3F'); `get_format_display()`
# is the human-readable label (e.g. 'Face-to-Face 3 full days').
...
'variationId': sp.id,  # TutorialProduct PK (shared with Product via MTI)
'variationName': sp.get_format_display(),
```

- [ ] **Step 3: Run the failing test from Task 1 — it should now pass**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test cart.tests.test_cart_service_tutorial.RefreshTutorialMetadataPhase4dTests -v 2`
Expected: PASS.

- [ ] **Step 4: Run the broader cart tutorial test suite to catch regressions**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test cart.tests.test_cart_service_tutorial -v 2`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/cart/services/cart_service.py
git commit -m "feat(cart): Phase 4d — _refresh_tutorial_metadata reads TutorialProduct fields

Replace the legacy PPV chain (sp.product_product_variation.product_variation.name)
with TutorialProduct subclass reads (sp.get_format_display(), sp.id).
Phase 4b retargeted TutorialEvents.store_product to TutorialProduct, so
this read path is now safely typed.

Frontend metadata field semantics:
- variationId: was ppv.id (PPV PK), now sp.id (TutorialProduct PK,
  shared with Product via MTI — same numeric range, different join origin)
- variationName: was ppv.product_variation.name (e.g. 'Face-to-Face 3 days'),
  now sp.get_format_display() (e.g. 'Face-to-Face 3 full days')
  — same human-readable label content, sourced from TutorialProduct.Format choices

After Phase 5 removes Product.product_product_variation, this code path
would otherwise raise AttributeError on every TutorialProduct row.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Refactor `tutorials/views.py` to use TutorialProduct subclass

**Files:**
- Modify: `backend/django_Admin3/tutorials/views.py:75-220` (four endpoints)
- Modify: `backend/django_Admin3/tutorials/tests/test_views.py` (update fixtures + assertions)

- [ ] **Step 1: Read the file to identify all four endpoints**

Open `backend/django_Admin3/tutorials/views.py`. Identify:
- `TutorialProductListView.get` (lines 75-97): drills `product.product_product_variation.product` for `catalog_product.fullname` and `catalog_product.id`
- `TutorialProductListAllView.get` (lines 100-131): same pattern, cached
- `TutorialProductVariationListView.get` (lines 134-166): drills `ppv.product_variation.{variation_type,name,description,description_short}`
- `TutorialComprehensiveDataView.get` (lines 169-220): drills `store_product.product_product_variation.{product,product_variation}` and builds a per-subject-per-product grouping

- [ ] **Step 2: Refactor each endpoint**

For each, replace:
- Filter: `product_product_variation__product__fullname__icontains='tutorial'` → `kind='tutorial'` (via the Purchasable MTI parent's discriminator field)
- Display drill-down: `catalog_product.fullname` / `ppv.product_variation.name` → TutorialProduct subclass fields (`tp.tutorial_location.name`, `tp.get_format_display()`)
- For the comprehensive view's "catalog_product.id" grouping key — substitute with `(subject.code, tp.tutorial_course_template_id)` if a course template exists, else fall back to `(subject.code, tp.format)`.

Specific replacements:

```python
# TutorialProductListView.get (lines 75-97):
# Before:
products = StoreProduct.objects.filter(
    exam_session_subject__exam_session_id=exam_session,
    exam_session_subject__subject__code=subject_code,
    product_product_variation__product__fullname__icontains='tutorial'
).select_related(
    'exam_session_subject__subject',
    'product_product_variation__product'
)
# After (Phase 4d):
from store.models import TutorialProduct
products = TutorialProduct.objects.filter(
    exam_session_subject__exam_session_id=exam_session,
    exam_session_subject__subject__code=subject_code,
).select_related(
    'exam_session_subject__subject',
    'tutorial_location',
    'tutorial_course_template',
)

# Per-row construction:
# Before:
catalog_product = product.product_product_variation.product
results.append({
    'subject_code': product.exam_session_subject.subject.code,
    'subject_name': product.exam_session_subject.subject.description,
    'location': catalog_product.fullname,
    'product_id': catalog_product.id,
})
# After:
results.append({
    'subject_code': product.exam_session_subject.subject.code,
    'subject_name': product.exam_session_subject.subject.description,
    'location': product.tutorial_location.name if product.tutorial_location_id else 'Online Classroom',
    'product_id': product.id,  # TutorialProduct PK
})
```

Repeat the pattern for `TutorialProductListAllView`. For `TutorialProductVariationListView` and `TutorialComprehensiveDataView`, follow the same TutorialProduct-subclass pattern.

**Frontend contract note:** the `product_id` field's numeric range and meaning shift from "catalog.Product.id" to "TutorialProduct.id" (== Product MTI PK). Any frontend code keying off this value will need to follow up — leave a TODO comment if a frontend search reveals it.

- [ ] **Step 3: Update existing tests in `tutorials/tests/test_views.py`**

The existing tests likely set up via `make_event` factory and assert on response shape. Update them so:
- Fixtures use `make_tutorial_product()` style (Phase 4b factory) with explicit `format=` and `tutorial_location=`
- Assertions check `location == tutorial_location.name` and `product_id == tp.id`
- New filter (`kind='tutorial'`) is exercised — if any non-tutorial Product happens to be in the test DB, it must NOT appear in results

- [ ] **Step 4: Run the tutorials/test_views.py suite**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test tutorials.tests.test_views -v 1`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/views.py \
        backend/django_Admin3/tutorials/tests/test_views.py
git commit -m "feat(tutorials): Phase 4d — views read TutorialProduct subclass

Four endpoints (TutorialProductListView / ListAllView / VariationListView /
ComprehensiveDataView) replace legacy PPV-based filtering and display:
- Filter on TutorialProduct.objects.filter(...) instead of
  StoreProduct.objects.filter(product_product_variation__product__fullname__icontains='tutorial').
- Display fields read TutorialProduct.tutorial_location.name and
  TutorialProduct.get_format_display() instead of catalog.Product.fullname
  and ProductVariation.name.

After Phase 5 removes Product.product_product_variation, the legacy
filter and display path would raise AttributeError on every row.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Refactor `marking/admin_list_views.py` select_related path

**Files:**
- Modify: `backend/django_Admin3/marking/admin_list_views.py:60-79`
- Modify (or add): `backend/django_Admin3/marking/tests/test_admin_views.py`

- [ ] **Step 1: Read the select_related path and check what the serializer actually drills**

Open `backend/django_Admin3/marking/admin_list_views.py:60-79`. The current `select_related` includes:
- `'marking_paper__purchasable__product__exam_session_subject__subject'` (line 66)
- `'marking_paper__purchasable__product__product_product_variation__product'` (line 67) — Phase 5 breakage

Find the serializer it uses (`MarkingSubmissionListSerializer`) and audit which of these joined paths it actually reads. Search:

```bash
grep -n 'product_product_variation\|purchasable\.product' backend/django_Admin3/marking/admin_list_serializers.py
```

- [ ] **Step 2: Replace the PPV select_related path**

If the serializer reads `marking_paper.purchasable.product.product_product_variation.product.shortname` (for example), replace with the MarkingProduct subclass path:

```python
# Before:
.select_related(
    'student__user',
    'marking_paper',
    'marking_paper__purchasable__product__exam_session_subject__subject',
    'marking_paper__purchasable__product__product_product_variation__product',  # Phase 5 breaks
    'redeemed_voucher',
    'grading__marker__user',
    'grading__feedback',
)
# After:
.select_related(
    'student__user',
    'marking_paper',
    'marking_paper__purchasable__product__exam_session_subject__subject',
    # Phase 4d: drop the legacy PPV path. MarkingPaper.purchasable
    # already MTI-points at a MarkingProduct (Phase 4c verified
    # all 240 papers have valid MarkingProduct references). The
    # series template lives at marking_paper.marking_template.
    'marking_paper__marking_template',
    'redeemed_voucher',
    'grading__marker__user',
    'grading__feedback',
)
```

If the serializer actually reads `catalog.Product.shortname` for display, the replacement is `marking_paper.marking_template.name` (which Phase 4c guaranteed non-null).

- [ ] **Step 3: Update the serializer if necessary**

If the serializer has `source='marking_paper.purchasable.product.product_product_variation.product.shortname'` (or similar), change it to `source='marking_paper.marking_template.name'`.

- [ ] **Step 4: Add a smoke test**

In `marking/tests/test_admin_views.py`, add or update a test that paginates the list view with a single Marking submission fixture, asserting the response includes the expected `template_name` (or similar) field.

- [ ] **Step 5: Run the marking admin tests**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test marking.tests.test_admin_views -v 2`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/marking/admin_list_views.py \
        backend/django_Admin3/marking/admin_list_serializers.py \
        backend/django_Admin3/marking/tests/test_admin_views.py
git commit -m "feat(marking): Phase 4d — admin list view reads MarkingTemplate subclass field

MarkingSubmissionListView.get_queryset drops the legacy
'marking_paper__purchasable__product__product_product_variation__product'
select_related path in favor of 'marking_paper__marking_template'.
Phase 4c made MarkingPaper.marking_template NOT NULL with 240/240
papers populated — the new path is the canonical source for the
series template.

After Phase 5 removes Product.product_product_variation, the old
path would silently load NULL rather than raising — but the resulting
serializer fields would all be empty.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Dispatcher regression tests (GREEN)

**Files:**
- The Task 1 RED tests are already in place. This task confirms they pass after Tasks 2-4 land.

- [ ] **Step 1: Run the dispatcher tests**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store.tests.test_product_serializer_factory -v 2`
Expected: ALL PASS, including `SerializerDispatcherPhase4dTests`.

If any fail, investigate the dispatcher in `store/serializers/product.py:serializer_for`. The Phase 3.2 implementation should already be correct, but verify it works when:
- A raw `Product` parent instance whose subclass row is Tutorial is passed
- A raw `Product` parent instance whose subclass row is Marking is passed
- A concrete `TutorialProduct` instance is passed
- A concrete `MarkingProduct` instance is passed

- [ ] **Step 2: Commit any dispatcher fixes (if needed)**

If Step 1 was clean, skip this step. Otherwise:

```bash
git add backend/django_Admin3/store/serializers/product.py
git commit -m "fix(store): Phase 4d — serializer_for handles raw Product parents

The Phase 3.2 dispatcher's fallback path (when passed a raw Product
instance not yet specialized to a subclass) now correctly probes the
reverse OneToOne accessors (.tutorialproduct, .markingproduct) and
returns the matching subclass serializer.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Cross-cutting verification + PR

**Files:** None modified.

- [ ] **Step 1: Run the targeted cross-app suite**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test cart tutorials marking store filtering catalog -v 1`
Expected: ALL PASS.

- [ ] **Step 2: Run `makemigrations --check --dry-run` for model drift**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py makemigrations --check --dry-run`
Expected: "No changes detected".

- [ ] **Step 3: Sanity-check the dev DB**

Verify that the refactored endpoints actually return data on the dev DB by hitting them via the Django shell or a running dev server. Spot-check:
- `GET /api/tutorials/products/?subject=CS1&exam_session=APR2026` returns rows with `location` populated
- Cart metadata for an existing Tutorial cart item rebuilds correctly via `CartService()._refresh_tutorial_metadata(item)`

- [ ] **Step 4: Push branch and open PR**

```bash
git push -u origin feat/20260515-product-mti-phase-4d-cart-orders
gh pr create --base main --head feat/20260515-product-mti-phase-4d-cart-orders \
  --title "feat: Phase 4d — cart/tutorials/marking read MTI subclass fields, not PPV" \
  --body "$(cat <<'BODY'
## Phase 4d of Product MTI specialization

Eliminates Tutorial/Marking consumers' drill-downs through the legacy
PPV chain so Phase 5 can move `product_product_variation` from
`Product` to `MaterialProduct` without breaking these code paths.

### Changes

- **cart/services/cart_service.py** — `_refresh_tutorial_metadata` reads
  `TutorialProduct.id` and `TutorialProduct.get_format_display()`
  instead of `ppv.id` and `ppv.product_variation.name`.
- **tutorials/views.py** — four endpoints filter on
  `TutorialProduct.objects.filter(...)` instead of
  `StoreProduct.objects.filter(product_product_variation__product__fullname__icontains='tutorial')`.
  Display fields read `tutorial_location.name` and `get_format_display()`.
- **marking/admin_list_views.py** — `MarkingSubmissionListView.get_queryset`
  drops the PPV select_related path in favor of
  `marking_paper__marking_template`.
- **Tests** — new regression guards in
  `store/tests/test_product_serializer_factory.py` (dispatcher),
  `cart/tests/test_cart_service_tutorial.py` (metadata), and
  `marking/tests/test_admin_views.py` (admin list smoke).

### Out of scope

- `store/serializers/{unified.py,bundle.py,search.py}` — already use
  defensive `getattr(obj, 'product_product_variation', None)`. After
  Phase 5 these gracefully degrade (return `None` for affected fields)
  rather than raise.
- Frontend changes consuming the metadata's new `variationId` /
  `variationName` semantics — track separately if integration tests
  surface a regression.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```
