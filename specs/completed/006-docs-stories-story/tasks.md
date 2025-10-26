# Tasks: Display Navbar Filters in FilterPanel and ActiveFilters (Stories 1.7-1.8)

**Input**: Design documents from `/Users/work/Documents/Code/Admin3/specs/006-docs-stories-story/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅, contracts/README.md ✅
**Branch**: `006-docs-stories-story`
**Feature**: Make navbar filters visible in FilterPanel sidebar and ActiveFilters chip bar

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: React 18.2, Material-UI v5, Redux Toolkit 1.9, Jest 29
   → Structure: Frontend-only changes to Product components
2. Load optional design documents ✅
   → data-model.md: No new entities (pure UI extension using existing state)
   → contracts/README.md: No new API contracts (uses existing endpoint)
   → research.md: Technology decisions already documented
   → quickstart.md: 17 test scenarios identified
3. Generate tasks by category:
   → Setup: Verify dependencies, verify existing state
   → Tests: Component tests for FilterPanel and ActiveFilters (TDD)
   → Core: Extend FilterPanel.js with 3 navbar filter sections
   → Core: Extend ActiveFilters.js with FILTER_CONFIG for navbar chips
   → Integration: Verify Redux state, URL sync, API integration work
   → Polish: Accessibility, mobile responsiveness, performance validation
4. Apply task rules:
   → FilterPanel.test.js and ActiveFilters.test.js = different files = [P]
   → FilterPanel.js and ActiveFilters.js = different files = [P]
   → Tests before implementation (TDD enforced)
5. Number tasks sequentially (T001-T033)
6. Generate dependency graph (see Dependencies section below)
7. Create parallel execution examples (see Parallel Example section below)
8. Validate task completeness:
   → All test scenarios from quickstart.md covered? ✅
   → All component changes have tests? ✅
   → TDD workflow enforced? ✅
9. Return: SUCCESS (33 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Web app structure**: `frontend/react-Admin3/src/` for React components
- Components: `frontend/react-Admin3/src/components/Product/`
- Tests: `frontend/react-Admin3/src/components/Product/__tests__/`
- Redux: `frontend/react-Admin3/src/store/slices/` (no changes needed - Story 1.2 complete)
- Middleware: `frontend/react-Admin3/src/store/middleware/` (no changes needed - Story 1.1 complete)

---

## Phase 3.1: Setup & Verification

**Goal**: Verify all prerequisites are in place before starting TDD workflow

- [ ] **T001** Verify Story 1.2 dependencies: Redux state contains navbar filters (tutorial_format, distance_learning, tutorial) and actions (setTutorialFormat, toggleDistanceLearning, setTutorial, clearAllFilters) in `frontend/react-Admin3/src/store/slices/filtersSlice.js`

- [ ] **T002** Verify Story 1.1 dependencies: URL sync middleware handles navbar filters in `frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js` (parseUrlToFilters and buildUrlFromFilters functions)

- [ ] **T003** Verify Story 1.4 dependencies: useProductsSearch hook includes navbar filters in API payload in `frontend/react-Admin3/src/hooks/useProductsSearch.js`

- [ ] **T004** Verify existing FilterPanel structure: Read `frontend/react-Admin3/src/components/Product/FilterPanel.js` to understand existing accordion pattern for subjects, categories, product types (use as reference for new sections)

- [ ] **T005** Verify existing ActiveFilters structure: Read `frontend/react-Admin3/src/components/Product/ActiveFilters.js` to understand existing FILTER_CONFIG and chip rendering pattern (use as reference for navbar chips)

- [ ] **T006** Verify Material-UI v5 components available: Check package.json confirms @mui/material@^5.x installed and Accordion, AccordionSummary, AccordionDetails, FormGroup, FormControlLabel, Checkbox, Radio, RadioGroup, Chip components are importable

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE PHASE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation. This enforces the RED phase of TDD.

### FilterPanel Component Tests (Tutorial Format Section)

- [ ] **T007** [P] Test: Tutorial Format section renders in FilterPanel
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`
  - **Test**: `describe('Tutorial Format filter section')` → `it('should render Tutorial Format accordion section with radio options')`
  - **Assertions**:
    - Accordion section with title "Tutorial Format" exists
    - Three radio options exist: "Online", "In-Person", "Hybrid"
    - No radio is checked initially (tutorial_format = null in state)
  - **Expected**: TEST FAILS (section doesn't exist yet)

- [ ] **T008** [P] Test: Selecting Tutorial Format radio dispatches Redux action
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`
  - **Test**: `describe('Tutorial Format filter section')` → `it('should dispatch setTutorialFormat action when radio button clicked')`
  - **User action**: Click "Online" radio button
  - **Assertions**:
    - Mock dispatch called with `setTutorialFormat('online')`
    - "Online" radio shows as checked
  - **Expected**: TEST FAILS (radio buttons don't exist yet)

- [ ] **T009** [P] Test: Tutorial Format radio reflects Redux state
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`
  - **Test**: `describe('Tutorial Format filter section')` → `it('should display checked radio when tutorial_format in Redux state')`
  - **Setup**: Mock Redux state with `tutorial_format: 'hybrid'`
  - **Assertions**: "Hybrid" radio is checked
  - **Expected**: TEST FAILS (section doesn't exist yet)

### FilterPanel Component Tests (Distance Learning Section)

- [ ] **T010** [P] Test: Distance Learning section renders in FilterPanel
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`
  - **Test**: `describe('Distance Learning filter section')` → `it('should render Distance Learning accordion section with checkbox')`
  - **Assertions**:
    - Accordion section with title "Distance Learning" exists
    - Checkbox labeled "Distance Learning Only" exists
    - Checkbox is unchecked initially (distance_learning = false in state)
    - Helper text "Show only products available through distance learning" exists
  - **Expected**: TEST FAILS (section doesn't exist yet)

- [ ] **T011** [P] Test: Toggling Distance Learning checkbox dispatches Redux action
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`
  - **Test**: `describe('Distance Learning filter section')` → `it('should dispatch toggleDistanceLearning action when checkbox clicked')`
  - **User action**: Click "Distance Learning Only" checkbox
  - **Assertions**:
    - Mock dispatch called with `toggleDistanceLearning()`
    - Checkbox shows as checked
  - **Expected**: TEST FAILS (checkbox doesn't exist yet)

- [ ] **T012** [P] Test: Distance Learning checkbox reflects Redux state
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`
  - **Test**: `describe('Distance Learning filter section')` → `it('should display checked checkbox when distance_learning true in Redux state')`
  - **Setup**: Mock Redux state with `distance_learning: true`
  - **Assertions**: Checkbox is checked
  - **Expected**: TEST FAILS (section doesn't exist yet)

### FilterPanel Component Tests (Tutorial Products Section)

- [ ] **T013** [P] Test: Tutorial Products section renders in FilterPanel
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`
  - **Test**: `describe('Tutorial filter section')` → `it('should render Tutorial accordion section with checkbox')`
  - **Assertions**:
    - Accordion section with title "Tutorial" exists
    - Checkbox labeled "Tutorial Products Only" exists
    - Checkbox is unchecked initially (tutorial = false in state)
    - Helper text "Show only tutorial products" exists
  - **Expected**: TEST FAILS (section doesn't exist yet)

- [ ] **T014** [P] Test: Toggling Tutorial checkbox dispatches Redux action
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`
  - **Test**: `describe('Tutorial filter section')` → `it('should dispatch setTutorial action when checkbox clicked')`
  - **User action**: Click "Tutorial Products Only" checkbox
  - **Assertions**:
    - Mock dispatch called with `setTutorial(true)` when checked
    - Mock dispatch called with `setTutorial(false)` when unchecked
  - **Expected**: TEST FAILS (checkbox doesn't exist yet)

- [ ] **T015** [P] Test: Tutorial checkbox reflects Redux state
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`
  - **Test**: `describe('Tutorial filter section')` → `it('should display checked checkbox when tutorial true in Redux state')`
  - **Setup**: Mock Redux state with `tutorial: true`
  - **Assertions**: Checkbox is checked
  - **Expected**: TEST FAILS (section doesn't exist yet)

### ActiveFilters Component Tests (Navbar Filter Chips)

- [ ] **T016** [P] Test: Tutorial Format chip renders when filter active
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/ActiveFilters.test.js`
  - **Test**: `describe('Navbar filter chips')` → `it('should render Tutorial Format chip when tutorial_format in state')`
  - **Setup**: Mock Redux state with `tutorial_format: 'online'`
  - **Assertions**:
    - Chip with label "Tutorial Format: Online" exists
    - Chip has delete icon (×)
  - **Expected**: TEST FAILS (FILTER_CONFIG for tutorial_format doesn't exist yet)

- [ ] **T017** [P] Test: Distance Learning chip renders when filter active
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/ActiveFilters.test.js`
  - **Test**: `describe('Navbar filter chips')` → `it('should render Distance Learning chip when distance_learning true')`
  - **Setup**: Mock Redux state with `distance_learning: true`
  - **Assertions**:
    - Chip with label "Distance Learning" exists
    - Chip has delete icon (×)
  - **Expected**: TEST FAILS (FILTER_CONFIG for distance_learning doesn't exist yet)

- [ ] **T018** [P] Test: Tutorial chip renders when filter active
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/ActiveFilters.test.js`
  - **Test**: `describe('Navbar filter chips')` → `it('should render Tutorial Products chip when tutorial true')`
  - **Setup**: Mock Redux state with `tutorial: true`
  - **Assertions**:
    - Chip with label "Tutorial Products" exists
    - Chip has delete icon (×)
  - **Expected**: TEST FAILS (FILTER_CONFIG for tutorial doesn't exist yet)

- [ ] **T019** [P] Test: Clicking Tutorial Format chip delete dispatches clearance action
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/ActiveFilters.test.js`
  - **Test**: `describe('Navbar filter chips')` → `it('should dispatch setTutorialFormat(null) when Tutorial Format chip deleted')`
  - **Setup**: Mock Redux state with `tutorial_format: 'online'`
  - **User action**: Click × on "Tutorial Format: Online" chip
  - **Assertions**: Mock dispatch called with `setTutorialFormat(null)`
  - **Expected**: TEST FAILS (chip delete handler doesn't exist yet)

- [ ] **T020** [P] Test: Clicking Distance Learning chip delete dispatches toggle action
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/ActiveFilters.test.js`
  - **Test**: `describe('Navbar filter chips')` → `it('should dispatch toggleDistanceLearning when Distance Learning chip deleted')`
  - **Setup**: Mock Redux state with `distance_learning: true`
  - **User action**: Click × on "Distance Learning" chip
  - **Assertions**: Mock dispatch called with `toggleDistanceLearning()`
  - **Expected**: TEST FAILS (chip delete handler doesn't exist yet)

- [ ] **T021** [P] Test: Clicking Tutorial chip delete dispatches clearance action
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/ActiveFilters.test.js`
  - **Test**: `describe('Navbar filter chips')` → `it('should dispatch setTutorial(false) when Tutorial Products chip deleted')`
  - **Setup**: Mock Redux state with `tutorial: true`
  - **User action**: Click × on "Tutorial Products" chip
  - **Assertions**: Mock dispatch called with `setTutorial(false)`
  - **Expected**: TEST FAILS (chip delete handler doesn't exist yet)

- [ ] **T022** [P] Test: Multiple navbar filter chips render simultaneously
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/ActiveFilters.test.js`
  - **Test**: `describe('Navbar filter chips')` → `it('should render all three navbar chips when all filters active')`
  - **Setup**: Mock Redux state with `tutorial_format: 'hybrid'`, `distance_learning: true`, `tutorial: true`
  - **Assertions**:
    - Three navbar chips exist
    - Chips have correct labels: "Tutorial Format: Hybrid", "Distance Learning", "Tutorial Products"
  - **Expected**: TEST FAILS (FILTER_CONFIG doesn't exist yet)

---

## Phase 3.3: Core Implementation (ONLY after tests T007-T022 are failing)

**CRITICAL**: Do NOT start this phase until ALL tests in Phase 3.2 are written and FAILING. Run `npm test` to verify RED phase.

### Implement FilterPanel Navbar Filter Sections

- [ ] **T023** Implement Tutorial Format section in FilterPanel
  - **File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`
  - **Location**: After Subjects section, before Categories section
  - **Implementation**:
    - Add Accordion component with title "Tutorial Format"
    - Add RadioGroup with three Radio options: "Online", "In-Person", "Hybrid"
    - Map radio values to Redux state: 'online', 'in_person', 'hybrid'
    - Wire onChange to dispatch `setTutorialFormat(value)`
    - Control checked state from `filters.tutorial_format` Redux selector
    - Copy exact styling from existing filter sections (typography, spacing, colors)
  - **Test validation**: Run T007, T008, T009 - all should PASS (GREEN phase)
  - **Dependencies**: Requires T007-T009 failing

- [ ] **T024** Implement Distance Learning section in FilterPanel
  - **File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`
  - **Location**: After Tutorial Format section
  - **Implementation**:
    - Add Accordion component with title "Distance Learning"
    - Add FormControlLabel with Checkbox labeled "Distance Learning Only"
    - Add Typography helper text: "Show only products available through distance learning"
    - Wire onChange to dispatch `toggleDistanceLearning()`
    - Control checked state from `filters.distance_learning` Redux selector
    - Copy exact styling from existing checkbox sections
  - **Test validation**: Run T010, T011, T012 - all should PASS (GREEN phase)
  - **Dependencies**: Requires T010-T012 failing

- [ ] **T025** Implement Tutorial Products section in FilterPanel
  - **File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`
  - **Location**: After Distance Learning section
  - **Implementation**:
    - Add Accordion component with title "Tutorial"
    - Add FormControlLabel with Checkbox labeled "Tutorial Products Only"
    - Add Typography helper text: "Show only tutorial products"
    - Wire onChange to dispatch `setTutorial(!filters.tutorial)`
    - Control checked state from `filters.tutorial` Redux selector
    - Copy exact styling from existing checkbox sections
  - **Test validation**: Run T013, T014, T015 - all should PASS (GREEN phase)
  - **Dependencies**: Requires T013-T015 failing

### Implement ActiveFilters Navbar Filter Chips

- [ ] **T026** Extend FILTER_CONFIG with tutorial_format entry in ActiveFilters
  - **File**: `frontend/react-Admin3/src/components/Product/ActiveFilters.js`
  - **Location**: FILTER_CONFIG object (add new entries)
  - **Implementation**:
    ```javascript
    tutorial_format: {
      label: 'Tutorial Format',
      color: 'secondary',
      getDisplayValue: (value) => {
        const formatLabels = {
          online: 'Online',
          in_person: 'In-Person',
          hybrid: 'Hybrid',
        };
        return formatLabels[value] || value;
      },
    },
    ```
  - **Delete handler**: Map to `setTutorialFormat(null)` action
  - **Test validation**: Run T016, T019 - should PASS (GREEN phase)
  - **Dependencies**: Requires T016, T019 failing

- [ ] **T027** Extend FILTER_CONFIG with distance_learning entry in ActiveFilters
  - **File**: `frontend/react-Admin3/src/components/Product/ActiveFilters.js`
  - **Location**: FILTER_CONFIG object (add new entry)
  - **Implementation**:
    ```javascript
    distance_learning: {
      label: 'Distance Learning',
      color: 'secondary',
      getDisplayValue: () => 'Active',
    },
    ```
  - **Delete handler**: Map to `toggleDistanceLearning()` action
  - **Rendering condition**: Only render chip if `filters.distance_learning === true`
  - **Test validation**: Run T017, T020 - should PASS (GREEN phase)
  - **Dependencies**: Requires T017, T020 failing

- [ ] **T028** Extend FILTER_CONFIG with tutorial entry in ActiveFilters
  - **File**: `frontend/react-Admin3/src/components/Product/ActiveFilters.js`
  - **Location**: FILTER_CONFIG object (add new entry)
  - **Implementation**:
    ```javascript
    tutorial: {
      label: 'Tutorial Products',
      color: 'secondary',
      getDisplayValue: () => 'Active',
    },
    ```
  - **Delete handler**: Map to `setTutorial(false)` action
  - **Rendering condition**: Only render chip if `filters.tutorial === true`
  - **Test validation**: Run T018, T021 - should PASS (GREEN phase)
  - **Dependencies**: Requires T018, T021 failing

- [ ] **T029** Update chip rendering logic to handle navbar filters
  - **File**: `frontend/react-Admin3/src/components/Product/ActiveFilters.js`
  - **Location**: Chip rendering loop
  - **Implementation**:
    - Ensure tutorial_format chip renders when `filters.tutorial_format` is not null
    - Ensure distance_learning chip renders when `filters.distance_learning === true`
    - Ensure tutorial chip renders when `filters.tutorial === true`
    - Maintain existing chip order (existing filters first, then navbar filters)
    - Ensure chip wrapping works on mobile (flex-wrap: wrap already applied)
  - **Test validation**: Run T022 - should PASS (GREEN phase)
  - **Dependencies**: Requires T026, T027, T028 complete, T022 failing

---

## Phase 3.4: Integration & End-to-End Validation

**Goal**: Verify navbar filters integrate correctly with Redux, URL sync, and API

- [ ] **T030** Integration test: Verify Redux state updates when navbar filters applied via FilterPanel
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.integration.test.js` (create new file)
  - **Test**: Use real Redux store (not mocked)
  - **Actions**:
    - Click "Online" radio → verify Redux state `tutorial_format: 'online'`
    - Check Distance Learning checkbox → verify Redux state `distance_learning: true`
    - Check Tutorial checkbox → verify Redux state `tutorial: true`
  - **Assertions**: Redux DevTools inspection confirms state updates
  - **Dependencies**: Requires T023, T024, T025 complete

- [ ] **T031** Integration test: Verify URL synchronization for navbar filters
  - **File**: `frontend/react-Admin3/src/components/Product/__tests__/URLSync.integration.test.js` (create new file)
  - **Test**: Use React Router with memory history
  - **Actions**:
    - Apply Tutorial Format: Online → verify URL contains `?tutorial_format=online`
    - Apply Distance Learning → verify URL contains `?distance_learning=1`
    - Remove Tutorial Format chip → verify URL parameter removed
    - Navigate to `/products?tutorial_format=hybrid&distance_learning=1` → verify filters restored
  - **Assertions**: URL params match filter state, browser back/forward work correctly
  - **Dependencies**: Requires T023-T029 complete, Story 1.1 URL sync working

- [ ] **T032** Integration test: Verify API payload includes navbar filters
  - **File**: `frontend/react-Admin3/src/hooks/__tests__/useProductsSearch.integration.test.js` (modify existing file)
  - **Test**: Mock fetch/axios, inspect request payload
  - **Setup**: Apply navbar filters via Redux actions
  - **Assertions**:
    - Request body includes `filters.tutorial_format: 'online'`
    - Request body includes `filters.distance_learning: true`
    - Request body includes `filters.tutorial: false`
  - **Dependencies**: Requires T023-T029 complete, Story 1.4 API integration working

---

## Phase 3.5: Polish, Accessibility, and Performance

**Goal**: Ensure production-ready quality, accessibility, and performance

- [ ] **T033** Accessibility audit: Keyboard navigation for navbar filter sections
  - **File**: Manual testing using keyboard only (document in quickstart.md)
  - **Test scenarios**:
    - Tab to Tutorial Format section → Enter expands → Tab to radios → Space selects
    - Tab to Distance Learning checkbox → Space toggles
    - Tab to Tutorial checkbox → Space toggles
    - Tab to navbar filter chips → Enter deletes chip
  - **Assertions**:
    - All navbar filter controls reachable via Tab key
    - Focus indicators visible on all interactive elements
    - Enter/Space keys work for all controls
    - Screen reader announces filter sections and state changes (test with NVDA/VoiceOver)
  - **Dependencies**: Requires T023-T029 complete

- [ ] **T034** Accessibility audit: ARIA labels and screen reader support
  - **File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js` and `ActiveFilters.js`
  - **Verification**:
    - Accordion sections have proper ARIA attributes (aria-expanded, aria-controls)
    - Radio group has aria-labelledby pointing to section title
    - Checkboxes have associated labels via FormControlLabel
    - Chip delete buttons have aria-label="Remove [filter name] filter"
  - **Tool**: axe DevTools browser extension
  - **Assertions**: Zero accessibility violations for navbar filter sections
  - **Dependencies**: Requires T023-T029 complete

- [ ] **T035** Mobile responsiveness test: FilterPanel drawer on mobile
  - **File**: Manual testing with Chrome DevTools mobile emulation
  - **Test scenarios** (from quickstart.md Test 9):
    - Resize to mobile width (< 600px)
    - Open FilterPanel drawer
    - Verify navbar filter sections visible in drawer
    - Verify touch targets ≥ 44×44px for all checkboxes/radios
    - Tap navbar filter controls → verify they apply correctly
  - **Assertions**:
    - FilterPanel drawer slides in smoothly
    - All navbar filter sections accessible on mobile
    - Touch targets meet WCAG 2.1 AA minimum size
  - **Dependencies**: Requires T023-T025 complete

- [ ] **T036** Mobile responsiveness test: Chip wrapping on narrow screens
  - **File**: Manual testing with Chrome DevTools mobile emulation
  - **Test scenarios** (from quickstart.md Test 10):
    - Apply 5+ filters (mix existing and navbar filters)
    - Resize to mobile width (< 400px)
    - Verify chips wrap to multiple rows
    - Verify no horizontal scrolling required
    - Verify chip delete icons remain tappable (≥ 44×44px touch target)
  - **Assertions**:
    - Chips wrap correctly using flex-wrap
    - All chips remain readable and functional on mobile
  - **Dependencies**: Requires T026-T029 complete

- [ ] **T037** Performance validation: FilterPanel render time
  - **File**: Manual testing with Chrome DevTools Performance tab
  - **Test scenarios** (from quickstart.md Test 12):
    - Record performance profile
    - Navigate to `/products`
    - Open FilterPanel
    - Stop recording
  - **Assertions**:
    - FilterPanel initial render < 100ms
    - Adding 3 navbar filter sections adds < 5ms to render time
    - No layout thrashing detected
  - **Performance budget**: < 100ms total FilterPanel render
  - **Dependencies**: Requires T023-T025 complete

- [ ] **T038** Performance validation: API call debouncing
  - **File**: Manual testing with Chrome DevTools Network tab
  - **Test scenarios** (from quickstart.md Test 13):
    - Open Network tab, filter to `/api/products/unified-search/`
    - Rapidly toggle Distance Learning checkbox 5 times in 1 second
  - **Assertions**:
    - NOT 10 API calls (5 on, 5 off)
    - Only 1-2 API calls made (debounced to 250ms)
  - **Note**: Debouncing already implemented in useProductsSearch hook (Story 1.4)
  - **Dependencies**: Requires T024 complete

- [ ] **T039** Code quality: Remove duplication and refactor
  - **Files**: `FilterPanel.js` and `ActiveFilters.js`
  - **Refactoring**:
    - Extract common accordion section pattern if duplicated > 3 times
    - Extract common checkbox section pattern if needed
    - Ensure DRY principle for FILTER_CONFIG entries
    - Remove any console.log statements
    - Remove commented-out code
  - **Assertions**: Linter passes (ESLint), no warnings
  - **Dependencies**: Requires T023-T029 complete

- [ ] **T040** Documentation: Update component JSDoc comments
  - **Files**: `FilterPanel.js` and `ActiveFilters.js`
  - **Add JSDoc**:
    - Document navbar filter sections in FilterPanel component docstring
    - Document FILTER_CONFIG entries for navbar filters in ActiveFilters
    - Include examples of Redux actions dispatched
    - Document dependencies on Story 1.2 Redux state
  - **Dependencies**: Requires T023-T029 complete

- [ ] **T041** Manual validation: Execute quickstart.md test scenarios
  - **File**: `/Users/work/Documents/Code/Admin3/specs/006-docs-stories-story/quickstart.md`
  - **Test scenarios**: Run all 17 test scenarios manually
    - Test 1-3: Filter visibility and interaction ✅
    - Test 4: Chip removal ✅
    - Test 5: Clear All Filters ✅
    - Test 6: Multiple navbar filters simultaneously ✅
    - Test 7: URL shareability ✅
    - Test 8: Browser back/forward ✅
    - Test 9-10: Mobile responsiveness ✅
    - Test 11: Redux DevTools verification ✅
    - Test 12-13: Performance validation ✅
    - Test 14-15: Accessibility testing ✅
    - Test 16-17: Edge cases ✅
  - **Assertions**: All 17 scenarios pass without errors
  - **Estimated time**: 17 minutes
  - **Dependencies**: Requires all implementation tasks (T023-T029) complete

---

## Dependencies

### Critical Path (TDD Workflow)
```
T001-T006 (Setup/Verification)
    ↓
T007-T022 (Tests - ALL must FAIL) [P]
    ↓
T023-T029 (Implementation - Tests turn GREEN)
    ↓
T030-T032 (Integration tests)
    ↓
T033-T041 (Polish & Validation)
```

### Detailed Dependencies
- **Setup (T001-T006)**: No dependencies, can run in sequence or parallel
- **Tests (T007-T022)**: Depend on T001-T006, ALL tests can run in parallel [P]
- **FilterPanel implementation**:
  - T023 depends on T007-T009 failing
  - T024 depends on T010-T012 failing
  - T025 depends on T013-T015 failing
  - T023, T024, T025 can run in parallel [P] (different sections, no conflicts)
- **ActiveFilters implementation**:
  - T026 depends on T016, T019 failing
  - T027 depends on T017, T020 failing
  - T028 depends on T018, T021 failing
  - T026, T027, T028 can run in parallel [P] (different FILTER_CONFIG entries)
  - T029 depends on T026-T028 complete (updates rendering logic)
- **Integration tests**:
  - T030 depends on T023-T025 (FilterPanel complete)
  - T031 depends on T023-T029 (all components complete)
  - T032 depends on T023-T029 (all components complete)
  - T030, T031, T032 can run in parallel [P] (different test files)
- **Polish tasks**:
  - T033-T034 depend on T023-T029 (accessibility requires implementation)
  - T035 depends on T023-T025 (mobile FilterPanel)
  - T036 depends on T026-T029 (mobile ActiveFilters)
  - T037 depends on T023-T025 (FilterPanel performance)
  - T038 depends on T024 (API debouncing)
  - T039-T040 depend on T023-T029 (code quality & docs)
  - T041 depends on ALL tasks (final validation)

### Parallel Execution Blocks
- **Block 1**: T001, T002, T003, T004, T005, T006 [P] (setup tasks - independent)
- **Block 2**: T007-T022 [P] (all tests - different test files or test suites)
- **Block 3**: T023, T024, T025 [P] (FilterPanel sections - different sections, no conflicts)
- **Block 4**: T026, T027, T028 [P] (FILTER_CONFIG entries - independent)
- **Block 5**: T030, T031, T032 [P] (integration tests - different test files)
- **Block 6**: T033, T034, T035, T036, T037, T038 [P] (validation tasks - independent)

---

## Parallel Example

### Launch Setup Tasks in Parallel
```bash
# Launch T001-T006 together (verification tasks)
# These verify dependencies are in place before starting TDD
Task: "Verify Story 1.2 dependencies: Redux state contains navbar filters"
Task: "Verify Story 1.1 dependencies: URL sync middleware handles navbar filters"
Task: "Verify Story 1.4 dependencies: useProductsSearch hook includes navbar filters"
Task: "Verify existing FilterPanel structure"
Task: "Verify existing ActiveFilters structure"
Task: "Verify Material-UI v5 components available"
```

### Launch All Test Tasks in Parallel (TDD RED Phase)
```bash
# Launch T007-T022 together (all component tests)
# These MUST all FAIL to confirm RED phase of TDD
Task: "Test: Tutorial Format section renders in FilterPanel"
Task: "Test: Selecting Tutorial Format radio dispatches Redux action"
Task: "Test: Tutorial Format radio reflects Redux state"
Task: "Test: Distance Learning section renders in FilterPanel"
Task: "Test: Toggling Distance Learning checkbox dispatches Redux action"
Task: "Test: Distance Learning checkbox reflects Redux state"
Task: "Test: Tutorial Products section renders in FilterPanel"
Task: "Test: Toggling Tutorial checkbox dispatches Redux action"
Task: "Test: Tutorial checkbox reflects Redux state"
Task: "Test: Tutorial Format chip renders when filter active"
Task: "Test: Distance Learning chip renders when filter active"
Task: "Test: Tutorial chip renders when filter active"
Task: "Test: Clicking Tutorial Format chip delete dispatches clearance action"
Task: "Test: Clicking Distance Learning chip delete dispatches toggle action"
Task: "Test: Clicking Tutorial chip delete dispatches clearance action"
Task: "Test: Multiple navbar filter chips render simultaneously"
```

### Launch FilterPanel Implementation in Parallel (TDD GREEN Phase)
```bash
# Launch T023-T025 together (FilterPanel sections)
# These turn FilterPanel tests from RED to GREEN
Task: "Implement Tutorial Format section in FilterPanel"
Task: "Implement Distance Learning section in FilterPanel"
Task: "Implement Tutorial Products section in FilterPanel"
```

### Launch ActiveFilters FILTER_CONFIG Extensions in Parallel (TDD GREEN Phase)
```bash
# Launch T026-T028 together (FILTER_CONFIG entries)
# These turn ActiveFilters tests from RED to GREEN
Task: "Extend FILTER_CONFIG with tutorial_format entry in ActiveFilters"
Task: "Extend FILTER_CONFIG with distance_learning entry in ActiveFilters"
Task: "Extend FILTER_CONFIG with tutorial entry in ActiveFilters"
```

### Launch Integration Tests in Parallel
```bash
# Launch T030-T032 together (integration validation)
Task: "Integration test: Verify Redux state updates when navbar filters applied"
Task: "Integration test: Verify URL synchronization for navbar filters"
Task: "Integration test: Verify API payload includes navbar filters"
```

### Launch Validation Tasks in Parallel
```bash
# Launch T033-T038 together (accessibility, mobile, performance)
Task: "Accessibility audit: Keyboard navigation for navbar filter sections"
Task: "Accessibility audit: ARIA labels and screen reader support"
Task: "Mobile responsiveness test: FilterPanel drawer on mobile"
Task: "Mobile responsiveness test: Chip wrapping on narrow screens"
Task: "Performance validation: FilterPanel render time"
Task: "Performance validation: API call debouncing"
```

---

## Notes

### TDD Enforcement
- **RED Phase (T007-T022)**: ALL tests MUST be written and MUST FAIL before T023
- **GREEN Phase (T023-T029)**: Implement minimal code to make tests pass
- **REFACTOR Phase (T039)**: Improve code quality while keeping tests green
- Run `npm test` after each phase to verify test state

### Parallel Task Guidelines
- **[P] tasks**: Different files, no dependencies, safe to run simultaneously
- **Sequential tasks**: Same file modifications, run one after another
- **Test files**: FilterPanel.test.js and ActiveFilters.test.js are independent [P]
- **Implementation files**: FilterPanel.js and ActiveFilters.js are independent [P]

### Commit Strategy
- Commit after each major phase:
  - After T006: "Setup: Verify all dependencies for navbar filters feature"
  - After T022: "Tests: Add failing tests for navbar filter sections and chips (RED)"
  - After T029: "Implementation: Add navbar filter sections to FilterPanel and chips to ActiveFilters (GREEN)"
  - After T032: "Integration: Verify navbar filters work with Redux, URL sync, and API"
  - After T041: "Polish: Complete accessibility, mobile, performance validation"

### Avoiding Common Mistakes
- ❌ **Don't**: Implement T023-T029 before T007-T022 are written and failing
- ❌ **Don't**: Mark test tasks [P] as parallel if they modify same test file sections
- ❌ **Don't**: Skip accessibility tests (T033-T034) - WCAG 2.1 AA compliance required
- ❌ **Don't**: Skip performance validation (T037-T038) - performance targets defined in plan.md
- ✅ **Do**: Run `npm test` frequently to verify TDD workflow
- ✅ **Do**: Use existing filter sections as reference for styling consistency
- ✅ **Do**: Test on real mobile devices (iOS, Android) for T035-T036
- ✅ **Do**: Use Redux DevTools to inspect state changes during manual testing

---

## Validation Checklist
*GATE: Must verify before marking feature complete*

- [x] All contracts have corresponding tests - N/A (no new API contracts)
- [x] All entities have model tasks - N/A (no new data models, pure UI extension)
- [x] All tests come before implementation - ✅ Phase 3.2 before Phase 3.3
- [x] Parallel tasks truly independent - ✅ Different files, no conflicts
- [x] Each task specifies exact file path - ✅ All tasks include file paths
- [x] No task modifies same file as another [P] task - ✅ Verified:
  - FilterPanel.test.js tasks (T007-T015) are all [P] - same file but different test suites
  - ActiveFilters.test.js tasks (T016-T022) are all [P] - same file but different test suites
  - FilterPanel.js sections (T023-T025) are [P] - different sections, no conflicts
  - ActiveFilters.js FILTER_CONFIG (T026-T028) are [P] - different entries, no conflicts
- [x] TDD workflow enforced - ✅ RED (T007-T022) → GREEN (T023-T029) → REFACTOR (T039)
- [x] All quickstart.md scenarios covered - ✅ T041 validates all 17 scenarios
- [x] Accessibility requirements met - ✅ T033-T034 validate WCAG 2.1 AA
- [x] Mobile responsiveness validated - ✅ T035-T036 validate mobile UX
- [x] Performance targets validated - ✅ T037-T038 validate < 100ms render, 250ms debounce

---

**Status**: ✅ Tasks ready for execution (41 tasks total)
**Estimated completion time**: 6-8 hours for experienced React developer
**Feature complexity**: Low (pure UI extension, no backend changes, no new state)
**Risk level**: Low (follows existing patterns, comprehensive test coverage, no breaking changes)

**Next step**: Execute T001-T006 setup tasks, then begin TDD workflow with T007-T022

---

*Generated by /tasks command on 2025-10-20*
*Based on design documents in `/Users/work/Documents/Code/Admin3/specs/006-docs-stories-story/`*
