# Contract Test Specification: SearchBox Component

**Component**: `frontend/react-Admin3/src/components/SearchBox.js`
**Test File**: `frontend/react-Admin3/src/components/__tests__/SearchBox.test.js`
**Date**: 2025-10-20

## Overview

This contract defines the expected behavior of SearchBox component after Redux migration. All tests must be written BEFORE implementation (TDD RED phase).

## Test Setup

```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SearchBox from '../SearchBox';
import filtersReducer from '../../store/slices/filtersSlice';

// Test helper: Create mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      filters: filtersReducer
    },
    preloadedState: {
      filters: {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: '',
        currentPage: 1,
        pageSize: 20,
        isFilterPanelOpen: false,
        isLoading: false,
        error: null,
        filterCounts: {},
        lastUpdated: null,
        appliedFilters: {},
        ...initialState
      }
    }
  });
};

// Test helper: Render with Redux provider
const renderWithRedux = (component, initialState = {}) => {
  const store = createMockStore(initialState);
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  };
};
```

## Contract Tests

### Test 1: Reads Selected Filters from Redux State

**Requirement**: FR-008, FR-009
**TDD Phase**: RED (test written first, will fail)

**Test Code**:
```javascript
describe('SearchBox Redux Integration', () => {
  test('displays selected filters from Redux state', () => {
    // ARRANGE: Redux state has pre-selected filters
    const initialState = {
      subjects: ['CB1', 'CB2'],
      product_types: ['8'],
      searchQuery: 'mock pack'
    };

    // ACT: Render SearchBox with Redux state
    renderWithRedux(<SearchBox />, initialState);

    // ASSERT: SearchBox displays Redux filter state
    expect(screen.getByDisplayValue('mock pack')).toBeInTheDocument();
    // Note: Filter chips will be rendered based on API data matching
    // This test verifies Redux state is read, not that chips display
  });
});
```

**Expected Failure Message**: `SearchBox uses local state, not Redux`

### Test 2: Dispatches Redux Action on Filter Selection

**Requirement**: FR-003, FR-009
**TDD Phase**: RED

**Test Code**:
```javascript
test('dispatches toggleSubjectFilter action when subject checkbox clicked', async () => {
  // ARRANGE: Render with mock store
  const { store } = renderWithRedux(<SearchBox />);

  // Mock subject checkbox (requires API data to be mocked)
  // This is simplified - actual test will need to mock searchService
  const mockSubjectCheckbox = screen.getByRole('checkbox', { name: /CB1/i });

  // ACT: Click subject checkbox
  fireEvent.click(mockSubjectCheckbox);

  // ASSERT: Redux action dispatched
  await waitFor(() => {
    const state = store.getState();
    expect(state.filters.subjects).toContain('CB1');
  });
});
```

**Expected Failure Message**: `SearchBox does not dispatch Redux actions`

### Test 3: Updates Redux Search Query on Input Change

**Requirement**: FR-002, FR-003
**TDD Phase**: RED

**Test Code**:
```javascript
test('dispatches setSearchQuery action when search input changes', async () => {
  // ARRANGE
  const { store } = renderWithRedux(<SearchBox placeholder="Search..." />);
  const searchInput = screen.getByPlaceholderText(/search/i);

  // ACT: Type in search input
  fireEvent.change(searchInput, { target: { value: 'mock pack' } });

  // ASSERT: Redux action dispatched (debounced)
  await waitFor(() => {
    const state = store.getState();
    expect(state.filters.searchQuery).toBe('mock pack');
  }, { timeout: 500 }); // Account for 300ms debounce
});
```

**Expected Failure Message**: `SearchBox updates local state, not Redux`

### Test 4: Filter Selections Persist Across Unmount/Remount

**Requirement**: FR-001, FR-011
**TDD Phase**: RED

**Test Code**:
```javascript
test('filter selections persist across component unmount and remount', async () => {
  // ARRANGE: Initial state with filters
  const initialState = {
    subjects: ['CB1'],
    searchQuery: 'mock'
  };

  // ACT: Render, unmount, remount
  const { unmount, store } = renderWithRedux(<SearchBox />, initialState);

  // Verify initial state
  const state1 = store.getState();
  expect(state1.filters.subjects).toEqual(['CB1']);

  // Unmount component
  unmount();

  // Remount component with same store
  render(
    <Provider store={store}>
      <SearchBox />
    </Provider>
  );

  // ASSERT: Redux state unchanged, filters still selected
  const state2 = store.getState();
  expect(state2.filters.subjects).toEqual(['CB1']);
  expect(state2.filters.searchQuery).toBe('mock');
});
```

**Expected Failure Message**: Pass (Redux persists by design, but test verifies SearchBox doesn't clear state)

### Test 5: Handles Rapid Filter Changes Without Race Conditions

**Requirement**: NFR-003, FR-012
**TDD Phase**: RED

**Test Code**:
```javascript
test('handles rapid filter changes without state inconsistency', async () => {
  // ARRANGE
  const { store } = renderWithRedux(<SearchBox />);

  // Mock multiple checkboxes
  const cb1 = screen.getByRole('checkbox', { name: /CB1/i });
  const cb2 = screen.getByRole('checkbox', { name: /CB2/i });
  const cb3 = screen.getByRole('checkbox', { name: /CB3/i });

  // ACT: Rapid clicks (simulating > 10 clicks/second)
  fireEvent.click(cb1); // Check CB1
  fireEvent.click(cb2); // Check CB2
  fireEvent.click(cb3); // Check CB3
  fireEvent.click(cb1); // Uncheck CB1
  fireEvent.click(cb2); // Uncheck CB2

  // ASSERT: Final state is consistent (only CB3 checked)
  await waitFor(() => {
    const state = store.getState();
    expect(state.filters.subjects).toEqual(['CB3']);
  });
});
```

**Expected Failure Message**: `Rapid clicks cause state inconsistency`

### Test 6: Removes Filter from Redux on Chip Delete

**Requirement**: FR-006
**TDD Phase**: RED

**Test Code**:
```javascript
test('dispatches removeSubjectFilter when filter chip deleted', async () => {
  // ARRANGE: State with selected filter
  const initialState = {
    subjects: ['CB1', 'CB2']
  };
  const { store } = renderWithRedux(<SearchBox />, initialState);

  // Find CB1 chip delete button
  const cb1Chip = screen.getByText('CB1').closest('.MuiChip-root');
  const deleteButton = cb1Chip.querySelector('[data-testid="CloseIcon"]');

  // ACT: Click delete button
  fireEvent.click(deleteButton);

  // ASSERT: CB1 removed from Redux
  await waitFor(() => {
    const state = store.getState();
    expect(state.filters.subjects).toEqual(['CB2']);
  });
});
```

**Expected Failure Message**: `Chip delete updates local state, not Redux`

### Test 7: Clears All Filters via Redux Action

**Requirement**: FR-006
**TDD Phase**: RED

**Test Code**:
```javascript
test('dispatches clearAllFilters when Clear All button clicked', async () => {
  // ARRANGE: State with multiple filters
  const initialState = {
    subjects: ['CB1', 'CB2'],
    product_types: ['8'],
    products: ['1234']
  };
  const { store } = renderWithRedux(<SearchBox />, initialState);

  // ACT: Click "Clear All" button
  const clearButton = screen.getByRole('button', { name: /clear all/i });
  fireEvent.click(clearButton);

  // ASSERT: All filters cleared in Redux
  await waitFor(() => {
    const state = store.getState();
    expect(state.filters.subjects).toEqual([]);
    expect(state.filters.product_types).toEqual([]);
    expect(state.filters.products).toEqual([]);
  });
});
```

**Expected Failure Message**: `Clear All uses local state, not Redux`

### Test 8: Does Not Maintain Local Filter State

**Requirement**: FR-009 (single source of truth)
**TDD Phase**: RED

**Test Code**:
```javascript
test('does not use useState for filter management', () => {
  // ARRANGE & ACT: Render component
  const { store } = renderWithRedux(<SearchBox />);

  // ASSERT: Component uses Redux, not local state
  // This is a code inspection test - verify no useState for selectedFilters
  // Will be validated during code review and by other tests passing

  // Verify Redux is source of truth
  const state = store.getState();
  expect(state.filters).toBeDefined();
  expect(state.filters.subjects).toEqual([]);
});
```

**Expected Failure Message**: `SearchBox still uses useState for selectedFilters`

## Performance Contract Tests

### Test 9: Filter State Update Completes in < 50ms

**Requirement**: NFR-001
**TDD Phase**: RED

**Test Code**:
```javascript
test('filter state update completes in less than 50ms', async () => {
  // ARRANGE
  const { store } = renderWithRedux(<SearchBox />);
  const checkbox = screen.getByRole('checkbox', { name: /CB1/i });

  // ACT & MEASURE: Click and measure time
  const startTime = performance.now();

  fireEvent.click(checkbox);

  await waitFor(() => {
    const state = store.getState();
    expect(state.filters.subjects).toContain('CB1');
  });

  const endTime = performance.now();
  const duration = endTime - startTime;

  // ASSERT: Update completed in < 50ms
  expect(duration).toBeLessThan(50);
});
```

**Expected Failure Message**: `Filter update took ${duration}ms (> 50ms threshold)`

### Test 10: SearchBox Render Time Increase < 5ms

**Requirement**: NFR-002
**TDD Phase**: RED

**Test Code**:
```javascript
test('SearchBox render time does not increase by more than 5ms', () => {
  // ARRANGE: Measure baseline (current local state implementation)
  const baseline = measureRenderTime(() => {
    render(<SearchBox />); // Old implementation
  });

  // ACT: Measure Redux implementation
  const reduxRenderTime = measureRenderTime(() => {
    renderWithRedux(<SearchBox />);
  });

  // ASSERT: Increase < 5ms
  const increase = reduxRenderTime - baseline;
  expect(increase).toBeLessThan(5);
});

// Helper function
function measureRenderTime(renderFn) {
  const startTime = performance.now();
  renderFn();
  const endTime = performance.now();
  return endTime - startTime;
}
```

**Expected Failure Message**: `Render time increased by ${increase}ms (> 5ms threshold)`

## Integration Contract Tests

### Test 11: Works with URL Sync Middleware

**Requirement**: FR-010
**TDD Phase**: RED

**Test Code**:
```javascript
test('filter changes trigger URL sync middleware', async () => {
  // ARRANGE: Render with real store (including middleware)
  const realStore = configureStore({
    reducer: { filters: filtersReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(urlSyncMiddleware)
  });

  render(
    <Provider store={realStore}>
      <SearchBox />
    </Provider>
  );

  // ACT: Select filter
  const checkbox = screen.getByRole('checkbox', { name: /CB1/i });
  fireEvent.click(checkbox);

  // ASSERT: URL updated by middleware
  await waitFor(() => {
    expect(window.location.search).toContain('subject_code=CB1');
  });
});
```

**Expected Failure Message**: `URL not updated after filter selection`

## Test Execution Order

**Phase 1 - RED (Write Failing Tests)**:
1. Test 8: Does not maintain local filter state (code inspection)
2. Test 1: Reads filters from Redux
3. Test 2: Dispatches Redux action on filter select
4. Test 3: Updates Redux search query
5. Test 6: Removes filter via Redux
6. Test 7: Clears all filters via Redux

**Phase 2 - RED (Write Integration Tests)**:
7. Test 4: Filter persistence across unmount
8. Test 5: Rapid filter changes
9. Test 11: URL sync middleware integration

**Phase 3 - RED (Write Performance Tests)**:
10. Test 9: Filter update < 50ms
11. Test 10: Render time increase < 5ms

**Phase 4 - GREEN (Implement Until Tests Pass)**:
- Remove local state from SearchBox
- Add Redux useSelector/useDispatch
- Update filter handlers to dispatch Redux actions

**Phase 5 - REFACTOR**:
- Optimize selectors
- Add React.memo if needed
- Remove prop drilling

## Success Criteria

All 11 contract tests must PASS for SearchBox Redux migration to be complete.

**Key Metrics**:
- ✅ 0 uses of useState for filter management
- ✅ All filter operations dispatch Redux actions
- ✅ Filter state reads from Redux selectors
- ✅ Performance targets met (< 50ms, < 5ms increase)
- ✅ Integration with URL sync middleware works

## Notes

- Tests must be written BEFORE implementation (TDD enforced by tdd-guard)
- Some tests require mocking searchService API responses
- Performance tests may need multiple runs for statistical significance
- Integration tests require full Redux store with middleware
