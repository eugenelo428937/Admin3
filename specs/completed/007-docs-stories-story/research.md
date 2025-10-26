# Research: FiltersSlice Refactoring

**Feature**: Extract Long Methods from FiltersSlice
**Date**: 2025-10-25
**Status**: Complete

## Research Questions & Findings

### 1. Redux Toolkit Slice Composition Patterns

**Question**: What are the best practices for splitting a large Redux Toolkit slice into smaller modules while maintaining backward compatibility?

**Decision**: Use reducer composition with re-exports from main slice

**Rationale**:
- Redux Toolkit supports exporting reducers and combining them in a parent slice
- Re-exporting actions and selectors from main slice maintains existing imports
- Each module exports `initialState` and `reducers` objects for composition
- Main slice uses spread operator to combine reducers: `{ ...baseReducers, ...navReducers }`

**Alternatives Considered**:
1. **createSlice per module with combineReducers**: More complex, requires changing imports
2. **Single slice with exported helper functions**: Doesn't achieve true separation
3. **Separate slices in store**: Breaking change, requires component updates

**References**:
- Redux Toolkit docs: https://redux-toolkit.js.org/usage/usage-guide#simplifying-slices-with-createslice
- Pattern: Extract reducers as plain objects, combine in parent slice

---

### 2. Selector Organization and Memoization

**Question**: How should selectors be organized when extracted to a separate module?

**Decision**: Centralized selectors module with re-export from main slice

**Rationale**:
- Single source of truth for all filter state access
- Memoized selectors (createSelector) prevent unnecessary re-renders
- Re-exporting from main slice maintains backward compatibility
- Easier to add new derived selectors in one location

**Best Practices Applied**:
- Simple selectors: Direct state access (e.g., `state => state.filters.subjects`)
- Derived selectors: Use `createSelector` for computed values
- Group by concern: Basic accessors, then derived/computed selectors

**Performance Considerations**:
- Memoization prevents re-computation unless dependencies change
- Keep selector dependencies minimal to maximize cache hits

---

### 3. Test Strategy for Refactored Modules

**Question**: How to test individual modules while maintaining integration test coverage?

**Decision**: Unit tests per module + integration tests for combined slice

**Rationale**:
- Each module (baseFilters, navigationFilters, selectors) gets independent unit tests
- Main slice integration tests verify module composition works correctly
- Existing 43 filtersSlice tests remain to ensure no regressions
- Faster test execution by testing modules in isolation

**Test Organization**:
```
__tests__/store/slices/
├── baseFilters.test.js          # Tests core filter actions
├── navigationFilters.test.js    # Tests navbar actions
├── filterSelectors.test.js      # Tests all selectors
└── filtersSlice.test.js         # Integration tests (existing)
```

**Test Coverage Goals**:
- Each module: 100% coverage of exported functions
- Integration: All 96 existing tests pass unchanged
- New tests: ~30-40 additional tests for module isolation

---

### 4. Module Boundaries and Responsibilities

**Question**: How to determine which actions belong in which module?

**Decision**: Split by domain concern and usage pattern

**Module Boundaries**:

**Base Filters Module** (`baseFilters.slice.js`):
- Core filter state (subjects, categories, product_types, products, modes_of_delivery)
- Standard CRUD actions (set, toggle, remove, clear)
- Search query and pagination state
- Loading/error states
- Common actions (setMultipleFilters, clearAllFilters)

**Navigation Filters Module** (`navigationFilters.slice.js`):
- Navigation-specific actions with filter-clearing behaviors
- Actions: navSelectSubject, navViewAllProducts, navSelectProductGroup, navSelectProduct, navSelectModeOfDelivery
- These actions have special logic: clear certain filters, then set specific filter

**Selectors Module** (`filterSelectors.js`):
- All state access selectors
- Derived/computed selectors (selectHasActiveFilters, selectActiveFilterCount)
- Validation selectors (selectValidationErrors, selectHasValidationErrors)

**Main Slice** (`filtersSlice.js`):
- Combines all modules
- Re-exports all actions and selectors
- Coordinates validation logic
- Maintains public API

---

### 5. Backward Compatibility Strategy

**Question**: How to ensure zero breaking changes for existing imports?

**Decision**: Facade pattern with re-exports from main slice

**Implementation**:
```javascript
// Main slice imports from modules
import { baseFiltersReducers } from './baseFilters.slice';
import { navigationFiltersReducers } from './navigationFilters.slice';

// Combines into single slice
const filtersSlice = createSlice({
  name: 'filters',
  initialState: { ...baseInitialState, ...navInitialState },
  reducers: { ...baseFiltersReducers, ...navigationFiltersReducers }
});

// Re-exports all actions (unchanged)
export const {
  setSubjects,
  toggleSubjectFilter,
  navSelectSubject,
  // ... all other actions
} = filtersSlice.actions;

// Re-exports all selectors (unchanged)
export {
  selectFilters,
  selectHasActiveFilters,
  // ... all other selectors
} from './filterSelectors';
```

**Verification Strategy**:
1. No changes to component imports required
2. All existing tests pass without modification
3. Public API remains identical
4. Internal organization improved

---

### 6. Migration Path and Rollback Plan

**Question**: What is the safest way to execute this refactoring?

**Decision**: Feature branch with comprehensive testing before merge

**Migration Steps**:
1. Create new modules with extracted code
2. Update main slice to use modules
3. Run all existing tests (must pass 100%)
4. Add new module-specific tests
5. Manual smoke testing in dev environment
6. Code review focusing on exports
7. Merge to main branch

**Rollback Plan**:
- If issues discovered: `git revert` refactoring commits
- Original 532-line file restored
- All functionality immediately restored
- Investigation time: 20-30 minutes
- Fix-forward option: Adjust exports if import issues found

**Risk Mitigation**:
- Keep PR focused: Only refactoring, no feature changes
- Comprehensive test coverage before/after
- Peer review of export structure
- Gradual rollout: Dev → Staging → Production

---

## Summary

All research questions resolved. Key decisions:

1. ✅ **Module composition**: Extract reducers as objects, combine in main slice
2. ✅ **Selectors**: Centralized module with createSelector for derived values
3. ✅ **Testing**: Unit tests per module + integration tests for combined slice
4. ✅ **Boundaries**: Split by domain (base filters vs navigation filters) and concern (state vs selectors)
5. ✅ **Compatibility**: Facade pattern with re-exports maintains public API
6. ✅ **Migration**: Feature branch → tests pass → code review → merge

**Ready for Phase 1**: Design & Contracts
