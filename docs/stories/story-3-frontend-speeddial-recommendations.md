# Story 3: Frontend SpeedDial for Recommended Products

**Epic:** Material Product Card SpeedDial Enhancements
**Type:** Brownfield Addition
**Priority:** High
**Dependencies:** Story 1 (Backend API must return recommended_product data)
**Estimated Effort:** 2-3 hours
**Story Points:** 3

---

## User Story

**As a** customer shopping for exam materials,
**I want** to see and easily purchase recommended complementary products (like marking services for mock exams),
**So that** I can enhance my study experience with relevant add-ons without searching separately.

---

## Story Context

### Existing System Integration

- **Integrates with:** MaterialProductCard component (extends Story 2 SpeedDial pattern), API recommendation data from Story 1
- **Technology:** React 18, Material-UI v5 SpeedDial, existing cart handlers
- **Follows pattern:** Conditional SpeedDial rendering (established in Story 2), price extraction, cart metadata structure
- **Touch points:**
  - API response: `variation.recommended_product` nested object
  - SpeedDial rendering: Add third conditional path (after buy_both, before standard button)
  - Cart additions: Add recommended product using same metadata structure

---

## Acceptance Criteria

### Functional Requirements

**1. Check for Recommendations**

When rendering "Add to Cart" button/SpeedDial:
- Check if `currentVariation.recommended_product` exists in API response
- If exists AND `product.buy_both === false`: Render SpeedDial for recommendations
- If not exists OR `product.buy_both === true`: Use existing rendering logic (Story 2)

**2. SpeedDial Actions for Recommendations**

- **Action 1:** "Add to Cart" - Adds currently selected variation only
- **Action 2:** "Buy with {product_short_name} ({standard_price})" - Adds both primary and recommended products
- Dynamic label uses `recommended_product.product_short_name` and standard price formatted with `formatPrice()`
- Example: "Buy with Mock Exam Marking (£73)"

**3. Add Recommended Product to Cart**

"Buy with Recommended" action triggers two sequential cart additions:
1. Add currently selected variation (primary product)
2. Add recommended product using `recommended_product.essp_id`, `recommended_product.esspv_id`, prices, etc.

Both additions use standard cart metadata structure. Price defaults to "standard" type for both products.

### Integration Requirements

4. **Existing buy_both SpeedDial** takes precedence (if `buy_both === true`, don't check recommendations)
5. **Fallback to standard button** when no buy_both AND no recommendation exists
6. **Cart metadata structure** preserved for both primary and recommended product additions

### Quality Requirements

7. **Tests cover:**
   - SpeedDial renders when `recommended_product` exists
   - Standard button renders when no recommendation
   - Action adds both products with correct metadata
   - Edge cases: missing standard price (falls back to first price), null recommendation, empty prices array

8. **Error handling:**
   - Gracefully handle missing standard price in recommended product
   - Validate `recommended_product` structure before rendering SpeedDial
   - Log warnings for malformed recommendation data

9. **No regression:** All existing rendering paths (buy_both SpeedDial, standard button) continue to work

---

## Technical Implementation

### Files to Modify

**File:** `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`

### Three-Tier Conditional Rendering Logic

Replace the conditional button/SpeedDial section (from Story 2) with:

```javascript
{/* Three-tier conditional rendering: buy_both SpeedDial, recommendation SpeedDial, or standard button */}
{product.buy_both && product.variations?.length >= 2 ? (
    // STORY 2: Buy Both SpeedDial (unchanged from Story 2)
    <SpeedDial ariaLabel="Product purchase options">
        {/* Buy Both actions from Story 2 */}
    </SpeedDial>
) : currentVariation?.recommended_product ? (
    // STORY 3: Recommendation SpeedDial (NEW)
    <SpeedDial
        ariaLabel="Product purchase options with recommendation"
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
                    producttype: product.type,
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

        {/* Action 2: Buy with Recommended Product */}
        <SpeedDialAction
            icon={<AddShoppingCart />}
            tooltipTitle={(() => {
                const recommendedProduct = currentVariation.recommended_product;
                if (!recommendedProduct) return "Buy with Recommended";

                // Extract standard price or fallback to first price
                const standardPrice = recommendedProduct.prices?.find(
                    p => p.price_type === "standard"
                );
                const price = standardPrice || recommendedProduct.prices?.[0];
                const priceDisplay = price ? formatPrice(price.amount) : "";

                return `Buy with ${recommendedProduct.product_short_name} (${priceDisplay})`;
            })()}
            onClick={() => {
                const priceType = selectedPriceType || "standard";
                const recommendedProduct = currentVariation.recommended_product;

                if (!currentVariation || !recommendedProduct) return;

                // Add primary variation
                const primaryPriceObj = currentVariation.prices?.find(
                    (p) => p.price_type === priceType
                );
                const primaryMetadata = {
                    type: "material",
                    producttype: product.type,
                    variationId: currentVariation.id,
                    variationName: currentVariation.name,
                    variationType: currentVariation.variation_type,
                    subjectCode: product.subject_code,
                    productName: product.product_name,
                };
                if (currentVariation.variation_type === "eBook") {
                    primaryMetadata.is_digital = true;
                }

                onAddToCart(product, {
                    variationId: currentVariation.id,
                    variationName: currentVariation.name,
                    priceType: priceType,
                    actualPrice: primaryPriceObj?.amount,
                    metadata: primaryMetadata,
                });

                // Add recommended product
                const recommendedPriceObj = recommendedProduct.prices?.find(
                    p => p.price_type === priceType
                ) || recommendedProduct.prices?.[0]; // Fallback to first price

                if (recommendedPriceObj) {
                    const recommendedMetadata = {
                        type: "material",
                        producttype: product.type,
                        variationId: recommendedProduct.esspv_id,
                        variationName: recommendedProduct.product_short_name,
                        variationType: recommendedProduct.variation_type,
                        subjectCode: product.subject_code,
                        productName: recommendedProduct.product_name,
                    };
                    if (recommendedProduct.variation_type === "eBook") {
                        recommendedMetadata.is_digital = true;
                    }

                    // Create pseudo-product object for recommended product
                    const recommendedProductObj = {
                        id: recommendedProduct.essp_id,
                        essp_id: recommendedProduct.essp_id,
                        product_code: recommendedProduct.product_code,
                        product_name: recommendedProduct.product_name,
                        subject_code: product.subject_code,
                        type: product.type,
                    };

                    onAddToCart(recommendedProductObj, {
                        variationId: recommendedProduct.esspv_id,
                        variationName: recommendedProduct.product_short_name,
                        priceType: priceType,
                        actualPrice: recommendedPriceObj.amount,
                        metadata: recommendedMetadata,
                    });
                }
            }}
        />
    </SpeedDial>
) : (
    // FALLBACK: Standard Add to Cart Button
    <Button
        variant="contained"
        className="add-to-cart-button"
        onClick={() => {
            // Existing single variation add-to-cart logic
        }}
        disabled={!currentVariation}
    >
        <AddShoppingCart />
    </Button>
)}
```

### Optional: Add Validation Helper

```javascript
// Add near top of component
const validateRecommendation = useCallback((recommendation) => {
    if (!recommendation) return false;
    if (!recommendation.essp_id || !recommendation.esspv_id) {
        console.warn('Invalid recommendation: missing essp_id or esspv_id', recommendation);
        return false;
    }
    if (!recommendation.prices || recommendation.prices.length === 0) {
        console.warn('Invalid recommendation: missing prices', recommendation);
        return false;
    }
    return true;
}, []);

// Use in conditional:
// currentVariation?.recommended_product && validateRecommendation(currentVariation.recommended_product)
```

---

## Testing Requirements

### Component Tests

**File:** `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MaterialProductCard.recommendation.test.js`

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MaterialProductCard from '../MaterialProductCard';
import { CartProvider } from '../../../../contexts/CartContext';

const mockProductWithRecommendation = {
    id: 1,
    essp_id: 2633,
    product_name: 'Mock Exam',
    subject_code: 'CB1',
    buy_both: false,
    variations: [
        {
            id: 289,
            name: 'eBook',
            variation_type: 'eBook',
            prices: [{ id: 1, price_type: 'standard', amount: 16 }],
            recommended_product: {
                essp_id: 2740,
                esspv_id: 390,
                product_code: 'M1',
                product_name: 'Mock Exam Marking',
                product_short_name: 'Mock Exam Marking',
                variation_type: 'Marking',
                prices: [{ id: 2, price_type: 'standard', amount: 73 }],
            },
        },
    ],
};

describe('MaterialProductCard Recommendation SpeedDial', () => {
    test('renders SpeedDial when variation has recommended_product', () => {
        const mockAddToCart = jest.fn();
        render(
            <CartProvider>
                <MaterialProductCard product={mockProductWithRecommendation} onAddToCart={mockAddToCart} />
            </CartProvider>
        );

        expect(screen.getByLabelText('Product purchase options with recommendation')).toBeInTheDocument();
    });

    test('SpeedDial action shows correct label with recommended product name and price', async () => {
        const mockAddToCart = jest.fn();
        render(
            <CartProvider>
                <MaterialProductCard product={mockProductWithRecommendation} onAddToCart={mockAddToCart} />
            </CartProvider>
        );

        const speedDial = screen.getByLabelText('Product purchase options with recommendation');
        fireEvent.click(speedDial);

        await waitFor(() => {
            expect(screen.getByText(/Buy with Mock Exam Marking \(£73\)/)).toBeInTheDocument();
        });
    });

    test('"Buy with Recommended" action adds both products to cart', async () => {
        const mockAddToCart = jest.fn();
        render(
            <CartProvider>
                <MaterialProductCard product={mockProductWithRecommendation} onAddToCart={mockAddToCart} />
            </CartProvider>
        );

        const speedDial = screen.getByLabelText('Product purchase options with recommendation');
        fireEvent.click(speedDial);

        const buyWithAction = await screen.findByText(/Buy with Mock Exam Marking/);
        fireEvent.click(buyWithAction);

        expect(mockAddToCart).toHaveBeenCalledTimes(2);
        // First call: primary product
        expect(mockAddToCart).toHaveBeenNthCalledWith(1, expect.objectContaining({
            essp_id: 2633,
        }), expect.any(Object));
        // Second call: recommended product
        expect(mockAddToCart).toHaveBeenNthCalledWith(2, expect.objectContaining({
            essp_id: 2740,
        }), expect.any(Object));
    });

    test('renders standard button when no recommendation exists', () => {
        const productNoRecommendation = {
            ...mockProductWithRecommendation,
            variations: [{
                ...mockProductWithRecommendation.variations[0],
                recommended_product: null,
            }],
        };
        const mockAddToCart = jest.fn();
        render(
            <CartProvider>
                <MaterialProductCard product={productNoRecommendation} onAddToCart={mockAddToCart} />
            </CartProvider>
        );

        expect(screen.queryByLabelText('Product purchase options with recommendation')).not.toBeInTheDocument();
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('handles missing standard price gracefully (falls back to first price)', async () => {
        const productMissingStandardPrice = {
            ...mockProductWithRecommendation,
            variations: [{
                ...mockProductWithRecommendation.variations[0],
                recommended_product: {
                    ...mockProductWithRecommendation.variations[0].recommended_product,
                    prices: [{ id: 2, price_type: 'retaker', amount: 60 }],
                },
            }],
        };
        const mockAddToCart = jest.fn();
        render(
            <CartProvider>
                <MaterialProductCard product={productMissingStandardPrice} onAddToCart={mockAddToCart} />
            </CartProvider>
        );

        const speedDial = screen.getByLabelText('Product purchase options with recommendation');
        fireEvent.click(speedDial);

        await waitFor(() => {
            expect(screen.getByText(/Buy with Mock Exam Marking \(£60\)/)).toBeInTheDocument();
        });
    });

    test('buy_both SpeedDial takes precedence over recommendation', () => {
        const productWithBoth = {
            ...mockProductWithRecommendation,
            buy_both: true,
            variations: [
                mockProductWithRecommendation.variations[0],
                { id: 2, name: 'Printed', variation_type: 'Printed', prices: [] },
            ],
        };
        const mockAddToCart = jest.fn();
        render(
            <CartProvider>
                <MaterialProductCard product={productWithBoth} onAddToCart={mockAddToCart} />
            </CartProvider>
        );

        // Should render buy_both SpeedDial, not recommendation SpeedDial
        expect(screen.getByLabelText('Product purchase options')).toBeInTheDocument();
        expect(screen.queryByLabelText('Product purchase options with recommendation')).not.toBeInTheDocument();
    });
});
```

---

## Risk Mitigation

### Primary Risk
Malformed `recommended_product` data from API causes rendering errors

### Mitigation Strategy
- Defensive null checks before accessing nested properties
- Validate `recommended_product` structure (has required fields)
- Fallback to standard button if validation fails
- Try-catch around recommendation data access
- Unit tests for malformed data scenarios

### Rollback Plan
- Git revert commit (single file change)
- Redeploy previous MaterialProductCard.js
- Backend API can continue returning `recommended_product` (frontend won't use it)

---

## Definition of Done

- ✅ Conditional logic checks `currentVariation.recommended_product`
- ✅ SpeedDial renders with dynamic "Buy with {Product} ({Price})" label
- ✅ "Buy with Recommended" action adds both products correctly
- ✅ Standard price extraction with fallback to first price
- ✅ Fallback to standard button when no recommendation
- ✅ Component tests validate recommendation rendering paths
- ✅ Edge case tests: missing price, null recommendation, malformed data
- ✅ Manual QA confirms correct cart additions
- ✅ No regression in Story 2 buy_both SpeedDial
- ✅ Code passes linting checks

---

## Conditional Rendering Decision Tree

```
┌─────────────────────────────────────────┐
│  MaterialProductCard Render Decision    │
└───────────────┬─────────────────────────┘
                │
                ▼
      ┌─────────────────────┐
      │ product.buy_both?   │
      │ variations >= 2?    │
      └────┬───────────┬────┘
           │           │
         YES           NO
           │           │
           ▼           ▼
   ┌──────────────┐  ┌────────────────────────┐
   │ Buy Both     │  │ currentVariation        │
   │ SpeedDial    │  │ .recommended_product?   │
   │ (Story 2)    │  └────┬──────────────┬────┘
   └──────────────┘       │              │
                        YES             NO
                          │              │
                          ▼              ▼
                  ┌──────────────┐  ┌──────────────┐
                  │ Recommendation│  │ Standard     │
                  │ SpeedDial     │  │ Button       │
                  │ (Story 3)     │  │ (Fallback)   │
                  └──────────────┘  └──────────────┘
```

---

## Example Scenarios

### Scenario 1: Mock Exam eBook with Marking Recommendation
- **Product:** Mock Exam eBook (£16)
- **Recommended:** Mock Exam Marking (£73)
- **Display:** SpeedDial with "Buy with Mock Exam Marking (£73)"
- **Result:** Both products added to cart (total £89)

### Scenario 2: Study Material with Buy Both
- **Product:** Study Material (eBook + Printed)
- **Buy Both:** true
- **Display:** Buy Both SpeedDial (Story 2 takes precedence)
- **Result:** Recommendation ignored, buy_both behavior active

### Scenario 3: Product without Recommendation
- **Product:** Tutorial Session
- **Recommended:** null
- **Display:** Standard "Add to Cart" button
- **Result:** Single product added as normal

---

**Created:** 2025-10-27
**Status:** Ready for Development (after Story 1 & 2)
**Previous Story:** Story 2 - Frontend SpeedDial for Buy Both
**Epic:** Material Product Card SpeedDial Enhancements
