# Tasks: Scrollable Filter Groups in FilterPanel

**Feature**: 002-in-the-frontend
**Branch**: `002-in-the-frontend`
**Created**: 2025-10-28
**TDD Cycle**: RED → GREEN → REFACTOR

## ✅ FEATURE COMPLETE (2026-01-16)

All implementation tasks completed. Verification summary:
- **Implementation**: Scrollable AccordionDetails with maxHeight (50vh desktop, 40vh mobile), overflowY: auto, ARIA attributes
- **Tests**: 9/9 test cases in FilterPanel.scrollable.test.js (some skipped due to JSDOM style limitations)
- **Key Files**:
  - `frontend/react-Admin3/src/components/Product/FilterPanel.js` (lines 96-105, 301-310, 330-331)
  - `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.scrollable.test.js`

---

## Overview

This task list implements scrollable filter groups with max-height constraints, keyboard accessibility, and ARIA attributes following strict Test-Driven Development (TDD) principles.

**Key Files**:
- Component: `frontend/react-Admin3/src/components/Product/FilterPanel.js`
- Tests: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.scrollable.test.js`

**Execution Order**: Sequential (no parallel execution - single file modification)

**TDD Enforcement**:
- **RED Phase** (T001-T006): Write failing tests first ✅
- **GREEN Phase** (T007-T011): Minimal implementation to pass tests ✅
- **REFACTOR Phase** (T012-T015): Code quality improvements while keeping tests green ✅

---

## Phase 1: RED - Write Failing Tests

### T001: Create test file and setup mocks
**File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`

**Description**: Set up test file structure with necessary imports and mocks for FilterPanel scrollable behavior testing.

**Steps**:
1. Create test file if it doesn't exist (or add to existing test suite)
2. Import required dependencies:
   ```javascript
   import { render, screen } from '@testing-library/react';
   import { Provider } from 'react-redux';
   import { BrowserRouter } from 'react-router-dom';
   import { ThemeProvider, createTheme } from '@mui/material/styles';
   import FilterPanel from '../FilterPanel';
   import { configureStore } from '@reduxjs/toolkit';
   import filtersReducer from '../../../store/slices/filtersSlice';
   ```
3. Create mock store with filter data including 20+ subjects (to trigger scrolling)
4. Add `beforeEach` block to mock `scrollIntoView`:
   ```javascript
   beforeEach(() => {
     Element.prototype.scrollIntoView = jest.fn();
   });
   ```
5. Create helper function to render FilterPanel with providers

**Verification**:
```bash
cd frontend/react-Admin3
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: Test file loads successfully, no tests run yet

**Dependencies**: None

---

### T002: Write unit test for max-height styling (desktop & mobile breakpoints)
**File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`

**Description**: Test that AccordionDetails components have correct max-height values for desktop (50vh) and mobile (40vh) viewports.

**Steps**:
1. Add test case in describe block:
   ```javascript
   describe('FilterPanel - Scrollable Behavior', () => {
     test('applies 50vh max-height on desktop viewport (≥900px)', () => {
       // Mock desktop viewport
       global.innerWidth = 1200;

       const { container } = render(<FilterPanel />);

       // Expand Subjects accordion
       const subjectsHeader = screen.getByText(/subjects/i);
       subjectsHeader.click();

       // Find AccordionDetails with region role
       const accordionDetails = screen.getByRole('region', {
         name: /subjects filter options/i
       });

       // Assert max-height styling
       expect(accordionDetails).toHaveStyle({ maxHeight: '50vh' });
     });

     test('applies 40vh max-height on mobile viewport (<900px)', () => {
       // Mock mobile viewport
       global.innerWidth = 375;

       const { container } = render(<FilterPanel />);

       const subjectsHeader = screen.getByText(/subjects/i);
       subjectsHeader.click();

       const accordionDetails = screen.getByRole('region', {
         name: /subjects filter options/i
       });

       expect(accordionDetails).toHaveStyle({ maxHeight: '40vh' });
     });
   });
   ```

**Verification**:
```bash
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: ❌ **Tests FAIL** - AccordionDetails does not have maxHeight styling or role="region"

**Dependencies**: T001

---

### T003: Write unit test for overflow scrolling behavior
**File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`

**Description**: Test that AccordionDetails has `overflowY: 'auto'` to enable vertical scrolling when content exceeds max-height.

**Steps**:
1. Add test case:
   ```javascript
   test('applies overflow-y: auto for vertical scrolling', () => {
     const { container } = render(<FilterPanel />);

     const subjectsHeader = screen.getByText(/subjects/i);
     subjectsHeader.click();

     const accordionDetails = screen.getByRole('region', {
       name: /subjects filter options/i
     });

     expect(accordionDetails).toHaveStyle({ overflowY: 'auto' });
   });
   ```

**Verification**:
```bash
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: ❌ **Tests FAIL** - overflowY: 'auto' not applied

**Dependencies**: T001

---

### T004: Write unit test for ARIA role="region" and aria-label attributes
**File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`

**Description**: Test that scrollable AccordionDetails have proper ARIA attributes for screen reader accessibility.

**Steps**:
1. Add test cases:
   ```javascript
   test('includes ARIA region role with descriptive label', () => {
     const { container } = render(<FilterPanel />);

     const subjectsHeader = screen.getByText(/subjects/i);
     subjectsHeader.click();

     // Verify role="region" and aria-label present
     const region = screen.getByRole('region', {
       name: /subjects filter options, scrollable/i
     });

     expect(region).toBeInTheDocument();
     expect(region).toHaveAttribute('role', 'region');
     expect(region).toHaveAttribute('aria-label',
       expect.stringContaining('scrollable')
     );
   });

   test('applies ARIA labels to all filter groups', () => {
     const { container } = render(<FilterPanel />);

     // Expand all accordions
     const accordionHeaders = ['subjects', 'categories', 'product types'];
     accordionHeaders.forEach(header => {
       const headerEl = screen.getByText(new RegExp(header, 'i'));
       headerEl.click();
     });

     // Verify each has region role
     accordionHeaders.forEach(header => {
       expect(screen.getByRole('region', {
         name: new RegExp(`${header} filter options`, 'i')
       })).toBeInTheDocument();
     });
   });
   ```

**Verification**:
```bash
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: ❌ **Tests FAIL** - AccordionDetails missing role="region" and aria-label

**Dependencies**: T001

---

### T005: Write unit test for scrollIntoView on checkbox focus
**File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`

**Description**: Test that focused checkboxes automatically scroll into view when navigating with keyboard.

**Steps**:
1. Add test cases:
   ```javascript
   test('scrolls focused checkbox into view on keyboard navigation', () => {
     const { container } = render(<FilterPanel />);

     const subjectsHeader = screen.getByText(/subjects/i);
     subjectsHeader.click();

     // Get all checkboxes in subjects list
     const checkboxes = screen.getAllByRole('checkbox');
     const bottomCheckbox = checkboxes[checkboxes.length - 1];

     // Simulate keyboard focus
     bottomCheckbox.focus();

     // Verify scrollIntoView called
     expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
       behavior: 'smooth',
       block: 'nearest',
       inline: 'nearest'
     });
   });

   test('scrollIntoView called for each checkbox focus', () => {
     const { container } = render(<FilterPanel />);

     const subjectsHeader = screen.getByText(/subjects/i);
     subjectsHeader.click();

     const checkboxes = screen.getAllByRole('checkbox');

     // Focus first checkbox
     checkboxes[0].focus();
     expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

     // Focus second checkbox
     checkboxes[1].focus();
     expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
   });
   ```

**Verification**:
```bash
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: ❌ **Tests FAIL** - scrollIntoView not called on checkbox focus

**Dependencies**: T001

---

### T006: Write integration test for keyboard navigation through scrollable list
**File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`

**Description**: Integration test verifying end-to-end keyboard navigation with auto-scroll.

**Steps**:
1. Add integration test:
   ```javascript
   describe('Keyboard Navigation Integration', () => {
     test('user can navigate through scrollable filter list with Tab key', () => {
       const { container } = render(<FilterPanel />);

       const subjectsHeader = screen.getByText(/subjects/i);
       subjectsHeader.click();

       const checkboxes = screen.getAllByRole('checkbox');

       // Simulate Tab navigation through multiple checkboxes
       for (let i = 0; i < Math.min(5, checkboxes.length); i++) {
         checkboxes[i].focus();

         // Verify focus visible
         expect(checkboxes[i]).toHaveFocus();

         // Verify auto-scroll triggered
         expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
       }

       // Verify at least 5 scroll calls
       expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(
         Math.min(5, checkboxes.length)
       );
     });

     test('multiple expanded accordions maintain independent scrolling', () => {
       const { container } = render(<FilterPanel />);

       // Expand multiple accordions
       const subjectsHeader = screen.getByText(/subjects/i);
       const categoriesHeader = screen.getByText(/categories/i);

       subjectsHeader.click();
       categoriesHeader.click();

       // Verify both regions present
       const subjectsRegion = screen.getByRole('region', {
         name: /subjects filter options/i
       });
       const categoriesRegion = screen.getByRole('region', {
         name: /categories filter options/i
       });

       expect(subjectsRegion).toBeInTheDocument();
       expect(categoriesRegion).toBeInTheDocument();

       // Verify independent scrolling (both have overflow: auto)
       expect(subjectsRegion).toHaveStyle({ overflowY: 'auto' });
       expect(categoriesRegion).toHaveStyle({ overflowY: 'auto' });
     });
   });
   ```

**Verification**:
```bash
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: ❌ **Tests FAIL** - Keyboard navigation and auto-scroll not implemented

**Dependencies**: T001

---

## Phase 2: GREEN - Minimal Implementation

### T007: Add sx prop with maxHeight and overflowY to AccordionDetails
**File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`

**Description**: Add Material-UI `sx` prop to AccordionDetails components with max-height and overflow styling to enable scrolling.

**Steps**:
1. Locate all `<AccordionDetails>` components in FilterPanel.js (typically 5 filter groups: subjects, categories, product types, products, modes of delivery)
2. Add `sx` prop to each AccordionDetails:
   ```javascript
   <AccordionDetails
     sx={{
       maxHeight: { xs: '40vh', md: '50vh' },
       overflowY: 'auto',
       padding: 2
     }}
   >
     {/* Existing FormGroup with checkboxes */}
   </AccordionDetails>
   ```
3. Ensure `useTheme` and `useMediaQuery` already imported (should exist for existing mobile detection)

**Verification**:
```bash
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: ✅ **T002 and T003 tests PASS** - Max-height and overflow styling applied

**Dependencies**: T002, T003 (tests must fail first)

---

### T008: Add responsive breakpoint objects (xs: 40vh, md: 50vh)
**File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`

**Description**: Verify responsive breakpoint objects are correctly specified in sx prop from T007.

**Steps**:
1. Review AccordionDetails `sx` prop from T007
2. Confirm breakpoint object format:
   ```javascript
   maxHeight: { xs: '40vh', md: '50vh' }
   ```
3. Test viewport switching:
   - Desktop (≥900px): 50vh
   - Mobile (<900px): 40vh

**Verification**:
```bash
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: ✅ **All T002 tests PASS** - Responsive max-heights applied correctly

**Dependencies**: T007

---

### T009: Add role="region" and aria-label to AccordionDetails
**File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`

**Description**: Add ARIA attributes to AccordionDetails for screen reader accessibility.

**Steps**:
1. For each AccordionDetails, add `role` and `aria-label`:
   ```javascript
   <AccordionDetails
     role="region"
     aria-label="Subjects filter options, scrollable"
     sx={{
       maxHeight: { xs: '40vh', md: '50vh' },
       overflowY: 'auto',
       padding: 2
     }}
   >
   ```
2. Customize aria-label for each filter group:
   - Subjects: "Subjects filter options, scrollable"
   - Categories: "Categories filter options, scrollable"
   - Product Types: "Product Types filter options, scrollable"
   - Products: "Products filter options, scrollable"
   - Modes of Delivery: "Modes of Delivery filter options, scrollable"

**Verification**:
```bash
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: ✅ **T004 tests PASS** - ARIA role and labels present

**Dependencies**: T007

---

### T010: Add onFocus handler to checkboxes with scrollIntoView logic
**File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`

**Description**: Implement keyboard focus auto-scroll behavior for filter checkboxes.

**Steps**:
1. Create focus handler function at component level:
   ```javascript
   const handleCheckboxFocus = useCallback((event) => {
     event.target.scrollIntoView({
       behavior: 'smooth',
       block: 'nearest',
       inline: 'nearest'
     });
   }, []);
   ```
2. Add `onFocus` prop to all Checkbox components within filter groups:
   ```javascript
   <Checkbox
     checked={filters.subjects.includes(subject.code)}
     onChange={() => handleToggleFilter('subjects', subject.code)}
     onFocus={handleCheckboxFocus}
     inputProps={{ 'aria-label': `Filter by ${subject.name}` }}
   />
   ```
3. Apply to all 5 filter groups (subjects, categories, product types, products, modes of delivery)

**Verification**:
```bash
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: ✅ **T005 and T006 tests PASS** - scrollIntoView called on checkbox focus

**Dependencies**: T007, T009

---

### T011: Verify all tests pass (run full test suite)
**File**: N/A (verification step)

**Description**: Run complete test suite to confirm all RED phase tests now pass with GREEN phase implementation.

**Steps**:
1. Run all FilterPanel tests:
   ```bash
   cd frontend/react-Admin3
   npm test -- --testPathPattern=FilterPanel --watchAll=false --coverage
   ```
2. Verify coverage report:
   - Statements: ≥80%
   - Branches: ≥80%
   - Functions: ≥80%
   - Lines: ≥80%

**Verification Output**:
```
PASS  src/components/Product/__tests__/FilterPanel.test.js
  FilterPanel - Scrollable Behavior
    ✓ applies 50vh max-height on desktop viewport (≥900px)
    ✓ applies 40vh max-height on mobile viewport (<900px)
    ✓ applies overflow-y: auto for vertical scrolling
    ✓ includes ARIA region role with descriptive label
    ✓ applies ARIA labels to all filter groups
    ✓ scrolls focused checkbox into view on keyboard navigation
    ✓ scrollIntoView called for each checkbox focus
  Keyboard Navigation Integration
    ✓ user can navigate through scrollable filter list with Tab key
    ✓ multiple expanded accordions maintain independent scrolling

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Coverage:    ≥80% for FilterPanel.js
```

**Expected**: ✅ **ALL TESTS PASS** - GREEN phase complete, ready for REFACTOR

**Dependencies**: T007, T008, T009, T010

---

## Phase 3: REFACTOR - Code Quality Improvements

### T012: Extract scrollable styling into reusable constant
**File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`

**Description**: Extract repeated sx prop styling into a shared constant to reduce duplication and improve maintainability.

**Steps**:
1. At top of FilterPanel component (before return), define constant:
   ```javascript
   const SCROLLABLE_ACCORDION_SX = {
     maxHeight: { xs: '40vh', md: '50vh' },
     overflowY: 'auto',
     padding: 2
   };
   ```
2. Replace inline sx prop in all AccordionDetails:
   ```javascript
   <AccordionDetails
     role="region"
     aria-label="Subjects filter options, scrollable"
     sx={SCROLLABLE_ACCORDION_SX}
   >
   ```
3. Apply to all 5 filter groups

**Verification**:
```bash
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: ✅ **All tests STILL PASS** - Refactor successful, no behavior changes

**Dependencies**: T011

---

### T013: Add PropTypes or TypeScript types for new behavior
**File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`

**Description**: Add PropTypes validation or TypeScript types to document the component's interface (optional if project doesn't use PropTypes).

**Steps**:
1. Check if project uses PropTypes (look for `import PropTypes from 'prop-types'` in other components)
2. If PropTypes used, add at bottom of file:
   ```javascript
   FilterPanel.propTypes = {
     showMobile: PropTypes.bool,
     isSearchMode: PropTypes.bool
   };

   FilterPanel.defaultProps = {
     showMobile: false,
     isSearchMode: false
   };
   ```
3. If project doesn't use PropTypes, skip this task or add JSDoc comments:
   ```javascript
   /**
    * FilterPanel component with scrollable filter groups
    * @param {Object} props
    * @param {boolean} [props.showMobile=false] - Display as mobile drawer
    * @param {boolean} [props.isSearchMode=false] - Search mode indicator
    * @returns {JSX.Element}
    */
   ```

**Verification**:
```bash
npm test -- --testPathPattern=FilterPanel --watchAll=false
```
**Expected**: ✅ **All tests STILL PASS** - Type documentation added, no behavior changes

**Dependencies**: T012

---

### T014: Update component documentation/comments
**File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`

**Description**: Update component header comments to document new scrollable behavior.

**Steps**:
1. Update JSDoc comment at top of file:
   ```javascript
   /**
    * FilterPanel Component
    *
    * Handles checkbox and radio interface for product filtering with proper counts.
    * Integrates with Redux store and displays disjunctive facet counts.
    * Replaces complex filtering logic from the original ProductList component.
    *
    * **Features:**
    * - Array-based filters: Subjects, Categories, Product Types, Products, Modes of Delivery
    * - Scrollable filter groups with viewport-relative max-heights (50vh desktop, 40vh mobile)
    * - Keyboard navigation with auto-scroll focus for accessibility
    * - ARIA region landmarks for screen reader support
    *
    * **Accessibility:**
    * - WCAG 2.1 Level AA compliant
    * - Keyboard-only navigation support with Tab and Space keys
    * - Screen reader support via role="region" and aria-label attributes
    * - Auto-scroll focused checkboxes into view during keyboard navigation
    *
    * @component
    * @example
    * // In ProductList component
    * <FilterPanel />
    */
   ```
2. Add inline comments above SCROLLABLE_ACCORDION_SX constant:
   ```javascript
   // Scrollable accordion styling for long filter lists
   // Desktop: 50vh max-height, Mobile: 40vh max-height
   // Enables vertical scrolling when content exceeds viewport threshold
   const SCROLLABLE_ACCORDION_SX = {
     maxHeight: { xs: '40vh', md: '50vh' },
     overflowY: 'auto',
     padding: 2
   };
   ```

**Verification**: Visual inspection - comments clear and accurate

**Expected**: ✅ **Documentation updated** - Future developers understand scrollable behavior

**Dependencies**: T013

---

### T015: Run quickstart.md acceptance tests
**File**: `specs/002-in-the-frontend/quickstart.md` (manual testing guide)

**Description**: Execute manual user acceptance tests following the quickstart guide to validate real-world behavior.

**Steps**:
1. Start development server:
   ```bash
   cd frontend/react-Admin3
   npm start
   ```
2. Follow Test Scenario 1: Desktop Scrollable Behavior
   - Navigate to `/products`
   - Expand Subjects filter
   - ✅ Verify scrollbar appears for long lists
   - ✅ Verify smooth scrolling without page scroll

3. Follow Test Scenario 2: Keyboard Navigation & Accessibility
   - Tab through filter checkboxes
   - ✅ Verify auto-scroll on focus
   - ✅ Verify focus indicators visible

4. Follow Test Scenario 3: Mobile Responsive Behavior
   - Switch to mobile viewport (Chrome DevTools or actual device)
   - ✅ Verify 40vh max-height applied
   - ✅ Verify touch scrolling smooth

5. Follow Test Scenario 4: Multiple Expanded Panels
   - Expand multiple filter accordions
   - ✅ Verify independent scrolling
   - ✅ Verify no viewport overflow

6. Document results in test report template at bottom of quickstart.md

**Verification**:
- All 4 required test scenarios PASS
- Test report signed off

**Expected**: ✅ **Acceptance tests PASS** - Feature complete and ready for production

**Dependencies**: T014

---

## Summary

**Total Tasks**: 15
**Execution Mode**: Sequential (no parallel execution due to single file modification)
**TDD Phases**:
- RED (T001-T006): 6 tasks
- GREEN (T007-T011): 5 tasks
- REFACTOR (T012-T015): 4 tasks

**Key Milestones**:
- After T006: All tests written and failing ❌
- After T011: All tests passing ✅ (GREEN phase complete)
- After T015: Feature complete with acceptance ✅ (REFACTOR phase complete)

**Files Modified**:
- `frontend/react-Admin3/src/components/Product/FilterPanel.js` (implementation)
- `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js` (tests)

**Test Coverage Target**: ≥80% (statements, branches, functions, lines)

---

## Execution Commands

### Run All Tasks Sequentially
```bash
# Navigate to frontend directory
cd frontend/react-Admin3

# T001-T006: Write tests (RED phase)
npm test -- --testPathPattern=FilterPanel --watchAll=false

# Verify tests fail ❌
# Expected: 9 failing tests

# T007-T010: Implement features (GREEN phase)
# (Manual code changes to FilterPanel.js)

# T011: Verify tests pass ✅
npm test -- --testPathPattern=FilterPanel --watchAll=false --coverage

# Expected: 9 passing tests, ≥80% coverage

# T012-T014: Refactor (REFACTOR phase)
# (Manual code improvements)

# Verify tests still pass ✅
npm test -- --testPathPattern=FilterPanel --watchAll=false

# T015: Acceptance testing
npm start
# Follow quickstart.md manual test scenarios
```

### Quick Validation
```bash
# Run tests
npm test -- --testPathPattern=FilterPanel --watchAll=false

# Check coverage
npm test -- --testPathPattern=FilterPanel --watchAll=false --coverage

# Lint check
npm run lint src/components/Product/FilterPanel.js
```

---

## Dependencies Graph

```
T001 (Setup)
  ├─→ T002 (Max-height test)
  ├─→ T003 (Overflow test)
  ├─→ T004 (ARIA test)
  ├─→ T005 (Focus test)
  └─→ T006 (Integration test)

T002, T003 ─→ T007 (Add sx prop) ─→ T008 (Verify breakpoints)
T004 ─→ T009 (Add ARIA)
T005, T006 ─→ T010 (Add onFocus)

T007, T008, T009, T010 ─→ T011 (Verify all pass)

T011 ─→ T012 (Extract constant) ─→ T013 (Add PropTypes) ─→ T014 (Update docs) ─→ T015 (Acceptance)
```

---

## Next Steps

**Execute tasks sequentially from T001 to T015** using TDD RED-GREEN-REFACTOR cycle.

After T015 completion:
1. Commit changes to feature branch
2. Create pull request to main branch
3. Request code review
4. Merge after approval

**Ready to begin**: Start with T001 (Create test file and setup mocks)
