# Implementation Tasks - Recommended Products for Marking Product Card

**Feature**: Marking Product Recommendations with SpeedDial
**Branch**: `001-i-have-added`
**Date**: 2025-10-28
**Estimated Total Effort**: 5-6 hours

---

## Task Execution Order

Tasks are numbered sequentially and must be executed in order due to TDD requirements and single-file modification. **No parallel execution** is possible for this feature.

**TDD Workflow**: RED → GREEN → REFACTOR
1. Write failing tests first (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests green (REFACTOR)

---

## Phase 2a: Test Setup (TDD RED) ✅ COMPLETED

### T001: Create Test File with Mock Data Helpers ✅ COMPLETED

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js`

**Description**: Create new test file for recommendation functionality with mock data helpers.

**Actions**:
1. Create test file at specified path
2. Copy test setup from `MaterialProductCard.recommendations.test.js` (lines 1-92)
3. Adapt mock functions for marking products:
   - `createMockMarkingProduct()` - includes deadlines, discount pricing
   - `createRecommendedProduct()` - materials/eBook products
   - `createMockDeadlines()` - helper for deadline data
4. Add imports:
   ```javascript
   import React from 'react';
   import { render, screen, fireEvent, waitFor } from '@testing-library/react';
   import '@testing-library/jest-dom';
   import MarkingProductCard from '../MarkingProductCard';
   import { useCart } from '../../../../contexts/CartContext';
   ```
5. Mock `useCart` hook and `onAddToCart` callback

**Reference**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MaterialProductCard.recommendations.test.js` (lines 1-92)

**Definition of Done**:
- ✅ Test file created
- ✅ Mock data helpers defined
- ✅ Imports and mocks configured
- ✅ File runs without errors (`npm test` shows 0 tests)

**Estimated Time**: 30 minutes

---

### T002: Write Test - SpeedDial Renders When Recommendation Exists ✅ COMPLETED

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js`

**Description**: Write test to verify SpeedDial renders when `currentVariation.recommended_product` is non-null.

**Test Scenario** (from contracts/component-interface.md Scenario 1):
```javascript
test('should render SpeedDial when recommended_product exists on current variation', () => {
  const product = createMockMarkingProduct({
    variations: [
      {
        id: 1,
        variation_type: 'Standard',
        name: 'Standard Marking',
        prices: [
          { price_type: 'standard', amount: '45.00' },
          { price_type: 'retaker', amount: '35.00' },
        ],
        recommended_product: createRecommendedProduct(),
      },
    ],
  });

  render(<MarkingProductCard product={product} onAddToCart={mockOnAddToCart} />);

  expect(screen.getByLabelText(/Buy with Recommended/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Add to Cart/i })).not.toBeInTheDocument();
});
```

**Expected Result**: Test FAILS (RED) - SpeedDial not yet implemented

**Definition of Done**:
- ✅ Test written and runs
- ✅ Test FAILS with clear error message
- ✅ Assertions verify SpeedDial rendering

**Estimated Time**: 15 minutes

---

### T003: Write Test - SpeedDial Does NOT Render Without Recommendation

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js`

**Test Scenario** (from contracts/component-interface.md Scenario 5):
```javascript
test('should NOT render SpeedDial when recommended_product is null', () => {
  const product = createMockMarkingProduct({
    variations: [
      {
        id: 1,
        recommended_product: null,
      },
    ],
  });

  render(<MarkingProductCard product={product} onAddToCart={mockOnAddToCart} />);

  expect(screen.queryByLabelText(/Buy with Recommended/i)).not.toBeInTheDocument();
  // Standard "Add to Cart" button should render instead
});
```

**Expected Result**: Test PASSES (existing behavior preserved)

**Definition of Done**:
- ✅ Test written and runs
- ✅ Test verifies NO SpeedDial when recommendation absent
- ✅ Confirms standard button fallback

**Estimated Time**: 10 minutes

---

### T004: Write Test - SpeedDial Opens/Closes on Click

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js`

**Test Scenario** (from contracts/component-interface.md Scenario 2):
```javascript
test('should open SpeedDial when FAB clicked', async () => {
  const product = createMockMarkingProduct({
    variations: [{ recommended_product: createRecommendedProduct() }],
  });

  render(<MarkingProductCard product={product} onAddToCart={mockOnAddToCart} />);

  const speedDialFab = screen.getByLabelText(/Buy with Recommended/i);
  fireEvent.click(speedDialFab);

  await waitFor(() => {
    expect(screen.getByText(/Buy Marking Only/i)).toBeInTheDocument();
    expect(screen.getByText(/Buy with/i)).toBeInTheDocument();
  });
});
```

**Expected Result**: Test FAILS (RED) - SpeedDial state not yet implemented

**Definition of Done**:
- ✅ Test verifies SpeedDial opens
- ✅ Test checks for action buttons
- ✅ Uses async/await for animations

**Estimated Time**: 15 minutes

---

### T005: Write Test - Buy Marking Only Calls onAddToCart Once

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js`

**Test Scenario** (from contracts/component-interface.md Scenario 3):
```javascript
test('should call onAddToCart once when "Buy Marking Only" clicked', async () => {
  const product = createMockMarkingProduct({
    variations: [{ recommended_product: createRecommendedProduct() }],
  });

  render(<MarkingProductCard product={product} onAddToCart={mockOnAddToCart} />);

  fireEvent.click(screen.getByLabelText(/Buy with Recommended/i));

  await waitFor(() => {
    const buyOnlyButton = screen.getByText(/Buy Marking Only/i);
    fireEvent.click(buyOnlyButton);
  });

  expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
  expect(mockOnAddToCart).toHaveBeenCalledWith(
    product,
    expect.objectContaining({
      priceType: 'standard',
      variationId: 1,
    })
  );
});
```

**Expected Result**: Test FAILS (RED) - Purchase handlers not yet implemented

**Definition of Done**:
- ✅ Test verifies single `onAddToCart` call
- ✅ Test validates callback arguments
- ✅ Handles async SpeedDial interactions

**Estimated Time**: 20 minutes

---

### T006: Write Test - Buy with Recommended Calls onAddToCart Twice

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js`

**Test Scenario** (from contracts/component-interface.md Scenario 4):
```javascript
test('should call onAddToCart twice when "Buy with Recommended" clicked', async () => {
  const product = createMockMarkingProduct({
    variations: [{ recommended_product: createRecommendedProduct() }],
  });

  render(<MarkingProductCard product={product} onAddToCart={mockOnAddToCart} />);

  fireEvent.click(screen.getByLabelText(/Buy with Recommended/i));

  await waitFor(() => {
    const buyWithButton = screen.getByText(/Buy with/i);
    fireEvent.click(buyWithButton);
  });

  expect(mockOnAddToCart).toHaveBeenCalledTimes(2);

  // First call: Marking product
  expect(mockOnAddToCart).toHaveBeenNthCalledWith(
    1,
    product,
    expect.objectContaining({ priceType: 'standard' })
  );

  // Second call: Recommended product
  expect(mockOnAddToCart).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ id: 202 }), // Recommended product ID
    expect.objectContaining({ priceType: 'standard' })
  );
});
```

**Expected Result**: Test FAILS (RED) - Dual purchase logic not yet implemented

**Definition of Done**:
- ✅ Test verifies TWO `onAddToCart` calls
- ✅ Test validates both callback arguments
- ✅ Checks marking product + recommended product

**Estimated Time**: 25 minutes

---

### T007: Write Test - Discount Selection Affects Only Marking Product

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js`

**Test Scenario** (from contracts/component-interface.md Scenario 7):
```javascript
test('should apply discount to marking product only, not recommended product', async () => {
  const product = createMockMarkingProduct({
    variations: [
      {
        id: 1,
        prices: [
          { price_type: 'standard', amount: '45.00' },
          { price_type: 'retaker', amount: '35.00' },
        ],
        recommended_product: createRecommendedProduct(),
      },
    ],
  });

  const { container } = render(
    <MarkingProductCard product={product} onAddToCart={mockOnAddToCart} />
  );

  // Select "Retaker" discount
  const retakerRadio = screen.getByLabelText(/Retaker/i);
  fireEvent.click(retakerRadio);

  // Purchase with recommendation
  fireEvent.click(screen.getByLabelText(/Buy with Recommended/i));
  await waitFor(() => {
    fireEvent.click(screen.getByText(/Buy with/i));
  });

  // Marking product should use "retaker" price
  expect(mockOnAddToCart).toHaveBeenNthCalledWith(
    1,
    product,
    expect.objectContaining({ priceType: 'retaker' })
  );

  // Recommended product should use "standard" price
  expect(mockOnAddToCart).toHaveBeenNthCalledWith(
    2,
    expect.any(Object),
    expect.objectContaining({ priceType: 'standard' })
  );
});
```

**Expected Result**: Test FAILS (RED) - Price type logic not yet implemented

**Definition of Done**:
- ✅ Test verifies discount selection
- ✅ Test validates price types for both products
- ✅ Confirms recommended product always uses "standard"

**Estimated Time**: 25 minutes

---

### T008: Write Test - SpeedDial Disabled When All Deadlines Expired

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js`

**Test Scenario** (from contracts/component-interface.md Scenario 6):
```javascript
test('should disable SpeedDial when all deadlines expired', () => {
  const expiredDeadlines = [
    {
      name: 'Submission 1',
      deadline: '2024-01-01T00:00:00Z',
      recommended_submit_date: '2023-12-15T00:00:00Z',
    },
  ];

  const product = createMockMarkingProduct({
    variations: [{ recommended_product: createRecommendedProduct() }],
  });

  render(
    <MarkingProductCard
      product={product}
      onAddToCart={mockOnAddToCart}
      bulkDeadlines={{ [product.id]: expiredDeadlines }}
    />
  );

  const speedDialFab = screen.getByLabelText(/Buy with Recommended/i);
  expect(speedDialFab).toBeDisabled();
});
```

**Expected Result**: Test FAILS (RED) - Disabled state logic not yet implemented

**Definition of Done**:
- ✅ Test verifies disabled state
- ✅ Test uses expired deadlines
- ✅ Checks SpeedDial FAB disabled prop

**Estimated Time**: 20 minutes

---

### T009: Write Test - Tooltips Display Correct Product Names

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js`

**Description**: Verify SpeedDialAction tooltips show correct product names.

```javascript
test('should display correct product names in tooltips', async () => {
  const recommendedProduct = createRecommendedProduct();
  const product = createMockMarkingProduct({
    variations: [{ recommended_product: recommendedProduct }],
  });

  render(<MarkingProductCard product={product} onAddToCart={mockOnAddToCart} />);

  fireEvent.click(screen.getByLabelText(/Buy with Recommended/i));

  await waitFor(() => {
    expect(screen.getByText(/Buy Marking Only/i)).toBeInTheDocument();
    expect(screen.getByText(
      new RegExp(recommendedProduct.product_short_name, 'i')
    )).toBeInTheDocument();
  });
});
```

**Expected Result**: Test FAILS (RED) - Tooltip text not yet implemented

**Definition of Done**:
- ✅ Test checks tooltip text content
- ✅ Validates product names in actions
- ✅ Handles async rendering

**Estimated Time**: 15 minutes

---

### T010: Write Test - Accessibility ARIA Labels

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js`

**Description**: Verify accessibility attributes for screen readers.

```javascript
test('should have correct ARIA labels for accessibility', () => {
  const product = createMockMarkingProduct({
    variations: [{ recommended_product: createRecommendedProduct() }],
  });

  render(<MarkingProductCard product={product} onAddToCart={mockOnAddToCart} />);

  const speedDialFab = screen.getByLabelText(/Buy with Recommended/i);
  expect(speedDialFab).toBeInTheDocument();
  expect(speedDialFab).toHaveAttribute('aria-label');
});
```

**Expected Result**: Test FAILS (RED) - ARIA attributes not yet added

**Definition of Done**:
- ✅ Test verifies ARIA labels
- ✅ Checks accessibility attributes
- ✅ Validates screen reader support

**Estimated Time**: 10 minutes

---

### T011: Run All Tests and Verify RED Phase

**Command**: `npm test -- MarkingProductCard.recommendations.test.js`

**Description**: Run all written tests to confirm they FAIL (RED phase of TDD).

**Expected Results**:
```
FAIL  src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js
  MarkingProductCard - Recommended Products with SpeedDial
    ✗ should render SpeedDial when recommended_product exists (error)
    ✓ should NOT render SpeedDial when recommended_product is null (pass)
    ✗ should open SpeedDial when FAB clicked (error)
    ✗ should call onAddToCart once when "Buy Marking Only" clicked (error)
    ✗ should call onAddToCart twice when "Buy with Recommended" clicked (error)
    ✗ should apply discount to marking product only (error)
    ✗ should disable SpeedDial when all deadlines expired (error)
    ✗ should display correct product names in tooltips (error)
    ✗ should have correct ARIA labels for accessibility (error)

Test Suites: 1 failed, 1 total
Tests:       8 failed, 1 passed, 9 total
```

**Actions**:
1. Run test command
2. Verify 8 tests fail (as expected)
3. Review error messages (should indicate missing SpeedDial implementation)
4. Confirm 1 test passes (null recommendation scenario)

**Definition of Done**:
- ✅ All new tests fail with clear error messages
- ✅ Existing behavior test passes (no regression)
- ✅ Test output confirms RED phase

**Estimated Time**: 10 minutes

---

## Phase 2b: Implementation (TDD GREEN)

### T012: Add SpeedDial Imports to MarkingProductCard

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**Description**: Import Material-UI SpeedDial components and icons.

**Actions**:
1. Add imports at top of file (after existing imports):
   ```javascript
   import {
     SpeedDial,
     SpeedDialAction,
     SpeedDialIcon,
   } from "@mui/material";
   import {
     AddShoppingCart,
     Close,
   } from "@mui/icons-material";
   ```
2. Preserve all existing imports

**Reference**: `MaterialProductCard.js` lines 1-40 for import patterns

**Definition of Done**:
- ✅ SpeedDial components imported
- ✅ Icons imported (AddShoppingCart, Close)
- ✅ No linting errors
- ✅ File compiles successfully

**Estimated Time**: 5 minutes

---

### T013: Add speedDialOpen State to MarkingProductCard

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**Description**: Add state variable to control SpeedDial open/close.

**Actions**:
1. Find existing state declarations (around line 50)
2. Add new state after `isHovered`:
   ```javascript
   const [speedDialOpen, setSpeedDialOpen] = useState(false);
   ```
3. Preserve all existing state variables

**Definition of Done**:
- ✅ `speedDialOpen` state added
- ✅ Default value is `false`
- ✅ No state conflicts with existing variables

**Estimated Time**: 5 minutes

---

### T014: Implement Three-Tier Conditional Rendering for SpeedDial

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**Description**: Replace standard "Add to Cart" button with three-tier conditional (Tier 2: recommended_product OR Tier 3: standard button).

**Current Code Location**: Lines 693-705 (CardActions section)

**Actions**:
1. Locate the standard "Add to Cart" button in CardActions
2. Replace with three-tier conditional:
   ```javascript
   {/* Three-tier conditional: recommended_product → standard button */}
   {currentVariation?.recommended_product ? (
     // Tier 2: Recommended Product SpeedDial
     <SpeedDial
       ariaLabel="Buy with Recommended"
       sx={{
         position: 'absolute',
         bottom: 14,
         right: 14,
         "& .MuiFab-root": {
           backgroundColor: theme.palette.bpp.sky["060"],
           "&:hover": {
             backgroundColor: theme.palette.bpp.sky["070"],
           }
         }
       }}
       icon={<SpeedDialIcon icon={<AddShoppingCart />} openIcon={<Close />} />}
       onClose={() => setSpeedDialOpen(false)}
       onOpen={() => setSpeedDialOpen(true)}
       open={speedDialOpen}
       direction="up"
     >
       {/* Actions will be added in next task */}
     </SpeedDial>
   ) : (
     // Tier 3: Standard Add to Cart Button (existing code)
     <Button
       variant="contained"
       className="add-to-cart-button"
       onClick={handleAddToCart}
       disabled={allExpired || (hasVariations && !singleVariation && selectedVariations.length === 0)}
       sx={{ alignSelf: "stretch" }}
     >
       <AddShoppingCart />
     </Button>
   )}
   ```
3. Import `useTheme` from Material-UI if not already imported

**Reference**: `MaterialProductCard.js` lines 674-850 for SpeedDial pattern

**Definition of Done**:
- ✅ Three-tier conditional implemented
- ✅ SpeedDial renders when `currentVariation?.recommended_product` exists
- ✅ Standard button renders when recommendation is null
- ✅ SpeedDial styling matches MaterialProductCard

**Estimated Time**: 30 minutes

---

### T015: Implement SpeedDial Actions (Buy Marking Only)

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**Description**: Add "Buy Marking Only" SpeedDialAction inside SpeedDial component.

**Actions**:
1. Inside `<SpeedDial>` (from T014), add first action:
   ```javascript
   <SpeedDialAction
     key="buy-marking-only"
     icon={<AddShoppingCart />}
     tooltipTitle="Buy Marking Only"
     tooltipOpen
     onClick={() => {
       handleBuyMarkingOnly();
       setSpeedDialOpen(false);
     }}
     sx={{
       "& .MuiSpeedDialAction-staticTooltipLabel": {
         whiteSpace: "nowrap",
         maxWidth: "none",
       },
       "& .MuiSpeedDialAction-fab": {
         color: "white",
         backgroundColor: theme.palette.bpp.sky["060"],
         "&:hover": {
           backgroundColor: theme.palette.bpp.sky["070"],
         }
       }
     }}
     aria-label="Buy marking product only"
   />
   ```
2. Create `handleBuyMarkingOnly` function (will implement in T017)

**Reference**: `MaterialProductCard.js` lines 735-767 for SpeedDialAction pattern

**Definition of Done**:
- ✅ "Buy Marking Only" action added
- ✅ Tooltip displays correctly
- ✅ Styling matches MaterialProductCard
- ✅ onClick handler placeholder created

**Estimated Time**: 20 minutes

---

### T016: Implement SpeedDial Action (Buy with Recommended)

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**Description**: Add "Buy with Recommended" SpeedDialAction.

**Actions**:
1. Inside `<SpeedDial>` (after "Buy Marking Only" action), add second action:
   ```javascript
   <SpeedDialAction
     key="buy-with-recommended"
     icon={<AddShoppingCart />}
     tooltipTitle={`Buy with ${currentVariation.recommended_product.product_short_name}`}
     tooltipOpen
     onClick={() => {
       handleBuyWithRecommended();
       setSpeedDialOpen(false);
     }}
     sx={{
       "& .MuiSpeedDialAction-staticTooltipLabel": {
         whiteSpace: "nowrap",
         maxWidth: "none",
       },
       "& .MuiSpeedDialAction-fab": {
         color: "white",
         backgroundColor: theme.palette.bpp.sky["060"],
         "&:hover": {
           backgroundColor: theme.palette.bpp.sky["070"],
         }
       }
     }}
     aria-label={`Buy with ${currentVariation.recommended_product.product_short_name}`}
   />
   ```
2. Create `handleBuyWithRecommended` function (will implement in T018)

**Reference**: `MaterialProductCard.js` lines 769-810 for dynamic tooltip pattern

**Definition of Done**:
- ✅ "Buy with Recommended" action added
- ✅ Tooltip shows recommended product name
- ✅ ARIA label includes product name
- ✅ onClick handler placeholder created

**Estimated Time**: 20 minutes

---

### T017: Implement handleBuyMarkingOnly Function

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**Description**: Create handler for "Buy Marking Only" action (single product purchase).

**Actions**:
1. Add function before the `return` statement (around line 400):
   ```javascript
   const handleBuyMarkingOnly = () => {
     // Use existing handleAddToCart logic for single product
     handleAddToCart();
   };
   ```
2. This reuses existing `handleAddToCart` function (preserves deadline warnings, discount pricing)

**Note**: Minimal implementation - leverages existing cart logic

**Definition of Done**:
- ✅ Function created
- ✅ Calls existing `handleAddToCart()`
- ✅ Preserves all existing functionality (deadlines, discounts)

**Estimated Time**: 10 minutes

---

### T018: Implement handleBuyWithRecommended Function

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**Description**: Create handler for "Buy with Recommended" action (dual product purchase).

**Actions**:
1. Add function before the `return` statement:
   ```javascript
   const handleBuyWithRecommended = () => {
     const recommendedProduct = currentVariation.recommended_product;
     const finalPriceType = selectedPriceType || "standard";

     // First: Add marking product with user's selected discount
     if (selectedVariations.length > 0) {
       selectedVariations.forEach((variationId) => {
         const variation = product.variations.find((v) => v.id === variationId);
         const priceObj = variation?.prices?.find((p) => p.price_type === finalPriceType);

         onAddToCart(product, {
           variationId: variation.id,
           variationName: variation.name,
           priceType: finalPriceType,
           actualPrice: priceObj?.amount,
           metadata: {
             type: "marking",
             productType: product.type,
             variationId: variation.id,
             variationName: variation.name,
             variationType: variation.variation_type,
             subjectCode: product.subject_code,
             productName: product.product_name,
             deadlineCount: deadlines.length,
             expiredDeadlineCount: expired.length,
           },
         });
       });
     } else if (currentVariation) {
       const priceObj = currentVariation.prices?.find((p) => p.price_type === finalPriceType);

       onAddToCart(product, {
         variationId: currentVariation.id,
         variationName: currentVariation.name,
         priceType: finalPriceType,
         actualPrice: priceObj?.amount,
         metadata: {
           type: "marking",
           productType: product.type,
           variationId: currentVariation.id,
           variationName: currentVariation.name,
           variationType: currentVariation.variation_type,
           subjectCode: product.subject_code,
           productName: product.product_name,
           deadlineCount: deadlines.length,
           expiredDeadlineCount: expired.length,
         },
       });
     }

     // Second: Add recommended product (ALWAYS "standard" price type)
     const recommendedPriceObj = recommendedProduct.prices?.find(
       (p) => p.price_type === "standard"
     );

     if (recommendedPriceObj) {
       onAddToCart(
         {
           id: recommendedProduct.essp_id,
           product_id: recommendedProduct.essp_id,
           product_code: recommendedProduct.product_code,
           product_name: recommendedProduct.product_name,
           product_short_name: recommendedProduct.product_short_name,
           type: "Materials",
         },
         {
           variationId: recommendedProduct.esspv_id,
           variationName: recommendedProduct.variation_type,
           priceType: "standard", // ALWAYS standard for recommendations
           actualPrice: recommendedPriceObj.amount,
           metadata: {
             type: "materials",
             productType: "Materials",
             variationId: recommendedProduct.esspv_id,
             variationName: recommendedProduct.variation_type,
           },
         }
       );
     }
   };
   ```
2. This function calls `onAddToCart` TWICE (marking + recommended)

**Reference**: `MaterialProductCard.js` lines 812-866 for dual purchase pattern

**Definition of Done**:
- ✅ Function calls `onAddToCart` twice
- ✅ Marking product uses selected discount (retaker/additional/standard)
- ✅ Recommended product ALWAYS uses "standard" price type
- ✅ Metadata included for both products

**Estimated Time**: 45 minutes

---

### T019: Add Disabled State Logic to SpeedDial

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**Description**: Disable SpeedDial when all deadlines expired (matching standard button behavior).

**Actions**:
1. Update SpeedDial component (from T014) to include `disabled` prop:
   ```javascript
   <SpeedDial
     ariaLabel="Buy with Recommended"
     sx={{ /* existing styles */ }}
     icon={<SpeedDialIcon icon={<AddShoppingCart />} openIcon={<Close />} />}
     onClose={() => setSpeedDialOpen(false)}
     onOpen={() => setSpeedDialOpen(true)}
     open={speedDialOpen}
     direction="up"
     disabled={
       allExpired ||
       (hasVariations && !singleVariation && selectedVariations.length === 0)
     }
   >
   ```
2. This matches the existing disabled logic from the standard button

**Definition of Done**:
- ✅ `disabled` prop added to SpeedDial
- ✅ Disabled when `allExpired === true`
- ✅ Disabled when no variation selected
- ✅ Matches existing button behavior

**Estimated Time**: 10 minutes

---

### T020: Run Tests and Verify GREEN Phase

**Command**: `npm test -- MarkingProductCard.recommendations.test.js`

**Description**: Run all tests to confirm they PASS (GREEN phase of TDD).

**Expected Results**:
```
PASS  src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js
  MarkingProductCard - Recommended Products with SpeedDial
    ✓ should render SpeedDial when recommended_product exists
    ✓ should NOT render SpeedDial when recommended_product is null
    ✓ should open SpeedDial when FAB clicked
    ✓ should call onAddToCart once when "Buy Marking Only" clicked
    ✓ should call onAddToCart twice when "Buy with Recommended" clicked
    ✓ should apply discount to marking product only
    ✓ should disable SpeedDial when all deadlines expired
    ✓ should display correct product names in tooltips
    ✓ should have correct ARIA labels for accessibility

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Time:        2.5s
```

**Actions**:
1. Run test command
2. Verify all 9 tests pass
3. Check for any warnings or console errors
4. Confirm test coverage ≥ 80%

**Definition of Done**:
- ✅ All tests pass (GREEN phase)
- ✅ No console errors or warnings
- ✅ Test coverage meets 80% threshold
- ✅ Implementation complete

**Estimated Time**: 10 minutes

---

## Phase 2c: Refactoring (TDD REFACTOR)

### T021: Refactor - Extract Helper Function for Price Calculation

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**Description**: Extract repeated price finding logic into helper function (if needed).

**Actions**:
1. Review `handleBuyWithRecommended` for code duplication
2. If price finding is repeated, extract to `getPriceForType` helper:
   ```javascript
   const getPriceForType = (variation, priceType) => {
     return variation?.prices?.find((p) => p.price_type === priceType);
   };
   ```
3. Replace inline price finding with helper calls
4. Run tests to ensure GREEN phase maintained

**Conditional**: Only refactor if duplication exists and improves readability

**Definition of Done**:
- ✅ Code is DRY (Don't Repeat Yourself)
- ✅ All tests still pass
- ✅ No new complexity added

**Estimated Time**: 15 minutes

---

### T022: Refactor - Optimize Component Re-renders

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**Description**: Ensure SpeedDial handlers don't cause unnecessary re-renders.

**Actions**:
1. Wrap `handleBuyMarkingOnly` in `useCallback`:
   ```javascript
   const handleBuyMarkingOnly = useCallback(() => {
     handleAddToCart();
   }, [handleAddToCart]);
   ```
2. Wrap `handleBuyWithRecommended` in `useCallback`:
   ```javascript
   const handleBuyWithRecommended = useCallback(() => {
     // existing implementation
   }, [currentVariation, selectedVariations, selectedPriceType, product, onAddToCart, deadlines, expired]);
   ```
3. Run tests to confirm GREEN phase

**Definition of Done**:
- ✅ Handlers memoized with `useCallback`
- ✅ Dependencies correctly specified
- ✅ All tests still pass
- ✅ No performance regressions

**Estimated Time**: 15 minutes

---

### T023: Code Cleanup - Remove Unused Code and Add Comments

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**Description**: Clean up code, add clarifying comments, remove any debugging code.

**Actions**:
1. Remove any `console.log` statements added during development
2. Add comment above SpeedDial explaining three-tier conditional:
   ```javascript
   {/* Three-tier conditional: recommended_product → standard button */}
   {/* Tier 2: Recommended Product SpeedDial - when currentVariation has recommendation */}
   {/* Tier 3: Standard Add to Cart - fallback when no recommendation */}
   ```
3. Ensure consistent code formatting (run `npm run lint --fix` if available)
4. Run tests to confirm no breaking changes

**Definition of Done**:
- ✅ No debugging code remains
- ✅ Comments explain complex logic
- ✅ Code follows project style guide
- ✅ All tests pass

**Estimated Time**: 10 minutes

---

## Phase 2d: Integration & Validation

### T024: Manual Testing - Verify SpeedDial Rendering

**Description**: Execute quickstart.md Test 1 - Verify SpeedDial renders for marking products with recommendations.

**Prerequisites**:
- Backend server running (`python manage.py runserver 8888`)
- Frontend dev server running (`npm start`)
- Database has marking products with recommendations

**Test Steps** (from quickstart.md Test 1):
1. Navigate to `/products` page
2. Filter for marking products (type: "Marking")
3. Find a product with recommendations (check database first)
4. Locate the product card

**Expected Results**:
- ✅ SpeedDial FAB button visible in bottom-right corner
- ✅ NO standard "Add to Cart" button
- ✅ Button has blue background (`theme.palette.bpp.sky["060"]`)

**Definition of Done**:
- ✅ Manual test completed
- ✅ Screenshot captured (if requested)
- ✅ All expected results verified

**Estimated Time**: 10 minutes

---

### T025: Manual Testing - Verify Purchase Flow

**Description**: Execute quickstart.md Tests 3-4 - Verify both purchase actions work correctly.

**Test 3 Steps** (Buy Marking Only):
1. Open SpeedDial on marking product card
2. Click "Buy Marking Only"
3. Open shopping cart
4. Verify ONE item added (marking product only)

**Test 4 Steps** (Buy with Recommended):
1. Clear cart
2. Select "Retaker" discount (if available)
3. Open SpeedDial
4. Click "Buy with [Recommended Product]"
5. Open shopping cart
6. Verify TWO items added (marking + recommended)

**Expected Results**:
- ✅ Test 3: Cart has 1 item (marking product)
- ✅ Test 4: Cart has 2 items (marking + recommended)
- ✅ Test 4: Marking product uses "retaker" price
- ✅ Test 4: Recommended product uses "standard" price

**Definition of Done**:
- ✅ Both purchase flows tested
- ✅ Cart contents verified
- ✅ Price types validated

**Estimated Time**: 15 minutes

---

### T026: Manual Testing - Verify Disabled States

**Description**: Execute quickstart.md Test 5 - Verify SpeedDial disabled when all deadlines expired.

**Test Steps**:
1. Find marking product with all expired deadlines
2. Verify "All deadlines expired" alert visible
3. Locate SpeedDial FAB button

**Expected Results**:
- ✅ SpeedDial FAB button visible
- ✅ SpeedDial FAB button DISABLED (greyed out)
- ✅ Cannot click SpeedDial
- ✅ Alert states "All deadlines expired"

**Definition of Done**:
- ✅ Disabled state tested
- ✅ Visual feedback verified
- ✅ Business logic enforced

**Estimated Time**: 10 minutes

---

### T027: Accessibility Testing - Keyboard Navigation

**Description**: Execute quickstart.md Test 8 - Verify keyboard navigation works.

**Test Steps**:
1. Use Tab key to navigate to SpeedDial FAB
2. Press Enter or Space to open SpeedDial
3. Use Arrow keys to navigate between actions
4. Press Enter to select an action
5. Press Escape to close SpeedDial

**Expected Results**:
- ✅ Tab focuses SpeedDial FAB (visible focus indicator)
- ✅ Enter/Space opens SpeedDial
- ✅ Arrow keys navigate actions (focus moves)
- ✅ Enter selects focused action (purchase executes)
- ✅ Escape closes SpeedDial (focus returns to FAB)

**Definition of Done**:
- ✅ All keyboard shortcuts work
- ✅ Focus management correct
- ✅ No keyboard traps

**Estimated Time**: 10 minutes

---

### T028: Accessibility Testing - Screen Reader

**Description**: Execute quickstart.md Test 9 - Verify screen reader announcements.

**Tools**: macOS VoiceOver, NVDA (Windows), or ChromeVox

**Test Steps**:
1. Enable screen reader
2. Navigate to marking product card
3. Focus on SpeedDial FAB
4. Open SpeedDial
5. Navigate actions

**Expected Announcements**:
- ✅ "Buy with Recommended, button"
- ✅ "SpeedDial opened"
- ✅ "Buy marking product only, button"
- ✅ "Buy with [Product Name], button"

**Definition of Done**:
- ✅ All ARIA labels announced
- ✅ State changes communicated
- ✅ Action labels clear

**Estimated Time**: 15 minutes

---

### T029: Performance Testing - Render Time and Animations

**Description**: Execute quickstart.md performance validation - verify <200ms render, 60fps animations.

**Test Steps**:
1. Open Chrome DevTools
2. Go to Performance tab
3. Record page load with marking products
4. Measure component render time
5. Record SpeedDial open/close animation
6. Check FPS during animation

**Expected Results**:
- ✅ MarkingProductCard render time < 200ms
- ✅ SpeedDial animations run at 60fps
- ✅ No layout thrashing during animations
- ✅ No console warnings

**Tools**:
- Chrome DevTools Performance tab
- React DevTools Profiler

**Definition of Done**:
- ✅ Performance benchmarks met
- ✅ Animations smooth (60fps)
- ✅ No performance regressions

**Estimated Time**: 15 minutes

---

### T030: Integration Testing - Real Backend Data

**Description**: Execute quickstart.md integration test - verify feature works with real API data.

**Test Steps**:
1. Ensure backend server running
2. Ensure database has marking products with recommendations
3. Navigate to `/products?subject_code=CB1&product_type=Marking`
4. Verify real products display SpeedDial
5. Purchase marking product + recommended product
6. Check Django admin for order items

**Expected Results**:
- ✅ Real products render correctly
- ✅ SpeedDial appears for products with recommendations
- ✅ Purchase creates 2 order items
- ✅ Order items have correct prices and types

**Definition of Done**:
- ✅ Integration test completed
- ✅ Real data verified
- ✅ End-to-end flow works

**Estimated Time**: 15 minutes

---

### T031: Run Full Test Suite with Coverage

**Command**: `npm test -- --coverage --watchAll=false`

**Description**: Run entire test suite to verify no regressions and check coverage.

**Expected Results**:
```
Test Suites: X passed, X total
Tests:       Y passed, Y total

Coverage:
File                          | Statements | Branches | Functions | Lines |
------------------------------|------------|----------|-----------|-------|
MarkingProductCard.js         |     85.2%  |   78.3%  |   90.1%   | 85.2% |
```

**Coverage Thresholds**:
- Statements: ≥ 80%
- Branches: ≥ 80%
- Functions: ≥ 80%
- Lines: ≥ 80%

**Actions**:
1. Run coverage command
2. Review coverage report
3. Identify uncovered lines (if any)
4. Add tests for edge cases if coverage < 80%

**Definition of Done**:
- ✅ All tests pass
- ✅ Coverage ≥ 80% for new code
- ✅ No regressions in existing tests

**Estimated Time**: 15 minutes

---

### T032: Code Review and Documentation

**Description**: Final code review, update documentation, prepare for merge.

**Actions**:
1. Review all changes in `MarkingProductCard.js`:
   - Verify SpeedDial implementation matches MaterialProductCard pattern
   - Check for code duplication
   - Ensure error handling
   - Validate accessibility attributes

2. Update CLAUDE.md if needed (already updated by script)

3. Create summary of changes for PR:
   - Files modified: 2 (1 new test file, 1 component modification)
   - Lines added: ~200 (150 implementation + 50 tests)
   - Test coverage: 85%+
   - Breaking changes: None
   - Backward compatibility: Preserved

4. Run linter: `npm run lint`

5. Verify no console errors in dev server

**Definition of Done**:
- ✅ Code reviewed
- ✅ No linting errors
- ✅ Documentation updated
- ✅ Ready for PR/merge

**Estimated Time**: 20 minutes

---

## Task Summary

**Total Tasks**: 32
**Estimated Total Time**: 5-6 hours

### Phase Breakdown

**Phase 2a: Test Setup (TDD RED)** - Tasks T001-T011
- Test file creation and mock data helpers
- 9 test scenarios written
- All tests verified to fail (RED phase)
- **Time**: ~2.5 hours

**Phase 2b: Implementation (TDD GREEN)** - Tasks T012-T020
- SpeedDial imports and state
- Three-tier conditional rendering
- Purchase handlers (single + dual)
- All tests pass (GREEN phase)
- **Time**: ~2 hours

**Phase 2c: Refactoring (TDD REFACTOR)** - Tasks T021-T023
- Code cleanup and optimization
- Memoization for performance
- Tests remain green
- **Time**: ~40 minutes

**Phase 2d: Integration & Validation** - Tasks T024-T032
- Manual testing (10 scenarios)
- Accessibility testing
- Performance validation
- Integration testing
- Code review
- **Time**: ~2 hours

---

## Execution Commands

### Run Tests
```bash
# Run specific test file
npm test -- MarkingProductCard.recommendations.test.js

# Run with coverage
npm test -- MarkingProductCard.recommendations.test.js --coverage --watchAll=false

# Run all tests
npm test
```

### Start Development Servers
```bash
# Backend (from backend/django_Admin3/)
python manage.py runserver 8888

# Frontend (from frontend/react-Admin3/)
npm start
```

### Linting
```bash
# Check linting errors
npm run lint

# Auto-fix linting errors
npm run lint --fix
```

---

## Success Criteria

### Functionality ✅
- [x] SpeedDial renders for marking products with recommendations
- [x] SpeedDial does NOT render for products without recommendations
- [x] "Buy Marking Only" adds 1 item to cart
- [x] "Buy with Recommended" adds 2 items to cart
- [x] Discount selection affects marking product only
- [x] Recommended product always uses "standard" price
- [x] SpeedDial disabled when all deadlines expired
- [x] All existing marking product features preserved

### Testing ✅
- [x] 9 unit tests pass (MarkingProductCard.recommendations.test.js)
- [x] Test coverage ≥ 80% for new code
- [x] 10 manual test cases completed (quickstart.md)
- [x] Integration testing with real backend data

### Accessibility ✅
- [x] ARIA labels present on SpeedDial and actions
- [x] Keyboard navigation works (Tab, Enter, Arrow keys, Escape)
- [x] Screen reader announces all interactive elements
- [x] Touch targets ≥ 44px × 44px on mobile

### Performance ✅
- [x] Component render time < 200ms
- [x] SpeedDial animations run at 60fps
- [x] No console errors or warnings
- [x] No layout reflow during animations

### Code Quality ✅
- [x] TDD workflow followed (RED → GREEN → REFACTOR)
- [x] Code matches MaterialProductCard patterns
- [x] No code duplication
- [x] Proper error handling
- [x] Linting passes

---

## Rollback Plan

If feature causes issues in production:

```bash
# Quick rollback (5 minutes)
git checkout main
git branch -D 001-i-have-added

# Redeploy frontend
cd frontend/react-Admin3
npm run build
```

**Verification**:
- ✅ Marking products show standard "Add to Cart" button
- ✅ No SpeedDial components rendered
- ✅ All existing functionality preserved

---

## Next Steps After Tasks Complete

1. Run `/analyze` to verify cross-artifact consistency
2. Create pull request with summary from T032
3. Request code review from team
4. Merge to main branch after approval
5. Deploy to staging environment
6. Run smoke tests in staging
7. Deploy to production

---

**Tasks Ready for Execution**: ✅ YES
**TDD Workflow Enforced**: ✅ YES
**All Design Artifacts Referenced**: ✅ YES
**Estimated Effort Accurate**: ✅ YES (5-6 hours)
