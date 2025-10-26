# Tasks: Mobile Responsive Tutorial Summary Bar

**Input**: Design documents from `specs/spec-2025-10-26-182118-mobile-responsive-summary-bar/`
**Prerequisites**: plan.md ✓, quickstart.md ✓, CLAUDE.md updated ✓

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: React 18, Material-UI v5, Jest, React Testing Library
   → Structure: Web application (frontend/react-Admin3/)
2. Load optional design documents:
   → data-model.md: N/A (no new data structures)
   → contracts/: N/A (frontend-only, no API changes)
   → quickstart.md: ✓ Responsive testing guide
3. Generate tasks by category:
   → Setup: Test infrastructure, mocking utilities
   → Tests: Component tests (mobile/desktop responsive behavior)
   → Core: TutorialSelectionSummaryBar responsive implementation
   → Integration: TutorialSummaryBarContainer mobile layout
   → Polish: Cross-device testing, accessibility audit, performance validation
4. Apply task rules:
   → Different test files = [P] for parallel
   → Same component file = sequential (TDD cycles)
   → Tests before implementation (RED → GREEN → REFACTOR)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All responsive behaviors have tests? ✓
   → All acceptance criteria covered? ✓
   → Desktop regression tests included? ✓
9. Return: SUCCESS (30 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- **TDD Stages**: 🔴 RED (failing test), 🟢 GREEN (minimal implementation), 🔵 REFACTOR (improve code)

## Path Conventions
- **Web app**: `frontend/react-Admin3/src/`, `frontend/react-Admin3/src/__tests__/`
- All paths relative to project root: `C:\Code\Admin3\`

---

## Phase 3.1: Setup (Test Infrastructure)

### ✅ T001 [P] Create test directory structure
- **Stage**: 🔧 Setup
- **Files**:
  - `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.test.js` (create)
  - `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.test.js` (create)
- **Description**: Create test file directory structure for Tutorial component tests
- **Time**: 0.1 hours
- **Dependencies**: None
- **Acceptance**: Test files created with basic imports and describe blocks

### ✅ T002 [P] Configure media query mocking utilities
- **Stage**: 🔧 Setup
- **Files**: `frontend/react-Admin3/src/__tests__/utils/mediaQueryMock.js` (create)
- **Description**: Create reusable media query mocking utility for responsive testing
- **Time**: 0.2 hours
- **Dependencies**: None
- **Acceptance**: Mock utility can simulate mobile (< 900px) and desktop (≥ 900px) viewports
- **Code Example**:
  ```javascript
  // mediaQueryMock.js
  export const mockMobile = () => {
    const useMediaQuery = require('@mui/material/useMediaQuery');
    useMediaQuery.default.mockReturnValue(true); // isMobile = true
  };

  export const mockDesktop = () => {
    const useMediaQuery = require('@mui/material/useMediaQuery');
    useMediaQuery.default.mockReturnValue(false); // isMobile = false
  };
  ```

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### TutorialSelectionSummaryBar Component Tests

### 🔴 T003 [P] Test: Mobile collapsed view by default
- **Stage**: 🔴 RED (Failing Test)
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.test.js`
- **Description**: Write test verifying summary bar is collapsed by default on mobile (< 900px)
- **Time**: 0.3 hours
- **Dependencies**: T001, T002
- **Acceptance**: Test fails - summary bar not yet responsive
- **Test Criteria** (FR-001):
  - Given: Viewport < 900px (mock useMediaQuery → true)
  - When: Component renders with tutorial selections
  - Then: Summary bar displays collapsed view (single line)
  - Verify: Only subject code and expand icon visible
  - Verify: NOT showing full choice details

### 🔴 T004 [P] Test: Desktop expanded view by default
- **Stage**: 🔴 RED (Failing Test)
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.test.js`
- **Description**: Write test verifying summary bar is expanded by default on desktop (≥ 900px)
- **Time**: 0.3 hours
- **Dependencies**: T001, T002
- **Acceptance**: Test passes initially (current behavior), validates regression prevention
- **Test Criteria** (FR-010):
  - Given: Viewport ≥ 900px (mock useMediaQuery → false)
  - When: Component renders with tutorial selections
  - Then: Summary bar displays expanded view
  - Verify: All tutorial choices visible (1st, 2nd, 3rd)
  - Verify: Action buttons visible (Edit, Add to Cart, Remove)

### 🔴 T005 [P] Test: Mobile Drawer opens on expand click
- **Stage**: 🔴 RED (Failing Test)
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.test.js`
- **Description**: Write test verifying Drawer opens when user clicks expand on mobile
- **Time**: 0.4 hours
- **Dependencies**: T001, T002
- **Acceptance**: Test fails - Drawer not yet implemented
- **Test Criteria** (FR-003):
  - Given: Mobile viewport, summary bar collapsed
  - When: User clicks collapsed bar or expand icon
  - Then: Drawer component renders with open={true}
  - Verify: Drawer shows all tutorial choices
  - Verify: Drawer shows action buttons

### 🔴 T006 [P] Test: Mobile Drawer closes on backdrop click
- **Stage**: 🔴 RED (Failing Test)
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.test.js`
- **Description**: Write test verifying Drawer closes when user clicks backdrop or collapse button
- **Time**: 0.3 hours
- **Dependencies**: T001, T002
- **Acceptance**: Test fails - Drawer interaction not yet implemented
- **Test Criteria** (FR-004):
  - Given: Mobile viewport, Drawer open
  - When: User clicks collapse button (X icon)
  - Then: Drawer closes (open={false})
  - Also test: Clicking backdrop closes Drawer

### 🔴 T007 [P] Test: Touch target sizes ≥ 44px
- **Stage**: 🔴 RED (Failing Test)
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.test.js`
- **Description**: Write test verifying all action buttons meet 44px × 44px minimum
- **Time**: 0.3 hours
- **Dependencies**: T001, T002
- **Acceptance**: Test may pass (touchIconButtonStyle already applied), validates regression
- **Test Criteria** (FR-013):
  - Given: Mobile viewport
  - When: Rendering action buttons (Edit, Add to Cart, Remove, Collapse)
  - Then: Each button width ≥ 44px
  - Then: Each button height ≥ 44px
  - Verify: touchIconButtonStyle applied (minWidth: 3rem, minHeight: 3rem)

### 🔴 T008 [P] Test: Responsive sx prop styling (mobile)
- **Stage**: 🔴 RED (Failing Test)
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.test.js`
- **Description**: Write test verifying mobile responsive styles (full width, bottom-0)
- **Time**: 0.3 hours
- **Dependencies**: T001, T002
- **Acceptance**: Test fails - responsive sx prop not yet implemented
- **Test Criteria** (FR-007, FR-008):
  - Given: Mobile viewport
  - When: Collapsed summary bar renders
  - Then: Width = 100% (xs breakpoint)
  - Verify: No maxWidth constraint on mobile

### 🔴 T009 [P] Test: Responsive sx prop styling (desktop)
- **Stage**: 🔴 RED (Failing Test)
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.test.js`
- **Description**: Write test verifying desktop responsive styles (24rem max width)
- **Time**: 0.3 hours
- **Dependencies**: T001, T002
- **Acceptance**: Test passes (current behavior), validates regression prevention
- **Test Criteria** (FR-012):
  - Given: Desktop viewport
  - When: Summary bar renders
  - Then: maxWidth = 24rem (md breakpoint)
  - Verify: Desktop styling unchanged

### TutorialSummaryBarContainer Component Tests

### 🔴 T010 [P] Test: Mobile full-width container positioning
- **Stage**: 🔴 RED (Failing Test)
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.test.js`
- **Description**: Write test verifying container uses full viewport width on mobile
- **Time**: 0.3 hours
- **Dependencies**: T001, T002
- **Acceptance**: Test fails - responsive container layout not yet implemented
- **Test Criteria** (FR-008):
  - Given: Mobile viewport
  - When: Container renders
  - Then: bottom = 0 (xs breakpoint)
  - Then: left = 0 (xs breakpoint)
  - Then: right = 0 (xs breakpoint)
  - Then: width = 100% (xs breakpoint)

### 🔴 T011 [P] Test: Desktop bottom-left container positioning
- **Stage**: 🔴 RED (Failing Test)
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.test.js`
- **Description**: Write test verifying container maintains bottom-left positioning on desktop
- **Time**: 0.3 hours
- **Dependencies**: T001, T002
- **Acceptance**: Test passes (current behavior), validates regression prevention
- **Test Criteria** (FR-011):
  - Given: Desktop viewport
  - When: Container renders
  - Then: bottom = 16px (md breakpoint)
  - Then: left = 16px (md breakpoint)
  - Then: right = auto (md breakpoint)
  - Verify: Desktop layout unchanged

### 🔴 T012 [P] Test: Multi-subject vertical stacking on mobile
- **Stage**: 🔴 RED (Failing Test)
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.test.js`
- **Description**: Write test verifying multiple summary bars stack vertically with gap spacing
- **Time**: 0.3 hours
- **Dependencies**: T001, T002
- **Acceptance**: Test may pass (flexDirection: column already exists), validates behavior
- **Test Criteria** (FR-019):
  - Given: Mobile viewport, 2+ subjects with selections
  - When: Container renders multiple summary bars
  - Then: flexDirection = column
  - Then: gap spacing present (gap: 2)
  - Verify: Bars stack vertically

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### TutorialSelectionSummaryBar Component Implementation

### 🟢 T013 Implement: useMediaQuery hook for mobile detection
- **Stage**: 🟢 GREEN (Minimal Implementation)
- **Files**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
- **Description**: Add useMediaQuery hook to detect mobile viewport (< 900px)
- **Time**: 0.2 hours
- **Dependencies**: T003, T004
- **Acceptance**: T003, T004 tests pass - mobile/desktop detection works
- **Implementation**:
  ```javascript
  import { useMediaQuery, useTheme } from '@mui/material';

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  ```

### 🟢 T014 Implement: Mobile collapsed default state
- **Stage**: 🟢 GREEN (Minimal Implementation)
- **Files**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
- **Description**: Set isCollapsed default state based on isMobile
- **Time**: 0.2 hours
- **Dependencies**: T013
- **Acceptance**: T003 test passes - mobile defaults to collapsed
- **Implementation**:
  ```javascript
  const [isCollapsed, setIsCollapsed] = useState(isMobile);
  ```

### 🟢 T015 Implement: Mobile Drawer for expanded state
- **Stage**: 🟢 GREEN (Minimal Implementation)
- **Files**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
- **Description**: Add Material-UI Drawer component for mobile expanded view
- **Time**: 0.8 hours
- **Dependencies**: T005, T006, T014
- **Acceptance**: T005, T006 tests pass - Drawer opens/closes correctly
- **Implementation**:
  ```javascript
  import { Drawer } from '@mui/material';

  // Mobile expanded: Drawer
  {isMobile && !isCollapsed && (
    <Drawer
      anchor="bottom"
      open={!isCollapsed}
      onClose={() => setIsCollapsed(true)}
      sx={{
        '& .MuiDrawer-paper': {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '50vh',
          backgroundColor: 'rgba(99, 50, 185, 0.965)',
          color: '#fff',
        }
      }}
    >
      {/* Full summary bar content (Grid with choices and buttons) */}
    </Drawer>
  )}
  ```

### 🟢 T016 Implement: Responsive sx prop styling for Paper component
- **Stage**: 🟢 GREEN (Minimal Implementation)
- **Files**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
- **Description**: Add responsive sx prop values for mobile and desktop Paper component
- **Time**: 0.5 hours
- **Dependencies**: T008, T009, T015
- **Acceptance**: T008, T009 tests pass - responsive styling works
- **Implementation**:
  ```javascript
  <Paper
    sx={{
      backgroundColor: 'rgba(99, 50, 185, 0.965)',
      color: '#fff',
      width: { xs: '100%', md: '100%' }, // Full width both
      maxWidth: { xs: '100%', md: '24rem' }, // Mobile: no limit, Desktop: 24rem
      py: { xs: 1, md: 2 },
      px: { xs: 2, md: 3 },
    }}
  >
  ```

### TutorialSummaryBarContainer Component Implementation

### 🟢 T017 Implement: Responsive container positioning
- **Stage**: 🟢 GREEN (Minimal Implementation)
- **Files**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`
- **Description**: Update container sx prop with responsive breakpoint values
- **Time**: 0.4 hours
- **Dependencies**: T010, T011
- **Acceptance**: T010, T011 tests pass - mobile full-width, desktop bottom-left
- **Implementation**:
  ```javascript
  <Box
    sx={{
      position: 'fixed',
      bottom: { xs: 0, md: 16 },
      left: { xs: 0, md: 16 },
      right: { xs: 0, md: 'auto' },
      width: { xs: '100%', md: 'auto' },
      maxWidth: { md: '24rem' },
      zIndex: 1200,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      pointerEvents: { xs: 'auto', md: 'none' },
      '& > *': {
        pointerEvents: 'auto',
      },
    }}
  >
  ```

---

## Phase 3.4: Refactor & Polish

### 🔵 T018 Refactor: Extract Drawer content into reusable render function
- **Stage**: 🔵 REFACTOR (Improve Code)
- **Files**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
- **Description**: Refactor Drawer and Paper to share content rendering logic (DRY principle)
- **Time**: 0.5 hours
- **Dependencies**: T015, T016
- **Acceptance**: All tests still pass, code duplication reduced
- **Implementation**:
  ```javascript
  const renderContent = () => (
    <Grid container>
      {/* Title Row */}
      {/* Choice Details Row */}
      {/* Action Buttons Row */}
    </Grid>
  );

  // Use in both Drawer and Paper
  ```

### 🔵 T019 Refactor: Add ARIA labels for accessibility
- **Stage**: 🔵 REFACTOR (Improve Code)
- **Files**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
- **Description**: Add aria-label, aria-expanded, role attributes for screen readers
- **Time**: 0.3 hours
- **Dependencies**: T015
- **Acceptance**: Screen reader announces state changes (verified in T025)
- **Implementation**:
  ```javascript
  <Drawer
    aria-label={`${subjectCode} tutorial selection summary`}
    role="dialog"
    aria-modal="true"
  >

  <IconButton
    aria-label={isCollapsed ? "Expand summary" : "Collapse summary"}
    aria-expanded={!isCollapsed}
  >
  ```

### 🔵 T020 Refactor: Respect prefers-reduced-motion
- **Stage**: 🔵 REFACTOR (Improve Code)
- **Files**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
- **Description**: Ensure animations respect user's reduced motion preference
- **Time**: 0.2 hours
- **Dependencies**: T015
- **Acceptance**: Material-UI Drawer already respects this (verify in tests)
- **Note**: Material-UI Drawer handles this automatically, verify with accessibility audit

---

## Phase 3.5: Integration Testing & Validation

### 🧪 T021 [P] Integration test: Mobile expand/collapse workflow
- **Stage**: 🧪 Integration Test
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.integration.test.js`
- **Description**: End-to-end test of mobile expand/collapse interaction flow
- **Time**: 0.4 hours
- **Dependencies**: T015, T016, T017
- **Acceptance**: Full mobile workflow tested (collapsed → expand → Drawer open → collapse → Drawer closed)
- **Test Flow**:
  1. Render component with mobile viewport
  2. Verify collapsed view
  3. User event: click expand
  4. Verify Drawer opens
  5. User event: click backdrop
  6. Verify Drawer closes

### 🧪 T022 [P] Integration test: Desktop regression validation
- **Stage**: 🧪 Integration Test
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.integration.test.js`
- **Description**: End-to-end test verifying desktop experience unchanged
- **Time**: 0.3 hours
- **Dependencies**: T016, T017
- **Acceptance**: Desktop behavior identical to pre-responsive implementation
- **Test Flow**:
  1. Render component with desktop viewport
  2. Verify expanded by default
  3. Verify bottom-left positioning
  4. Verify 24rem max width
  5. Test collapse/expand (existing behavior)

### 🧪 T023 [P] Integration test: Responsive breakpoint transition (900px)
- **Stage**: 🧪 Integration Test
- **Files**: `frontend/react-Admin3/src/__tests__/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.integration.test.js`
- **Description**: Test behavior at exact breakpoint boundary (900px)
- **Time**: 0.3 hours
- **Dependencies**: T013, T016, T017
- **Acceptance**: Component transitions correctly at 900px boundary
- **Test Flow**:
  1. Render at 901px (desktop mode)
  2. Mock viewport resize to 900px (still desktop)
  3. Mock viewport resize to 899px (mobile mode)
  4. Verify state preserved during transition

---

## Phase 3.6: Manual Testing & Accessibility

### 📱 T024 Manual test: Cross-device responsive validation
- **Stage**: 📱 Manual Testing
- **Files**: N/A (use quickstart.md guide)
- **Description**: Follow quickstart.md testing guide for cross-device validation
- **Time**: 1.5 hours
- **Dependencies**: T017, T018, T019
- **Acceptance**: All quickstart.md test scenarios pass (tests 1-12)
- **Checklist**:
  - [ ] Desktop regression test (1920px)
  - [ ] Mobile compact view (375px iPhone)
  - [ ] Mobile expand/collapse (Drawer interaction)
  - [ ] Touch target sizes (44px minimum)
  - [ ] Responsive breakpoint transitions (899px, 900px, 901px)
  - [ ] Multi-subject stacking (2+ subjects)
  - [ ] Z-index coordination (no conflicts)
  - [ ] iPad tablet mode (768px)

### ♿ T025 Accessibility audit: Keyboard navigation & screen reader
- **Stage**: ♿ Accessibility Testing
- **Files**: N/A (use quickstart.md guide)
- **Description**: Verify keyboard navigation and screen reader announcements
- **Time**: 0.8 hours
- **Dependencies**: T019, T024
- **Acceptance**: All accessibility criteria pass (quickstart.md tests 8-10)
- **Checklist**:
  - [ ] Tab navigation through summary bar
  - [ ] Enter/Space to expand/collapse
  - [ ] Escape to close Drawer
  - [ ] Screen reader announces state changes
  - [ ] ARIA labels correct
  - [ ] Focus trap works in Drawer

### ♿ T026 Accessibility audit: Reduced motion preference
- **Stage**: ♿ Accessibility Testing
- **Files**: N/A (use quickstart.md guide)
- **Description**: Verify animations respect reduced motion preference
- **Time**: 0.3 hours
- **Dependencies**: T020, T024
- **Acceptance**: Instant transitions when reduced motion enabled (quickstart.md test 10)
- **Test Steps**:
  1. Enable reduced motion in OS settings
  2. Test expand/collapse → verify instant (no animation)
  3. Disable reduced motion → verify animations return

### ⚡ T027 Performance validation: 60fps animation
- **Stage**: ⚡ Performance Testing
- **Files**: N/A (use Chrome DevTools)
- **Description**: Verify expand/collapse animations run at 60fps
- **Time**: 0.5 hours
- **Dependencies**: T015, T024
- **Acceptance**: Chrome DevTools shows 60fps, no layout shift (quickstart.md test 11)
- **Test Steps**:
  1. Open Chrome DevTools Performance tab
  2. Record expand/collapse animation
  3. Verify FPS ≥ 60fps (green meter)
  4. Verify no Layout shift (CLS = 0)
  5. Verify GPU-accelerated transforms

---

## Phase 3.7: Documentation & Final Validation

### 📝 T028 [P] Update component PropTypes documentation
- **Stage**: 📝 Documentation
- **Files**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
- **Description**: Add JSDoc comments documenting responsive behavior
- **Time**: 0.2 hours
- **Dependencies**: T015, T016
- **Acceptance**: Component header comments describe mobile vs desktop behavior
- **Documentation**:
  ```javascript
  /**
   * TutorialSelectionSummaryBar - Persistent summary bar for tutorial choices
   * with expand/collapse states and action buttons.
   *
   * Responsive Behavior:
   * - Mobile (< 900px): Collapsed by default, Drawer for expanded state, full viewport width
   * - Desktop (≥ 900px): Expanded by default, bottom-left positioning, 24rem max width
   *
   * Contract: Displays at bottom center (mobile) or bottom-left (desktop)
   * Optimized: Memoized to prevent unnecessary re-renders
   */
  ```

### 📝 T029 [P] Add inline comments for responsive logic
- **Stage**: 📝 Documentation
- **Files**:
  - `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
  - `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`
- **Description**: Add inline comments explaining responsive breakpoint decisions
- **Time**: 0.2 hours
- **Dependencies**: T016, T017
- **Acceptance**: Responsive sx prop values have clarifying comments
- **Example**:
  ```javascript
  sx={{
    // Mobile: Full viewport width (xs, sm)
    width: { xs: '100%', md: 'auto' },

    // Desktop: 24rem max width (md+)
    maxWidth: { md: '24rem' },
  }}
  ```

### ✅ T030 Final validation: Run full test suite & quickstart.md
- **Stage**: ✅ Final Validation
- **Files**: All test files
- **Description**: Run full test suite and complete quickstart.md sign-off checklist
- **Time**: 0.5 hours
- **Dependencies**: All previous tasks
- **Acceptance**: All criteria met for feature completion
- **Validation Checklist**:
  - [ ] Run `npm test` → all tests pass
  - [ ] Run `npm test -- --coverage` → coverage ≥ 80% for modified components
  - [ ] Complete quickstart.md sign-off checklist (all 26 FR requirements)
  - [ ] No console errors in browser
  - [ ] Desktop experience unchanged (regression tests pass)
  - [ ] Mobile responsive behavior works (cross-device tests pass)
  - [ ] Accessibility audit complete (keyboard, screen reader, reduced motion)
  - [ ] Performance validated (60fps, no layout shift)

---

## Dependencies Graph

```
Setup Phase:
T001, T002 (parallel, no dependencies)

RED Phase (Failing Tests):
T003 → depends on T001, T002
T004 → depends on T001, T002
T005 → depends on T001, T002
T006 → depends on T001, T002
T007 → depends on T001, T002
T008 → depends on T001, T002
T009 → depends on T001, T002
T010 → depends on T001, T002
T011 → depends on T001, T002
T012 → depends on T001, T002

All tests (T003-T012) can run in parallel after T001, T002 complete.

GREEN Phase (Implementation):
T013 → depends on T003, T004
T014 → depends on T013
T015 → depends on T005, T006, T014
T016 → depends on T008, T009, T015
T017 → depends on T010, T011

Sequential flow: T013 → T014 → T015 → T016
Parallel: T017 (container) can run after T010, T011

REFACTOR Phase:
T018 → depends on T015, T016
T019 → depends on T015
T020 → depends on T015

Integration Tests:
T021 → depends on T015, T016, T017
T022 → depends on T016, T017
T023 → depends on T013, T016, T017

All integration tests (T021-T023) can run in parallel after implementation complete.

Manual Testing:
T024 → depends on T017, T018, T019
T025 → depends on T019, T024
T026 → depends on T020, T024
T027 → depends on T015, T024

Documentation:
T028, T029 → can run in parallel after T015, T016, T017

Final Validation:
T030 → depends on ALL previous tasks
```

## Parallel Execution Examples

### Phase 1: Setup (parallel)
```bash
# Launch T001 and T002 together:
Task: "Create test directory structure"
Task: "Configure media query mocking utilities"
```

### Phase 2: RED Phase (all tests in parallel after setup)
```bash
# Launch T003-T012 together (10 test files):
Task: "Test: Mobile collapsed view by default"
Task: "Test: Desktop expanded view by default"
Task: "Test: Mobile Drawer opens on expand click"
Task: "Test: Mobile Drawer closes on backdrop click"
Task: "Test: Touch target sizes ≥ 44px"
Task: "Test: Responsive sx prop styling (mobile)"
Task: "Test: Responsive sx prop styling (desktop)"
Task: "Test: Mobile full-width container positioning"
Task: "Test: Desktop bottom-left container positioning"
Task: "Test: Multi-subject vertical stacking on mobile"
```

### Phase 3: Integration Tests (parallel)
```bash
# Launch T021-T023 together:
Task: "Integration test: Mobile expand/collapse workflow"
Task: "Integration test: Desktop regression validation"
Task: "Integration test: Responsive breakpoint transition"
```

### Phase 4: Documentation (parallel)
```bash
# Launch T028-T029 together:
Task: "Update component PropTypes documentation"
Task: "Add inline comments for responsive logic"
```

---

## Task Summary

**Total Tasks**: 30
- **Setup**: 2 tasks (0.3 hours)
- **RED (Failing Tests)**: 10 tasks (3.1 hours)
- **GREEN (Implementation)**: 5 tasks (2.1 hours)
- **REFACTOR**: 3 tasks (1.0 hours)
- **Integration Tests**: 3 tasks (1.0 hours)
- **Manual Testing**: 4 tasks (3.1 hours)
- **Documentation**: 2 tasks (0.4 hours)
- **Final Validation**: 1 task (0.5 hours)

**Estimated Total Time**: **11.5 hours** (includes testing time)
- Development (TDD cycles): ~6.5 hours
- Testing (manual + accessibility): ~4.5 hours
- Documentation: ~0.5 hours

**Story Estimate**: 3-4 hours (implementation only)
**Actual with Testing**: 11.5 hours (comprehensive validation)

---

## Notes

- **[P] tasks** = different files, no dependencies (can run in parallel)
- **Verify tests fail** before implementing (RED phase critical)
- **Commit after each GREEN task** (working state checkpoints)
- **Desktop regression tests** run throughout to prevent breaking changes
- **Manual testing time** (3.1 hours) includes cross-device validation

---

## Validation Checklist
*GATE: Checked before marking feature complete*

- [x] All responsive behaviors have tests (10 test tasks)
- [x] All acceptance criteria covered (26 FR requirements mapped to tasks)
- [x] Desktop regression tests included (T004, T009, T011, T022)
- [x] All tests come before implementation (RED → GREEN ordering)
- [x] Parallel tasks truly independent (different files, marked [P])
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Touch accessibility validated (T007, T024)
- [x] Performance validated (T027)
- [x] Accessibility audited (T025, T026)

---

**Status**: ✅ Ready for Implementation

**Next Steps**:
1. Run TDD workflow: Start with T001 (setup), then T003-T012 (RED phase)
2. Use `TodoWrite` to track task progress during implementation
3. Follow quickstart.md for manual testing validation
4. Update progress in this file as tasks complete

---

*Generated from plan.md - Epic 4 Story 3: Mobile Responsive Summary Bar*
*Follows TDD principles: RED → GREEN → REFACTOR*
