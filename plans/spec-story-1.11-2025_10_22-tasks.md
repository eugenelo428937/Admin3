# Tasks: Filter Registry Pattern (Story 1.11)

**Input**: Design documents from `/Users/work/Documents/Code/Admin3/plans/spec-story-1.11-2025_10_22-plan.md`
**Branch**: `1.11-filter-registry-pattern`
**Prerequisites**: plan.md, contracts/FilterRegistry.contract.js

## Execution Flow
```
1. Load plan.md from feature directory
   → Tech stack: React 18, JavaScript ES6+, Material-UI 5, Redux Toolkit
   → Structure: Frontend registry pattern (Option 2)
2. Load contract: FilterRegistry.contract.js
   → Extract API methods and registration schema
3. Generate tasks by phase:
   → Phase A: Registry Foundation (TDD)
   → Phase B: FilterPanel Migration (incremental with visual verification)
   → Phase C: ActiveFilters Migration (incremental with visual verification)
   → Phase D: Optional FilterUrlManager integration
   → Phase E: Documentation & verification
4. Apply task rules:
   → Tests before implementation (TDD for registry)
   → Incremental migration (one component at a time)
   → Visual verification after each migration
5. SUCCESS: 19 tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup
- [ ] **T001** Create registry file `frontend/react-Admin3/src/store/filters/filterRegistry.js` with empty class stub
- [ ] **T002** Create test file `frontend/react-Admin3/src/store/filters/__tests__/filterRegistry.test.js` with test suite structure

## Phase 3.2: Registry Foundation (TDD) ⚠️ Tests First

### RED Phase - Write Failing Tests
- [ ] **T003** [P] Write registration tests in `filterRegistry.test.js`:
  - registers new filter type
  - throws error if type missing
  - throws error if label missing
  - throws error if urlParam missing
  - sets default values for optional fields
  - allows re-registration (last wins)
- [ ] **T004** [P] Write query method tests in `filterRegistry.test.js`:
  - get retrieves registered filter by type
  - get returns undefined for unregistered type
  - getAll returns all registered filters sorted by order
  - getAll returns empty array when no filters registered
  - getByUrlParam finds filter by primary URL parameter
  - getByUrlParam finds filter by URL parameter alias
  - getByUrlParam returns undefined for unknown parameter
- [ ] **T005** [P] Write filter subset tests in `filterRegistry.test.js`:
  - getMultipleSelectFilters returns only multiple=true
  - getBooleanFilters returns only dataType=boolean
  - getArrayFilters returns only dataType=array
  - has returns true for registered filter
  - has returns false for unregistered filter
- [ ] **T006** [P] Write visual consistency tests in `filterRegistry.test.js`:
  - all 6 existing filters registered (subjects, categories, product_types, products, modes_of_delivery, searchQuery)
  - registered configs match current hardcoded values

**GATE: Run tests and verify ALL FAIL before proceeding to GREEN phase**

### GREEN Phase - Implement Registry
- [ ] **T007** Implement FilterRegistry class in `frontend/react-Admin3/src/store/filters/filterRegistry.js`:
  - Implement register() with validation and defaults
  - Implement get(), getAll(), getByUrlParam(), has(), clear()
  - Implement getMultipleSelectFilters(), getBooleanFilters(), getArrayFilters()
  - Use Map for O(1) lookups
  - Sort getAll() results by order field
- [ ] **T008** Register all 6 existing filter types in `frontend/react-Admin3/src/store/filters/filterRegistry.js`:
  - subjects (label: 'Subject', urlParam: 'subject_code', color: 'primary', etc.)
  - categories (label: 'Category', urlParam: 'category', color: 'info', etc.)
  - product_types (label: 'Product Type', urlParam: 'group', etc.)
  - products (label: 'Product', urlParam: 'product', etc.)
  - modes_of_delivery (label: 'Mode of Delivery', urlParam: 'mode_of_delivery', etc.)
  - searchQuery (label: 'Search', urlParam: 'search', dataType: 'string', etc.)

  **Note**: tutorial_format, distance_learning, and tutorial filters have been deprecated and removed

**GATE: Run tests and verify ALL PASS before proceeding to Phase B**

## Phase 3.3: FilterPanel Migration (Incremental)

### Pre-Migration Verification
- [ ] **T009** Create FilterPanel integration tests in `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.integration.test.js`:
  - captures current UI state (5 filter sections: subjects, categories, product_types, products, modes_of_delivery)
  - captures section labels and order
  - captures badge colors
  - baseline for visual regression detection
  - Note: searchQuery is not rendered in FilterPanel

### Migration
- [ ] **T010** Update FilterPanel in `frontend/react-Admin3/src/components/Product/FilterPanel.js`:
  - Import FilterRegistry
  - Replace hardcoded Accordion sections with FilterRegistry.getAll().map()
  - Use config.pluralLabel for section titles
  - Use config.color for badges
  - Use config.dataType to determine rendering strategy (checkbox list, radio, toggle)
  - Remove hardcoded filter section code (~100 lines → ~30 lines)

### Post-Migration Verification
- [ ] **T011** Run FilterPanel integration tests and manual verification:
  - Run integration tests (verify no visual changes)
  - Manual UI check: all 5 array filter sections render (subjects, categories, product_types, products, modes_of_delivery)
  - Manual UI check: section order matches original
  - Manual UI check: colors match original
  - Manual UI check: filter selections work correctly

**GATE: Visual verification MUST PASS before proceeding to Phase C**

## Phase 3.4: ActiveFilters Migration (Incremental)

### Pre-Migration Verification
- [ ] **T012** Create ActiveFilters integration tests in `frontend/react-Admin3/src/components/Product/__tests__/ActiveFilters.integration.test.js`:
  - captures current chip rendering
  - captures chip colors and labels
  - captures display value formatting
  - baseline for visual regression detection

### Migration
- [ ] **T013** Update ActiveFilters in `frontend/react-Admin3/src/components/Product/ActiveFilters.js`:
  - Import FilterRegistry
  - Replace hardcoded FILTER_CONFIG with FilterRegistry.getAll()
  - Use config.color for chip colors
  - Use config.label for chip labels
  - Use config.getDisplayValue for value formatting
  - Remove FILTER_CONFIG constant (~50 lines → ~20 lines)

### Post-Migration Verification
- [ ] **T014** Run ActiveFilters integration tests and manual verification:
  - Run integration tests (verify no chip changes)
  - Manual UI check: chips render with correct colors
  - Manual UI check: chip labels match original
  - Manual UI check: display values formatted correctly
  - Manual UI check: chip removal works correctly

**GATE: Visual verification MUST PASS before proceeding to Phase D**

## Phase 3.5: Optional FilterUrlManager Integration
- [ ] **T015** [OPTIONAL] Review FilterUrlManager for registry integration in `frontend/react-Admin3/src/utils/filterUrlManager.js`:
  - Evaluate if URL_PARAM_KEYS can be generated from registry
  - If beneficial: Update URL_PARAM_KEYS to read from FilterRegistry.getAll()
  - If not beneficial: Document decision and skip
  - Note: Story 1.10 already complete, this is enhancement only

## Phase 3.6: Documentation & Verification
- [ ] **T016** [P] Create developer guide in `frontend/react-Admin3/docs/how-to-add-new-filter.md`:
  - Document 3-step process: Add registry entry, Add Redux state/actions, Done!
  - Provide example registry entry with all fields explained
  - Provide example Redux state addition
  - Explain automatic rendering in FilterPanel and ActiveFilters
- [ ] **T017** [P] Run full test suite and verify no regression:
  - Run `npm test -- filterRegistry.test.js` (verify all registry tests pass)
  - Run `npm test -- FilterPanel.integration.test.js` (verify visual consistency)
  - Run `npm test -- ActiveFilters.integration.test.js` (verify visual consistency)
  - Run full test suite `npm test` (verify no breaks in existing tests)
  - Verify coverage ≥90% for filterRegistry.js
- [ ] **T018** [P] Comprehensive code search verification:
  ```bash
  # Verify no hardcoded filter configs remain
  grep -r "FILTER_CONFIG\|filter.*label.*color" frontend/react-Admin3/src/components/ | grep -v registry
  # Review results to ensure only registry references
  ```
- [ ] **T019** [P] Manual end-to-end testing:
  - Apply various filter combinations → verify all render correctly
  - Check FilterPanel accordion sections → verify 9 sections with correct labels
  - Check ActiveFilters chips → verify correct colors and labels
  - Refresh page → verify filters persist via URL
  - Share URL → verify recipient sees same filters
  - Test new filter addition workflow from developer guide

## Dependencies
```
Phase 3.1 (Setup) → Phase 3.2 (Registry TDD) → Phase 3.3 (FilterPanel) → Phase 3.4 (ActiveFilters) → Phase 3.5 (Optional) → Phase 3.6 (Verification)

Detailed:
- T001-T002 (Setup) before T003-T006 (RED tests)
- T003-T006 (RED tests) must ALL FAIL before T007-T008 (GREEN implementation)
- T007-T008 (Registry implementation) before T009 (FilterPanel pre-migration tests)
- T009 (Pre-migration baseline) before T010 (FilterPanel migration)
- T010 (FilterPanel migration) before T011 (FilterPanel verification)
- T011 MUST PASS before T012 (ActiveFilters pre-migration tests)
- T012 (Pre-migration baseline) before T013 (ActiveFilters migration)
- T013 (ActiveFilters migration) before T014 (ActiveFilters verification)
- T014 MUST PASS before T015-T019 (Final verification)
```

## Parallel Execution Examples
```bash
# Phase 3.2: RED Tests (all parallel - different test suites within same file)
# Launch T003-T006 together:
Task: "Write registration tests in filterRegistry.test.js"
Task: "Write query method tests in filterRegistry.test.js"
Task: "Write filter subset tests in filterRegistry.test.js"
Task: "Write visual consistency tests in filterRegistry.test.js"

# Phase 3.3-3.4: Migrations (sequential - incremental with gates)
# Must run one at a time with visual verification between each

# Phase 3.6: Final Verification (all parallel - independent checks)
# Launch T016-T019 together:
Task: "Create developer guide in docs/how-to-add-new-filter.md"
Task: "Run full test suite and verify no regression"
Task: "Comprehensive code search verification"
Task: "Manual end-to-end testing"
```

## Success Metrics
- ✅ **Shotgun Surgery Eliminated**: Add filter = 2 files (was 6+ files)
- ✅ **Open/Closed Achieved**: Add filter via registry entry only (no component changes)
- ✅ **Test Coverage**: ≥90% for filterRegistry.js
- ✅ **Visual Consistency**: Zero UI changes visible to users
- ✅ **Developer Guide**: Clear 3-step process documented

## Rollback Plan
```bash
# If visual regression detected in T011 or T014:
git stash  # Stash migration changes
# Run baseline tests again to confirm original state
# Investigate discrepancy
# Fix migration code
# Re-run migration and verification
```

## Notes
- **Incremental Migration**: One component at a time (FilterPanel → ActiveFilters)
- **Visual Verification Gates**: MUST pass before proceeding to next component
- **[P] tasks**: Can run in parallel (different files, independent checks)
- **Integration tests**: Capture baseline BEFORE migration for comparison
- **Commit strategy**: Commit after each component migration passes verification
- **Rollback ready**: Each migration can be rolled back independently

## Validation Checklist
*GATE: Checked before marking story complete*

- [ ] All registry tests passing (T003-T006)
- [ ] Registry implementation complete (T007-T008)
- [ ] FilterPanel migration verified (T009-T011)
- [ ] ActiveFilters migration verified (T012-T014)
- [ ] Coverage ≥90% for filterRegistry.js (T017)
- [ ] No visual regression detected (T017)
- [ ] Developer guide complete (T016)
- [ ] Manual testing scenarios pass (T019)
- [ ] No hardcoded filter configs remain (T018)
- [ ] All 6 filters registered and rendering correctly (subjects, categories, product_types, products, modes_of_delivery, searchQuery)
