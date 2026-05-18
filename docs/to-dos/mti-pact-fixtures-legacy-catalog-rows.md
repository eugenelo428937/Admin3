# MTI — Drop legacy catalog rows from pact fixtures

> Created 2026-05-18. Tracks the deferred cleanup of legacy
> catalog-product rows that pact state handlers still create after
> Phase 5 decoupled Tutorial/Marking from the catalog.

## Background

After Phase 5, `TutorialProduct` and `MarkingProduct` no longer link
to `catalog.Product` / `catalog.ProductVariation` /
`catalog.ProductProductVariation`. Their identity is on subclass
fields.

The pact provider's state handlers
([`backend/django_Admin3/pact_tests/state_handlers.py`](../../backend/django_Admin3/pact_tests/state_handlers.py))
were written ESSP-era and still create the legacy catalog rows for
consistency with older consumer contracts.

PR #123 fixed `setup_tutorial_catalog_product` so the
**TutorialProduct itself** is built via the new (`tutorial_location`,
`format`) shape, but kept the legacy `TUT01` catalog product +
`TLONCM2` variation + PPV creation **disconnected** from the store
row, on the comment:

> kept for any caller that asserts on a catalog row with fullname
> containing 'tutorial' (e.g. `/products/all/`).

That's dead-link data. Either drop it or migrate the consumer.

## What needs to be done

### Step 1 — find consumers that need a catalog "tutorial" row

```bash
rg -n "fullname__icontains.*tutorial|fullname__icontains.*Tutorial" \
    --type py backend/django_Admin3/
```

Likely hits in `catalog/views/` and `products/views/`. For each, check:

- Does the consumer endpoint still need to surface catalog templates
  for tutorials? If so, the migration is to switch it to query
  `TutorialProduct` directly (or `TutorialCourseTemplate`).
- Or is it a pact-only assertion that we can drop from the consumer
  side?

### Step 2 — clean up the state handler

Once consumers are migrated, delete from
[`setup_tutorial_catalog_product`](../../backend/django_Admin3/pact_tests/state_handlers.py):

```python
# Remove these — no longer linked to TutorialProduct
tutorial_product, _ = CatalogProduct.objects.get_or_create(
    code='TUT01',
    defaults={'fullname': 'CM2 Tutorial London', ...},
)
```

And drop the catalog product from the return tuple:

```python
# before
return tutorial_store_product, tutorial_product

# after
return tutorial_store_product
```

Callers (`state_tutorial_events_exist`, `state_tutorial_products_exist`)
already discard the catalog return.

### Step 3 — same audit for Marking state handlers

Search `state_handlers.py` for the marking equivalents:

```bash
rg -n "Marking\|marking_template\|MarkingProduct" backend/django_Admin3/pact_tests/
```

Check if any state handler still creates legacy catalog rows for
marking that aren't linked to a real `MarkingProduct.marking_template`.

## Verification gates

- All pact provider state handlers still verify.
- `python manage.py test pact_tests` green.
- No new errors in CI for `test-pact-provider`.

## Why this is deferred

PR #123 had to get CI green; deleting the dead-link rows is a
follow-up audit that touches consumer contracts. Doing it inline would
have blown the PR's scope.

## Related

- Phase 5 plan:
  [docs/superpowers/plans/2026-05-15-product-mti-specialization-phase-5-drop-legacy.md](../superpowers/plans/2026-05-15-product-mti-specialization-phase-5-drop-legacy.md)
- See also: [[mti-search-polymorphic-tutorial-marking]] — the
  `/products/all/` consumer is the same one referenced in step 1.
