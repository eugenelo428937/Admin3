# Story 1.1: Implement Redux-to-URL Synchronization Middleware

**Epic**: Product Filtering State Management Refactoring
**Phase**: 1 - Critical Fixes (Priority 0)
**Story ID**: 1.1
**Estimated Effort**: 2 days
**Dependencies**: None (foundational story)

---

## User Story

As a **developer**,
I want **Redux filter state changes to automatically update URL parameters via middleware**,
so that **the "Clear All Filters" button works correctly and URLs remain shareable**.

---

## Story Context

### Problem Being Solved

Currently, the filtering system has unidirectional sync (URL → Redux) but is missing Redux → URL synchronization. This causes:
- "Clear All Filters" button clears Redux but not URL, causing filters to reappear
- Manual filter changes don't update the URL (bookmarks don't reflect current state)
- Race conditions between navigation handlers that update both Redux and URL independently

### Existing System Integration

**Integrates with**:
- Redux store (`frontend/react-Admin3/src/store/store.js`)
- Existing `filtersSlice` (`frontend/react-Admin3/src/store/slices/filtersSlice.js`)
- React Router v6 (browser history API)
- RTK Query API caching system

**Technology**:
- Redux Toolkit (RTK) middleware pattern
- Browser History API (`window.history.replaceState`)
- URLSearchParams for query string building

**Follows Pattern**:
- Redux Toolkit's `createListenerMiddleware` pattern
- Existing cookie persistence middleware structure (will be replaced in Phase 3)

**Touch Points**:
- Redux store configuration (`store.js` - add middleware to chain)
- All components that dispatch filter actions (FilterPanel, MainNavBar, ActiveFilters)
- URL parameters (reads current URL, writes new URL)

---

## Acceptance Criteria

### Functional Requirements

**AC1**: Middleware intercepts all `filters/*` Redux actions
- Listen for any action with type starting with `filters/`
- Include: `setSubjects`, `toggleCategory`, `clearAllFilters`, `setMultipleFilters`, etc.
- Exclude: Actions from other slices (e.g., `cart/*`, `user/*`)

**AC2**: Middleware builds URL query string from Redux state using `URLSearchParams`
- Extract filter state from Redux after action completes
- Map Redux state fields to URL parameter names:
  - `subjects` → `subject_code` (first item), `subject_1`, `subject_2`, etc.
  - `product_types` → `group` (comma-separated)
  - `products` → `product` (comma-separated)
  - `categories` → (defer to Phase 2 - not in current URL)
  - `modes_of_delivery` → (defer to Phase 2 - not in current URL)
- Build URLSearchParams object with mapped values

**AC3**: Middleware updates browser URL using `history.replaceState()` (not `pushState`)
- Use `window.history.replaceState({}, '', newUrl)` to avoid history pollution
- Never use `pushState` (creates new history entries for every filter change)
- Construct full URL: `/products?${params.toString()}`

**AC4**: Middleware includes loop prevention (no-op if URL already matches target)
- Compare current `window.location.search` with target `params.toString()`
- Skip URL update if identical (prevents unnecessary history operations)
- Add loop detection counter: if middleware fires >5 times in <100ms, log warning and bail

**AC5**: Middleware only executes in browser context (not during SSR)
- Check `typeof window !== 'undefined'` before accessing window.history
- Gracefully skip URL updates during server-side rendering (if applicable)

**AC6**: Redux DevTools logs middleware actions in development mode
- Log middleware execution with action type and new URL in dev mode
- Format: `[URL Sync Middleware] ${action.type} → ${newUrl}`
- Only log when `process.env.NODE_ENV === 'development'`

**AC7**: Unit tests achieve ≥80% coverage for middleware logic
- Test suite: `urlSyncMiddleware.test.js`
- Test cases:
  - Middleware intercepts filter actions
  - URL is updated with correct parameters
  - replaceState is called (not pushState)
  - Loop prevention skips identical URLs
  - Non-filter actions are ignored
  - Browser context check works

### Integration Requirements

**AC8**: Existing Redux actions continue to work without modification
- All existing `filtersSlice` actions dispatch successfully
- Components using `dispatch(setSubjects([...]))` work identically
- No breaking changes to action creators or reducers

**AC9**: RTK Query caching and API calls remain unaffected by middleware
- RTK Query cache invalidation logic unchanged
- API call timing and debouncing preserved (250ms debounce in useProductsSearch)
- No duplicate API calls introduced by URL sync

**AC10**: Performance impact is unmeasurable (< 5ms per filter change)
- Middleware execution time < 5ms (measured with performance.now())
- No noticeable delay when toggling filters
- Page load time unaffected by middleware registration

### Quality Requirements

**AC11**: Code follows existing Redux middleware patterns
- Use Redux Toolkit's `createListenerMiddleware` API
- Match structure of existing cookie persistence middleware (for consistency)
- Follow project coding standards (camelCase, JSDoc comments)

**AC12**: Error handling prevents middleware crashes
- Wrap URL building logic in try-catch
- Log errors to console in development, silently fail in production
- Middleware failure doesn't block Redux action dispatch

**AC13**: Tests include integration scenarios
- Test with mock Redux store configuration
- Test with React Router mock
- Verify interaction with existing middlewares (cookie, RTK Query)

---

## Technical Implementation Guide

### File Structure

**New Files**:
```
frontend/react-Admin3/src/
└── store/
    └── middleware/
        ├── urlSyncMiddleware.js           # Main middleware implementation
        └── __tests__/
            └── urlSyncMiddleware.test.js  # Test suite
```

**Modified Files**:
```
frontend/react-Admin3/src/store/store.js   # Add middleware to chain
```

### Implementation Steps

#### Step 1: Create Middleware File

**File**: `frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js`

```javascript
import { createListenerMiddleware } from '@reduxjs/toolkit';
import { selectFilters } from '../slices/filtersSlice';

// Create listener middleware instance
export const urlSyncMiddleware = createListenerMiddleware();

// Track execution for loop detection
let executionCount = 0;
let lastExecutionTime = 0;

/**
 * Build URL parameters from Redux filter state
 * @param {Object} filters - Filter state from Redux
 * @returns {URLSearchParams} - URL parameters
 */
const buildUrlParams = (filters) => {
  const params = new URLSearchParams();

  // Map subjects to URL parameters
  if (filters.subjects && filters.subjects.length > 0) {
    filters.subjects.forEach((subject, index) => {
      const paramName = index === 0 ? 'subject_code' : `subject_${index}`;
      params.set(paramName, subject);
    });
  }

  // Map product_types to 'group' parameter
  if (filters.product_types && filters.product_types.length > 0) {
    params.set('group', filters.product_types.join(','));
  }

  // Map products to 'product' parameter
  if (filters.products && filters.products.length > 0) {
    params.set('product', filters.products.join(','));
  }

  // TODO Phase 2: Add navbar filters (tutorial_format, distance_learning, tutorial)
  // TODO Phase 2: Add categories and modes_of_delivery if needed

  return params;
};

/**
 * Check if middleware execution frequency suggests infinite loop
 * @returns {boolean} - True if potential loop detected
 */
const detectLoop = () => {
  const now = Date.now();

  if (now - lastExecutionTime < 100) {
    executionCount++;
  } else {
    executionCount = 1;
  }

  lastExecutionTime = now;

  if (executionCount > 5) {
    console.error('[URL Sync Middleware] Potential infinite loop detected. Execution halted.');
    return true;
  }

  return false;
};

// Listen for all filter actions
urlSyncMiddleware.startListening({
  predicate: (action) => action.type.startsWith('filters/'),
  effect: (action, listenerApi) => {
    try {
      // Check for browser context
      if (typeof window === 'undefined') {
        return;
      }

      // Loop detection
      if (detectLoop()) {
        return;
      }

      // Get current filter state after action completed
      const state = listenerApi.getState();
      const filters = selectFilters(state);

      // Build URL parameters
      const params = buildUrlParams(filters);
      const newSearch = params.toString();
      const newUrl = newSearch ? `/products?${newSearch}` : '/products';

      // Get current URL search
      const currentSearch = window.location.search.substring(1); // Remove leading '?'

      // Skip if URL already matches (loop prevention)
      if (currentSearch === newSearch) {
        return;
      }

      // Update browser URL without adding history entry
      window.history.replaceState({}, '', newUrl);

      // Development logging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[URL Sync Middleware] ${action.type} → ${newUrl}`);
      }
    } catch (error) {
      // Log error in development, silent in production
      if (process.env.NODE_ENV === 'development') {
        console.error('[URL Sync Middleware] Error:', error);
      }
      // Don't throw - let Redux action complete normally
    }
  },
});
```

#### Step 2: Add Middleware to Redux Store

**File**: `frontend/react-Admin3/src/store/store.js`

```javascript
import { configureStore } from '@reduxjs/toolkit';
import { api } from './api'; // RTK Query API
import filtersReducer from './slices/filtersSlice';
import cookieMiddleware from '../utils/cookiePersistenceMiddleware'; // Existing
import { urlSyncMiddleware } from './middleware/urlSyncMiddleware'; // NEW

export const store = configureStore({
  reducer: {
    filters: filtersReducer,
    [api.reducerPath]: api.reducer,
    // ... other reducers
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(api.middleware)           // RTK Query (existing)
      .concat(cookieMiddleware)         // Cookie persistence (existing, Phase 2 removal)
      .concat(urlSyncMiddleware.middleware), // NEW: URL sync
});
```

**IMPORTANT**: Middleware order matters:
1. RTK Query first (handles API caching)
2. Cookie middleware second (will be removed in Phase 3)
3. URL sync middleware last (reads final state after other middlewares)

#### Step 3: Create Test Suite

**File**: `frontend/react-Admin3/src/store/middleware/__tests__/urlSyncMiddleware.test.js`

```javascript
import { configureStore } from '@reduxjs/toolkit';
import { urlSyncMiddleware } from '../urlSyncMiddleware';
import filtersReducer, { setSubjects, clearAllFilters, setMultipleFilters } from '../../slices/filtersSlice';

describe('urlSyncMiddleware', () => {
  let store;
  let replaceStateSpy;

  beforeEach(() => {
    // Create test store with middleware
    store = configureStore({
      reducer: {
        filters: filtersReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(urlSyncMiddleware.middleware),
    });

    // Mock window.history.replaceState
    replaceStateSpy = jest.spyOn(window.history, 'replaceState').mockImplementation(() => {});

    // Mock window.location.search
    delete window.location;
    window.location = { search: '' };
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
  });

  test('intercepts filter actions', () => {
    store.dispatch(setSubjects(['CB1']));

    expect(replaceStateSpy).toHaveBeenCalled();
  });

  test('builds URL with subject_code parameter', () => {
    store.dispatch(setSubjects(['CB1']));

    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      '',
      '/products?subject_code=CB1'
    );
  });

  test('handles multiple subjects', () => {
    store.dispatch(setSubjects(['CB1', 'CB2']));

    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      '',
      expect.stringContaining('subject_code=CB1')
    );
    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      '',
      expect.stringContaining('subject_1=CB2')
    );
  });

  test('uses replaceState not pushState', () => {
    const pushStateSpy = jest.spyOn(window.history, 'pushState');

    store.dispatch(setSubjects(['CB1']));

    expect(replaceStateSpy).toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();

    pushStateSpy.mockRestore();
  });

  test('skips update if URL already matches', () => {
    window.location.search = '?subject_code=CB1';

    store.dispatch(setSubjects(['CB1']));

    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  test('clears URL when filters cleared', () => {
    store.dispatch(setSubjects(['CB1']));
    replaceStateSpy.mockClear();

    store.dispatch(clearAllFilters());

    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      '',
      '/products'
    );
  });

  test('ignores non-filter actions', () => {
    store.dispatch({ type: 'user/login' });

    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  test('handles errors gracefully', () => {
    replaceStateSpy.mockImplementation(() => {
      throw new Error('History API error');
    });

    // Should not throw
    expect(() => {
      store.dispatch(setSubjects(['CB1']));
    }).not.toThrow();
  });
});
```

### Testing Strategy

**Unit Tests** (Target: 80% coverage):
- Middleware intercepts correct actions
- URL parameters built correctly
- replaceState called with correct arguments
- Loop prevention works
- Error handling doesn't crash

**Integration Tests** (in Story 1.5):
- Full flow: Filter change → Redux → URL → "Clear All" → URL cleared
- Verify with actual React components

**Manual Testing Checklist**:
1. Open `/products` page
2. Select a subject filter → URL should update immediately
3. Select multiple filters → URL should show all parameters
4. Click "Clear All Filters" → URL should clear (this is the main bug fix!)
5. Bookmark URL with filters → Reload → Filters should persist
6. Click browser back/forward → Filters should update correctly

---

## Integration Verification

### IV1: Existing Redux Actions Continue to Work

**Verification Steps**:
1. Test all existing filter operations in FilterPanel
2. Verify MainNavBar navigation still works
3. Confirm SearchBox filter selection still functions
4. Check that no existing component shows errors

**Success Criteria**:
- No breaking changes to existing Redux action creators
- Components dispatch actions successfully
- Redux DevTools shows actions completing normally

### IV2: RTK Query Caching and API Calls Unaffected

**Verification Steps**:
1. Monitor Network tab for API calls to `/api/products/search`
2. Verify 250ms debounce still works (no immediate API calls on filter toggle)
3. Check RTK Query cache in Redux DevTools
4. Confirm cache invalidation logic unchanged

**Success Criteria**:
- API call count matches pre-middleware baseline
- Debounce timing preserved
- Cache hit rate unchanged
- No duplicate API calls

### IV3: Performance Impact Is Unmeasurable

**Verification Steps**:
1. Use React DevTools Profiler to measure filter toggle performance
2. Add performance.now() timing around middleware execution
3. Test with 10+ rapid filter changes
4. Monitor for UI lag or delays

**Success Criteria**:
- Middleware execution < 5ms per action
- No noticeable UI delay when toggling filters
- React Profiler shows no performance regression

---

## Technical Notes

### Integration Approach

**How It Connects**:
1. Middleware sits in Redux store middleware chain
2. Intercepts filter actions AFTER they update Redux state
3. Reads final state using `selectFilters` selector
4. Builds URL parameters from state
5. Updates browser history API directly (no React Router hooks needed)

### Existing Pattern Reference

**Redux Toolkit Listener Middleware**:
- Docs: https://redux-toolkit.js.org/api/createListenerMiddleware
- Example in project: `cookiePersistenceMiddleware.js` (similar structure)

**Browser History API**:
- `history.replaceState()` - Updates URL without navigation
- `history.pushState()` - Creates new history entry (DON'T USE for filters)

### Key Constraints

1. **No React Router Hooks**: Middleware runs outside React context, can't use `useNavigate()`
2. **Middleware Ordering**: Must run AFTER cookie middleware but BEFORE any future middlewares that depend on URL
3. **Loop Prevention Critical**: Without loop detection, URL updates could trigger router events that trigger Redux updates
4. **Phase 1 Scope**: Only map existing filters (subjects, product_types, products). Navbar filters added in Story 1.2.

---

## Definition of Done

- [x] `urlSyncMiddleware.js` created with loop prevention
- [x] Middleware added to Redux store configuration
- [x] Test suite created with ≥80% coverage
- [x] All tests pass (unit + integration)
- [x] Manual testing confirms "Clear All" now clears URL
- [x] Redux DevTools shows middleware logging in dev mode
- [x] No performance regression (< 5ms execution time)
- [x] Code reviewed by another developer
- [x] Documentation updated (inline JSDoc comments added)

---

## Risk Assessment and Mitigation

### Primary Risk: Middleware Infinite Loop

**Risk**: Middleware updates URL → React Router detects change → triggers Redux update → middleware loops infinitely

**Mitigation**:
1. **Loop Detection Counter**: Bail after 5 executions in 100ms
2. **URL Comparison**: Skip update if URL already matches target
3. **Use replaceState**: Avoids triggering React Router navigation events
4. **Flag Detection (Story 1.6)**: Add `fromUrlSync: true` flag to distinguish URL-initiated updates

**Test Coverage**: Specific unit test for loop detection

### Secondary Risk: Browser History Pollution

**Risk**: Using `pushState` creates history entry per filter change, back button becomes unusable

**Mitigation**:
1. Always use `replaceState`, never `pushState`
2. Test suite verifies `pushState` is never called
3. Manual testing of back button behavior

### Rollback Plan

If middleware causes issues:

1. **Quick Rollback** (5 minutes):
   - Comment out middleware in `store.js`:
     ```javascript
     // .concat(urlSyncMiddleware.middleware), // Temporarily disabled
     ```
   - Redeploy frontend
   - URL sync stops, but filtering still works (back to old behavior)

2. **Full Rollback** (30 minutes):
   - Git revert commits for Story 1.1
   - Remove middleware file
   - Remove from store configuration
   - Run tests to confirm rollback successful

---

## Dependencies and Blockers

**Dependencies**:
- None (this is the foundational story)

**Blockers**:
- None identified

**Enables**:
- Story 1.3 (Remove manual URL updates from nav handlers)
- Story 1.5 (Clear All Filters URL reset)
- Story 1.6 (Remove URL parsing from ProductList)

---

## Related PRD Sections

- **FR2**: Bidirectional synchronization requirement
- **FR4**: "Clear All" functionality requirement
- **NFR1**: Use replaceState not pushState
- **NFR4**: Middleware testability requirement
- **Section 4.2**: Frontend integration strategy
- **Section 4.5**: Risk assessment (middleware infinite loop)

---

## Next Steps After Completion

1. **Code Review**: Get peer review of middleware implementation
2. **Story 1.2**: Start extending filtersSlice with navbar filters
3. **Story 1.3**: Can now remove manual URL updates from MainNavBar
4. **Integration Testing**: Will be comprehensively tested in Story 1.16

---

**Story Status**: Ready for Development
**Assigned To**: [Pending]
**Started**: [Pending]
**Completed**: [Pending]
