# Product Navigation Bug Fix - 2025-10-25

## Issue Summary
**Reported**: 2025-10-25
**Status**: ✅ FIXED
**Severity**: Medium
**Impact**: Navbar product links (e.g., "Core Reading") showed product IDs instead of names in Active filter pills

## Problem Description

When users clicked product links in the navbar (e.g., "Core Reading", "Core Revision"), the Active filter pills displayed:
- **Actual**: "Product: 75" (showing product ID)
- **Expected**: "Product: Core Reading" (showing product name)

### User Report
> "When I am testing the Products link on the navbar, the product link does not work. For example, when I click on the 'Core Reading' link, the products page does not only show Core Reading products. The Active filter pill shows 'Product: 75' but it should show 'Core Reading'"

## Root Cause Analysis

Three bugs were discovered that prevented the products filter from working correctly:

### Bug 1: Products Filter Not Sent to API
**File**: `frontend/react-Admin3/src/hooks/useProductsSearch.js:105`
**Issue**: Products filter was explicitly excluded from API call
**Code**: Comment said "products filter removed - handled by searchQuery or navbar links"
**Impact**: Backend never received products filter, couldn't return product metadata

### Bug 2: Products Filter Not in Duplicate Request Prevention Hash
**File**: `frontend/react-Admin3/src/hooks/useProductsSearch.js:133`
**Issue**: `paramsHash` didn't include `filters.products`
**Impact**: Even if products filter was sent, duplicate request check would skip the API call

### Bug 3: Products Filter Not in useEffect Dependency Hash
**File**: `frontend/react-Admin3/src/hooks/useProductsSearch.js:253`
**Issue**: `filterHash` in useMemo didn't include `filters.products`
**Impact**: useEffect didn't detect products filter changes, so search wasn't triggered

**Bug 3 was the critical one** - Redux state had correct value `products: [75]`, but the useEffect hook that triggers searches wasn't watching the products filter.

## Investigation Timeline

1. **Initial Investigation**: Examined filterRegistry.js `getDisplayValue` function
2. **First Fix Attempt**: Updated getDisplayValue to look up product names from filterCounts - didn't work
3. **Debug Logging Added**: Console logs showed `counts: {}` - filterCounts.products was empty
4. **Backend Analysis**: Found backend only populates filterCounts when products in applied_filters
5. **Frontend Analysis**: Found products filter excluded from API call (line 106 comment)
6. **Redux State Check**: Confirmed Redux had `products: [75]` (correct)
7. **Search Not Executing**: No `[useProductsSearch] DEBUG: Search params:` log
8. **Root Cause Found**: filterHash didn't include products, so useEffect didn't trigger search

## Solution

### Fix 1: Include Products in API Call
```javascript
// Line 105: useProductsSearch.js
filters: {
  subjects: filters.subjects || [],
  categories: filters.categories || [],
  product_types: filters.product_types || [],
  products: filters.products || [], // ✅ ADDED
  modes_of_delivery: filters.modes_of_delivery || [],
},
```

### Fix 2: Include Products in Duplicate Request Hash
```javascript
// Line 133: useProductsSearch.js
const paramsHash = `${searchQuery||''}|${filters.subjects?.join(',')||''}|${filters.categories?.join(',')||''}|${filters.product_types?.join(',')||''}|${filters.products?.join(',')||''}|${filters.modes_of_delivery?.join(',')||''}|${currentPage}|${pageSize}`;
```

### Fix 3: Include Products in useEffect Dependency Hash
```javascript
// Line 253: useProductsSearch.js
const filterHash = useMemo(() => {
  return `${searchQuery||''}|${filters.subjects?.join(',')||''}|${filters.categories?.join(',')||''}|${filters.product_types?.join(',')||''}|${filters.products?.join(',')||''}|${filters.modes_of_delivery?.join(',')||''}|${currentPage}|${pageSize}`;
}, [searchQuery, filters.subjects, filters.categories, filters.product_types, filters.products, filters.modes_of_delivery, currentPage, pageSize]);
```

### Debug Logging Added (Backend)
```python
# optimized_search_service.py lines 417-439
logger.info(f"[FILTER-COUNTS] Processing products filter: {applied_filters.get('products')}")
logger.info(f"[FILTER-COUNTS] Looking up Product with id={product_id}")
logger.info(f"[FILTER-COUNTS] Found product: {product.shortname or product.name}")
```

### Debug Logging Added (Frontend)
```javascript
// useProductsSearch.js lines 51-58
console.log('[useProductsSearch] Redux filters state:', {
  subjects: filters.subjects,
  categories: filters.categories,
  product_types: filters.product_types,
  products: filters.products,
  modes_of_delivery: filters.modes_of_delivery,
});
```

## Files Modified

1. **Frontend**:
   - `frontend/react-Admin3/src/hooks/useProductsSearch.js` (3 bug fixes + debug logging)
   - `frontend/react-Admin3/src/store/filters/filterRegistry.js` (getDisplayValue already correct)
   - `frontend/react-Admin3/src/components/Product/ActiveFilters.js` (debug logging only)

2. **Backend**:
   - `backend/django_Admin3/exam_sessions_subjects_products/services/optimized_search_service.py` (debug logging)

## Verification

### Test Results
```
[useProductsSearch] Redux filters state: {
  products: [75]  // ✅ Redux state correct
}

[useProductsSearch] DEBUG: Search params: {
  filters: {
    products: [75]  // ✅ Sent to API
  }
}

[SEARCH] Received filters: {'products': [75], ...}  // ✅ Backend receives
[FILTER-COUNTS] Processing products filter: [75]     // ✅ Backend processes
[FILTER-COUNTS] Found product: Core Reading (id=75)  // ✅ Backend finds name
```

### UI Verification
- Click "Core Reading" in navbar
- Active filter pill shows: "Product: Core Reading" ✅
- Product list filters correctly ✅

## Related Systems

### Filter System Architecture
- **Redux State**: `state.filters.products` (managed by filtersSlice)
- **Navigation Actions**: `navSelectProduct(productId)` dispatched from MainNavBar
- **URL Sync**: Middleware updates URL automatically
- **Search Hook**: useProductsSearch monitors filter changes via useEffect
- **Backend**: optimized_search_service.py populates filterCounts['products']

### Product ID Source
- Navbar uses `Product.id` from `acted_products` table (master product catalog)
- Backend matches using `ExamSessionSubjectProduct.product_id` (foreign key to Product)
- FilterCounts returns product metadata: `{count, name, id}`

## Prevention

To prevent similar issues in the future:

1. **All filter types should be included in**:
   - API call parameters (useProductsSearch.js line ~105)
   - Duplicate request hash (useProductsSearch.js line ~133)
   - useEffect dependency hash (useProductsSearch.js line ~253)

2. **When adding new filters**, use checklist:
   - [ ] Add to Redux state (filtersSlice.js)
   - [ ] Add to selectFilters selector (filtersSlice.js)
   - [ ] Add to API call parameters (useProductsSearch.js)
   - [ ] Add to paramsHash (useProductsSearch.js)
   - [ ] Add to filterHash dependencies (useProductsSearch.js)
   - [ ] Add to URL sync middleware (urlSyncMiddleware.js)
   - [ ] Add backend filtering logic (optimized_search_service.py)
   - [ ] Add filterCounts population (optimized_search_service.py)

3. **Debug logging** proved essential:
   - Redux state logging in hooks
   - API parameter logging
   - Backend filter processing logging
   - Keep debug logs for troubleshooting

## Timeline
- **2025-10-25 14:00**: Issue reported by user
- **2025-10-25 14:15**: Root cause identified (3 bugs)
- **2025-10-25 14:30**: All fixes implemented
- **2025-10-25 14:35**: Verification complete
- **2025-10-25 14:40**: Documentation created

## Status
✅ **RESOLVED** - All three bugs fixed and verified working
