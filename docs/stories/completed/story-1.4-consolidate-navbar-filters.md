# Story 1.4: Consolidate Navbar Filters in useProductsSearch Hook

**Epic**: Product Filtering State Management Refactoring
**Phase**: 1 - Critical Fixes (Priority 0)
**Story ID**: 1.4
**Estimated Effort**: 1 day
**Dependencies**: Story 1.2 (navbar filters must exist in Redux)

---

## User Story

As a **developer**,
I want **useProductsSearch to use Redux navbar filters instead of parsing URL directly**,
so that **hidden filters are eliminated and API calls use consolidated state**.

---

## Story Context

### Problem Being Solved

Currently, `useProductsSearch` hook extracts navbar filters directly from URL parameters (lines 91-99) and sends them as a **separate** `navbarFilters` object to the API:

```javascript
// Current implementation (PROBLEM)
const navbarFilters = {};
if (queryParams.get('tutorial_format')) navbarFilters.tutorial_format = queryParams.get('tutorial_format');
if (queryParams.get('group')) navbarFilters.group = queryParams.get('group');
// ... more URL parsing

const searchParams = {
    filters: { ...reduxFilters },    // Redux filters
    navbarFilters: { ...navbarFilters }, // Separate URL-based filters
    // ...
};
```

This creates the **dual filter system** problem:
- **Redux filters** (visible in FilterPanel)
- **Navbar filters** (hidden, parsed from URL)
- Both sent to API separately → Backend applies AND logic → Zero results if conflicting

**Solution**: Use Redux for ALL filters (navbar filters added in Story 1.2), eliminating URL parsing.

### Existing System Integration

**Integrates with**:
- `useProductsSearch.js` hook (lines 91-116)
- Story 1.2 Redux state (navbar filters now in Redux)
- RTK Query API (`/api/products/search`)
- Backend API contract (current format maintained)

**Technology**:
- React custom hooks
- Redux `useSelector` hook
- RTK Query for API calls
- Axios for HTTP

**Follows Pattern**:
- Hooks use Redux selectors for state
- API call structure matches existing format (backward compatible)

**Touch Points**:
- URL parameter extraction (lines 91-99 - DELETE)
- `navbarFilters` object construction (DELETE)
- API call parameters (consolidate filters)

---

## Acceptance Criteria

### Functional Requirements

**AC1**: Remove URL parameter extraction logic (lines 91-99) from useProductsSearch.js
- Delete: `const queryParams = new URLSearchParams(location.search)`
- Delete: All `if (queryParams.get(...))` checks for navbar filters
- Delete: `navbarFilters` object construction

**AC2**: Remove `navbarFilters` object construction from executeSearch function
- Delete: `const navbarFilters = {}` declaration
- Delete: All lines adding properties to navbarFilters
- Navbar filters now come from Redux, not URL

**AC3**: Update API call to use `filters` object only (consolidated navbar filters)
- Navbar filters are already in Redux (Story 1.2)
- `selectFilters` selector returns them automatically
- API receives consolidated filter object

**AC4**: Backend receives same data format (temporary adapter maintains API contract)
- **Challenge**: Backend currently expects `filters` + `navbarFilters` as separate objects
- **Solution**: Create adapter to split Redux state back into two objects for API
- **Future**: Phase 2 can simplify backend to accept single filters object

**AC5**: Debounce timing (250ms) remains unchanged
- Existing debounce logic preserved
- No change to API call frequency
- User experience unchanged

**AC6**: RTK Query cache keys reflect consolidated filters
- Cache keys based on Redux state, not URL
- Cache invalidation logic unchanged
- 5-minute cache duration preserved

**AC7**: Unit tests verify consolidated filter API calls
- Test: useProductsSearch uses Redux navbar filters
- Test: URL parameters not parsed for navbar filters
- Test: API receives correct payload structure
- Mock Redux state with navbar filters

### Integration Requirements

**AC8**: Search results match previous behavior with same filters applied
- Same filter values → same API call → same results
- User doesn't perceive any change
- Filtering logic works identically

**AC9**: API call count remains the same (no duplicate calls)
- Single API call per filter change (after debounce)
- No race conditions causing extra calls
- Network tab shows same call pattern as before

**AC10**: Filter debouncing works correctly
- 250ms delay before API call
- Rapid filter changes batch correctly
- Only final state triggers API call

### Quality Requirements

**AC11**: Code is simpler and more maintainable
- Remove 10+ lines of URL parsing
- Single source for all filters (Redux)
- Easier to understand and debug

**AC12**: Error handling preserved
- Try-catch blocks maintained
- Error states handled correctly
- Loading states work properly

**AC13**: TypeScript types (if used) updated correctly
- Filter types include navbar filters
- API payload types match new structure
- No type errors in components

---

## Technical Implementation Guide

### File Structure

**Modified Files**:
```
frontend/react-Admin3/src/hooks/
├── useProductsSearch.js               # Remove URL parsing, use Redux
└── __tests__/
    └── useProductsSearch.test.js      # Update tests
```

### Implementation Steps

#### Step 1: Remove URL Parameter Extraction

**File**: `frontend/react-Admin3/src/hooks/useProductsSearch.js`

**Find lines 91-99** (URL parsing for navbar filters):

**BEFORE** (current implementation):
```javascript
import { useLocation } from 'react-router-dom';

// Inside hook
const location = useLocation();

// Parse navbar filters from URL
const queryParams = new URLSearchParams(location.search);
const navbarFilters = {};
if (queryParams.get('tutorial_format')) navbarFilters.tutorial_format = queryParams.get('tutorial_format');
if (queryParams.get('group')) navbarFilters.group = queryParams.get('group');
if (queryParams.get('variation')) navbarFilters.variation = queryParams.get('variation');
if (queryParams.get('distance_learning')) navbarFilters.distance_learning = queryParams.get('distance_learning');
if (queryParams.get('tutorial')) navbarFilters.tutorial = queryParams.get('tutorial');
if (queryParams.get('product')) navbarFilters.product = queryParams.get('product');
```

**AFTER** (Story 1.4 implementation):
```javascript
// DELETE: useLocation import (if not used elsewhere)
// DELETE: location variable
// DELETE: All URL parsing logic above

// Navbar filters now come from Redux (Story 1.2)
// No additional code needed - filters selector already includes them
```

#### Step 2: Create API Payload Adapter

**Find executeSearch function** (around lines 100-116):

**BEFORE**:
```javascript
const executeSearch = useCallback(async (forceSearch = false) => {
    // ... loading logic

    const searchParams = {
        filters: {
            ...filters, // Redux filters (subjects, categories, etc.)
            ...(searchQuery && { searchQuery }),
        },
        navbarFilters, // Separate URL-based filters
        pagination: {
            page: currentPage,
            page_size: pageSize,
        },
        options: {
            include_bundles: true,
            include_analytics: false,
        },
    };

    // API call
    const result = await dispatch(productsApi.endpoints.searchProducts.initiate(searchParams));
}, [filters, searchQuery, currentPage, pageSize, ...]);
```

**AFTER** (with adapter for backward compatibility):
```javascript
/**
 * Build API payload from Redux filters
 * TEMPORARY: Backend expects separate 'filters' and 'navbarFilters' objects
 * TODO Phase 2: Simplify backend to accept single filters object
 */
const buildApiPayload = useCallback((reduxFilters) => {
    // Extract navbar filters from Redux state
    const {
        tutorial_format,
        distance_learning,
        tutorial,
        subjects,
        categories,
        product_types,
        products,
        modes_of_delivery,
        searchQuery,
    } = reduxFilters;

    // Main filters (visible in FilterPanel)
    const mainFilters = {
        subjects,
        categories,
        product_types,
        products,
        modes_of_delivery,
        ...(searchQuery && { searchQuery }),
    };

    // Navbar filters (now from Redux, not URL)
    const navbarFiltersFromRedux = {};

    if (tutorial_format) {
        navbarFiltersFromRedux.tutorial_format = tutorial_format;
    }

    if (distance_learning) {
        navbarFiltersFromRedux.distance_learning = String(distance_learning); // Convert boolean to string
    }

    if (tutorial) {
        navbarFiltersFromRedux.tutorial = String(tutorial); // Convert boolean to string
    }

    // Map product_types to 'group' for navbar filters (API expects 'group')
    if (product_types && product_types.length > 0) {
        navbarFiltersFromRedux.group = product_types.join(',');
    }

    // Map products to 'product' for navbar filters
    if (products && products.length > 0) {
        navbarFiltersFromRedux.product = products.join(',');
    }

    return {
        filters: mainFilters,
        navbarFilters: navbarFiltersFromRedux, // Now from Redux, not URL
        pagination: {
            page: currentPage,
            page_size: pageSize,
        },
        options: {
            include_bundles: true,
            include_analytics: false,
        },
    };
}, [currentPage, pageSize]);

const executeSearch = useCallback(async (forceSearch = false) => {
    // ... loading logic

    // Build API payload from Redux state
    const searchParams = buildApiPayload(filters);

    // API call
    const result = await dispatch(productsApi.endpoints.searchProducts.initiate(searchParams));
}, [filters, buildApiPayload, dispatch, ...]);
```

**Key Points**:
- Navbar filters come from Redux `filters` object (Story 1.2)
- Adapter splits into `filters` + `navbarFilters` for API compatibility
- Boolean values converted to strings (API expects strings)
- `product_types` mapped to `group` parameter name

#### Step 3: Clean Up Imports

**Check useLocation import**:

**BEFORE**:
```javascript
import { useLocation } from 'react-router-dom';
```

**AFTER** (if location not used elsewhere):
```javascript
// DELETE: import { useLocation } from 'react-router-dom';
```

**⚠️ Only remove if completely unused in the hook**

#### Step 4: Update Tests

**File**: `frontend/react-Admin3/src/hooks/__tests__/useProductsSearch.test.js`

**Add test for Redux navbar filters**:
```javascript
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import useProductsSearch from '../useProductsSearch';
import filtersReducer from '../../store/slices/filtersSlice';

describe('useProductsSearch - Navbar Filters from Redux (Story 1.4)', () => {
  test('uses navbar filters from Redux state', async () => {
    // Setup Redux store with navbar filters
    const store = configureStore({
      reducer: {
        filters: filtersReducer,
      },
      preloadedState: {
        filters: {
          subjects: [],
          categories: [],
          product_types: ['Materials'],
          products: [],
          modes_of_delivery: [],
          tutorial_format: 'online',
          distance_learning: true,
          tutorial: false,
          searchQuery: '',
          currentPage: 1,
          pageSize: 20,
        },
      },
    });

    // Spy on API call
    const mockApiCall = jest.fn();

    const wrapper = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => useProductsSearch(), { wrapper });

    // Trigger search
    await result.current.executeSearch();

    // Verify API called with navbar filters from Redux
    expect(mockApiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        navbarFilters: expect.objectContaining({
          tutorial_format: 'online',
          distance_learning: 'true', // String
          group: 'Materials',
        }),
      })
    );
  });

  test('does not parse URL for navbar filters', () => {
    // Setup URL with query parameters
    delete window.location;
    window.location = { search: '?tutorial_format=online&group=Materials' };

    const store = configureStore({
      reducer: { filters: filtersReducer },
    });

    const wrapper = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => useProductsSearch(), { wrapper });

    // Hook should NOT parse URL (navbar filters come from Redux)
    // Verify by checking that Redux state is used, not URL
    expect(result.current.filters.tutorial_format).toBe(null); // From Redux default, not URL
  });

  test('adapts Redux state to API payload format', () => {
    const store = configureStore({
      reducer: { filters: filtersReducer },
      preloadedState: {
        filters: {
          subjects: ['CB1'],
          product_types: ['Materials', 'Tutorials'],
          tutorial_format: 'intensive',
          distance_learning: false,
          tutorial: true,
        },
      },
    });

    // Test adapter logic
    const filters = store.getState().filters;
    const payload = buildApiPayload(filters);

    expect(payload.filters).toEqual({
      subjects: ['CB1'],
      categories: [],
      product_types: ['Materials', 'Tutorials'],
      products: [],
      modes_of_delivery: [],
    });

    expect(payload.navbarFilters).toEqual({
      tutorial_format: 'intensive',
      tutorial: 'true', // Boolean → String
      group: 'Materials,Tutorials', // Array → Comma-separated string
    });
  });
});
```

### Testing Strategy

**Unit Tests**:
- Hook uses Redux navbar filters (not URL)
- Adapter splits Redux state correctly
- API receives correct payload structure
- Boolean → string conversion works
- Array → comma-separated string works

**Integration Tests** (in Story 1.16):
- Full flow: FilterPanel → Redux → useProductsSearch → API → Results
- Navbar filter changes trigger correct API calls
- Results match expected filtering

**Manual Testing Checklist**:
1. Open app with Redux DevTools
2. Set navbar filters in Redux (dispatch actions manually):
   ```javascript
   dispatch(setTutorialFormat('online'));
   dispatch(toggleDistanceLearning());
   ```
3. Trigger search (change any filter)
4. Check Network tab → API call should include navbar filters
5. Verify `navbarFilters` object in API payload contains Redux values
6. Verify results are correct

---

## Integration Verification

### IV1: Search Results Match Previous Behavior

**Verification Steps**:
1. Apply same filters as before refactoring:
   - Subject: CB1
   - Product Type: Materials
   - Tutorial Format: Online (navbar filter)
2. Compare results before/after
3. Verify result count matches
4. Verify product list matches

**Success Criteria**:
- Identical results for same filter combinations
- No user-visible changes
- Filtering logic works correctly

### IV2: API Call Count Remains the Same

**Verification Steps**:
1. Open Network tab
2. Clear network log
3. Apply filter
4. Wait 250ms (debounce)
5. Count API calls to `/api/products/search`
6. Repeat with navbar filter changes

**Success Criteria**:
- Single API call per filter change (after debounce)
- No duplicate calls
- Same call frequency as before

### IV3: Filter Debouncing Works Correctly

**Verification Steps**:
1. Toggle filter rapidly (5 times in 1 second)
2. Check Network tab
3. Verify only 1 API call after 250ms from last change

**Success Criteria**:
- Debounce timer works correctly
- Multiple rapid changes batch into single call
- 250ms delay preserved

---

## Technical Notes

### Integration Approach

**Why Adapter Is Needed**:
- Backend currently expects **two separate** filter objects
- Changing backend API is out of scope for Phase 1
- Adapter allows frontend consolidation while maintaining API contract
- Phase 2 can simplify backend to accept single filters object

**Data Type Conversions**:
- **Booleans → Strings**: Backend API expects string values (`'true'`, `'false'`)
- **Arrays → Comma-separated**: `product_types: ['A', 'B']` → `group: 'A,B'`
- **Field Name Mapping**: `product_types` (Redux) → `group` (API)

### API Payload Structure

**Before Story 1.4**:
```javascript
{
  filters: { subjects: [...], ... },      // From Redux
  navbarFilters: { group: 'X', ... },    // From URL parsing
  pagination: { page: 1, page_size: 20 }
}
```

**After Story 1.4**:
```javascript
{
  filters: { subjects: [...], ... },      // From Redux
  navbarFilters: { group: 'X', ... },    // From Redux (via adapter)
  pagination: { page: 1, page_size: 20 }
}
```

**Same structure**, different source (Redux instead of URL).

### Key Constraints

1. **Backward Compatible**: API contract unchanged
2. **No Backend Changes**: Frontend-only refactoring
3. **Data Type Matching**: Must match what URL parsing provided (strings)

---

## Definition of Done

- [x] URL parameter extraction removed from useProductsSearch
- [x] `navbarFilters` object construction removed
- [x] `buildApiPayload` adapter created
- [x] API call uses consolidated Redux filters
- [x] Boolean → string conversion implemented
- [x] Array → comma-separated string conversion implemented
- [x] `useLocation` import removed (if unused)
- [x] Tests updated with navbar filter scenarios
- [x] Manual testing confirms results match previous behavior
- [x] Network tab shows no duplicate API calls
- [x] Debounce timing verified (250ms)
- [x] Code reviewed by another developer

---

## Risk Assessment and Mitigation

### Primary Risk: API Payload Format Mismatch

**Risk**: Adapter doesn't match backend expectations → API errors or wrong results

**Mitigation**:
1. **Copy existing payload structure** from URL parsing code
2. **Test with actual API** using Network tab to verify payload
3. **Gradual rollout**: Test in dev environment first
4. **Rollback plan**: Keep old URL parsing code commented out for quick revert

**Probability**: Medium
**Impact**: High (would break filtering)

**Verification**:
- Compare Network tab payloads before/after
- Verify API response status codes (200 OK)
- Verify result counts match

### Secondary Risk: Data Type Conversion Errors

**Risk**: Boolean/array conversions don't match what backend expects

**Mitigation**:
1. **Check backend code** for expected data types (if accessible)
2. **Test with different filter combinations** in dev
3. **Console log payload** before API call (dev mode)

**Probability**: Low (copying existing URL parsing logic)
**Impact**: Medium (some filters might not work)

### Rollback Plan

If consolidated filters break API calls:

1. **Quick Rollback** (10 minutes):
   - Uncomment old URL parsing code
   - Comment out new adapter code
   - Redeploy
   - Filters work again (back to dual system)

2. **Debug** (30 minutes):
   - Check API error messages
   - Verify payload structure in Network tab
   - Adjust adapter data type conversions

---

## Dependencies and Blockers

**Dependencies**:
- ✅ **Story 1.2**: Navbar filters must exist in Redux (blocks this story)

**Blockers**:
- If Story 1.2 navbar filters not working → blocks this story
- If API contract unknown → need backend team consultation

**Enables**:
- Story 1.7 (FilterPanel displays navbar filters) - now visible because Redux-based
- Story 1.8 (ActiveFilters shows navbar filter chips) - now visible

---

## Related PRD Sections

- **FR3**: Consolidate navbar filters into Redux requirement
- **Section 2.2.2 (Problem)**: Dual filter system identified as issue
- **Section 4.2**: API integration strategy (maintain compatibility)
- **CR1**: Maintain existing API contract

---

## Next Steps After Completion

1. **Code Review**: Get peer review of adapter logic
2. **Story 1.5**: Implement Clear All Filters (benefits from single filter source)
3. **Story 1.7**: Display navbar filters in FilterPanel (now possible)
4. **Backend Consultation**: Discuss Phase 2 API simplification

---

## Verification Queries

```javascript
// In browser console after implementation:

// Check Redux state includes navbar filters
console.log(store.getState().filters.tutorial_format);
console.log(store.getState().filters.distance_learning);

// Verify API payload structure
// (Set breakpoint in executeSearch or log searchParams)
console.log(JSON.stringify(searchParams, null, 2));
```

---

**Story Status**: Ready for Development (after Story 1.2 complete)
**Assigned To**: [Pending]
**Started**: [Pending]
**Completed**: [Pending]
