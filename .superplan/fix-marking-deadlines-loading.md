# Plan: Fix Marking Product Cards Stuck on "Loading Deadlines"

## Problem Summary

Marking product cards display "Loading deadlines..." indefinitely and never refresh to show actual deadline data. The `/api/markings/papers/bulk-deadlines/` API is called successfully and returns data, but the UI doesn't update.

## Root Cause Analysis

**Investigation Path:**
1. Traced data flow from `useProductCardHelpers` → `ProductList` → `ProductGrid` → `MaterialProductCard` → `MarkingProductCard`
2. Found `MaterialProductCard` has a custom `React.memo` comparison function at lines 970-979
3. This comparison function **does NOT include `bulkDeadlines` or `allEsspIds`** in its prop comparison

**The Bug:**
```javascript
// MaterialProductCard.js lines 970-979
(prevProps, nextProps) => {
   return (
      prevProps.product?.id === nextProps.product?.id &&
      prevProps.product?.essp_id === nextProps.product?.essp_id &&
      prevProps.product?.variations === nextProps.product?.variations &&
      prevProps.product?.prices === nextProps.product?.prices &&
      prevProps.onAddToCart === nextProps.onAddToCart
      // ❌ MISSING: bulkDeadlines and allEsspIds comparison!
   );
}
```

**What happens:**
1. Initial render: `bulkDeadlines = {}` (empty object)
2. `useProductCardHelpers` fetches bulk deadlines asynchronously
3. `ProductGrid` receives updated `bulkDeadlines` prop
4. `MaterialProductCard` receives new `bulkDeadlines` prop BUT its memo comparison ignores it
5. `MaterialProductCard` doesn't re-render → `MarkingProductCard` never gets updated props
6. `MarkingProductCard.useEffect` runs only once with empty `bulkDeadlines`, stays loading forever

## Solution

Add `bulkDeadlines` and `allEsspIds` to the `MaterialProductCard` memo comparison function.

## Implementation Tasks

### Task 1: Fix MaterialProductCard memo comparison
**File:** `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
**Lines:** 970-979

**Change:**
```javascript
// Before (broken)
(prevProps, nextProps) => {
   return (
      prevProps.product?.id === nextProps.product?.id &&
      prevProps.product?.essp_id === nextProps.product?.essp_id &&
      prevProps.product?.variations === nextProps.product?.variations &&
      prevProps.product?.prices === nextProps.product?.prices &&
      prevProps.onAddToCart === nextProps.onAddToCart
   );
}

// After (fixed)
(prevProps, nextProps) => {
   return (
      prevProps.product?.id === nextProps.product?.id &&
      prevProps.product?.essp_id === nextProps.product?.essp_id &&
      prevProps.product?.variations === nextProps.product?.variations &&
      prevProps.product?.prices === nextProps.product?.prices &&
      prevProps.onAddToCart === nextProps.onAddToCart &&
      prevProps.bulkDeadlines === nextProps.bulkDeadlines &&
      prevProps.allEsspIds === nextProps.allEsspIds
   );
}
```

### Task 2: Verify MarkingProductCard receives updated props
After the fix, verify:
- `bulkDeadlines` flows correctly to `MarkingProductCard`
- `MarkingProductCard.useEffect` triggers when `bulkDeadlines` updates
- "Loading deadlines..." message changes to actual deadline info

### Task 3: Manual testing verification
1. Navigate to products page with marking products
2. Confirm marking cards show deadline info (not "Loading deadlines...")
3. Verify deadline data displays correctly
4. Check browser console for any errors

## Risk Assessment

**Low risk fix:**
- Single file change
- Adds missing comparison checks to existing memo function
- No logic changes to MarkingProductCard
- No API changes

**Potential side effects:**
- MaterialProductCard will re-render when bulkDeadlines changes (intended behavior)
- Minor performance impact for non-marking products (acceptable - they'll simply compare equal references)

## Testing Strategy

1. **Unit test:** Verify MaterialProductCard re-renders when bulkDeadlines changes
2. **Integration test:** Verify MarkingProductCard shows deadlines after bulk fetch completes
3. **Manual test:** Load products page, verify marking cards show actual deadlines

## Files Changed

| File | Change |
|------|--------|
| `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js` | Add bulkDeadlines and allEsspIds to memo comparison |
