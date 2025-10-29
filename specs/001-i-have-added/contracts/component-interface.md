# Component Interface Contract - MarkingProductCard with Recommendations

**Component**: `MarkingProductCard`
**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`
**Date**: 2025-10-28

---

## Component Props Interface

### Input Props

```typescript
interface MarkingProductCardProps {
  // Required Props
  product: MarkingProduct;           // Product object with variations and recommendations
  onAddToCart: OnAddToCartCallback;  // Callback for cart operations

  // Optional Props
  allEsspIds?: number[];             // Array of product IDs for bulk deadline loading
  bulkDeadlines?: BulkDeadlines;     // Pre-loaded deadline data
}
```

### Type Definitions

```typescript
interface MarkingProduct {
  id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  product_short_name: string;
  subject_code: string;
  type: "Marking";
  variations: ProductVariation[];
}

interface ProductVariation {
  id: number;
  variation_type: string;              // e.g., "Standard"
  name: string;                        // e.g., "Standard Marking"
  description_short: string;
  prices: Price[];
  recommended_product?: RecommendedProduct | null;  // NEW: Optional recommendation
}

interface RecommendedProduct {
  essp_id: number;                     // External product ID
  esspv_id: number;                    // External product variation ID
  product_code: string;
  product_name: string;
  product_short_name: string;
  variation_type: string;
  prices: Price[];                     // Must include "standard" price type
}

interface Price {
  id: number;
  price_type: "standard" | "retaker" | "additional";
  amount: string;                      // e.g., "45.00"
  currency: "GBP";
}

type OnAddToCartCallback = (
  product: MarkingProduct,
  options: AddToCartOptions
) => void;

interface AddToCartOptions {
  variationId?: number;
  variationName?: string;
  priceType: "standard" | "retaker" | "additional";
  actualPrice?: string;
  metadata?: Record<string, any>;
}

interface BulkDeadlines {
  [esspId: number]: Deadline[];
}

interface Deadline {
  name: string;
  deadline: string;                    // ISO 8601 date string
  recommended_submit_date: string;     // ISO 8601 date string
}
```

---

## Component Behavior Contract

### Rendering Rules

#### Rule 1: Three-Tier Conditional Rendering (NEW)

**Condition**: Recommendations exist
```javascript
if (currentVariation?.recommended_product) {
  // Render SpeedDial with recommendation actions
} else {
  // Render standard "Add to Cart" button
}
```

**Tier 2 (Recommended Product)**: Renders when `currentVariation?.recommended_product` is non-null
**Tier 3 (Standard)**: Renders when `currentVariation?.recommended_product` is null

**Note**: Marking products do NOT support `buy_both` (Tier 1), so only Tiers 2 and 3 apply.

#### Rule 2: SpeedDial Display Conditions

SpeedDial **IS RENDERED** when:
- ✅ `currentVariation?.recommended_product` exists
- ✅ `recommended_product.prices` is non-empty
- ✅ `recommended_product.prices` includes `price_type: "standard"`

SpeedDial **IS NOT RENDERED** when:
- ❌ `currentVariation?.recommended_product` is null or undefined
- ❌ `recommended_product.prices` is empty
- ❌ No "standard" price type found in `recommended_product.prices`

#### Rule 3: SpeedDial Disabled State

SpeedDial **IS DISABLED** when:
- ❌ `allExpired === true` (all marking deadlines expired)
- ❌ `hasVariations && !singleVariation && selectedVariations.length === 0` (no variation selected)

SpeedDial **IS ENABLED** when:
- ✅ At least one deadline is not expired OR no deadlines exist
- ✅ Single variation auto-selected OR user selected a variation

---

### User Interaction Contract

#### Interaction 1: Open SpeedDial

**User Action**: Click SpeedDial FAB button
**System Behavior**:
1. Set `speedDialOpen = true`
2. Render two SpeedDialAction buttons:
   - "Buy Marking Only"
   - "Buy with Recommended [Product Short Name]"
3. Display tooltips on hover

**Accessibility**:
- `aria-label="Buy with Recommended"`
- Keyboard navigable (Tab, Enter, Escape)
- Focus management (trap focus when open)

#### Interaction 2: Purchase Marking Product Only

**User Action**: Click "Buy Marking Only" SpeedDialAction
**System Behavior**:
1. Close SpeedDial (`setSpeedDialOpen(false)`)
2. Call `onAddToCart(product, options)` with:
   ```javascript
   {
     variationId: currentVariation.id,
     variationName: currentVariation.name,
     priceType: selectedPriceType || "standard",  // Respects user discount selection
     actualPrice: priceObj.amount,
     metadata: { type: "marking", ... }
   }
   ```
3. No expired deadline warning (handled by existing logic)

#### Interaction 3: Purchase Marking Product + Recommended Product

**User Action**: Click "Buy with Recommended [Product]" SpeedDialAction
**System Behavior**:
1. Close SpeedDial (`setSpeedDialOpen(false)`)
2. Call `onAddToCart()` **TWICE** in sequence:

   **First Call** (Marking Product):
   ```javascript
   onAddToCart(product, {
     variationId: currentVariation.id,
     variationName: currentVariation.name,
     priceType: selectedPriceType || "standard",  // User's discount selection
     actualPrice: markingPriceObj.amount,
     metadata: { type: "marking", ... }
   })
   ```

   **Second Call** (Recommended Product):
   ```javascript
   onAddToCart(
     {
       id: recommendedProduct.essp_id,
       product_id: recommendedProduct.essp_id,
       product_code: recommendedProduct.product_code,
       product_name: recommendedProduct.product_name,
       product_short_name: recommendedProduct.product_short_name,
       type: "Materials",  // Assumed type for recommended products
     },
     {
       variationId: recommendedProduct.esspv_id,
       variationName: recommendedProduct.variation_type,
       priceType: "standard",  // ALWAYS standard, no discounts for recommendations
       actualPrice: recommendedPriceObj.amount,
       metadata: { type: "materials", ... }
     }
   )
   ```

3. No expired deadline warning for recommendations (only for marking product)

#### Interaction 4: Close SpeedDial

**User Actions**:
- Click SpeedDial FAB again (toggle closed)
- Click outside SpeedDial (blur event)
- Press Escape key
- Select a SpeedDialAction (auto-closes after action)

**System Behavior**:
- Set `speedDialOpen = false`
- Collapse SpeedDial actions
- Return focus to FAB button

---

### Price Type Behavior Contract

#### Discount Application Rules

**Marking Product Price**:
```javascript
const markingPriceType = selectedPriceType || "standard";
// User can select: "standard", "retaker", or "additional"
// Default: "standard"
```

**Recommended Product Price**:
```javascript
const recommendedPriceType = "standard";
// ALWAYS "standard" - no discount options for recommendations
```

**Rationale**: Discount eligibility is tied to the marking product only (e.g., retaker status for that specific marking service). Recommended products (materials) have separate discount rules managed independently.

---

### Preserved Existing Behavior

#### Deadline Warnings (No Changes)

- ✅ Deadline alerts displayed in CardContent
- ✅ "Submission Deadlines" button opens modal
- ✅ Expired deadline warning dialog before cart addition
- ✅ Disabled state when all deadlines expired

#### Discount Options (No Changes)

- ✅ Retaker/Additional Copy radio buttons
- ✅ Discount selection affects marking product price only
- ✅ Price display updates based on selection

#### Variations (No Changes)

- ✅ Single variation auto-selected
- ✅ Multiple variations require user selection
- ✅ Current variation determines available discounts

---

## Test Scenarios Contract

### Scenario 1: SpeedDial Rendering

**Given**: Marking product with `recommended_product` on variation
**When**: Component renders
**Then**:
- SpeedDial FAB button visible
- Standard "Add to Cart" button NOT rendered
- `aria-label="Buy with Recommended"` present

### Scenario 2: SpeedDial Actions

**Given**: SpeedDial rendered
**When**: User clicks SpeedDial FAB
**Then**:
- SpeedDial opens (`speedDialOpen = true`)
- Two actions visible:
  1. "Buy Marking Only"
  2. "Buy with [Recommended Product Short Name]"
- Tooltips displayed on hover

### Scenario 3: Purchase Marking Product Only

**Given**: SpeedDial open
**When**: User clicks "Buy Marking Only"
**Then**:
- `onAddToCart` called ONCE
- Marking product added with user's selected price type
- SpeedDial closes

### Scenario 4: Purchase with Recommendation

**Given**: SpeedDial open
**When**: User clicks "Buy with Recommended [Product]"
**Then**:
- `onAddToCart` called TWICE (marking product + recommended product)
- Marking product uses user's price type (standard/retaker/additional)
- Recommended product uses "standard" price type
- SpeedDial closes

### Scenario 5: No Recommendation

**Given**: Marking product with `recommended_product = null`
**When**: Component renders
**Then**:
- SpeedDial NOT rendered
- Standard "Add to Cart" button rendered (existing Tier 3 behavior)

### Scenario 6: Disabled State - All Deadlines Expired

**Given**: Marking product with recommendation AND all deadlines expired
**When**: Component renders
**Then**:
- SpeedDial rendered but DISABLED
- User cannot click FAB or actions
- "All deadlines expired" alert displayed (existing behavior)

### Scenario 7: Discount Selection with Recommendation

**Given**: User selects "Retaker" discount AND has recommendation
**When**: User purchases "Buy with Recommended"
**Then**:
- Marking product added with "retaker" price
- Recommended product added with "standard" price
- Two separate cart items created

---

## Edge Cases Contract

### Edge Case 1: Invalid Recommended Product Price

**Condition**: `recommended_product.prices` is empty OR no "standard" price type
**Behavior**: Do NOT render SpeedDial (fallback to standard button)

### Edge Case 2: Recommended Product Already in Cart

**Condition**: User already has recommended product in cart
**Behavior**: Add duplicate (existing cart logic handles duplicates/quantities)

### Edge Case 3: Variation Change While SpeedDial Open

**Condition**: User changes variation selection while SpeedDial is open
**Behavior**:
- Close SpeedDial (`setSpeedDialOpen = false`)
- Re-render with new `currentVariation.recommended_product`

### Edge Case 4: Zero-Price Recommended Product

**Condition**: `recommended_product.prices[0].amount = "0.00"`
**Behavior**: Render SpeedDial normally, allow purchase (valid business case: free materials)

---

## Component Output Contract

### No Direct Output

Component uses callback pattern. All cart operations delegated to `onAddToCart` callback.

### Side Effects

**State Updates**:
- `speedDialOpen`: Toggled by user interaction
- All existing state variables preserved (deadlines, modals, pricing, etc.)

**Cart Operations** (via callback):
- Single product addition: 1 call to `onAddToCart`
- Recommendation purchase: 2 calls to `onAddToCart` (marking + recommended)

---

## Accessibility Contract

### ARIA Labels

- SpeedDial FAB: `aria-label="Buy with Recommended"`
- "Buy Marking Only" action: `aria-label="Buy marking product only"`
- "Buy with Recommended" action: `aria-label="Buy with [Product Short Name]"`

### Keyboard Navigation

- **Tab**: Navigate to SpeedDial FAB
- **Enter/Space**: Open SpeedDial
- **Arrow Keys**: Navigate between actions (Material-UI built-in)
- **Enter/Space**: Select action
- **Escape**: Close SpeedDial

### Screen Reader Support

- Tooltips read aloud on focus
- Action labels announced on navigation
- State changes announced (opened/closed)

---

## Performance Contract

### Render Optimization

- Memoize `currentVariation` calculation (existing `useMemo`)
- Use `React.memo` for MarkingProductCard component (existing)
- No additional re-renders introduced by SpeedDial state

### Animation Performance

- SpeedDial animations: GPU-accelerated (Material-UI default)
- Target: 60fps for open/close transitions
- No layout reflow during animations

---

## Error Handling Contract

### Graceful Degradation

**Missing `recommended_product`**:
- Fallback to standard "Add to Cart" button
- No console errors or warnings

**Invalid Price Data**:
- Validate `prices` array before rendering SpeedDial
- Fallback to standard button if validation fails

**Cart Callback Errors**:
- Catch errors from `onAddToCart` (if any)
- Display user-friendly error message (if applicable)
- Do NOT crash component

---

## Contract Tests (To Be Written)

### Test File: `MarkingProductCard.recommendations.test.js`

**Test Coverage**:
- [ ] SpeedDial renders when `recommended_product` exists
- [ ] SpeedDial does NOT render when `recommended_product` is null
- [ ] SpeedDial opens/closes on FAB click
- [ ] "Buy Marking Only" calls `onAddToCart` once
- [ ] "Buy with Recommended" calls `onAddToCart` twice
- [ ] Marking product uses selected discount (retaker/additional)
- [ ] Recommended product always uses "standard" price type
- [ ] SpeedDial disabled when all deadlines expired
- [ ] SpeedDial disabled when no variation selected
- [ ] Tooltips display correct product names
- [ ] Accessibility: ARIA labels present
- [ ] Accessibility: Keyboard navigation works
- [ ] Edge case: Invalid recommended product prices
- [ ] Edge case: Zero-price recommended product

**Estimated Tests**: 14 tests (based on MaterialProductCard.recommendations.test.js pattern)

---

## Contract Versioning

**Version**: 1.0.0
**Date**: 2025-10-28
**Breaking Changes**: None (backward compatible with existing MarkingProductCard usage)

---

## Summary

This contract defines:
✅ Component props interface (TypeScript types)
✅ Rendering rules (three-tier conditional)
✅ User interaction flows (purchase actions)
✅ Price type behavior (discount application)
✅ Accessibility requirements (ARIA, keyboard)
✅ Test scenarios (14 tests)
✅ Error handling (graceful degradation)

**Contract Status**: ✅ Complete
**Implementation Ready**: ✅ Yes
