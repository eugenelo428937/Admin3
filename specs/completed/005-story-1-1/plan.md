# Implementation Plan: Product Filter State Management - Phase 1 (Stories 1.1-1.6)

**Branch**: `005-story-1-1` | **Date**: 2025-01-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/work/Documents/Code/Admin3/specs/005-story-1-1/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → SUCCESS: Spec loaded with 41 functional requirements
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detected: Web application (React frontend + Django backend)
   → Set Structure Decision: Option 2 (web application)
3. Fill the Constitution Check section
   → Constitution template found - no specific project principles defined yet
4. Evaluate Constitution Check section
   → No specific violations (constitution is template)
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → All technical context known from existing codebase
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → Generate design artifacts
7. Re-evaluate Constitution Check section
   → No new violations
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach
9. STOP - Ready for /tasks command
```

## Summary

This plan implements Phase 1 (Stories 1.1-1.6) of the product filtering refactoring to establish **bidirectional Redux ↔ URL synchronization** and consolidate all filter state management. The implementation fixes critical bugs where "Clear All" doesn't work, filters reappear after refresh, and navigation filters aren't visible to users.

**Primary Requirement**: Enable automatic URL synchronization when Redux filter state changes, and restore filters from URL on page load, eliminating race conditions and ensuring filter URLs are shareable and bookmarkable.

**Technical Approach**:
- Create Redux Toolkit listener middleware (urlSyncMiddleware) for Redux → URL sync
- Extend filtersSlice with navigation filter fields (tutorial_format, distance_learning, tutorial)
- Remove manual URL manipulation from navigation handlers
- Implement URL parsing on ProductList mount for URL → Redux restoration
- Consolidate useProductsSearch to read from Redux only (no URL parsing)

## Technical Context

**Language/Version**: JavaScript (ES6+), React 18.x, Node.js 18+
**Primary Dependencies**:
- Frontend: React 18, Redux Toolkit (RTK), React Router v6, Material-UI v5
- Backend: Django 5.1, Django REST Framework, PostgreSQL
**Storage**: Redux store (in-memory), Browser URL (persistent), PostgreSQL (backend)
**Testing**: Jest, React Testing Library, MSW (Mock Service Worker)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari)
**Project Type**: Web application (React frontend + Django backend)
**Performance Goals**:
- URL sync < 5ms per filter change
- No noticeable UI delay
- Zero duplicate API calls
**Constraints**:
- Must preserve existing filter UI
- Backward compatible with existing URL formats
- No breaking changes to Redux API
**Scale/Scope**:
- 10 filter types to manage
- 6 stories (1.1-1.6)
- ~1000 lines of new/modified code

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: PASS (Constitution is template - no project-specific principles defined yet)

**Notes**:
- Constitution file exists but is placeholder template
- No specific architectural constraints to validate against
- Following general best practices:
  - Test-driven development approach
  - Small, focused changes
  - Existing patterns maintained
  - No unnecessary complexity added

## Project Structure

### Documentation (this feature)
```
specs/005-story-1-1/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification (exists)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── redux-state.schema.json
│   └── url-parameters.schema.json
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application
backend/django_Admin3/
├── apps/
│   └── products/        # Existing - no changes for Phase 1
└── tests/               # Existing tests

frontend/react-Admin3/
├── src/
│   ├── store/
│   │   ├── index.js                     # MODIFY: Add urlSyncMiddleware
│   │   ├── slices/
│   │   │   └── filtersSlice.js          # MODIFY: Add navbar filter fields
│   │   └── middleware/                  # NEW DIRECTORY
│   │       ├── urlSyncMiddleware.js     # NEW: Redux → URL sync (Story 1.1)
│   │       └── __tests__/
│   │           └── urlSyncMiddleware.test.js  # NEW: Tests
│   ├── components/
│   │   ├── Ordering/
│   │   │   ├── ProductList.js           # MODIFY: URL → Redux on mount (Story 1.6)
│   │   │   └── __tests__/
│   │   │       └── ProductList.test.js  # MODIFY: Add tests
│   │   ├── MainNavBar.js                # MODIFY: Remove manual URL updates (Story 1.3)
│   │   └── SearchBox.js                 # MODIFY: Use Redux for search (Story 1.9 - Phase 2)
│   └── hooks/
│       ├── useProductsSearch.js         # MODIFY: Use Redux navbar filters (Story 1.4)
│       └── __tests__/
│           └── useProductsSearch.test.js  # MODIFY: Add tests
└── tests/
    ├── integration/                     # NEW: Integration tests
    │   └── filterStateManagement.test.js
    └── e2e/                            # Existing - no changes for Phase 1
```

**Structure Decision**: Option 2 (Web application) - Frontend (React) + Backend (Django)

## Phase 0: Outline & Research

**Status**: All technical decisions known from existing codebase analysis

### Research Findings

#### 1. Redux Middleware Pattern (urlSyncMiddleware - Story 1.1)
**Decision**: Use Redux Toolkit's `createListenerMiddleware`
**Rationale**:
- Official RTK pattern for side effects
- Type-safe action filtering with predicate
- Clean separation from reducers
- Already used in codebase for cookie persistence
**Alternatives Considered**:
- Custom middleware: More boilerplate, less type safety
- useEffect in components: Scattered logic, harder to test
- Redux Saga: Overkill for simple URL sync

#### 2. URL Update Strategy
**Decision**: Use `window.history.replaceState()` (not `pushState`)
**Rationale**:
- Avoids polluting browser history with every filter click
- User can still use back button for page navigation
- Matches existing behavior in codebase
**Alternatives Considered**:
- pushState: Would create history entry per filter change (bad UX)
- Direct URL manipulation: Doesn't trigger browser events properly

#### 3. Loop Prevention Strategy
**Decision**: Track last URL parameters and skip update if identical
**Rationale**:
- Prevents infinite Redux → URL → Redux loops
- Simple comparison using URLSearchParams.toString()
- Minimal performance overhead
**Implementation**:
```javascript
let lastUrlParams = null;
if (currentParams === lastUrlParams) return; // Skip update
lastUrlParams = currentParams;
```

#### 4. URL Parameter Format (Story 1.1, 1.6)
**Decision**: Maintain existing indexed format for backward compatibility
**Rationale**:
- Existing URLs in bookmarks must continue working
- Format: `?subject_code=CB1&subject_1=CB2` (indexed)
- Alternative format: `?group=Mat,Tut` (comma-separated)
- Code maps Redux state to appropriate format per filter type
**Alternatives Considered**:
- JSON in URL: Not human-readable, harder to share
- Single comma-separated param: Breaks for some filter types

#### 5. Redux State Extension (Story 1.2)
**Decision**: Add navbar fields directly to filtersSlice
**Rationale**:
- Single source of truth principle
- Consistent with existing filter structure
- Easy to sync with URL via same middleware
**New Fields**:
```javascript
{
  tutorial_format: null,        // 'online' | 'in_person' | 'hybrid' | null
  distance_learning: false,     // boolean
  tutorial: false,              // boolean
}
```
**Alternatives Considered**:
- Separate navbar slice: Adds complexity, duplicate sync logic
- Keep in URL only: Violates single source of truth

#### 6. Testing Strategy
**Decision**: Jest + React Testing Library for unit/integration tests
**Rationale**:
- Already configured in project
- RTL promotes testing user behavior over implementation
- MSW for API mocking
**Test Coverage Goals**:
- Unit tests: urlSyncMiddleware, Redux actions
- Integration tests: Full filter flow (UI → Redux → URL → refresh)
- E2E tests: Deferred to Phase 4 (Story 1.17)

**Output**: All research complete - no unknowns remain

## Phase 1: Design & Contracts

### 1. Data Model (`data-model.md`)

#### FilterState Entity
**Purpose**: Complete representation of all product filter selections in Redux

**Structure**:
```typescript
interface FilterState {
  // Array filters (multiple selection)
  subject_code: string[];           // e.g., ['CB1', 'CB2']
  category_code: string[];          // e.g., ['MAT', 'TUT']
  product_type_code: string[];      // e.g., ['PRINTED', 'EBOOK']
  product_code: string[];           // Specific products
  mode_of_delivery_code: string[];  // Delivery modes

  // Single-value filters
  tutorial_format: string | null;   // 'online' | 'in_person' | 'hybrid' | null

  // Boolean filters
  distance_learning: boolean;       // true/false
  tutorial: boolean;                // true/false

  // Search
  search_query: string;             // Search text

  // Metadata
  lastUpdated: number | null;       // Timestamp for change detection
  filterCounts: Record<string, number>;  // Product counts per filter
  validationErrors: ValidationError[];   // Validation messages (Phase 3)
}
```

**Validation Rules** (from spec):
- FR-001: All filters must exist in single centralized state
- FR-002-010: Each filter type must be tracked correctly
- FR-035: Invalid filter values ignored gracefully

**State Transitions**:
- Initial: All filters empty/false/null
- On user interaction: Individual filter updated, lastUpdated timestamp set
- On "Clear All": Reset to initial state
- On URL load: Bulk update from URL parameters

#### URLParameters Mapping
**Purpose**: Define bidirectional mapping between Redux state and URL query params

**Mappings**:
```javascript
const URL_PARAM_MAPPING = {
  subject_code: {
    reduxField: 'subject_code',
    urlFormat: 'indexed',        // subject_code, subject_1, subject_2
    type: 'array'
  },
  category_code: {
    reduxField: 'category_code',
    urlFormat: 'indexed',
    type: 'array'
  },
  group: {                        // Legacy name for product_type_code
    reduxField: 'product_type_code',
    urlFormat: 'comma-separated', // group=PRINTED,EBOOK
    type: 'array'
  },
  product: {
    reduxField: 'product_code',
    urlFormat: 'comma-separated',
    type: 'array'
  },
  tutorial_format: {
    reduxField: 'tutorial_format',
    urlFormat: 'single',
    type: 'string'
  },
  distance_learning: {
    reduxField: 'distance_learning',
    urlFormat: 'boolean',       // '1' or absent
    type: 'boolean'
  },
  tutorial: {
    reduxField: 'tutorial',
    urlFormat: 'boolean',
    type: 'boolean'
  },
  search_query: {
    reduxField: 'search_query',
    urlFormat: 'single',
    type: 'string'
  }
};
```

**Backward Compatibility**:
- Support both indexed and comma-separated formats
- Map legacy parameter names (e.g., 'group' → 'product_type_code')
- Ignore unknown parameters gracefully

### 2. API Contracts (`contracts/`)

#### Redux State Contract (`redux-state.schema.json`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FilterState",
  "type": "object",
  "properties": {
    "subject_code": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "category_code": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "product_type_code": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "product_code": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "mode_of_delivery_code": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "tutorial_format": {
      "type": ["string", "null"],
      "enum": ["online", "in_person", "hybrid", null],
      "default": null
    },
    "distance_learning": {
      "type": "boolean",
      "default": false
    },
    "tutorial": {
      "type": "boolean",
      "default": false
    },
    "search_query": {
      "type": "string",
      "default": ""
    },
    "lastUpdated": {
      "type": ["number", "null"],
      "default": null
    }
  },
  "required": [
    "subject_code",
    "category_code",
    "product_type_code",
    "product_code",
    "mode_of_delivery_code",
    "tutorial_format",
    "distance_learning",
    "tutorial",
    "search_query"
  ]
}
```

#### URL Parameters Contract (`url-parameters.schema.json`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "URLParameters",
  "description": "Valid URL query parameters for product filtering",
  "type": "object",
  "properties": {
    "subject_code": { "type": "string" },
    "subject_1": { "type": "string" },
    "subject_2": { "type": "string" },
    "category_code": { "type": "string" },
    "category_1": { "type": "string" },
    "group": { "type": "string" },
    "product": { "type": "string" },
    "tutorial_format": {
      "type": "string",
      "enum": ["online", "in_person", "hybrid"]
    },
    "distance_learning": {
      "type": "string",
      "enum": ["1"]
    },
    "tutorial": {
      "type": "string",
      "enum": ["1"]
    },
    "search_query": { "type": "string" }
  },
  "additionalProperties": false
}
```

### 3. Test Scenarios (from User Stories)

#### Test Scenario 1: Clear All Filters (Story 1.5)
```javascript
describe('Clear All Filters', () => {
  it('should clear filters from Redux, URL, and UI', async () => {
    // Given: User has applied multiple filters
    const { store } = renderWithRedux(<ProductList />);
    dispatch(setSubjects(['CB1', 'CB2']));
    dispatch(setCategories(['MAT']));

    // When: User clicks "Clear All" button
    fireEvent.click(screen.getByText('Clear All'));

    // Then: All filters removed
    expect(store.getState().filters.subject_code).toEqual([]);
    expect(store.getState().filters.category_code).toEqual([]);

    // And: URL resets
    expect(window.location.search).toBe('');

    // And: Refresh preserves empty state
    await act(() => { window.location.reload(); });
    expect(store.getState().filters.subject_code).toEqual([]);
  });
});
```

#### Test Scenario 2: Filter Persistence on Refresh (Story 1.6)
```javascript
describe('Filter Persistence', () => {
  it('should restore filters from URL on page load', () => {
    // Given: URL contains filter parameters
    window.history.replaceState({}, '', '/products?subject_code=CB1&category_code=MAT');

    // When: ProductList mounts
    const { store } = renderWithRedux(<ProductList />);

    // Then: Filters restored to Redux
    expect(store.getState().filters.subject_code).toEqual(['CB1']);
    expect(store.getState().filters.category_code).toEqual(['MAT']);

    // And: Filtered products displayed
    await waitFor(() => {
      expect(screen.getByText(/Filtered Results/i)).toBeInTheDocument();
    });
  });
});
```

#### Test Scenario 3: URL Synchronization (Story 1.1)
```javascript
describe('URL Synchronization', () => {
  it('should update URL when filter changes', () => {
    // Given: User on products page
    const { store } = renderWithRedux(<FilterPanel />);

    // When: User selects CB1 subject
    dispatch(setSubjects(['CB1']));

    // Then: URL updates immediately
    expect(window.location.search).toContain('subject_code=CB1');

    // And: No new history entry created
    const historyLength = window.history.length;
    dispatch(setCategories(['MAT']));
    expect(window.history.length).toBe(historyLength);
  });
});
```

#### Test Scenario 4: Navigation Integration (Story 1.2, 1.3, 1.4)
```javascript
describe('Navigation Filters', () => {
  it('should integrate navbar filters with Redux', () => {
    // Given: User clicks "Tutorial Products" in navbar
    const { store } = renderWithRedux(<MainNavBar />);

    // When: Tutorial link clicked
    fireEvent.click(screen.getByText('Tutorial Products'));

    // Then: Tutorial filter set in Redux
    expect(store.getState().filters.tutorial).toBe(true);

    // And: URL updated
    expect(window.location.search).toContain('tutorial=1');

    // And: No manual URL manipulation in code
    // (verified by code inspection)
  });
});
```

### 4. Quickstart Validation (`quickstart.md`)

See `quickstart.md` artifact for complete validation steps.

### 5. Agent Context Update

**Action**: Update CLAUDE.md with new technical context
**Command**: `.specify/scripts/bash/update-agent-context.sh claude`
**Content to Add**:
- Redux middleware pattern (urlSyncMiddleware)
- Filter state structure (10 filter types)
- URL parameter mapping rules
- Loop prevention strategy
- Test-driven development approach for this feature

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks from Phase 1 design docs:
   - Each contract test → contract test task [P]
   - Each Redux action → reducer test + implementation
   - Each middleware function → middleware test + implementation
   - Each user story → integration test
3. Order by TDD + dependency:
   - Tests before implementation
   - Redux state before middleware
   - Middleware before component changes
4. Mark independent tasks with [P] for parallel execution

**Task Categories**:
- **Setup**: Test utilities, mock data (Tasks 1-2)
- **Redux State**: filtersSlice extension (Tasks 3-5) [Story 1.2]
- **Middleware**: urlSyncMiddleware (Tasks 6-9) [Story 1.1]
- **Component Updates**: Navigation, ProductList (Tasks 10-14) [Stories 1.3, 1.6]
- **Integration**: useProductsSearch consolidation (Tasks 15-17) [Story 1.4]
- **Validation**: Clear All verification (Tasks 18-20) [Story 1.5]
- **Documentation**: Update CLAUDE.md, README (Tasks 21-22)

**Estimated Task Count**: 22 tasks
- Contract tests: 2 tasks
- Redux state: 3 tasks
- Middleware: 4 tasks
- Components: 5 tasks
- Integration: 3 tasks
- Validation: 3 tasks
- Documentation: 2 tasks

**Ordering Strategy**:
```
Task 1-2:   Setup [P]
Task 3-5:   Redux state extension [Story 1.2]
Task 6-9:   URL sync middleware [Story 1.1] (depends on 3-5)
Task 10-11: Remove nav URL updates [Story 1.3] (depends on 6-9)
Task 12-13: ProductList URL parsing [Story 1.6] (depends on 6-9)
Task 14-15: Consolidate useProductsSearch [Story 1.4] (depends on 3-5)
Task 16-18: Integration testing
Task 19-20: Clear All validation [Story 1.5] (depends on all)
Task 21-22: Documentation
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (manual or via implementation tools)
**Phase 4**: Test execution and validation
**Phase 5**: Code review and merge to main branch

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | Constitution is template - no project-specific constraints | N/A |

**Notes**:
- No complexity violations detected
- Implementation follows existing patterns
- No new dependencies introduced
- Redux middleware is standard pattern in codebase

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (template - no violations)
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A)

---
*Plan generated for Stories 1.1-1.6 (Phase 1: Critical Fixes)*
*Next step: Run `/tasks` command to generate tasks.md*
