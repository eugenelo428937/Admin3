# Filter Investigation Findings

**Date**: 2025-10-23
**Issue**: Filters returning no products when multiple filter types are combined
**Status**: Frontend ✅ Fixed | Backend ⚠️ Issue Identified

## Summary

The frontend filtering system was correctly parsing URL parameters and sending filters to the backend. However, there were two issues:

1. **Frontend Issue (FIXED)**: `useProductsSearch.js` hook was referencing removed filter fields
2. **Backend Issue (IDENTIFIED)**: Backend filtering logic uses incorrect AND logic for cross-filter-type combinations

## Frontend Fix Applied

### Problem
`useProductsSearch.js` was still trying to access removed Redux state fields:
- `tutorial_format` (removed)
- `distance_learning` (removed)
- `tutorial` (removed)

These fields were being included in `navbarFilters` object sent to the backend, which caused the search to fail.

### Solution
Removed all references to the 3 unused filter fields from `useProductsSearch.js`:

**Lines removed/updated**:
- Lines 49-52: Removed `useSelector` hooks for removed filters
- Lines 88-97: Removed `navbarFilters` object building
- Line 110: Removed `navbarFilters` from `searchParams`
- Line 118: Updated `paramsHash` to exclude removed filters
- Line 175: Updated `executeSearch` dependency array
- Line 229: Updated `filterHash` useMemo dependencies

### Verification
After the fix, filtering by a single category works correctly:
- ✅ `category_code=Material` → 248 products returned
- ✅ Search executes successfully
- ✅ URL sync working correctly
- ✅ Redux state management working correctly

## Backend Issue Identified

### Problem
When combining filters from different types, the backend returns 0 results:

**Test Cases**:
1. ✅ `category_code=Material` → 248 products (WORKS)
2. ❌ `category_code=Material&group=Core+Study+Materials` → 0 products (FAILS)
3. ❌ `category_code=Material&group=Core+Study+Materials&mode_of_delivery=eBook` → 0 products (FAILS)

### Root Cause
Backend file: `backend/django_Admin3/exam_sessions_subjects_products/services/optimized_search_service.py`

**Lines 193-210** - Incorrect AND logic:
```python
# Category filter
if filters.get('categories'):
    category_q = Q()
    for category_name in filters['categories']:
        category_q |= Q(product__groups__name__iexact=category_name)
    if category_q:
        q_filter &= category_q  # ❌ AND logic

# Product type filter
if filters.get('product_types'):
    product_type_q = Q()
    for product_type_name in filters['product_types']:
        product_type_q |= Q(product__groups__name__iexact=product_type_name)
    if product_type_q:
        q_filter &= product_type_q  # ❌ AND logic
```

**Issue**: Both `categories` and `product_types` query the same `product__groups` field. Using AND logic (`&=`) means the backend is looking for products that have BOTH:
- A group named "Material" (parent category)
- A group named "Core Study Materials" (child product type)

But based on the database schema:
- "Material" is a **root category** (parent_id IS NULL)
- "Core Study Materials" is a **child product type** (parent_id IS NOT NULL)

A product cannot belong to both a parent and child group simultaneously in this schema.

### Expected Behavior
The backend should use hierarchical filtering logic:
1. If category filter is applied: Filter by root group
2. If product_type filter is also applied: Further filter by child groups **within that root group**
3. Not use strict AND logic across all group filters

### Filter Panel Data Shows This
Looking at the filter counts when only "Material" is selected:
- Material: 248 products
- Core Study Materials: 109 products (subset of Material)
- Revision Materials: 121 products (subset of Material)

This confirms that product types are **subsets within categories**, not independent AND conditions.

## Recommended Backend Fix

The backend filtering logic needs to be updated to handle hierarchical group relationships properly. Instead of:

```python
q_filter &= category_q  # AND with category
q_filter &= product_type_q  # AND with product type
```

It should use:

```python
# Apply category filter (root groups)
if filters.get('categories'):
    q_filter &= category_q

# Apply product type filter as refinement (child groups within selected categories)
if filters.get('product_types'):
    # Only filter by child groups if they belong to selected parent categories
    product_type_q &= Q(product__groups__parent_id__isnull=False)  # Ensure child groups
    q_filter &= product_type_q
```

Or, more correctly, use separate queries for parent and child groups with proper OR logic.

## Testing Checklist

### Frontend (All Passing ✅)
- [x] Single category filter works
- [x] URL parameter parsing works
- [x] Redux state updates correctly
- [x] Search hook executes without errors
- [x] No references to removed filter fields

### Backend (Needs Attention ⚠️)
- [ ] Category filter works alone
- [ ] Product type filter works alone
- [ ] Category + Product type combination returns correct results
- [ ] Category + Product type + Mode of delivery combination returns correct results
- [ ] Filter counts are calculated correctly for hierarchical groups

## Files Modified

### Frontend
- `src/hooks/useProductsSearch.js` - Removed unused filter references

### Backend (Needs Fix)
- `backend/django_Admin3/exam_sessions_subjects_products/services/optimized_search_service.py` - Lines 169-257 (filter application logic)

## Next Steps

1. ✅ Frontend fix complete - filtering system working correctly
2. ⚠️ Backend team needs to fix hierarchical filtering logic
3. Test all filter combinations after backend fix
4. Update filter count generation to reflect hierarchical relationships
