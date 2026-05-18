# MTI — Surface Tutorial / Marking products as first-class in search

> Created 2026-05-18. Tracks the deferred work to make search and
> listing responses properly polymorphic across all three store
> product kinds (Material / Tutorial / Marking) after Phase 5.

## Background

Phase 5 moved Tutorial/Marking products off the catalog
`ProductProductVariation` link onto subclass-local FKs
(`tutorial_location`, `format`, `marking_template`). Their variation
semantics no longer flow through the catalog.

The search service and grouped-products serializer were written
ESSP-era around `product_product_variation.product` — i.e.,
material-shaped. When the pact provider tests started producing real
TutorialProducts with no PPV (PR #123), `/api/search/advanced-fuzzy/`
crashed with `'NoneType' object has no attribute 'product'`.

## Current state (after PR #123)

The search path **tolerates** Tutorial/Marking but treats them as
second-class:

- [`SearchService._build_searchable_text`](../../backend/django_Admin3/search/services/search_service.py)
  — falls back to `subject_code + product_code` when PPV is None
  (matchable text exists but is sparse).
- [`SearchService._calculate_fuzzy_score`](../../backend/django_Admin3/search/services/search_service.py)
  — `product_name` falls back to `product_code` when PPV is None.
- [`StoreProductListSerializer.serialize_grouped_products`](../../backend/django_Admin3/search/serializers.py)
  — **skips** rows with no PPV entirely. They never reach the
  response.

The Phase 5 design note in those files says Tutorial/Marking should be
"surfaced through their own kind-specific endpoints." That work hasn't
landed yet.

## What needs to be built

### 1. Decide the response shape for Tutorial / Marking

Material rows group by `(exam_session_subject, catalog_product)` and
emit `variations[]`. That shape doesn't fit Tutorial/Marking — their
"variations" are formats / locations / templates.

Two options:

| Option | Pros | Cons |
|---|---|---|
| **Polymorphic single endpoint** — `/api/search/` returns rows with `kind`, and the frontend renders each kind differently | Single search box; one network call | Frontend has to branch on kind |
| **Per-kind endpoints** — `/api/search/materials/`, `/api/search/tutorials/`, `/api/search/marking/` | Each shape is clean and validated | More endpoints; frontend coordinates 3 calls |

Phase 5 doc-comment leans toward per-kind endpoints. Validate with the
frontend before committing.

### 2. Build the kind-specific serializers

If per-kind endpoints win:

- `TutorialProductSearchSerializer` — group by
  `(exam_session_subject, format)` with location list per group, or
  group by `tutorial_location` with format list — depends on UX.
- `MarkingProductSearchSerializer` — group by
  `(exam_session_subject, marking_template)`.

### 3. Update fuzzy-text generation

Right now `_build_searchable_text` falls back to just subject + code
for non-Material. To make tutorials/marking actually findable by name,
add:

- For Tutorial: `tutorial_location.name`, format display name (from
  `TutorialProduct.Format` choices), `tutorial_course_template.name` if
  set.
- For Marking: `marking_template.name`, `marking_template.code`.

### 4. Adjust the listing endpoint

The same gap likely exists in `/api/store/products/` (the non-fuzzy
listing). Audit
[`backend/django_Admin3/store/views/`](../../backend/django_Admin3/store/) for
PPV access that assumes Material.

## Acceptance criteria

- Searching for "London" returns the London face-to-face TutorialProduct.
- Searching for "mock marking" returns the mock-marking MarkingProduct.
- Listings show Tutorial/Marking rows alongside Material rows.
- `/api/search/advanced-fuzzy/` does not crash on any kind.

## Verification gates

- All search tests still pass.
- New tests cover the polymorphic / per-kind serializer.
- Pact consumer contract updated if the response shape changes.

## Why this is deferred

PR #123 has the surgical "don't crash" fix. Surfacing Tutorial/Marking
properly is a feature/UX decision and needs frontend coordination,
which is out of scope for a Phase 5 cleanup PR.

## Related

- Phase 5 plan:
  [docs/superpowers/plans/2026-05-15-product-mti-specialization-phase-5-drop-legacy.md](../superpowers/plans/2026-05-15-product-mti-specialization-phase-5-drop-legacy.md)
- Fuzzy search broader optimisation backlog:
  [fuzzy-search-optimization.md](fuzzy-search-optimization.md)
- See also: [[mti-phase-6-remove-parent-ppv-scaffolding]]
