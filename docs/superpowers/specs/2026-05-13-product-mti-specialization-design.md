# Product MTI Specialization — Design

**Date:** 2026-05-13
**Status:** Design approved; ready for implementation plan
**Author:** Eugene Lo (co-designed with Claude)
**Supersedes:** N/A — extends Phase A purchasable unification (commit `6e1ad52c`)

---

## 1. Problem Statement

The current store hierarchy is:

```
Purchasable (acted.purchasables)
├── Product            (acted.products)           ESS-based store items
└── GenericItem        (acted.generic_items)      vouchers / binders / charges
```

Every `Product` row points at a `catalog_products.ProductProductVariation`
(PPV), which itself joins `catalog_products.Product` (master template) to
`catalog_products.ProductVariation` (format: eBook / Printed / Hub /
Tutorial / Marking).

This shape fits **Material** products perfectly. It produces two structural
problems for the other product families:

- **Tutorial products** carry redundant data. The tutorial "format"
  (Face-to-Face 3-day, Live Online, …) exists as a row in
  `catalog_product_variations` *and* the course concept exists as
  `tutorials.TutorialCourseTemplate`. The location lives in a third place
  (`tutorials.TutorialLocation`). The catalog tables contribute no
  information that tutorial-app tables don't already provide; they exist
  only because every store `Product` is required to point at a PPV.
- **Marking products** carry a structurally pointless variation. There
  is no second marking variation to choose between — marking is always
  delivered electronically. The `ProductVariation(variation_type='Marking')`
  row exists purely as a placeholder so the FK chain validates.

We want each product family to have a schema tailored to its concept,
with the redundant catalog rows removed. We will do this by pushing
specialization one level deeper in the MTI tree, so each product family
has its own concrete subclass under the existing `Product` intermediate.

---

## 2. Goals

- Eliminate the `catalog_product_variations` rows for Tutorial and
  Marking. The catalog tables become "templates for things that have
  format choices" (i.e. Material only).
- Eliminate the implicit duplication of tutorial location/format
  across `catalog_products`, `catalog_product_variations`, and the
  tutorials app.
- Keep `store.Product` working as the FK target for cart/order lines
  via shared MTI PKs — no FK changes on `CartItem`, `OrderItem`,
  `Bundle`, `Price`.
- Land the refactor in five independently-mergeable phases, each
  reversible at the phase boundary.
- Treat addon/solution products (PXS, CXS, CM1S, CYS) as `MaterialProduct`
  rows with `Purchasable.is_addon=True` — no fourth product family.

## 3. Non-Goals

- No change to `Bundle`, `BundleProduct`, or `Price` shape — they
  already live on `Purchasable` and don't care about subclasses.
- No change to `cart` / `orders` line schemas — they reference
  `Purchasable.id`, which is preserved by the MTI shared-PK model.
- No new admin UX work — Phase 3 adds three Django-admin pages
  mirroring today's, not a shadcn redesign.
- No removal of the existing Phase A purchasable unification — this
  design **extends** it, not replaces it.

---

## 4. Architecture

### 4.1 Class hierarchy

```
Purchasable                           acted.purchasables  (unchanged shape)
├── Product                           acted.products      (intermediate parent)
│   ├── MaterialProduct               acted.material_products    ← NEW
│   ├── TutorialProduct               acted.tutorial_products    ← NEW
│   └── MarkingProduct                acted.marking_products     ← NEW
└── GenericItem                       acted.generic_items (unchanged)
```

`Product` becomes an MTI **intermediate** — it is not abstract (a row
still exists in `acted.products` for every leaf), but it is no longer
intended to be instantiated directly. Existing `Product` rows are
re-classed into subclasses during Phase 2 backfill (Section 6).

### 4.2 Field placement

| Level             | Field                          | Type             | Notes |
|-------------------|--------------------------------|------------------|-------|
| `Purchasable`     | `kind`                         | TextChoices      | New values: `material`, `tutorial`, `marking`. Old `'product'` deprecated after Phase 4. |
| `Purchasable`     | `code` / `name` / `is_active` / `is_addon` / `vat_classification` / `dynamic_pricing` | (unchanged)      | |
| `Product`         | `exam_session_subject`         | FK ESS           | Truly shared by all three subclasses. |
| `Product`         | `product_code`                 | CharField unique | Shared field; subclass overrides `_generate_product_code()`. |
| `MaterialProduct` | `product_product_variation`    | FK PPV           | **Final state**: lives on MaterialProduct. **Transition**: stays on `Product` through Phases 1–4 (Django MTI forbids field clashes). MaterialProduct ships as empty marker in Phase 1; field is moved in Phase 5 via `RemoveField('product', 'product_product_variation') + AddField('materialproduct', 'product_product_variation')` with data migration. Material is the only family using catalog variations. |
| `TutorialProduct` | `tutorial_course_template`     | FK TutorialCourseTemplate | Tutorials app owns the template concept. |
| `TutorialProduct` | `tutorial_location`            | FK TutorialLocation | |
| `TutorialProduct` | `format`                       | TextChoices      | Replaces `ProductVariation` rows with `variation_type='Tutorial'`. |
| `MarkingProduct`  | `marking_template`             | FK MarkingTemplate | New marking-app table — see §4.4. |
| `MarkingProduct`  | `paper_count`                  | PositiveSmallIntegerField (nullable) | Optional — papers can also be derived from MarkingPaper count. |
| `GenericItem`     | (unchanged: `validity_period_days`, `stock_tracked`) | | |

### 4.3 New `Kind` enum

```python
# store/models/purchasable.py
class Kind(models.TextChoices):
    MATERIAL          = 'material',          'Material Product'
    TUTORIAL          = 'tutorial',          'Tutorial Product'
    MARKING           = 'marking',           'Marking Product'
    MARKING_VOUCHER   = 'marking_voucher',   'Marking Voucher'
    DOCUMENT_BINDER   = 'document_binder',   'Document Binder'
    ADDITIONAL_CHARGE = 'additional_charge', 'Additional Charge'

    # Deprecated after Phase 4e — kept for backfill safety in Phases 1–4
    PRODUCT           = 'product',           'Legacy Product (pre-split)'
```

### 4.4 New `marking.MarkingTemplate`

```python
# marking/models/marking_template.py
class MarkingTemplate(models.Model):
    """The reusable concept of 'Series X Marking' or 'Mock Marking 1'.

    Exam-session-agnostic. Concrete saleable rows live in
    store.MarkingProduct, which links a template to an ExamSessionSubject.
    """
    code = models.CharField(max_length=10)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."marking_templates"'
        verbose_name = 'Marking Template'
        constraints = [
            # `code` is NOT unique by itself — the catalog has multiple
            # rows sharing the same code with distinct shortnames
            # (e.g. `M` appears as both 'Mock Exam Marking' and
            # 'Practice Exam Marking'). We preserve that distinction.
            models.UniqueConstraint(
                fields=['code', 'name'],
                name='uq_marking_template_code_name',
            ),
        ]
```

**Phase 1 shipped with `code = CharField(unique=True)`** — Phase 2 must
relax that constraint to the composite `(code, name)` UniqueConstraint
above before the backfill can run (otherwise rows with duplicate codes
fail). See Phase 2 plan §3.

`MarkingPaper` gains a nullable `marking_template` FK (Phase 1) which
becomes non-null in Phase 4c.

### 4.5 Subclass models (final shapes)

```python
# store/models/material_product.py
class MaterialProduct(Product):
    product_product_variation = models.ForeignKey(
        'catalog_products.ProductProductVariation',
        on_delete=models.PROTECT,
        related_name='store_material_products',
    )

    class Meta:
        db_table = '"acted"."material_products"'
        # Addons share PPV with their base, distinguished via is_addon —
        # uniqueness enforced by Purchasable.code UNIQUE, not (ess, ppv).

    def _generate_product_code(self):
        ess = self.exam_session_subject
        ppv = self.product_product_variation
        v = ppv.product_variation
        return f"{ess.subject.code}/{v.code or ''}{ppv.product.code}/{ess.exam_session.session_code}"
```

```python
# store/models/tutorial_product.py
class TutorialProduct(Product):
    class Format(models.TextChoices):
        # Phase 2 expanded the enum to match the 23 real codes in
        # `catalog_product_variations` (variation_type='Tutorial').
        # Phase 1 shipped 5 placeholder values; Phase 2 dropped
        # LIVE/REC (no data uses them) and added the 18 missing codes.

        # Face-to-face
        F2F_1F  = 'F2F_1F',  'Face-to-Face 1 full day'
        F2F_1PD = 'F2F_1PD', 'Face-to-Face Paper B Preparation Day'
        F2F_2F  = 'F2F_2F',  'Face-to-Face 2 full days'
        F2F_3F  = 'F2F_3F',  'Face-to-Face 3 full days'
        F2F_4F  = 'F2F_4F',  'Face-to-Face 4 full days'
        F2F_5B  = 'F2F_5B',  'Face-to-Face 5-day bundle'
        F2F_5F  = 'F2F_5F',  'Face-to-Face 5 full days'
        F2F_6B  = 'F2F_6B',  'Face-to-Face 6-day bundle'
        F2F_6H  = 'F2F_6H',  'Face-to-Face 6 half days'

        # Live online
        LO_10H  = 'LO_10H',  'Live Online 10 half days'
        LO_1F   = 'LO_1F',   'Live Online 1 full day'
        LO_1PD  = 'LO_1PD',  'Live Online Paper B Preparation Day'
        LO_2F   = 'LO_2F',   'Live Online 2 full days'
        LO_2H   = 'LO_2H',   'Live Online 2 half days'
        LO_3F   = 'LO_3F',   'Live Online 3 full days'
        LO_4F   = 'LO_4F',   'Live Online 4 full days'
        LO_4H   = 'LO_4H',   'Live Online 4 half days'
        LO_5B   = 'LO_5B',   'Live Online 5-day bundle'
        LO_5F   = 'LO_5F',   'Live Online 5 full days'
        LO_6B   = 'LO_6B',   'Live Online 6-day bundle'
        LO_6H   = 'LO_6H',   'Live Online 6 half days'
        LO_8H   = 'LO_8H',   'Live Online 8 half days'

        # Online classroom (no physical location — see tutorial_location below)
        OC      = 'OC',      'Online Classroom'

    tutorial_course_template = models.ForeignKey(
        'tutorials.TutorialCourseTemplate',
        on_delete=models.PROTECT,
        # Nullable in Phase 2 because OC (Online Classroom) products
        # don't have corresponding `tutorials.TutorialCourseTemplate`
        # rows (those follow a `{subject}_{format}` naming convention
        # that doesn't include `OC`). The backfill creates synthetic
        # OC templates only where data justifies it; rows that can't
        # match a template stay NULL until operators fix the data.
        null=True,
        blank=True,
        related_name='store_tutorial_products',
    )
    tutorial_location = models.ForeignKey(
        'tutorials.TutorialLocation',
        on_delete=models.PROTECT,
        # Nullable: OC (Online Classroom) products have no physical
        # venue. ~98 such rows existed pre-refactor; their NULL
        # location is semantically correct ("online, no venue") and
        # avoids needing a sentinel TutorialLocation row.
        null=True,
        blank=True,
        related_name='store_tutorial_products',
    )
    format = models.CharField(max_length=16, choices=Format.choices)

    class Meta:
        db_table = '"acted"."tutorial_products"'
        # Note: Phase 1 dropped the planned
        # (template, location, format, ESS) UniqueConstraint because
        # Django MTI raises models.E016 when a child constraint
        # references a parent-table field. Uniqueness is enforced via
        # Purchasable.code UNIQUE (auto-generated product_code includes
        # all four dimensions).

    def _generate_product_code(self):
        ess = self.exam_session_subject
        return (
            f"{ess.subject.code}/{self.tutorial_location.code}/"
            f"{self.format}/{ess.exam_session.session_code}"
        )
```

```python
# store/models/marking_product.py
class MarkingProduct(Product):
    marking_template = models.ForeignKey(
        'marking.MarkingTemplate',
        on_delete=models.PROTECT,
        related_name='store_marking_products',
    )
    paper_count = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        db_table = '"acted"."marking_products"'
        constraints = [
            models.UniqueConstraint(
                fields=['marking_template', 'exam_session_subject'],
                name='uq_marking_product_per_template_ess',
            ),
        ]

    def _generate_product_code(self):
        ess = self.exam_session_subject
        return (
            f"{ess.subject.code}/{self.marking_template.code}/"
            f"{ess.exam_session.session_code}"
        )
```

### 4.6 Catalog tables after refactor

| Table | After-state |
|---|---|
| `catalog_products` | Material templates only (CSM01, FAQ22, …). Tutorial and Marking rows backfilled into per-app tables and deleted. |
| `catalog_product_variations` | Material variations only (eBook, Printed, Hub). `Tutorial` and `Marking` rows deleted. |
| `catalog_product_product_variations` | Material PPV junctions only. |

The catalog app becomes self-consistent: it stores templates for things
that have format choices, and nothing else.

### 4.7 Product code formats

| Subclass         | Format                                                    | Example              |
|------------------|-----------------------------------------------------------|----------------------|
| MaterialProduct  | `{subject}/{variation_code}{template_code}/{session}`     | `CB1/PC/26S`         |
| TutorialProduct  | `{subject}/{location_code}/{format_code}/{session}`       | `CB1/GSW/F2F_3F/26S` |
| MarkingProduct   | `{subject}/{template_code}/{session}`                     | `CM2/X/26S`          |

These mirror today's formats — only the *implementation* moves from a
single `if/elif` ladder in `Product.save()` into per-subclass methods.

---

## 5. Backward compatibility

The Phase A purchasable unification already migrated every cart/order
line FK to `Purchasable.id`. Because Django MTI uses **shared PKs**
(`material_product.product_ptr_id == product.purchasable_ptr_id ==
purchasable.id`), every existing FK keeps pointing at the same
conceptual row after a backfill splits the row into a subclass table.

Specifically preserved without code changes:

- `CartItem.purchasable_id` — unchanged.
- `OrderItem.purchasable_id` — unchanged.
- `Price.purchasable_id` — unchanged.
- `BundleProduct.product_id` — points at `store.Product` (the
  intermediate), which is still a real table.
- `MarkingPaper.purchasable_id` — unchanged.
- `TutorialEvents.store_product_id` — points at `store.Product` until
  Phase 4b retargets it at `store.TutorialProduct`.

Existing backward-compat properties on `store.Product`
(`.product`, `.product_variation`, `.variations`) keep working for
`MaterialProduct` rows because the `product_product_variation` FK is
still reachable through the subclass relation. Tutorial and Marking
rows will raise `AttributeError` if old code calls those properties;
Phase 4 PRs catch these via grep + test.

---

## 6. Migration Plan (phased dual-write)

### Phase 1 — Schema additions (1 PR)

- Add `MaterialProduct`, `TutorialProduct`, `MarkingProduct` models +
  empty tables.
- Add `marking.MarkingTemplate` model + empty table.
- Add `MaterialProduct/Tutorial/Marking` Kind values to the
  `Purchasable.Kind` enum (do not remove `'product'`).
- Add `MarkingPaper.marking_template` nullable FK.
- `MIGRATION_ASSERT_MODE=True` per CLAUDE.md.
- Verify with `python manage.py verify_schema_placement`.

**Reversible:** drop the four new tables.

### Phase 2 — Backfill (1 PR, foundations + backfill)

Phase 2 was reshaped during execution after inspecting real data.
The original design assumed simpler shapes; reality forced three
schema refinements before the backfill itself could run.

**2A — Schema refinements (3 AlterField migrations):**

1. **Expand `TutorialProduct.Format` to 23 real codes.** Phase 1
   shipped 5 placeholder values (F2F_1F, F2F_3F, F2F_5F, LIVE, REC).
   Real `catalog_product_variations` has 23 codes including
   `F2F_{1F,1PD,2F,3F,4F,5B,5F,6B,6H}`, `LO_{10H,1F,1PD,2F,2H,3F,4F,4H,5B,5F,6B,6H,8H}`,
   and `OC`. Drop `LIVE`/`REC` (no data).
2. **Relax `MarkingTemplate.code` UNIQUE → composite `(code, name)` UC.**
   Phase 1 shipped `code = CharField(unique=True)`. The catalog has
   rows with duplicate codes and distinct shortnames (`M` appears as
   both 'Mock Exam Marking' and 'Practice Exam Marking'). The
   composite UC preserves both while preventing exact-duplicate
   re-imports.
3. **Make `TutorialProduct.tutorial_location` nullable.** 98 OC
   (Online Classroom) tutorial products in the existing data have no
   `TutorialEvent` and no physical venue. NULL is the semantically
   correct value; avoids needing a sentinel TutorialLocation row.

**2B — Data migrations / backfill commands:**

4. **`marking/migrations/00XX_backfill_marking_templates.py`** —
   create one `MarkingTemplate` row per distinct
   `catalog_products.Product` row referenced by any PPV with
   `variation_type='Marking'`. Preserves the catalog's
   (code, shortname) distinctions via the composite UC. Sets
   `MarkingTemplate.id = catalog.Product.id` so the mapping is 1:1
   and easy to invert.
5. **`store/management/commands/split_products_by_kind.py`** — for
   every `store.Product` row:
   - If `variation_type ∈ {eBook, Printed, Hub}` → create
     `MaterialProduct(product_ptr_id=product.pk)` (empty marker
     subclass; PPV stays on Product through Phase 4), set
     `Purchasable.kind='material'`.
   - If `variation_type == 'Tutorial'` → resolve format from
     `ppv.product_variation.code` (1:1 enum mapping); resolve
     location from the first linked `TutorialEvent.location`, or
     leave NULL for OC products; resolve course template by matching
     `{subject_code}_{format_pattern}` against
     `tutorials.TutorialCourseTemplate.code`, or leave NULL if no
     template matches (operator can backfill later); create
     `TutorialProduct(product_ptr_id=product.pk, ...)`; set
     `Purchasable.kind='tutorial'`.
   - If `variation_type == 'Marking'` → look up `MarkingTemplate` by
     `id=ppv.product_id` (the 1:1 mapping from migration step 4),
     create `MarkingProduct(product_ptr_id=product.pk,
     marking_template_id=...)`; set `Purchasable.kind='marking'`.
   - Supports `--dry-run` (default), `--check` (audit unmapped
     formats and missing templates), and `--commit`.
   - Idempotent: re-runs skip rows that already have a subclass row.

**Verification:**
- `MaterialProduct + TutorialProduct + MarkingProduct row count == Product row count`.
- `Purchasable.objects.filter(kind='product').count() == 0`.
- `product_code` on every subclass row is byte-identical to its parent
  Product's `product_code` (regression net).

**Reversible:** `DELETE FROM material_products/tutorial_products/
marking_products`; reset `Purchasable.kind='product'`.

### Phase 3 — Dual-write (2 PRs)

- **Admin**: replace single `Product` admin with three per-subclass
  admins. Existing `create_addon_products` and `import_current_products`
  commands updated to instantiate `MaterialProduct`.
- **Serializers**: add subclass-aware factory in
  `store/serializers/product.py`. Old serializers remain functional via
  reverse accessors (`product.materialproduct`, etc.).
- No consumer changes yet.

**Verification:** create one MaterialProduct, one TutorialProduct, one
MarkingProduct via admin; confirm storefront list + add-to-cart +
checkout work for each.

### Phase 4 — Repoint consumers (one PR per app)

| Step | Consumer | Change |
|---|---|---|
| 4a | filtering / search | Switch facet queries to read subclass fields; branch by `Purchasable.kind`. |
| 4b | tutorials | `TutorialEvents.store_product` retargeted at `store.TutorialProduct`. |
| 4c | marking | `MarkingPaper.marking_template` becomes non-null; `purchasable` may narrow to `MarkingProduct` later. |
| 4d | cart / orders / bundle | Catch any serializer drilling `purchasable.product.product_product_variation` — handle Tutorial/Marking branch. |
| 4e | Kind cleanup | Remove `'product'` from `Kind.choices` (already 0 rows). |

Each PR follows TDD (RED → GREEN → REFACTOR) and has at least 24h
burn-in before the next step lands.

### Phase 5 — Drop legacy (1 PR, after Phase 4 burn-in)

- Move `product_product_variation` from `store.Product` to `store.MaterialProduct` via data migration: backfill `MaterialProduct.product_product_variation` from `Product.product_product_variation` for material rows, then `RemoveField('product', 'product_product_variation')`. Tutorial/Marking rows lose their PPV value at this point (their type info now lives entirely in subclass-specific fields).
- Delete `catalog_product_variations` rows with `variation_type IN ('Tutorial', 'Marking')`.
- Delete dangling `catalog_product_product_variations` rows.
- Delete `catalog_products.Product` rows whose code matches a
  `MarkingTemplate.code` (marking-template-only catalog rows).
- Optionally remove `'Tutorial'` and `'Marking'` choices from
  `ProductVariation.VARIATION_TYPE_CHOICES`.

---

## 7. Testing Strategy

### 7.1 Phase 1 — Schema

- TDD per new model: MTI parent linkage, schema-qualified `db_table`,
  required FK cascades, `save()` populates `Purchasable.kind`.
- `verify_schema_placement` extended to assert new tables in `acted`.
- `makemigrations --check --dry-run` — no unexpected drift.

### 7.2 Phase 2 — Backfill

- **Idempotency test** — running the split command twice produces the
  same row counts.
- **Invariant test** — every `Product` has exactly one subclass row.
- **Code preservation test** — `product_code` byte-identical on
  every subclass row vs. its Product parent.
- **Dry-run test** — `--dry-run` writes nothing.

### 7.3 Phase 3 — Dual-write

- Admin smoke checklist for each subclass (create → list → cart →
  checkout).
- Serializer parity test: legacy `Product` and new subclass row return
  the same `ProductSerializer.data.keys()`.

### 7.4 Phase 4 — Repoint consumers

- Per-consumer TDD.
- Filtering: facet snapshot before/after must match for unchanged
  dataset. `/api/products/filter-configuration/` response snapshot.
- Tutorial events: `event.store_product` resolves to `TutorialProduct`;
  `event.subject_code` via inheritance.
- Cart/order: existing Pact tests as regression guardrails.

### 7.5 Phase 5 — Drop legacy

- Pre-drop assertions: no rows with `kind='product'`; no orphan
  `Tutorial`/`Marking` variation rows.

---

## 8. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| 1 | Tutorial backfill maps wrong format for legacy rows whose `ProductVariation.code` doesn't cleanly match the new enum | M | H | Explicit `map_pv_to_format()` dict in split command. Dry-run dumps a (old code → new format) CSV for staff review before commit. Fail loud on unmapped entries. |
| 2 | Tutorial Product has no linked `TutorialEvent` at backfill time | L | M | Pre-flight `--check` listing all such Products. Either fix data or mark `is_active=False` and skip with logged warning. |
| 3 | Bundle composition breaks — `BundleProduct.product_id` references a row now split into a subclass | L | H | PK is preserved (MTI shared PK); FK still resolves to `store.Product` parent. No code change. Validated by Bundle Pact in Phase 4d. |
| 4 | Filtering/search joins `product_product_variation` for non-Material rows (returns empty after Phase 4a) | M | H | Audit `filtering/` and `products/views/search.py` for every PPV join. Branch by `kind`. Snapshot facet test as regression net. |
| 5 | Marking deadlines orphaned if `MarkingTemplate` backfill misses a code | L | M | Pre-flight code cross-check. Phase 4c writes `marking_template` on every paper and asserts NOT NULL before Phase 5. |
| 6 | Long-tail consumer bypasses Purchasable (third-party scripts, ad-hoc admin queries) | M | M | Grep audit (`product_product_variation` ~50 hits in repo). Phase 4 PRs enumerate each. Keep field nullable on `Product` until Phase 5 burn-in passes. |
| 7 | Schema cycle between catalog ↔ store ↔ tutorials/marking | L | L | All FKs one-way. Use string FK references in Django to avoid import order issues. |
| 8 | Performance regression from extra MTI join | L | L | Add `select_related` at hot paths. Benchmark `/api/products/` list before & after; budget < 5% latency increase. |
| 9 | Test DB doesn't reflect production catalog drift | M | M | Per CLAUDE.md, tests run against PostgreSQL not SQLite. Add a "production parity" management command dumping catalog/store row counts grouped by kind for staff review. |
| 10 | Rollback after Phase 4 if a consumer is missed in production | L | H | Phase 4 PRs land one at a time with ≥24h burn-in. `kind='product'` value stays defined until Phase 4e; revert the consumer PR to re-enable old path. |

---

## 9. Out of scope

- No change to `Bundle` / `BundleProduct` / `Price` schema.
- No change to `cart` / `orders` line schemas.
- No new admin UX (shadcn migration is a separate spec).
- Solution/addon products stay as `MaterialProduct` rows with
  `Purchasable.is_addon=True` — no fourth subclass (decision in §2,
  Goals).

---

## 10. Open questions resolved during brainstorming

| Question | Resolution |
|----------|------------|
| Where does specialization live? | 3-level MTI: `Purchasable → Product → {Material, Tutorial, Marking}` plus `Purchasable → GenericItem`. |
| What's the catalog usage for Tutorial / Marking? | They bypass catalog entirely. Material remains the sole catalog consumer. |
| What stays on `Product` parent? | `exam_session_subject` + `product_code`. Subclasses own everything else. |
| Migration strategy? | Phased dual-write (mirroring Phase A unification). |
| Where do Tutorial / Marking templates live? | Each app owns its own. `marking.MarkingTemplate` is new; `tutorials.TutorialCourseTemplate` already exists. |

---

## 11. Implementation phases at a glance

| Phase | PRs | Reversible? |
|-------|-----|-------------|
| 1 — Schema additions | 1 | Drop new tables |
| 2 — Backfill | 1–2 | `DELETE FROM` new tables; reset `kind` |
| 3 — Dual-write (admin + serializers) | 2 | Revert PRs |
| 4 — Repoint consumers (filtering, tutorials, marking, cart/orders, kind cleanup) | 5 | Revert PR (≥24h burn-in between each) |
| 5 — Drop legacy | 1 | One-way (post-burn-in) |

Each phase is independently mergeable. Production stays green at every
phase boundary.
