# Tasks: Phase 8 - Frontend VAT Display Updates

**Epic**: Epic 3 - Dynamic VAT Calculation System
**Phase**: Phase 8 - Frontend VAT Display Updates
**Input**: `plans/epic-3-dynamic-vat-calculation-system-plan.md`
**Duration**: 2-3 days

## Overview

Update React frontend components to consume dynamic VAT calculations from the backend API. Remove all hardcoded VAT rates, labels, and pricing. Ensure all components display VAT data from `vatCalculations` API response.

## Key Findings from Analysis

**Good News**: Frontend already uses `vatCalculations` prop from API - no VAT calculation logic to remove!

**Issues Found**:
1. Hardcoded "VAT (20%)" labels in CartSummaryPanel.js:95 and CartReviewStep.js:114
2. Hardcoded prices in TutorialProductCard.js (£239.20, £149.50, £299.00)
3. Hardcoded "Price includes VAT" text in TutorialProductCard.js:410

## Phase 8.1: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 8.2

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Frontend Component Tests

- [ ] **T001** [P] Create test for CartSummaryPanel VAT label display
  - **File**: `frontend/react-Admin3/src/components/Ordering/CheckoutSteps/__tests__/CartSummaryPanel.test.js`
  - **Stage**: RED
  - **Description**: Test that VAT label displays dynamic rate from `vatCalculations.totals.effective_vat_rate` instead of hardcoded "20%"
  - **Test Cases**:
    - Should display "VAT (20%)" when effective_vat_rate is 0.20
    - Should display "VAT (15%)" when effective_vat_rate is 0.15
    - Should display "VAT (0%)" when effective_vat_rate is 0.00
    - Should display "VAT" when effective_vat_rate is undefined/null
  - **Expected Result**: Tests FAIL (component currently shows hardcoded "VAT (20%)")
  - **Time**: 1 hour
  - **Dependencies**: None

- [ ] **T002** [P] Create test for CartReviewStep VAT label display
  - **File**: `frontend/react-Admin3/src/components/Ordering/CheckoutSteps/__tests__/CartReviewStep.test.js`
  - **Stage**: RED
  - **Description**: Test that VAT label displays dynamic rate from `vatCalculations.totals.effective_vat_rate`
  - **Test Cases**:
    - Should display "VAT (20%)" when effective_vat_rate is 0.20
    - Should display "VAT (15%)" when effective_vat_rate is 0.15
    - Should display "VAT (0%)" when effective_vat_rate is 0.00
  - **Expected Result**: Tests FAIL (component currently shows hardcoded "VAT (20%)")
  - **Time**: 1 hour
  - **Dependencies**: None

- [ ] **T003** [P] Create test for TutorialProductCard dynamic pricing
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js`
  - **Stage**: RED
  - **Description**: Test that prices come from product.variations data instead of hardcoded values
  - **Test Cases**:
    - Should display standard price from product.price
    - Should display retaker price from product.retaker_price
    - Should display additional copy price from product.additional_copy_price
    - Should display "Price includes VAT" or "VAT exempt" based on product.vat_status
  - **Expected Result**: Tests FAIL (component currently shows hardcoded prices)
  - **Time**: 1.5 hours
  - **Dependencies**: None

- [ ] **T004** [P] Create integration test for VAT display in checkout flow
  - **File**: `frontend/react-Admin3/src/components/Ordering/__tests__/CheckoutSteps.integration.test.js`
  - **Stage**: RED
  - **Description**: End-to-end test verifying VAT displays correctly throughout checkout
  - **Test Cases**:
    - CartReviewStep shows dynamic VAT rate
    - CartSummaryPanel collapsed/expanded views show correct VAT
    - Payment method changes update displayed totals correctly
    - Mixed VAT rates (UK + ROW products) display correctly
  - **Expected Result**: Tests FAIL (hardcoded VAT labels present)
  - **Time**: 2 hours
  - **Dependencies**: None

## Phase 8.2: Implementation (ONLY after tests are failing)

### Update Cart Components

- [ ] **T005** Update CartSummaryPanel VAT label to use dynamic rate
  - **File**: `frontend/react-Admin3/src/components/Ordering/CheckoutSteps/CartSummaryPanel.js`
  - **Stage**: GREEN
  - **Description**: Replace hardcoded "VAT (20%)" on line 95 with dynamic label
  - **Changes**:
    ```javascript
    // OLD (line 95):
    <small>VAT (20%):</small>

    // NEW:
    <small>VAT {vatCalculations.totals.effective_vat_rate
      ? `(${(vatCalculations.totals.effective_vat_rate * 100).toFixed(0)}%)`
      : ''}:
    </small>
    ```
  - **Verification**: Run `npm test -- CartSummaryPanel.test.js` → T001 tests should PASS
  - **Time**: 0.5 hours
  - **Dependencies**: T001

- [ ] **T006** Update CartReviewStep VAT label to use dynamic rate
  - **File**: `frontend/react-Admin3/src/components/Ordering/CheckoutSteps/CartReviewStep.js`
  - **Stage**: GREEN
  - **Description**: Replace hardcoded "VAT (20%)" on line 114 with dynamic label
  - **Changes**:
    ```javascript
    // OLD (line 114):
    <Typography variant="body2">VAT (20%):</Typography>

    // NEW:
    <Typography variant="body2">
      VAT {vatCalculations.totals.effective_vat_rate
        ? `(${(vatCalculations.totals.effective_vat_rate * 100).toFixed(0)}%)`
        : ''}:
    </Typography>
    ```
  - **Verification**: Run `npm test -- CartReviewStep.test.js` → T002 tests should PASS
  - **Time**: 0.5 hours
  - **Dependencies**: T002

- [ ] **T007** Update TutorialProductCard to use dynamic pricing
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
  - **Stage**: GREEN
  - **Description**: Replace hardcoded prices (lines 384-388) with product variation data
  - **Changes**:
    - Extract price logic to helper function `getPriceForPriceType(selectedPriceType, variations)`
    - Replace hardcoded £239.20, £149.50, £299.00 with dynamic prices
    - Update line 410: Replace "Price includes VAT" with `product.vat_status_display`
  - **Verification**: Run `npm test -- TutorialProductCard.test.js` → T003 tests should PASS
  - **Time**: 2 hours
  - **Dependencies**: T003

### Update Product Card Components (if needed)

- [ ] **T008** [P] Search for hardcoded VAT text in other product cards
  - **Files**:
    - `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
    - `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`
    - `frontend/react-Admin3/src/components/Product/ProductCard/BundleCard.js`
    - `frontend/react-Admin3/src/components/Product/ProductCard/OnlineClassroomProductCard.js`
  - **Stage**: GREEN
  - **Description**: Grep for "VAT", "20%", "includes VAT" patterns and update if found
  - **Commands**:
    ```bash
    cd frontend/react-Admin3/src/components/Product/ProductCard
    grep -r "VAT\|20%\|includes VAT" --include="*.js" --exclude="Tutorial/*" --exclude="__tests__/*"
    ```
  - **Verification**: No hardcoded VAT text remains in product cards
  - **Time**: 1 hour
  - **Dependencies**: None

- [ ] **T009** [P] Update ProductGrid to pass vatCalculations to child components
  - **File**: `frontend/react-Admin3/src/components/Product/ProductGrid.js`
  - **Stage**: GREEN
  - **Description**: Ensure ProductGrid passes `vatCalculations` prop to all product card components
  - **Verification**: Check prop drilling is correct
  - **Time**: 0.5 hours
  - **Dependencies**: T008

## Phase 8.3: Refactor & Cleanup

- [ ] **T010** Extract VAT label formatting to utility function
  - **File**: `frontend/react-Admin3/src/utils/vatUtils.js` (new file)
  - **Stage**: REFACTOR
  - **Description**: Create reusable utility for VAT label formatting
  - **Functions**:
    ```javascript
    export const formatVatLabel = (effectiveVatRate) => {
      if (!effectiveVatRate && effectiveVatRate !== 0) return 'VAT';
      const percentage = (effectiveVatRate * 100).toFixed(0);
      return `VAT (${percentage}%)`;
    };

    export const getVatStatusDisplay = (vatStatus) => {
      const statusMap = {
        'standard': 'Price includes VAT',
        'zero': 'VAT exempt',
        'reverse_charge': 'Reverse charge applies'
      };
      return statusMap[vatStatus] || 'Price includes VAT';
    };
    ```
  - **Verification**: All tests still pass after refactoring
  - **Time**: 1 hour
  - **Dependencies**: T005, T006, T007

- [ ] **T011** Update components to use VAT utility functions
  - **Files**:
    - `frontend/react-Admin3/src/components/Ordering/CheckoutSteps/CartSummaryPanel.js`
    - `frontend/react-Admin3/src/components/Ordering/CheckoutSteps/CartReviewStep.js`
    - `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
  - **Stage**: REFACTOR
  - **Description**: Replace inline VAT formatting with utility function calls
  - **Verification**: All tests still pass, no functionality changes
  - **Time**: 1 hour
  - **Dependencies**: T010

- [ ] **T012** Remove styleguide hardcoded VAT examples
  - **Files**:
    - `frontend/react-Admin3/src/components/styleguide/ProductCards/*.js`
  - **Stage**: REFACTOR
  - **Description**: Update styleguide examples to use dynamic VAT or mark as mock data
  - **Verification**: Styleguide still renders correctly
  - **Time**: 0.5 hours
  - **Dependencies**: T010

## Phase 8.4: Browser Verification

- [ ] **T013** Verify CartSummaryPanel rendering with Browser MCP
  - **Tool**: Browser MCP (mcp__browsermcp__)
  - **Stage**: VERIFICATION
  - **Description**: Visual verification of cart summary VAT display
  - **Test Scenarios**:
    1. UK cart with 20% VAT → should show "VAT (20%)"
    2. Mixed cart (UK + ROW) with blended rate → should show calculated rate
    3. ROW cart with 0% VAT → should show "VAT (0%)"
  - **Commands**:
    ```javascript
    // Navigate to checkout
    mcp__browsermcp__browser_navigate({url: "http://localhost:3000/checkout"})

    // Take screenshot of cart summary
    mcp__browsermcp__browser_screenshot()

    // Verify VAT label text
    mcp__browsermcp__browser_snapshot()
    ```
  - **Verification**: Screenshots show dynamic VAT labels
  - **Time**: 1 hour
  - **Dependencies**: T005, T006, T007

- [ ] **T014** Verify TutorialProductCard rendering with Browser MCP
  - **Tool**: Browser MCP
  - **Stage**: VERIFICATION
  - **Description**: Visual verification of tutorial card pricing
  - **Test Scenarios**:
    1. Standard pricing display
    2. Retaker pricing display
    3. Additional copy pricing display
    4. VAT status text display
  - **Commands**:
    ```javascript
    mcp__browsermcp__browser_navigate({url: "http://localhost:3000/products/tutorials"})
    mcp__browsermcp__browser_screenshot()
    mcp__browsermcp__browser_snapshot()
    ```
  - **Verification**: Screenshots show dynamic prices and VAT status
  - **Time**: 1 hour
  - **Dependencies**: T007

- [ ] **T015** End-to-end checkout flow verification
  - **Tool**: Browser MCP
  - **Stage**: VERIFICATION
  - **Description**: Full checkout flow with VAT verification
  - **Test Scenarios**:
    1. Add UK products → verify 20% VAT in cart summary
    2. Add ROW product → verify VAT updates to blended rate
    3. Proceed to checkout → verify VAT displays correctly in review step
    4. Select payment method → verify totals update correctly
  - **Verification**: Complete checkout flow shows dynamic VAT throughout
  - **Time**: 1.5 hours
  - **Dependencies**: T013, T014

## Phase 8.5: Documentation & Cleanup

- [ ] **T016** [P] Update frontend component documentation
  - **File**: `frontend/react-Admin3/src/components/Ordering/CheckoutSteps/README.md` (new file)
  - **Stage**: DOCUMENTATION
  - **Description**: Document VAT display requirements and vatCalculations prop structure
  - **Content**:
    - `vatCalculations` prop schema
    - VAT label formatting guidelines
    - Examples of different VAT scenarios
  - **Time**: 1 hour
  - **Dependencies**: None

- [ ] **T017** [P] Create migration guide for other developers
  - **File**: `docs/frontend-vat-migration-guide.md` (new file)
  - **Stage**: DOCUMENTATION
  - **Description**: Guide for updating custom components to use dynamic VAT
  - **Content**:
    - Before/after code examples
    - Common mistakes to avoid
    - Testing checklist
  - **Time**: 1 hour
  - **Dependencies**: None

- [ ] **T018** Run final test suite and verify coverage
  - **Commands**:
    ```bash
    cd frontend/react-Admin3
    npm test -- --coverage --watchAll=false
    ```
  - **Stage**: VERIFICATION
  - **Description**: Ensure all tests pass and coverage meets 80% threshold
  - **Verification**:
    - All tests passing
    - Coverage > 80% for updated components
    - No console errors or warnings
  - **Time**: 0.5 hours
  - **Dependencies**: ALL previous tasks

## Dependencies Graph

```
Phase 8.1 (Tests - RED):
  T001, T002, T003, T004 [All parallel, no dependencies]
  ↓
Phase 8.2 (Implementation - GREEN):
  T001 → T005 (CartSummaryPanel)
  T002 → T006 (CartReviewStep)
  T003 → T007 (TutorialProductCard)
  T008, T009 [Parallel]
  ↓
Phase 8.3 (Refactor):
  T005, T006, T007 → T010 (Create utils)
  T010 → T011 (Use utils)
  T010 → T012 (Update styleguide)
  ↓
Phase 8.4 (Browser Verification):
  T005, T006, T007 → T013 (Verify cart)
  T007 → T014 (Verify tutorial card)
  T013, T014 → T015 (E2E flow)
  ↓
Phase 8.5 (Documentation):
  T016, T017 [Parallel]
  ALL → T018 (Final verification)
```

## Parallel Execution Examples

### Tests Phase (All Parallel):
```bash
# Launch T001-T004 together:
npm test -- CartSummaryPanel.test.js &
npm test -- CartReviewStep.test.js &
npm test -- TutorialProductCard.test.js &
npm test -- CheckoutSteps.integration.test.js &
wait
```

### Implementation Phase:
```bash
# After tests pass, implement in sequence:
# T005 → Edit CartSummaryPanel.js
# T006 → Edit CartReviewStep.js
# T007 → Edit TutorialProductCard.js

# Then parallel tasks:
# T008 - Search product cards
# T009 - Update ProductGrid
```

### Documentation Phase (All Parallel):
```bash
# T016 and T017 can be done simultaneously (different files)
```

## Validation Checklist

- [x] All components identified have test tasks
- [x] All tests come before implementation (RED → GREEN)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Browser MCP verification included
- [x] TDD workflow maintained throughout

## Acceptance Criteria (from Plan)

- [ ] ✅ All frontend components use API VAT data (`vatCalculations` prop)
- [ ] ✅ No frontend VAT calculation logic remains (already true - just labels to fix)
- [ ] ✅ Browser MCP verification passes (T013-T015)
- [ ] ✅ Visual rendering correct (T013-T015)
- [ ] ✅ All tests passing (T018)
- [ ] ✅ Test coverage > 80% (T018)

## Estimated Time

- **Phase 8.1 (Tests)**: 5.5 hours
- **Phase 8.2 (Implementation)**: 4.5 hours
- **Phase 8.3 (Refactor)**: 2.5 hours
- **Phase 8.4 (Browser Verification)**: 3.5 hours
- **Phase 8.5 (Documentation)**: 2.5 hours

**Total**: ~18.5 hours (2-3 days)

## Notes

- Frontend already uses `vatCalculations` from API - no calculation logic to remove! ✅
- Main work is updating hardcoded labels and prices to dynamic values
- Heavy emphasis on visual verification with Browser MCP
- Utility functions will make future VAT display updates easier
- Test coverage crucial for regression prevention

## Getting Started

1. Read this entire task file
2. Ensure backend Phase 7 is complete (VAT API working)
3. Start with Phase 8.1 (ALL tests must fail before proceeding)
4. Use TodoWrite to track progress
5. Commit after each task completion
6. Run full test suite before marking phase complete

---

*Generated for Epic 3 - Dynamic VAT Calculation System*
*Based on: plans/epic-3-dynamic-vat-calculation-system-plan.md (Phase 8)*
*Created: 2025-10-01*
