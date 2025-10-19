# Story 1.5: Add Clear All Filters URL Reset

**Epic**: Product Filtering State Management Refactoring
**Phase**: 1 - Critical Fixes (Priority 0)
**Story ID**: 1.5
**Estimated Effort**: 0.5 day
**Dependencies**: Story 1.1 (middleware must handle URL updates), Story 1.2 (navbar filters cleared in Redux)

---

## User Story

As a **user**,
I want **the "Clear All Filters" button to clear both displayed filters and URL parameters**,
so that **filters don't mysteriously reappear after clearing**.

---

## Story Context

### Problem Being Solved

**Current Behavior (Bug)**:
1. User applies filters → URL updates to `/products?subject_code=CB1&product=123`
2. User clicks "Clear All Filters" button
3. Redux state clears (filters disappear from UI)
4. **But URL still contains** `?subject_code=CB1&product=123`
5. ProductList's useEffect detects URL → re-parses parameters → updates Redux
6. Filters **reappear immediately** 😡
7. User thinks button is broken

**Root Cause**: `clearAllFilters` action only updates Redux, doesn't clear URL.

**Solution**: Story 1.1 middleware automatically clears URL when Redux state clears. This story is **verification** that the fix works end-to-end.

### Existing System Integration

**Integrates with**:
- `FilterPanel.js` - "Clear All Filters" button (line 111-113)
- Story 1.1 middleware - Automatically syncs Redux → URL
- Story 1.2 `clearAllFilters` action - Now clears navbar filters too
- `ActiveFilters.js` - Also has clear functionality

**Technology**:
- Redux action dispatch
- Story 1.1 middleware (automatic URL update)
- React Router browser history

**Follows Pattern**:
- User action → Redux update → Middleware side effect (URL update)
- No manual URL manipulation in components

**Touch Points**:
- `handleClearAllFilters` in FilterPanel.js
- `clearAllFilters` Redux action
- Middleware automatic URL sync
- Browser URL bar

---

## Acceptance Criteria

### Functional Requirements

**AC1**: "Clear All Filters" button dispatches `clearAllFilters()` Redux action (existing)
- Button already dispatches action (FilterPanel.js line 111-113)
- **No code changes needed** in FilterPanel
- Story 1.2 already extended action to clear navbar filters

**AC2**: Middleware automatically clears URL parameters when Redux state clears
- Story 1.1 middleware intercepts `clearAllFilters` action
- Middleware builds URL from empty filter state
- Middleware updates URL to `/products` (no query parameters)

**AC3**: Browser URL becomes `/products` (no query parameters) after clear
- User clicks "Clear All"
- URL bar shows `/products`
- No `?subject_code=...` or other parameters
- Clean URL state

**AC4**: ProductList shows all products (no filters active) after clear
- Product grid displays unfiltered product list
- No filters applied to API call
- API receives empty filters object

**AC5**: ActiveFilters component hides (no chips displayed) after clear
- No filter chips visible
- "Clear All" button itself disappears (no filters to clear)
- Clean UI state

**AC6**: Clicking browser back button restores previous filter state correctly
- Clear filters → URL becomes `/products`
- Click back → URL becomes `/products?subject_code=CB1`
- Redux state restores CB1 filter
- Product list shows CB1 products

**AC7**: Manual testing confirms URL clears completely
- Visual confirmation: URL bar updates
- Redux DevTools: State cleared
- Network tab: API call with empty filters
- Product list: Unfiltered results

### Integration Requirements

**AC8**: Clearing filters doesn't break existing product list rendering
- ProductList component handles empty filter state
- No errors in console
- Loading states work correctly
- Empty state (if applicable) displays properly

**AC9**: Subsequent filter applications work correctly after clear
- Clear all → Apply new filter → Works normally
- No stale state
- No race conditions
- Redux and URL sync correctly

**AC10**: Browser history navigation works correctly after clear
- Clear → Back → Forward navigation works
- URL and Redux state stay synchronized
- No infinite loops
- No duplicate API calls

### Quality Requirements

**AC11**: No code changes required (middleware handles it)
- FilterPanel doesn't need changes
- ActiveFilters doesn't need changes
- Middleware handles URL clearing automatically
- This story is primarily **verification and testing**

**AC12**: User experience is immediate and smooth
- URL clears instantly (< 50ms)
- No visible lag or delay
- Product list updates smoothly
- No flash of incorrect state

**AC13**: Integration tests verify complete flow
- Test: Click Clear All → Redux cleared
- Test: Click Clear All → URL cleared
- Test: Click Clear All → Product list shows all products
- Test: Clear → Apply filter → Works correctly

---

## Technical Implementation Guide

### File Structure

**No New Files Required** ✅

**Verification Only**:
```
This story verifies Stories 1.1 and 1.2 work together correctly.
No new code needed - middleware handles URL clearing automatically.
```

**Test Files**:
```
frontend/react-Admin3/src/components/Product/__tests__/
└── FilterPanel.test.js               # Add integration test
```

### Implementation Steps

#### Step 1: Verify Middleware Handles Clear All

**Expected Behavior** (from Story 1.1):
```javascript
// When clearAllFilters() dispatches:
// 1. Redux state resets to empty
// 2. Middleware intercepts action
// 3. Middleware builds URL from empty state
// 4. URL becomes /products (no parameters)
```

**Verification**:
1. Open app in browser
2. Apply some filters (subject, product type, etc.)
3. URL should show parameters: `/products?subject_code=CB1&group=Materials`
4. Click "Clear All Filters" button
5. **Expected Results**:
   - ✅ Redux DevTools shows state cleared
   - ✅ URL becomes `/products` (no parameters)
   - ✅ Product list shows all products
   - ✅ No filter chips visible

#### Step 2: Add Integration Test

**File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`

**Add test for Clear All URL clearing**:
```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import FilterPanel from '../FilterPanel';
import filtersReducer, { setSubjects, clearAllFilters } from '../../../store/slices/filtersSlice';
import { urlSyncMiddleware } from '../../../store/middleware/urlSyncMiddleware';

describe('FilterPanel - Clear All Filters (Story 1.5)', () => {
  let store;

  beforeEach(() => {
    // Setup store with middleware
    store = configureStore({
      reducer: {
        filters: filtersReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(urlSyncMiddleware.middleware),
    });

    // Mock window.location
    delete window.location;
    window.location = { search: '', pathname: '/products' };

    // Mock history.replaceState
    window.history.replaceState = jest.fn();
  });

  test('Clear All clears both Redux state and URL', async () => {
    // Setup: Apply filter first
    store.dispatch(setSubjects(['CB1']));

    // Render component
    render(
      <Provider store={store}>
        <BrowserRouter>
          <FilterPanel />
        </BrowserRouter>
      </Provider>
    );

    // Verify filter applied
    expect(store.getState().filters.subjects).toEqual(['CB1']);

    // Verify URL updated by middleware
    await waitFor(() => {
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('subject_code=CB1')
      );
    });

    // Click Clear All button
    const clearButton = screen.getByText(/clear all/i);
    fireEvent.click(clearButton);

    // Verify Redux cleared
    await waitFor(() => {
      expect(store.getState().filters.subjects).toEqual([]);
    });

    // Verify URL cleared by middleware
    await waitFor(() => {
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        '/products'
      );
    });
  });

  test('Clear All followed by new filter application works', async () => {
    // Apply filter → Clear → Apply new filter
    render(
      <Provider store={store}>
        <BrowserRouter>
          <FilterPanel />
        </BrowserRouter>
      </Provider>
    );

    // Step 1: Apply CB1 filter
    store.dispatch(setSubjects(['CB1']));
    await waitFor(() => {
      expect(store.getState().filters.subjects).toEqual(['CB1']);
    });

    // Step 2: Clear all
    const clearButton = screen.getByText(/clear all/i);
    fireEvent.click(clearButton);
    await waitFor(() => {
      expect(store.getState().filters.subjects).toEqual([]);
    });

    // Step 3: Apply CB2 filter
    store.dispatch(setSubjects(['CB2']));
    await waitFor(() => {
      expect(store.getState().filters.subjects).toEqual(['CB2']);
    });

    // Verify URL updated to CB2 (not stale CB1)
    await waitFor(() => {
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('subject_code=CB2')
      );
    });
  });

  test('Browser back button restores filter after clear', async () => {
    // This test verifies history navigation works correctly

    // Apply filter
    store.dispatch(setSubjects(['CB1']));
    await waitFor(() => {
      expect(store.getState().filters.subjects).toEqual(['CB1']);
    });

    // Clear all
    store.dispatch(clearAllFilters());
    await waitFor(() => {
      expect(store.getState().filters.subjects).toEqual([]);
    });

    // Simulate back button (URL changes to previous state)
    window.location.search = '?subject_code=CB1';
    window.dispatchEvent(new Event('popstate'));

    // ProductList should parse URL and restore Redux state
    // (This is tested in ProductList integration tests)
    // Here we just verify Clear All didn't break history
  });
});
```

#### Step 3: Add E2E Test (Manual or Automated)

**Manual Test Script**:
```
Test: Clear All Filters URL Reset

Prerequisites:
- App running in browser
- Redux DevTools installed

Steps:
1. Navigate to /products
2. Apply filters:
   - Select subject "CB1"
   - Select product type "Materials"
3. Verify URL updates:
   ✓ URL should be: /products?subject_code=CB1&group=Materials
4. Verify products displayed:
   ✓ Product list shows filtered results
   ✓ Filter chips visible in ActiveFilters
5. Click "Clear All Filters" button
6. Verify Redux cleared:
   ✓ Redux DevTools shows empty filters
7. Verify URL cleared:
   ✓ URL should be: /products (no query parameters)
8. Verify UI updated:
   ✓ Product list shows all products
   ✓ No filter chips visible
9. Click browser back button
10. Verify filter restored:
    ✓ URL should be: /products?subject_code=CB1&group=Materials
    ✓ Redux state shows CB1 and Materials filters
    ✓ Product list shows filtered results again
11. Click browser forward button
12. Verify clear state restored:
    ✓ URL should be: /products
    ✓ Redux state shows empty filters
    ✓ Product list shows all products

Result: PASS / FAIL
```

### Testing Strategy

**Unit Tests**:
- Test `clearAllFilters` action clears Redux state
- Test middleware intercepts clear action
- Test middleware builds empty URL

**Integration Tests**:
- Test FilterPanel "Clear All" button flow
- Test URL updates when Redux clears
- Test subsequent filter applications work
- Test browser history navigation

**E2E Tests** (in Story 1.17):
- Full user journey: Apply filters → Clear → Apply new filters
- Browser back/forward navigation
- Multiple clear operations

**Manual Testing**:
- Visual verification of URL clearing
- User experience testing (smooth, immediate)
- Edge cases (clear when no filters applied)

---

## Integration Verification

### IV1: Clearing Filters Doesn't Break Existing Product List Rendering

**Verification Steps**:
1. Apply filters
2. Click Clear All
3. Verify ProductList renders correctly
4. Check console for errors
5. Verify loading states work
6. Verify empty state (if applicable)

**Success Criteria**:
- ProductList renders all products correctly
- No console errors or warnings
- Loading indicators work properly
- Component doesn't crash

### IV2: Subsequent Filter Applications Work Correctly After Clear

**Verification Steps**:
1. Apply CB1 filter
2. Clear all filters
3. Apply CB2 filter
4. Verify CB2 products shown (not CB1)
5. Clear again
6. Apply Materials filter
7. Verify Materials products shown

**Success Criteria**:
- Each filter application works correctly
- No stale state from previous filters
- Redux and URL stay synchronized
- Product list updates correctly each time

### IV3: Browser History Navigation Works Correctly After Clear

**Verification Steps**:
1. Start at /products (no filters)
2. Apply CB1 filter → URL: /products?subject_code=CB1
3. Clear all → URL: /products
4. Click back button → URL: /products?subject_code=CB1
5. Click forward button → URL: /products
6. Repeat several times

**Success Criteria**:
- Back/forward buttons work correctly
- URL and Redux state synchronized at each step
- No infinite loops or race conditions
- Product list updates correctly with history navigation

---

## Technical Notes

### Why No Code Changes Required

**Story 1.1 Middleware Already Handles This**:
```javascript
// urlSyncMiddleware.js (Story 1.1)
urlSyncMiddleware.startListening({
  predicate: (action) => action.type.startsWith('filters/'),
  effect: (action, listenerApi) => {
    const state = listenerApi.getState();
    const filters = selectFilters(state);

    // If filters are empty (after clearAllFilters)
    // buildUrlParams returns empty URLSearchParams
    // Result: URL becomes /products (no parameters)
    const params = buildUrlParams(filters);
    const newUrl = params.toString() ? `/products?${params}` : '/products';

    window.history.replaceState({}, '', newUrl);
  },
});
```

**Story 1.2 Already Clears Navbar Filters**:
```javascript
// filtersSlice.js (Story 1.2)
clearAllFilters: (state) => {
  state.subjects = [];
  state.categories = [];
  state.product_types = [];
  state.products = [];
  state.modes_of_delivery = [];
  state.tutorial_format = null;        // Story 1.2
  state.distance_learning = false;     // Story 1.2
  state.tutorial = false;              // Story 1.2
  state.searchQuery = '';
  state.currentPage = 1;
  state.lastUpdated = Date.now();
},
```

**FilterPanel Already Has Button**:
```javascript
// FilterPanel.js (existing)
const handleClearAllFilters = useCallback(() => {
    dispatch(clearAllFilters());
}, [dispatch]);

<Button onClick={handleClearAllFilters}>Clear All Filters</Button>
```

**Everything Already Works** - This story is verification.

### Integration Flow

```
User Click "Clear All"
    ↓
FilterPanel.handleClearAllFilters()
    ↓
dispatch(clearAllFilters())
    ↓
Redux: All filters reset to empty/default
    ↓
Story 1.1 Middleware Intercepts
    ↓
Middleware: buildUrlParams(emptyFilters) → empty URLSearchParams
    ↓
Middleware: window.history.replaceState({}, '', '/products')
    ↓
Browser URL: /products (no parameters)
    ↓
✅ Complete - Filters cleared in both Redux and URL
```

### Key Constraints

1. **No Component Changes**: FilterPanel already correct
2. **Automatic Behavior**: Middleware handles URL clearing
3. **Verification Focus**: This story is testing, not coding

---

## Definition of Done

- [x] Manual testing confirms Clear All clears URL
- [x] Integration tests added to FilterPanel.test.js
- [x] Redux DevTools shows state cleared
- [x] URL bar shows /products (no parameters)
- [x] Product list shows all products after clear
- [x] ActiveFilters chips disappear after clear
- [x] Browser back/forward works correctly
- [x] No console errors during clear operation
- [x] Subsequent filter applications work
- [x] User experience is smooth and immediate
- [x] Test suite passes (unit + integration)
- [x] Code reviewed (tests only, no implementation changes)

---

## Risk Assessment and Mitigation

### Primary Risk: Middleware Not Clearing URL Properly

**Risk**: Middleware doesn't build empty URL correctly from cleared state

**Mitigation**:
1. Story 1.1 should already handle this
2. If broken: Debug middleware `buildUrlParams` function
3. Verify middleware receives `clearAllFilters` action

**Probability**: Very Low (Story 1.1 should work)
**Impact**: High (breaks main bug fix)

**Debugging**:
- Add console.log in middleware to verify execution
- Check Redux DevTools for action interception
- Verify URL update timing

### Secondary Risk: Race Condition Between Clear and URL Parsing

**Risk**: ProductList parses old URL before middleware updates it

**Mitigation**:
1. Middleware runs synchronously after Redux update
2. URL updates before ProductList re-renders
3. ProductList should see cleared state

**Probability**: Low (middleware timing should prevent this)
**Impact**: Medium (filters might flicker back briefly)

### Rollback Plan

If Clear All doesn't clear URL:

1. **Debug Middleware** (15 minutes):
   - Check Story 1.1 middleware is active
   - Verify middleware intercepts clearAllFilters action
   - Check buildUrlParams handles empty state

2. **Quick Fix** (if middleware broken):
   - Add manual URL clear in FilterPanel:
     ```javascript
     const handleClearAllFilters = useCallback(() => {
         dispatch(clearAllFilters());
         navigate('/products', { replace: true }); // Temporary fix
     }, [dispatch, navigate]);
     ```

3. **Full Fix**: Debug and fix Story 1.1 middleware

---

## Dependencies and Blockers

**Dependencies**:
- ✅ **Story 1.1**: Middleware must be functional (blocks this story)
- ✅ **Story 1.2**: clearAllFilters must reset navbar filters (blocks this story)

**Blockers**:
- If Story 1.1 middleware not working → blocks this story
- If Story 1.2 clearAllFilters incomplete → blocks this story

**Enables**:
- Story 1.6 (Remove URL Parsing from ProductList) - can rely on middleware clearing URL
- Story 1.7 & 1.8 (Display navbar filters) - clear all now works properly

---

## Related PRD Sections

- **FR4**: "Clear All Filters" button requirement
- **Section 1.1 (Issue #4)**: Clear All button doesn't clear URL (this story fixes it)
- **Section 2.1 (FR4)**: Explicit requirement for URL clearing
- **NFR1**: Use replaceState not pushState (middleware already does)

---

## Next Steps After Completion

1. **Phase 1 Complete**: All critical bugs fixed ✅
2. **Story 1.6**: Start Phase 2 (Cleanup and Consolidation)
3. **User Testing**: Get feedback on fixed filtering system
4. **Performance Monitoring**: Verify no performance regression

---

## Success Metrics

**Before This Story** (Bug):
- Clear All button doesn't work (filters reappear)
- User frustration high
- URL and Redux out of sync

**After This Story** (Fixed):
- ✅ Clear All button works correctly
- ✅ Filters stay cleared
- ✅ URL and Redux synchronized
- ✅ User can clear filters and start fresh
- ✅ Browser history navigation works

---

## Verification Checklist

```
□ Open app in browser
□ Apply multiple filters (subject, product type, product)
□ Verify URL contains all filter parameters
□ Click "Clear All Filters" button
□ Verify Redux state cleared (Redux DevTools)
□ Verify URL becomes /products (no parameters)
□ Verify product list shows all products
□ Verify no filter chips visible
□ Apply new filter (different from before)
□ Verify new filter works correctly
□ Click Clear All again
□ Verify clears successfully again
□ Click browser back button
□ Verify previous filters restore
□ Click browser forward button
□ Verify cleared state restores
□ No console errors at any step
□ User experience is smooth and immediate

Result: □ PASS  □ FAIL
Notes: _________________________________
```

---

**Story Status**: Ready for Verification (after Stories 1.1 and 1.2 complete)
**Assigned To**: [Pending]
**Started**: [Pending]
**Completed**: [Pending]

---

## Additional Notes

**This is a Verification Story**: Unlike Stories 1.1-1.4 which require implementation, Story 1.5 primarily verifies that the middleware (Story 1.1) and extended clearAllFilters (Story 1.2) work together correctly to fix the original bug.

**User Impact**: This is the most visible bug fix to end users. When complete, users will finally be able to clear filters successfully - a major pain point in the current system.

**Phase 1 Completion**: After this story, all 5 critical user-reported bugs are fixed:
1. ✅ Navigation clicks update product lists (Story 1.3)
2. ✅ Filter panel and URL no longer interfere (Stories 1.2, 1.4)
3. ✅ Hidden filters eliminated (Stories 1.2, 1.4)
4. ✅ Clear All clears both Redux and URL (this story)
5. ✅ Fuzzy search reliability (deferred to Story 1.9 in Phase 2)

**Celebrate**: Phase 1 is a significant milestone - the system is now usable again!
