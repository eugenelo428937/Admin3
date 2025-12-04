# Restore has_digital Flag Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the `has_digital` cart flag by ensuring `variationId` and `variationName` are passed in the `metadata` property when adding products to cart from `MaterialProductCard`.

**Architecture:** The backend's `_is_digital_product()` method in `cart/views.py` correctly checks `cart_item.metadata.get('variationId')` to detect digital products (eBook, Hub variations). However, `MaterialProductCard.js` passes `variationId` at the top level of `priceInfo` instead of inside `priceInfo.metadata`. Since `cartService.js` expects `priceInfo.metadata`, the variation data never reaches the backend.

**Tech Stack:** React (frontend), Django REST Framework (backend)

---

## Root Cause Analysis

| Component | Expected Behavior | Actual Behavior |
|-----------|-------------------|-----------------|
| `MaterialProductCard.js` | Pass `metadata: { variationId, variationName }` | Passes `variationId`, `variationName` at top level |
| `cartService.js` | Uses `priceInfo.metadata \|\| {}` | Correctly looks for nested metadata |
| `OnlineClassroomProductCard.js` | Pass `metadata: { variationId, ... }` | Works correctly (already has nested metadata) |
| Backend `_is_digital_product()` | Read `metadata.variationId` | Works correctly when metadata is present |

---

## Task 1: Write Failing Test for MaterialProductCard Add to Cart

**Files:**
- Modify: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MaterialProductCard.test.js`

**Step 1: Write the failing test**

Add test to verify metadata structure when adding to cart:

```javascript
describe('Add to Cart metadata structure', () => {
  it('should pass variationId and variationName in metadata object when adding to cart', async () => {
    const mockOnAddToCart = jest.fn();
    const productWithVariations = {
      ...mockProduct,
      variations: [
        {
          id: 123,
          name: 'eBook',
          variation_type: 'eBook',
          prices: [{ price_type: 'standard', amount: '49.99' }]
        },
        {
          id: 124,
          name: 'Printed',
          variation_type: 'Printed',
          prices: [{ price_type: 'standard', amount: '79.99' }]
        }
      ]
    };

    render(
      <ThemeProvider theme={theme}>
        <CartContext.Provider value={{ cartData: null }}>
          <MaterialProductCard
            product={productWithVariations}
            onAddToCart={mockOnAddToCart}
          />
        </CartContext.Provider>
      </ThemeProvider>
    );

    // Find and click the add to cart button
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    await userEvent.click(addToCartButton);

    // Verify onAddToCart was called with correct metadata structure
    expect(mockOnAddToCart).toHaveBeenCalledWith(
      productWithVariations,
      expect.objectContaining({
        priceType: 'standard',
        actualPrice: '49.99',
        metadata: expect.objectContaining({
          variationId: 123,
          variationName: 'eBook'
        })
      })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=MaterialProductCard.test.js --testNamePattern="should pass variationId and variationName in metadata" --watchAll=false`

Expected: FAIL - The test should fail because current implementation passes `variationId` at top level, not inside `metadata`

**Step 3: Commit failing test**

```bash
git add frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MaterialProductCard.test.js
git commit -m "test(cart): add failing test for MaterialProductCard metadata structure

The test verifies that variationId and variationName are passed inside
the metadata object when adding to cart, not at the top level.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Fix MaterialProductCard Standard Add to Cart Button

**Files:**
- Modify: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js:857-880`

**Step 1: Locate the standard add to cart button handler**

The standard button is in the "Tier 3" section (fallback when no SpeedDial needed).

**Step 2: Fix the implementation**

Change from:
```javascript
onClick={() => {
    const priceType = selectedPriceType || "standard";
    if (!currentVariation) return;
    const priceObj = currentVariation.prices?.find(
        (p) => p.price_type === priceType
    );
    onAddToCart(product, {
        variationId: currentVariation.id,
        variationName: currentVariation.name,
        priceType: priceType,
        actualPrice: priceObj?.amount,
    });
}}
```

To:
```javascript
onClick={() => {
    const priceType = selectedPriceType || "standard";
    if (!currentVariation) return;
    const priceObj = currentVariation.prices?.find(
        (p) => p.price_type === priceType
    );
    onAddToCart(product, {
        priceType: priceType,
        actualPrice: priceObj?.amount,
        metadata: {
            variationId: currentVariation.id,
            variationName: currentVariation.name,
            variationType: currentVariation.variation_type,
        },
    });
}}
```

**Step 3: Run test to verify it passes**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=MaterialProductCard.test.js --testNamePattern="should pass variationId and variationName in metadata" --watchAll=false`

Expected: PASS

**Step 4: Commit**

```bash
git add frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js
git commit -m "fix(cart): move variationId to metadata in MaterialProductCard standard button

Fixes the has_digital cart flag by ensuring variationId and variationName
are passed inside the metadata object, not at the top level.

The backend's _is_digital_product() method looks for metadata.variationId
to detect eBook/Hub variations, but the data was being passed at the
wrong nesting level.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Fix MaterialProductCard SpeedDial Add to Cart Action

**Files:**
- Modify: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js:584-601`

**Step 1: Locate the SpeedDial "Add to Cart" action**

This is in the "Tier 1" Buy Both SpeedDial section.

**Step 2: Fix the implementation**

Change from:
```javascript
onClick={() => {
    const priceType = selectedPriceType || "standard";
    if (!currentVariation) return;
    const priceObj = currentVariation.prices?.find(
        (p) => p.price_type === priceType
    );
    if (priceObj) {
        onAddToCart(product, {
            variationId: currentVariation.id,
            variationName: currentVariation.name,
            priceType: priceType,
            actualPrice: priceObj.amount,
        });
    }
    setSpeedDialOpen(false);
}}
```

To:
```javascript
onClick={() => {
    const priceType = selectedPriceType || "standard";
    if (!currentVariation) return;
    const priceObj = currentVariation.prices?.find(
        (p) => p.price_type === priceType
    );
    if (priceObj) {
        onAddToCart(product, {
            priceType: priceType,
            actualPrice: priceObj.amount,
            metadata: {
                variationId: currentVariation.id,
                variationName: currentVariation.name,
                variationType: currentVariation.variation_type,
            },
        });
    }
    setSpeedDialOpen(false);
}}
```

**Step 3: Run tests**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=MaterialProductCard --watchAll=false`

Expected: PASS

**Step 4: Commit**

```bash
git add frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js
git commit -m "fix(cart): move variationId to metadata in SpeedDial add to cart

Updates the SpeedDial 'Add to Cart' action in Buy Both mode to pass
variationId inside metadata object.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Fix MaterialProductCard SpeedDial Buy Both Action

**Files:**
- Modify: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js:631-667`

**Step 1: Locate the SpeedDial "Buy Both" action**

This adds both Printed and eBook variations to cart.

**Step 2: Fix the implementation**

Change from:
```javascript
if (variation1 && variation2 && price1 && price2) {
    // Add first variation
    onAddToCart(product, {
        variationId: variation1.id,
        variationName: variation1.name,
        priceType: priceType,
        actualPrice: price1.amount,
    });

    // Add second variation
    onAddToCart(product, {
        variationId: variation2.id,
        variationName: variation2.name,
        priceType: priceType,
        actualPrice: price2.amount,
    });
}
```

To:
```javascript
if (variation1 && variation2 && price1 && price2) {
    // Add first variation
    onAddToCart(product, {
        priceType: priceType,
        actualPrice: price1.amount,
        metadata: {
            variationId: variation1.id,
            variationName: variation1.name,
            variationType: variation1.variation_type,
        },
    });

    // Add second variation
    onAddToCart(product, {
        priceType: priceType,
        actualPrice: price2.amount,
        metadata: {
            variationId: variation2.id,
            variationName: variation2.name,
            variationType: variation2.variation_type,
        },
    });
}
```

**Step 3: Run tests**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=MaterialProductCard --watchAll=false`

Expected: PASS

**Step 4: Commit**

```bash
git add frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js
git commit -m "fix(cart): move variationId to metadata in Buy Both action

Updates the Buy Both SpeedDial action to pass variationId inside metadata
for both Printed and eBook variations.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Fix MaterialProductCard Recommended Product SpeedDial Actions

**Files:**
- Modify: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js:742-760` (Add to Cart in Tier 2)
- Modify: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js:800-851` (Buy with Recommended)

**Step 1: Fix Tier 2 Add to Cart action**

Change from:
```javascript
onClick={() => {
    const priceType = selectedPriceType || "standard";
    if (!currentVariation) return;
    const priceObj = currentVariation.prices?.find(
        (p) => p.price_type === priceType
    );
    if (priceObj) {
        onAddToCart(product, {
            variationId: currentVariation.id,
            variationName: currentVariation.name,
            priceType: priceType,
            actualPrice: priceObj.amount,
        });
    }
    setSpeedDialOpen(false);
}}
```

To:
```javascript
onClick={() => {
    const priceType = selectedPriceType || "standard";
    if (!currentVariation) return;
    const priceObj = currentVariation.prices?.find(
        (p) => p.price_type === priceType
    );
    if (priceObj) {
        onAddToCart(product, {
            priceType: priceType,
            actualPrice: priceObj.amount,
            metadata: {
                variationId: currentVariation.id,
                variationName: currentVariation.name,
                variationType: currentVariation.variation_type,
            },
        });
    }
    setSpeedDialOpen(false);
}}
```

**Step 2: Fix Buy with Recommended action**

Change from:
```javascript
// Add current variation
const currentPriceObj = currentVariation.prices?.find(
    (p) => p.price_type === priceType
);
if (currentPriceObj) {
    onAddToCart(product, {
        variationId: currentVariation.id,
        variationName: currentVariation.name,
        priceType: priceType,
        actualPrice: currentPriceObj.amount,
    });
}

// Add recommended product
const recommendedPriceObj = recommendedProduct.prices?.find(
    (p) => p.price_type === priceType
);
if (recommendedPriceObj) {
    onAddToCart(
        {
            id: recommendedProduct.essp_id,
            essp_id: recommendedProduct.essp_id,
            product_code: recommendedProduct.product_code,
            product_name: recommendedProduct.product_name,
            product_short_name: recommendedProduct.product_short_name,
            type: "Materials",
        },
        {
            variationId: recommendedProduct.esspv_id,
            variationName: recommendedProduct.variation_type,
            priceType: priceType,
            actualPrice: recommendedPriceObj.amount,
        }
    );
}
```

To:
```javascript
// Add current variation
const currentPriceObj = currentVariation.prices?.find(
    (p) => p.price_type === priceType
);
if (currentPriceObj) {
    onAddToCart(product, {
        priceType: priceType,
        actualPrice: currentPriceObj.amount,
        metadata: {
            variationId: currentVariation.id,
            variationName: currentVariation.name,
            variationType: currentVariation.variation_type,
        },
    });
}

// Add recommended product
const recommendedPriceObj = recommendedProduct.prices?.find(
    (p) => p.price_type === priceType
);
if (recommendedPriceObj) {
    onAddToCart(
        {
            id: recommendedProduct.essp_id,
            essp_id: recommendedProduct.essp_id,
            product_code: recommendedProduct.product_code,
            product_name: recommendedProduct.product_name,
            product_short_name: recommendedProduct.product_short_name,
            type: "Materials",
        },
        {
            priceType: priceType,
            actualPrice: recommendedPriceObj.amount,
            metadata: {
                variationId: recommendedProduct.esspv_id,
                variationName: recommendedProduct.variation_type,
                variationType: recommendedProduct.variation_type,
            },
        }
    );
}
```

**Step 3: Run all MaterialProductCard tests**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=MaterialProductCard --watchAll=false`

Expected: PASS

**Step 4: Commit**

```bash
git add frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js
git commit -m "fix(cart): move variationId to metadata in recommended product actions

Updates all remaining add-to-cart handlers in MaterialProductCard:
- Tier 2 SpeedDial Add to Cart
- Buy with Recommended action (both current and recommended products)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Run Full Test Suite

**Files:** None (verification only)

**Step 1: Run frontend tests**

Run: `cd frontend/react-Admin3 && npm test -- --watchAll=false`

Expected: All tests pass

**Step 2: Run backend tests for cart**

Run: `cd backend/django_Admin3 && python manage.py test cart --keepdb -v 2`

Expected: All tests pass

**Step 3: Commit if needed (should already be committed)**

---

## Task 7: Manual End-to-End Verification

**Files:** None (manual testing)

**Step 1: Start development servers**

```bash
# Terminal 1: Backend
cd backend/django_Admin3 && python manage.py runserver 8888

# Terminal 2: Frontend
cd frontend/react-Admin3 && npm start
```

**Step 2: Test eBook product**

1. Navigate to products page
2. Find a Material product with eBook variation
3. Select "eBook" variation
4. Click "Add to Cart"
5. Open browser DevTools > Network tab
6. Verify the POST request to `/api/cart/add/` contains:
   ```json
   {
     "metadata": {
       "variationId": 123,
       "variationName": "eBook",
       "variationType": "eBook"
     }
   }
   ```

**Step 3: Verify cart response has has_digital flag**

Check the response from `/api/cart/add/`:
```json
{
  "has_digital": true,
  ...
}
```

**Step 4: Test Online Classroom product (should already work)**

Repeat steps 2-3 with an Online Classroom product.

---

## Summary

| Task | Description | Files Modified |
|------|-------------|----------------|
| 1 | Write failing test | `MaterialProductCard.test.js` |
| 2 | Fix standard button | `MaterialProductCard.js` |
| 3 | Fix SpeedDial add to cart | `MaterialProductCard.js` |
| 4 | Fix Buy Both action | `MaterialProductCard.js` |
| 5 | Fix Recommended actions | `MaterialProductCard.js` |
| 6 | Run full test suite | None |
| 7 | Manual verification | None |

Total estimated changes: ~100 lines across 2 files
