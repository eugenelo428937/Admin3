# Tasks: Tutorial Selection UX Refactoring (Epic 2)

**Input**: Design documents from `/specs/001-docs-stories-epic/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory → ✅ LOADED
   → Tech stack: React 18, Material-UI v5, Jest, React Testing Library
   → Structure: Web app (frontend/react-Admin3/)
2. Load optional design documents → ✅ LOADED
   → data-model.md: 3 components (TutorialDetailCard, TutorialSelectionDialog, TutorialSelectionSummaryBar)
   → contracts/: 3 contract files (one per component)
   → research.md: MUI components, responsive grid, TDD strategy
   → quickstart.md: Manual validation scenarios
3. Generate tasks by category → ✅ GENERATED
   → Setup: None needed (existing project)
   → Tests: 3 contract tests + 3 integration tests
   → Core: 3 components (Story 2.1, 2.2, 2.3)
   → Integration: Context integration, cart integration
   → Polish: Visual regression, performance, accessibility
4. Apply task rules → ✅ APPLIED
   → Different test files = marked [P]
   → Component implementations sequential by story
   → TDD: RED → GREEN → REFACTOR → VERIFY per story
5. Number tasks sequentially → ✅ NUMBERED (T001-T038)
6. Generate dependency graph → ✅ GENERATED
7. Create parallel execution examples → ✅ GENERATED
8. Validate task completeness → ✅ VALIDATED
   → All contracts have tests ✅
   → All components have implementations ✅
   → Integration tests included ✅
9. Return: SUCCESS (tasks ready for execution) → ✅
```

## Format: `[ID] [P?] [TDD Phase] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[RED]**: Write failing test
- **[GREEN]**: Minimal implementation
- **[REFACTOR]**: Optimize code
- **[VERIFY]**: Coverage + manual validation
- Include exact file paths in descriptions

## Path Conventions
- **Frontend base**: `frontend/react-Admin3/`
- **Components**: `src/components/Product/ProductCard/Tutorial/`
- **Tests**: `src/components/Product/ProductCard/Tutorial/__tests__/`
- **Context**: `src/contexts/TutorialChoiceContext.js` (Epic 1 - no changes)
- **Utils**: `src/utils/tutorialMetadataBuilder.js` (Epic 1 - no changes)

---

## Phase 3.1: Setup (if needed)
_No setup tasks - using existing project structure and dependencies_

---

## Phase 3.2: Story 2.1 - Extract TutorialDetailCard

### TDD RED Phase: Write Failing Tests
- [ ] **T001** [P] [RED] Write contract test for TutorialDetailCard rendering in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialDetailCard.test.js`
  - Test: Renders event title, code, location, venue, dates correctly
  - Test: Renders 3 choice buttons ("1st", "2nd", "3rd")
  - Test: Applies "outlined" variant to unselected buttons
  - Test: Handles null selectedChoiceLevel (all buttons outlined)
  - **Expected**: All tests FAIL (component doesn't exist)
  - **File**: New test file
  - **Parallel**: Yes (independent test file)

- [ ] **T002** [P] [RED] Write choice selection feedback tests in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialDetailCard.test.js`
  - Test: Applies "contained" variant to selectedChoiceLevel button
  - Test: Calls onSelectChoice with correct parameters when button clicked
  - Test: Passes event data + variation data to callback
  - **Expected**: All tests FAIL (component doesn't exist)
  - **File**: Adds to T001 test file
  - **Parallel**: Yes (different concern, same file but can write simultaneously)

- [ ] **T003** [P] [RED] Write accessibility tests in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialDetailCard.test.js`
  - Test: Buttons have aria-pressed attribute indicating selection state
  - Test: Card has semantic HTML structure (h3 for title)
  - Test: Focus indicators visible on keyboard navigation
  - **Expected**: All tests FAIL (component doesn't exist)
  - **File**: Adds to T001 test file
  - **Parallel**: Yes (accessibility concern)

### TDD GREEN Phase: Minimal Implementation
- [ ] **T004** [GREEN] Create TutorialDetailCard component in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialDetailCard.js`
  - Implement minimal component to pass T001 tests
  - Display event information (title, code, location, venue, dates)
  - Render 3 choice buttons with labels "1st", "2nd", "3rd"
  - Apply outlined variant by default
  - Use Material-UI Card, CardContent, Button components
  - **Expected**: T001 tests pass
  - **Dependencies**: T001-T003 must fail first
  - **File**: New component file

- [ ] **T005** [GREEN] Implement choice selection logic in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialDetailCard.js`
  - Add selectedChoiceLevel prop handling
  - Apply "contained" variant to selected button
  - Implement onSelectChoice callback with correct parameters
  - Pass full event data + variation to callback
  - **Expected**: T002 tests pass
  - **Dependencies**: T004 complete
  - **File**: Same as T004 (sequential)

- [ ] **T006** [GREEN] Add accessibility features to TutorialDetailCard in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialDetailCard.js`
  - Add aria-pressed attributes to buttons
  - Use semantic HTML (h3 for event title, section for details)
  - Ensure focus indicators visible (MUI default)
  - **Expected**: T003 tests pass
  - **Dependencies**: T005 complete
  - **File**: Same as T004 (sequential)

### TDD REFACTOR Phase
- [ ] **T007** [REFACTOR] Optimize TutorialDetailCard rendering in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialDetailCard.js`
  - Wrap component in React.memo() for performance
  - Extract common button styling to constants or theme
  - Ensure fixed card dimensions for grid alignment
  - Add PropTypes or TypeScript interface
  - **Expected**: All T001-T003 tests still pass
  - **Dependencies**: T006 complete
  - **File**: Same as T004 (sequential)

### TDD VERIFY Phase
- [ ] **T008** [VERIFY] Run coverage and manual validation for Story 2.1
  - Run: `npm test -- --coverage --watchAll=false --testPathPattern=TutorialDetailCard`
  - Verify: 80%+ statement coverage
  - Manual: Follow quickstart.md Story 2.1 steps
  - Verify: Event display correct, choice button feedback works
  - **Expected**: Coverage ≥80%, manual tests pass
  - **Dependencies**: T007 complete

---

## Phase 3.3: Story 2.2 - Refactor TutorialSelectionDialog

### TDD RED Phase: Write Failing Tests
- [ ] **T009** [P] [RED] Write contract test for TutorialSelectionDialog responsive grid in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSelectionDialog.test.js`
  - Test: Renders Material-UI Dialog with fullWidth and maxWidth="lg"
  - Test: Grid container has spacing={2}
  - Test: Grid items have correct breakpoints (xs=12, md=6, lg=4)
  - Test: Renders TutorialDetailCard for each event
  - **Expected**: All tests FAIL (dialog not refactored yet)
  - **File**: New test file (or update existing if TutorialChoiceDialog tests exist)
  - **Parallel**: Yes (independent test file)

- [ ] **T010** [P] [RED] Write context integration tests in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSelectionDialog.test.js`
  - Test: Reads draft choices from TutorialChoiceContext
  - Test: Pre-selects TutorialDetailCards based on existing draft choices
  - Test: Calls addTutorialChoice when card selection changes
  - Test: Updates context with isDraft: true
  - **Expected**: All tests FAIL (context integration not implemented)
  - **File**: Adds to T009 test file
  - **Parallel**: Yes (different concern)

- [ ] **T011** [P] [RED] Write dialog interaction tests in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSelectionDialog.test.js`
  - Test: Dialog opens when open prop is true
  - Test: Calls onClose when close button clicked
  - Test: Calls onClose when Escape key pressed
  - Test: Dialog title displays "{subjectName} Tutorials - {location}"
  - **Expected**: All tests FAIL (interactions not implemented)
  - **File**: Adds to T009 test file
  - **Parallel**: Yes (interaction concern)

### TDD GREEN Phase: Minimal Implementation
- [ ] **T012** [GREEN] Archive legacy TutorialChoiceDialog in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/`
  - Rename: TutorialChoiceDialog.js → TutorialChoiceDialog.js.legacy
  - Copy to: TutorialSelectionDialog.js (start refactoring)
  - **Expected**: Legacy file preserved, new file created
  - **Dependencies**: T009-T011 must fail first
  - **File**: File system operation

- [ ] **T013** [GREEN] Refactor TutorialSelectionDialog with responsive grid in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionDialog.js`
  - Remove "current choices" card from dialog content
  - Implement Grid container with spacing={2}
  - Map events to TutorialDetailCard components
  - Apply Grid item breakpoints: xs={12}, md={6}, lg={4}
  - **Expected**: T009 tests pass
  - **Dependencies**: T012 complete
  - **File**: TutorialSelectionDialog.js (refactored)

- [ ] **T014** [GREEN] Integrate TutorialSelectionDialog with TutorialChoiceContext in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionDialog.js`
  - Import useTutorialChoice hook
  - Read draft choices using getSubjectChoices(subjectCode)
  - Determine selectedChoiceLevel for each event
  - Implement handleSelectChoice to call addTutorialChoice()
  - Pass selectedChoiceLevel and onSelectChoice to TutorialDetailCards
  - **Expected**: T010 tests pass
  - **Dependencies**: T013 complete, T004-T006 complete (needs TutorialDetailCard)
  - **File**: Same as T013 (sequential)

- [ ] **T015** [GREEN] Implement dialog interactions in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionDialog.js`
  - Add Dialog title with subject and location
  - Add close button (IconButton with CloseIcon)
  - Connect close button to onClose prop
  - Ensure Escape key closes dialog (MUI default)
  - **Expected**: T011 tests pass
  - **Dependencies**: T014 complete
  - **File**: Same as T013 (sequential)

### TDD REFACTOR Phase
- [ ] **T016** [REFACTOR] Update TutorialSelectionDialog imports across codebase
  - Find all files importing TutorialChoiceDialog
  - Update imports to TutorialSelectionDialog
  - Verify: TutorialProductCard.js import updated
  - Verify: Any other components importing old dialog updated
  - **Expected**: No import errors, all T009-T011 tests still pass
  - **Dependencies**: T015 complete
  - **File**: Multiple files (TutorialProductCard.js + any others)

### TDD VERIFY Phase
- [ ] **T017** [VERIFY] Run coverage and manual validation for Story 2.2
  - Run: `npm test -- --coverage --watchAll=false --testPathPattern=TutorialSelectionDialog`
  - Verify: 80%+ statement coverage
  - Manual: Follow quickstart.md Story 2.2 steps
  - Verify: Responsive grid (3/2/1 columns), context integration, dialog behavior
  - **Expected**: Coverage ≥80%, manual tests pass
  - **Dependencies**: T016 complete

---

## Phase 3.4: Story 2.3 - Implement TutorialSelectionSummaryBar & UI Polish

### TDD RED Phase: Write Failing Tests
- [ ] **T018** [P] [RED] Write contract test for TutorialSelectionSummaryBar rendering in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSelectionSummaryBar.test.js`
  - Test: Uses Material-UI Snackbar component
  - Test: Displays subject title "{subjectName} Tutorials"
  - Test: Shows ordered list of choices (1st, 2nd, 3rd) when expanded
  - Test: Displays location and event code for each choice
  - Test: Renders action buttons (Edit, Add to Cart, Remove)
  - **Expected**: All tests FAIL (component doesn't exist)
  - **File**: New test file
  - **Parallel**: Yes (independent test file)

- [ ] **T019** [P] [RED] Write expand/collapse behavior tests in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSelectionSummaryBar.test.js`
  - Test: Expands when getDraftChoices(subjectCode).length > 0
  - Test: Collapses when hasCartedChoices() && getDraftChoices().length === 0
  - Test: Hides when getSubjectChoices(subjectCode).length === 0
  - Test: Collapsed state shows only title and Edit button
  - **Expected**: All tests FAIL (component doesn't exist)
  - **File**: Adds to T018 test file
  - **Parallel**: Yes (different concern)

- [ ] **T020** [P] [RED] Write action button tests in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSelectionSummaryBar.test.js`
  - Test: Edit button calls onEdit callback
  - Test: Add to Cart button calls onAddToCart callback
  - Test: Remove button calls onRemove callback
  - Test: Add to Cart disabled when no draft choices
  - **Expected**: All tests FAIL (component doesn't exist)
  - **File**: Adds to T018 test file
  - **Parallel**: Yes (interaction concern)

- [ ] **T021** [P] [RED] Write SpeedDial behavior tests in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js`
  - Test: SpeedDial expands on mouse hover
  - Test: SpeedDial collapses on mouse leave
  - Test: SpeedDial collapses after action button clicked
  - Test: Select Tutorial action opens dialog
  - **Expected**: Tests FAIL (SpeedDial not refactored yet)
  - **File**: Existing test file (may need new tests added)
  - **Parallel**: Yes (different component)

- [ ] **T022** [P] [RED] Write price info button tests in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js`
  - Test: Price Info action opens modal/popover
  - Test: Modal displays variation-specific pricing table
  - Test: Pricing table shows all variations with prices
  - Test: Modal can be closed
  - **Expected**: Tests FAIL (price info not implemented)
  - **File**: Adds to T021 test file
  - **Parallel**: Yes (different feature)

### TDD GREEN Phase: Minimal Implementation
- [ ] **T023** [GREEN] Create TutorialSelectionSummaryBar component in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
  - Implement Snackbar with anchorOrigin bottom/center
  - Display subject title
  - Render ordered list of choices (1st, 2nd, 3rd)
  - Show location and event code for each choice
  - Add action buttons (Edit, Add to Cart, Remove, Close)
  - **Expected**: T018 tests pass
  - **Dependencies**: T018-T020 must fail first
  - **File**: New component file

- [ ] **T024** [GREEN] Implement expand/collapse logic in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
  - Import useTutorialChoice hook
  - Read choices using getSubjectChoices(subjectCode)
  - Calculate expanded state: hasDraft || !hasCarted
  - Calculate visibility: getSubjectChoices().length > 0
  - Conditionally render choice details vs collapsed state
  - **Expected**: T019 tests pass
  - **Dependencies**: T023 complete
  - **File**: Same as T023 (sequential)

- [ ] **T025** [GREEN] Wire up action button callbacks in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
  - Connect Edit button to onEdit prop
  - Connect Add to Cart button to onAddToCart prop
  - Connect Remove button to onRemove prop
  - Disable Add to Cart when getDraftChoices().length === 0
  - **Expected**: T020 tests pass
  - **Dependencies**: T024 complete
  - **File**: Same as T023 (sequential)

- [ ] **T026** [GREEN] Fix SpeedDial hover/click behavior in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
  - Add onOpen and onClose handlers to SpeedDial
  - Implement hover-based expansion (onMouseEnter → setOpen(true))
  - Implement mouse leave collapse (onMouseLeave → setOpen(false))
  - Collapse SpeedDial after action click
  - **Expected**: T021 tests pass
  - **Dependencies**: T021 must fail first
  - **File**: TutorialProductCard.js (existing)

- [ ] **T027** [GREEN] Implement price info button functionality in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
  - Add Price Info SpeedDial action
  - Create modal/popover state (open/close)
  - Implement modal component with pricing table
  - Display product.variations with prices
  - Reference MaterialProductCard implementation for patterns
  - **Expected**: T022 tests pass
  - **Dependencies**: T026 complete
  - **File**: Same as T026 (sequential)

### TDD REFACTOR Phase
- [ ] **T028** [REFACTOR] Integrate TutorialSelectionSummaryBar into TutorialProductCard in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
  - Import TutorialSelectionSummaryBar
  - Add state for summary bar visibility
  - Implement onEdit handler (opens TutorialSelectionDialog)
  - Implement onAddToCart handler (markChoicesAsAdded + CartContext.addToCart)
  - Implement onRemove handler (removeSubjectChoices)
  - **Expected**: Summary bar appears/disappears based on choices
  - **Dependencies**: T025, T027 complete
  - **File**: Same as T026 (sequential)

- [ ] **T029** [REFACTOR] Archive legacy TutorialChoicePanel in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/`
  - Rename: TutorialChoicePanel.js → TutorialChoicePanel.js.legacy
  - Remove any imports of TutorialChoicePanel from TutorialProductCard
  - Verify: No components still importing legacy panel
  - **Expected**: Legacy file preserved, imports cleaned
  - **Dependencies**: T028 complete
  - **File**: File system operation + TutorialProductCard.js

- [ ] **T030** [REFACTOR] Optimize mobile responsiveness across all components in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/`
  - Review TutorialDetailCard mobile layout
  - Review TutorialSelectionDialog mobile layout
  - Review TutorialSelectionSummaryBar mobile layout
  - Ensure touch targets ≥44px
  - Test on mobile breakpoint (<600px)
  - **Expected**: All components responsive on mobile
  - **Dependencies**: T029 complete
  - **File**: All 3 component files (review + minor adjustments)

- [ ] **T031** [REFACTOR] Extract common patterns and optimize code
  - Extract common button styles to theme or constants
  - Remove code duplication across components
  - Ensure PropTypes or TypeScript interfaces on all components
  - Add JSDoc comments for complex functions
  - **Expected**: Code clean, no duplication, well-documented
  - **Dependencies**: T030 complete
  - **File**: All component files

### TDD VERIFY Phase
- [ ] **T032** [VERIFY] Run coverage for Story 2.3
  - Run: `npm test -- --coverage --watchAll=false --testPathPattern=Tutorial`
  - Verify: TutorialSelectionSummaryBar ≥80% coverage
  - Verify: TutorialProductCard updates ≥80% coverage
  - Verify: Overall tutorial components ≥80% coverage
  - **Expected**: All coverage thresholds met
  - **Dependencies**: T031 complete

- [ ] **T033** [VERIFY] Manual validation for Story 2.3 using quickstart.md
  - Follow quickstart.md Story 2.3 Part A (Summary Bar)
  - Follow quickstart.md Story 2.3 Part B (SpeedDial)
  - Follow quickstart.md Story 2.3 Part C (Price Info)
  - Follow quickstart.md Story 2.3 Part D (Mobile)
  - **Expected**: All manual tests pass
  - **Dependencies**: T032 complete

---

## Phase 3.5: Integration & Regression Testing

- [ ] **T034** [P] [VERIFY] Write integration tests for Dialog → Context → SummaryBar workflow in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialComponents.integration.test.js`
  - Test: Selecting choice in dialog updates context
  - Test: Context update triggers summary bar visibility
  - Test: Summary bar Edit button opens dialog with pre-selected choices
  - Test: Add to Cart transitions choices from draft to carted
  - Test: Remove from cart restores draft state
  - **Expected**: Full workflow tests pass
  - **File**: New integration test file
  - **Parallel**: Yes (integration tests can run in parallel with unit tests)

- [ ] **T035** [P] [VERIFY] Run Epic 1 regression tests
  - Run: `npm test -- --watchAll=false --testPathPattern=TutorialChoiceContext`
  - Verify: All 39 Epic 1 context tests still pass
  - Run: `npm test -- --watchAll=false --testPathPattern=CartPanel`
  - Verify: Cart integration tests pass (no duplicates)
  - **Expected**: Epic 1 functionality intact
  - **File**: Existing test files
  - **Parallel**: Yes (different test suites)

---

## Phase 3.6: Polish & Performance

- [ ] **T036** [P] [VERIFY] Performance validation using Chrome DevTools
  - Record dialog open → verify <200ms
  - Record grid re-layout → verify <100ms
  - Record SpeedDial interaction → verify <100ms
  - Measure CLS (Cumulative Layout Shift) → verify <0.1
  - Use React DevTools Profiler → verify component render <16ms
  - **Expected**: All performance targets met
  - **File**: Manual browser testing
  - **Parallel**: Yes (can do alongside other tasks)

- [ ] **T037** [P] [VERIFY] Accessibility validation
  - Follow quickstart.md Accessibility Validation section
  - Test keyboard navigation (Tab, Enter, Escape, Arrow keys)
  - Test with screen reader (VoiceOver on Mac or NVDA on Windows)
  - Verify ARIA labels on all interactive elements
  - Verify focus management in dialogs
  - **Expected**: All accessibility criteria met
  - **File**: Manual accessibility testing
  - **Parallel**: Yes (can do alongside performance)

- [ ] **T038** [VERIFY] Final visual regression check
  - Compare screenshots across device sizes (desktop, tablet, mobile)
  - Verify SpeedDial state transitions smooth
  - Verify summary bar expand/collapse animations
  - Verify grid layout transitions responsive
  - Optionally: Use visual regression tool (Percy, Chromatic)
  - **Expected**: No visual regressions, animations smooth
  - **Dependencies**: T036, T037 complete
  - **File**: Visual testing

---

## Dependencies Graph

```
Story 2.1 (TutorialDetailCard):
T001-T003 [RED] → T004-T006 [GREEN] → T007 [REFACTOR] → T008 [VERIFY]

Story 2.2 (TutorialSelectionDialog):
T009-T011 [RED] → T012-T015 [GREEN] → T016 [REFACTOR] → T017 [VERIFY]
  ↑ Depends on Story 2.1 (T004-T006) for TutorialDetailCard

Story 2.3 (TutorialSelectionSummaryBar & UI Polish):
T018-T022 [RED] → T023-T027 [GREEN] → T028-T031 [REFACTOR] → T032-T033 [VERIFY]
  ↑ Depends on Story 2.2 (T013-T015) for TutorialSelectionDialog

Integration & Regression:
T034-T035 [VERIFY] (can run after T033)

Polish & Performance:
T036-T038 [VERIFY] (can run after T035)
```

## Parallel Execution Examples

### Parallel Group 1: Story 2.1 RED Phase
```bash
# Launch T001-T003 together (all writing to same test file but independent test suites):
Task: "Write contract test for TutorialDetailCard rendering"
Task: "Write choice selection feedback tests"
Task: "Write accessibility tests"
```

### Parallel Group 2: Story 2.2 RED Phase
```bash
# Launch T009-T011 together (all writing to same test file but independent test suites):
Task: "Write contract test for responsive grid"
Task: "Write context integration tests"
Task: "Write dialog interaction tests"
```

### Parallel Group 3: Story 2.3 RED Phase
```bash
# Launch T018-T020 together (TutorialSelectionSummaryBar tests):
Task: "Write contract test for summary bar rendering"
Task: "Write expand/collapse behavior tests"
Task: "Write action button tests"

# Launch T021-T022 separately (TutorialProductCard tests):
Task: "Write SpeedDial behavior tests"
Task: "Write price info button tests"
```

### Parallel Group 4: Final Verification
```bash
# Launch T034-T037 together (independent verification tasks):
Task: "Write integration tests for Dialog → Context → SummaryBar workflow"
Task: "Run Epic 1 regression tests"
Task: "Performance validation using Chrome DevTools"
Task: "Accessibility validation"
```

## Task Execution Notes

### TDD Workflow Reminder
**For every story (2.1, 2.2, 2.3):**
1. **RED Phase**: Write ALL tests first, verify they FAIL
2. **GREEN Phase**: Implement minimal code to pass tests
3. **REFACTOR Phase**: Optimize while keeping tests green
4. **VERIFY Phase**: Run coverage + manual validation

### Coverage Requirements
- **Minimum**: 80% statement coverage (enforced by CLAUDE.md)
- **Target**: 90%+ for new components
- **Critical paths**: 100% for choice selection, cart integration

### Commit Strategy
- Commit after each task completion
- Use conventional commit format:
  - `test: add TutorialDetailCard contract tests (T001)` (RED phase)
  - `feat: implement TutorialDetailCard component (T004)` (GREEN phase)
  - `refactor: optimize TutorialDetailCard with React.memo (T007)`
  - `test: verify Story 2.1 coverage and manual tests (T008)`

### Common Pitfalls to Avoid
- ❌ Writing implementation before tests
- ❌ Skipping coverage verification
- ❌ Modifying Epic 1 context (TutorialChoiceContext.js) - it's complete!
- ❌ Breaking backward compatibility
- ❌ Creating duplicate cart items (regression from Epic 1 fix)

---

## Task Summary

**Total Tasks**: 38
- **RED Phase**: 14 tasks (T001-T003, T009-T011, T018-T022)
- **GREEN Phase**: 12 tasks (T004-T006, T012-T015, T023-T027)
- **REFACTOR Phase**: 6 tasks (T007, T016, T028-T031)
- **VERIFY Phase**: 6 tasks (T008, T017, T032-T035, T038)
- **Performance/Accessibility**: 2 tasks (T036, T037)

**Estimated Time**: ~35-45 hours
- Story 2.1: ~8-10 hours
- Story 2.2: ~10-12 hours
- Story 2.3: ~12-15 hours
- Integration & Polish: ~5-8 hours

**Parallel Opportunities**: 14 tasks marked [P] can run in parallel

---

## Validation Checklist

**Before marking Epic 2 complete:**
- [ ] All 38 tasks checked off
- [ ] All tests passing (Epic 1 + Epic 2)
- [ ] Coverage ≥80% for all new components
- [ ] Manual quickstart.md validation complete
- [ ] Performance targets met (<200ms dialog, <100ms interactions)
- [ ] Accessibility validation passed
- [ ] No visual regressions
- [ ] Epic 1 regression tests passing (no cart duplicates)
- [ ] No breaking changes to TutorialChoiceContext API

---

**Tasks Status**: ✅ **READY FOR EXECUTION**
**Next Step**: Begin with T001 (RED phase for TutorialDetailCard)
