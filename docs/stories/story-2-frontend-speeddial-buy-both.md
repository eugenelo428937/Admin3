# Story 2: Frontend Material UI SpeedDial for Buy Both

**Epic:** Material Product Card SpeedDial Enhancements
**Type:** Brownfield Addition
**Priority:** High
**Dependencies:** Story 1 (Backend API must return buy_both flag)
**Estimated Effort:** 2-3 hours
**Story Points:** 3

---

## User Story

**As a** customer shopping for study materials,
**I want** a clear and intuitive way to purchase both eBook and Printed versions together,
**So that** I can quickly add complementary products to my cart without multiple selections.

---

## Story Context

### Existing System Integration

- **Integrates with:** MaterialProductCard component, existing cart context and onAddToCart handlers
- **Technology:** React 18, Material-UI v5 SpeedDial component, existing state management hooks
- **Follows pattern:** Conditional rendering based on product flags (similar to Tutorial/Marking product routing)
- **Touch points:**
  - Component rendering logic (replace radio button with SpeedDial)
  - Existing add-to-cart handlers (reuse without modification)
  - Product prop structure (`product.buy_both` boolean flag)

---

## Acceptance Criteria

### Functional Requirements

**1. SpeedDial Rendering**

When `product.buy_both === true` AND product has 2+ variations:
- Display Material UI SpeedDial in place of "Add to Cart" button
- SpeedDial icon: `AddShoppingCart` (consistent with existing button)
- SpeedDial opens on hover/click revealing 2 actions

**2. SpeedDial Actions**

- **Action 1:** "Add to Cart" - Adds currently selected variation only
- **Action 2:** "Buy Both" - Adds both variations (reuses existing logic lines 578-642)
- Actions display clear text labels with appropriate icons
- Clicking action closes SpeedDial and triggers cart addition

**3. Fallback Rendering**

When `product.buy_both === false` OR only 1 variation exists:
- Display standard "Add to Cart" button (existing pattern)
- No SpeedDial rendered
- Existing button behavior unchanged

### Integration Requirements

4. **Existing add-to-cart logic** remains completely unchanged (lines 578-642 maintained)
5. **Cart metadata structure** preserved for both single and "buy both" additions
6. **Material-UI theme** applied to SpeedDial (uses existing theme from ThemeProvider)

### Quality Requirements

7. **Tests cover:**
   - SpeedDial renders when `buy_both=true` with 2+ variations
   - Standard button renders when `buy_both=false`
   - "Add to Cart" action adds single variation
   - "Buy Both" action adds both variations with correct metadata
   - Edge cases: 1 variation, missing buy_both flag

8. **Code cleanup:**
   - Remove lines 373-437 (buy_both radio button code)
   - Remove unused radio button imports if applicable
   - Maintain code formatting and linting standards

9. **No regression:** All existing product types (Materials, Tutorials, Markings) render correctly

---

## Technical Implementation

### Files to Modify

**File:** `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`

### Step 1: Add SpeedDial Imports

```javascript
// Update Material-UI imports (line 4-28)
import {
    Button,
    Chip,
    Card,
    // ... existing imports
    SpeedDial,
    SpeedDialAction,
    SpeedDialIcon,
} from "@mui/material";
```

### Step 2: Remove Buy Both Radio Button

**Delete lines 373-437** - The entire buy_both radio button block inside the RadioGroup Stack.

### Step 3: Replace Add to Cart Button with Conditional SpeedDial

Replace the existing "Add to Cart" button section (lines 571-677) with:

```javascript
{/* Conditional SpeedDial or Standard Button */}
{product.buy_both && product.variations?.length >= 2 ? (
    <SpeedDial
        ariaLabel="Product purchase options"
        sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            '& .MuiSpeedDial-fab': {
                backgroundColor: 'primary.main',
                '&:hover': {
                    backgroundColor: 'primary.dark',
                },
            },
        }}
        icon={<SpeedDialIcon icon={<AddShoppingCart />} />}
    >
        {/* Action 1: Add to Cart (single variation) */}
        <SpeedDialAction
            icon={<AddShoppingCart />}
            tooltipTitle="Add to Cart"
            onClick={() => {
                const priceType = selectedPriceType || "standard";
                if (!currentVariation) return;
                const priceObj = currentVariation.prices?.find(
                    (p) => p.price_type === priceType
                );

                const metadata = {
                    type: "material",
                    productType: product.type,
                    variationId: currentVariation.id,
                    variationName: currentVariation.name,
                    variationType: currentVariation.variation_type,
                    subjectCode: product.subject_code,
                    productName: product.product_name,
                };
                if (currentVariation.variation_type === "eBook") {
                    metadata.is_digital = true;
                }

                onAddToCart(product, {
                    variationId: currentVariation.id,
                    variationName: currentVariation.name,
                    priceType: priceType,
                    actualPrice: priceObj?.amount,
                    metadata: metadata,
                });
            }}
        />

        {/* Action 2: Buy Both */}
        <SpeedDialAction
            icon={<AddShoppingCart />}
            tooltipTitle="Buy Both"
            onClick={() => {
                const priceType = selectedPriceType || "standard";
                const variation1 = product.variations[0];
                const variation2 = product.variations[1];
                const price1 = variation1?.prices?.find(
                    (p) => p.price_type === priceType
                );
                const price2 = variation2?.prices?.find(
                    (p) => p.price_type === priceType
                );

                if (variation1 && variation2 && price1 && price2) {
                    // Add first variation
                    const metadata1 = {
                        type: "material",
                        productType: product.type,
                        variationId: variation1.id,
                        variationName: variation1.name,
                        variationType: variation1.variation_type,
                        subjectCode: product.subject_code,
                        productName: product.product_name,
                    };
                    if (variation1.variation_type === "eBook") {
                        metadata1.is_digital = true;
                    }

                    onAddToCart(product, {
                        variationId: variation1.id,
                        variationName: variation1.name,
                        priceType: priceType,
                        actualPrice: price1.amount,
                        metadata: metadata1,
                    });

                    // Add second variation
                    const metadata2 = {
                        type: "material",
                        productType: product.type,
                        variationId: variation2.id,
                        variationName: variation2.name,
                        variationType: variation2.variation_type,
                        subjectCode: product.subject_code,
                        productName: product.product_name,
                    };
                    if (variation2.variation_type === "eBook") {
                        metadata2.is_digital = true;
                    }

                    onAddToCart(product, {
                        variationId: variation2.id,
                        variationName: variation2.name,
                        priceType: priceType,
                        actualPrice: price2.amount,
                        metadata: metadata2,
                    });
                }
            }}
        />
    </SpeedDial>
) : (
    <Button
        variant="contained"
        className="add-to-cart-button"
        onClick={() => {
            // Existing single variation add-to-cart logic
            const priceType = selectedPriceType || "standard";
            if (!currentVariation) return;
            const priceObj = currentVariation.prices?.find(
                (p) => p.price_type === priceType
            );

            const metadata = {
                type: "material",
                productType: product.type,
                variationId: currentVariation.id,
                variationName: currentVariation.name,
                variationType: currentVariation.variation_type,
                subjectCode: product.subject_code,
                productName: product.product_name,
            };
            if (currentVariation.variation_type === "eBook") {
                metadata.is_digital = true;
            }

            onAddToCart(product, {
                variationId: currentVariation.id,
                variationName: currentVariation.name,
                priceType: priceType,
                actualPrice: priceObj?.amount,
                metadata: metadata,
            });
        }}
        disabled={!currentVariation}
    >
        <AddShoppingCart />
    </Button>
)}
```

---

## Testing Requirements

### Component Tests

**File:** `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MaterialProductCard.buyboth.test.js`

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import MaterialProductCard from '../MaterialProductCard';
import { CartProvider } from '../../../../contexts/CartContext';

const mockProduct = {
    id: 1,
    essp_id: 1,
    product_name: 'Mock Exam',
    subject_code: 'CB1',
    buy_both: true,
    variations: [
        {
            id: 1,
            name: 'eBook',
            variation_type: 'eBook',
            prices: [{ id: 1, price_type: 'standard', amount: 16 }],
        },
        {
            id: 2,
            name: 'Printed',
            variation_type: 'Printed',
            prices: [{ id: 2, price_type: 'standard', amount: 25 }],
        },
    ],
};

describe('MaterialProductCard SpeedDial Buy Both', () => {
    test('renders SpeedDial when buy_both is true', () => {
        const mockAddToCart = jest.fn();
        render(
            <CartProvider>
                <MaterialProductCard product={mockProduct} onAddToCart={mockAddToCart} />
            </CartProvider>
        );

        expect(screen.getByLabelText('Product purchase options')).toBeInTheDocument();
    });

    test('renders standard button when buy_both is false', () => {
        const productNoBuyBoth = { ...mockProduct, buy_both: false };
        const mockAddToCart = jest.fn();
        render(
            <CartProvider>
                <MaterialProductCard product={productNoBuyBoth} onAddToCart={mockAddToCart} />
            </CartProvider>
        );

        expect(screen.queryByLabelText('Product purchase options')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
    });

    test('"Buy Both" action adds both variations to cart', () => {
        const mockAddToCart = jest.fn();
        render(
            <CartProvider>
                <MaterialProductCard product={mockProduct} onAddToCart={mockAddToCart} />
            </CartProvider>
        );

        const speedDial = screen.getByLabelText('Product purchase options');
        fireEvent.click(speedDial);

        const buyBothAction = screen.getByText('Buy Both');
        fireEvent.click(buyBothAction);

        expect(mockAddToCart).toHaveBeenCalledTimes(2);
    });
});
```

---

## Risk Mitigation

### Primary Risk
SpeedDial accidentally renders for products without buy_both flag

### Mitigation Strategy
- Strict conditional rendering: `product.buy_both === true && product.variations?.length >= 2`
- Explicit fallback to standard button
- Unit tests for all conditional rendering paths
- Manual QA across product types

### Rollback Plan
- Git revert commit (single file change)
- Redeploy previous MaterialProductCard.js
- No API/backend dependencies

---

## Definition of Done

- ✅ SpeedDial component imported from Material-UI
- ✅ Buy_both radio button code removed (lines 373-437)
- ✅ SpeedDial renders conditionally when `product.buy_both === true`
- ✅ "Add to Cart" action adds single variation correctly
- ✅ "Buy Both" action adds both variations correctly
- ✅ Fallback button renders when buy_both is false
- ✅ Component tests validate all rendering paths
- ✅ Visual QA confirms SpeedDial styling
- ✅ No regression in cart functionality
- ✅ Code passes linting checks

---

## Visual Design

### SpeedDial States

**Collapsed State:**
- Circular FAB button with `AddShoppingCart` icon
- Primary theme color
- Positioned bottom-right of card

**Expanded State:**
- Two action buttons revealed above FAB
- Each action shows icon + tooltip on hover
- Actions: "Add to Cart", "Buy Both"

**Theme Integration:**
- Uses `primary.main` for FAB background
- Hover state: `primary.dark`
- Material-UI default animations

---

**Created:** 2025-10-27
**Status:** Ready for Development (after Story 1)
**Previous Story:** Story 1 - Backend Recommendation System
**Next Story:** Story 3 - Frontend SpeedDial for Recommended Products
