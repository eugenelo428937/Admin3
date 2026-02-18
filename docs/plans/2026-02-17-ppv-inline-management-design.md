# Expandable Product Rows with Inline PPV Management

**Date**: 2026-02-17
**Status**: Approved
**Branch**: 20260216-admin-panel-api

## Problem

The admin panel has CRUD pages for catalog_products and catalog_product_variations, but no UI for managing catalog_product_product_variations (PPV) - the junction table that links products to their variations.

## Decision

Embed PPV management directly inside the Products admin table via expandable rows, rather than creating a separate admin page.

## Design

### User Flow

1. Admin navigates to Products admin list
2. Each product row has an expand/collapse arrow button
3. Clicking expand lazy-loads the product's assigned variations from the API
4. Expanded area shows a mini-table of assigned variations (name, code, variation_type) with edit/remove actions
5. An add row at the bottom provides an Autocomplete to assign new variations
6. Autocomplete options are filtered to only show unassigned variations for that product

### Visual Layout

```
Product List Table
┌────┬──────┬───────────────┬──────────┬─────────┬────────┬──────────┬─────────┐
│    │ Code │ Full Name     │ Short    │ Descrip │ Active │ Buy Both │ Actions │
├────┼──────┼───────────────┼──────────┼─────────┼────────┼──────────┼─────────┤
│ ▶  │ TEST │ Test Product  │ test     │ -       │ Active │ No       │ V E D   │
├────┼──────┼───────────────┼──────────┼─────────┼────────┼──────────┼─────────┤
│ ▼  │ CM2  │ CM2 Course    │ cm2      │ desc    │ Active │ Yes      │ V E D   │
│    ┌──────────────────────────────────────────────────────────────────────────┤
│    │ Variations for CM2                                                      │
│    │ Name     │ Code │ Type    │ Actions                                     │
│    │ eBook    │ EB   │ eBook   │ [✏️] [🗑️]                                  │
│    │ Printed  │ PC   │ Printed │ [✏️] [🗑️]                                  │
│    │ [Autocomplete: search variations...            ] [➕]                   │
│    └──────────────────────────────────────────────────────────────────────────┤
│ ▶  │ SA1  │ SA1 Course    │ sa1      │ desc    │ Active │ No       │ V E D   │
└────┴──────┴───────────────┴──────────┴─────────┴────────┴──────────┴─────────┘
```

### Edit Mode

When pencil icon clicked on a variation row, the row transforms to:
```
│ [Autocomplete: Hub ▾] │ [✓ Save] [✗ Cancel]
```
Autocomplete shows unassigned variations plus the currently-selected one.

### Data Flow

```
Expand row → GET /api/catalog/product-product-variations/?product={id}
             (returns PPV records with nested variation details)

Add row    → All variations: GET /api/catalog/product-variations/ (cached)
             Filter: remove already-assigned variation IDs
             Confirm: POST /api/catalog/product-product-variations/
             Refresh expanded rows

Edit row   → Same autocomplete as Add (+ current variation in options)
             Confirm: PUT /api/catalog/product-product-variations/{ppv_id}/
             Refresh expanded rows

Remove     → Confirm dialog
             DELETE /api/catalog/product-product-variations/{ppv_id}/
             Refresh expanded rows
```

## Backend Changes

### 1. New Detail Serializer

Add `ProductProductVariationDetailSerializer` to `catalog/serializers/product_serializers.py`:
- Includes nested variation fields: `variation_name`, `variation_code`, `variation_type`
- Used for list/retrieve (reads); existing `ProductProductVariationAdminSerializer` used for create/update (writes)

### 2. Product Filter on PPV ViewSet

Modify `ProductProductVariationViewSet` in `catalog/views/product_variation_views.py`:
- Override `get_queryset()` to support `?product={id}` filter parameter
- Use detail serializer for reads, admin serializer for writes
- Add `pagination_class = None` (small result sets per product)

## Frontend Changes

### 1. ProductTable.js (Modify)

- Add expand/collapse IconButton column (KeyboardArrowDown/KeyboardArrowUp)
- Track `expandedProductId` state (only one expanded at a time)
- Render `Collapse` component with `ProductVariationsPanel` inside

### 2. ProductVariationsPanel.js (New)

Props: `productId`, `onError`

State:
- `variations` - assigned PPV records for this product
- `allVariations` - all ProductVariation records (for autocomplete)
- `loading` - initial fetch state
- `editingId` - PPV id being edited (null = view mode)
- `addMode` - whether add row autocomplete is active

Behavior:
- On mount: fetch PPVs filtered by productId
- Compute unassigned = allVariations minus assigned variation IDs
- Add: POST new PPV, refresh list
- Edit: PUT updated PPV, refresh list
- Remove: confirm dialog, DELETE PPV, refresh list

### 3. Service Updates

Add to `productProductVariationService.js`:
- `getByProduct(productId)` - GET with `?product={productId}` param
- Add `list()` method (for pagination support if needed later)

### 4. No Route Changes

PPV management is embedded in the existing ProductList page. No new routes needed.

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/catalog/serializers/product_serializers.py` | Add detail serializer |
| `backend/catalog/views/product_variation_views.py` | Add product filter + dual serializer |
| `frontend/services/productProductVariationService.js` | Add `getByProduct()` |
| `frontend/products/ProductTable.js` | Add expandable rows |
| `frontend/products/ProductVariationsPanel.js` | **Create** - inline PPV management |
| `frontend/products/__tests__/ProductVariationsPanel.test.js` | **Create** - tests |
| `frontend/products/__tests__/ProductTable.test.js` | Modify - test expand/collapse |

## Constraints

- `unique_together = ('product', 'product_variation')` on PPV model prevents duplicate assignments
- ProductVariation table is small (~5 rows) so autocomplete loads all without search endpoint
- Lazy loading on expand keeps initial ProductList page load fast
