# Quickstart Guide - Recommended Products for Marking Product Card

**Feature**: Marking Product Recommendations with SpeedDial
**Branch**: `001-i-have-added`
**Date**: 2025-10-28

---

## Prerequisites

### Development Environment
- ✅ Node.js 16+ and npm installed
- ✅ React 18 development server running (`npm start`)
- ✅ Django backend server running on port 8888
- ✅ PostgreSQL database with `acted_product_productvariation_recommendations` table populated

### Required Files
- ✅ `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js` (exists)
- ✅ `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js` (reference implementation)
- ✅ `backend/django_Admin3/products/models/product_variation_recommendation.py` (exists)

---

## Quick Verification - Does Your Environment Support Recommendations?

### Step 1: Verify Database Has Recommendation Data

```bash
# From backend/django_Admin3/
python manage.py shell
```

```python
from products.models import ProductVariationRecommendation

# Check if recommendations exist
count = ProductVariationRecommendation.objects.count()
print(f"Recommendation count: {count}")

# View sample recommendations
recommendations = ProductVariationRecommendation.objects.all()[:5]
for rec in recommendations:
    print(rec)
```

**Expected Output**:
```
Recommendation count: 15
Mock Exam eBook → Mock Exam Marking Service
CB1 Materials Printed → CB1 Mock Exam Marking
...
```

**If count is 0**: User stated they added recommendations, so this should not happen. Contact user if no data found.

---

### Step 2: Verify API Returns Recommendations

```bash
# Navigate to frontend directory
cd frontend/react-Admin3

# Start dev server if not running
npm start
```

Open browser console and inspect network requests to `/api/products/`:

**Check Response** (look for marking products):
```json
{
  "variations": [
    {
      "id": 1,
      "recommended_product": {
        "essp_id": 202,
        "product_code": "MAT001",
        "product_name": "Mock Exam eBook",
        "prices": [...]
      }
    }
  ]
}
```

**Expected**: `recommended_product` field present and non-null for marking products with recommendations.

---

## Manual Testing Workflow

### Test 1: Verify SpeedDial Renders (After Implementation)

**Prerequisites**: Implementation complete, tests passing

**Steps**:
1. Navigate to `/products` page
2. Filter for marking products (type: "Marking")
3. Find a product with recommendations (check database first)
4. Locate the product card

**Expected Result**:
- ✅ SpeedDial FAB button visible in bottom-right corner of card
- ✅ NO standard "Add to Cart" button (replaced by SpeedDial)
- ✅ Button has blue background (`theme.palette.bpp.sky["060"]`)

**Screenshot Checkpoint**: SpeedDial FAB button visible on marking product card

---

### Test 2: Open SpeedDial and View Actions

**Steps**:
1. Click the SpeedDial FAB button
2. Observe animation and action buttons

**Expected Result**:
- ✅ SpeedDial opens with smooth animation
- ✅ Two action buttons appear:
  1. "Buy Marking Only"
  2. "Buy with [Recommended Product Short Name]"
- ✅ Tooltips appear on hover
- ✅ Both actions have white icons on blue backgrounds

**Screenshot Checkpoint**: SpeedDial open with two visible actions

---

### Test 3: Purchase Marking Product Only

**Steps**:
1. Open SpeedDial (from Test 2)
2. Click "Buy Marking Only" action
3. Open shopping cart

**Expected Result**:
- ✅ SpeedDial closes immediately
- ✅ Cart shows ONE new item: Marking product
- ✅ Price matches selected discount (if any: retaker/additional)
- ✅ NO recommended product added to cart

**Verification**:
```javascript
// In browser console
console.log(cart.items.length); // Should increase by 1
console.log(cart.items[cart.items.length - 1].product_name); // Should be marking product
```

---

### Test 4: Purchase Marking Product + Recommended Product

**Steps**:
1. Clear cart (start fresh)
2. Select "Retaker" discount option (if available)
3. Open SpeedDial
4. Click "Buy with [Recommended Product]" action
5. Open shopping cart

**Expected Result**:
- ✅ SpeedDial closes immediately
- ✅ Cart shows TWO new items:
  1. Marking product with "retaker" price
  2. Recommended product with "standard" price
- ✅ Total price = marking (retaker) + recommended (standard)

**Verification**:
```javascript
// In browser console
console.log(cart.items.length); // Should increase by 2
console.log(cart.items[cart.items.length - 2].price_type); // "retaker"
console.log(cart.items[cart.items.length - 1].price_type); // "standard"
```

---

### Test 5: SpeedDial Disabled When All Deadlines Expired

**Setup**: Find a marking product with all expired deadlines (or modify deadlines in database for testing)

**Steps**:
1. Navigate to marking product card with all deadlines expired
2. Verify "All deadlines expired" alert is visible
3. Locate SpeedDial FAB button

**Expected Result**:
- ✅ SpeedDial FAB button is visible
- ✅ SpeedDial FAB button is DISABLED (greyed out, no cursor pointer)
- ✅ Cannot click SpeedDial (no action on click)
- ✅ Alert states "All deadlines expired"

---

### Test 6: No SpeedDial for Products Without Recommendations

**Steps**:
1. Find a marking product WITHOUT `recommended_product` in database
2. Navigate to that product card

**Expected Result**:
- ✅ NO SpeedDial FAB button visible
- ✅ Standard circular "Add to Cart" button rendered (existing Tier 3 behavior)
- ✅ Product card functions normally (deadlines, pricing, etc.)

---

### Test 7: Discount Selection Affects Only Marking Product

**Steps**:
1. Select a marking product with recommendations
2. Select "Retaker" discount option
3. Verify price display updates to retaker price
4. Open SpeedDial
5. Click "Buy with Recommended"
6. Inspect cart items

**Expected Result**:
- ✅ Marking product in cart has "retaker" price type
- ✅ Recommended product in cart has "standard" price type (NOT retaker)
- ✅ Discount ONLY applied to marking product

---

### Test 8: Accessibility - Keyboard Navigation

**Steps**:
1. Use Tab key to navigate to SpeedDial FAB
2. Press Enter or Space to open SpeedDial
3. Use Arrow keys to navigate between actions
4. Press Enter to select an action
5. Press Escape to close SpeedDial

**Expected Result**:
- ✅ Tab focuses SpeedDial FAB (visible focus indicator)
- ✅ Enter/Space opens SpeedDial
- ✅ Arrow keys navigate actions (focus moves)
- ✅ Enter selects focused action (purchase executes)
- ✅ Escape closes SpeedDial (focus returns to FAB)

---

### Test 9: Accessibility - Screen Reader

**Tools**: macOS VoiceOver, NVDA (Windows), or ChromeVox

**Steps**:
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

---

### Test 10: Mobile Responsive Behavior

**Viewport**: 375px × 667px (iPhone SE)

**Steps**:
1. Resize browser to mobile viewport
2. Navigate to marking product card
3. Click SpeedDial FAB (touch target)
4. Select action

**Expected Result**:
- ✅ SpeedDial FAB is at least 44px × 44px (touch target minimum)
- ✅ Actions are readable and touchable
- ✅ No layout overflow or horizontal scroll
- ✅ SpeedDial animations smooth (60fps)

---

## Automated Testing Workflow

### Run Unit Tests

```bash
# From frontend/react-Admin3/
npm test -- MarkingProductCard.recommendations.test.js
```

**Expected Output**:
```
PASS  src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js
  MarkingProductCard - Recommended Products with SpeedDial
    ✓ should render SpeedDial when recommended_product exists (45ms)
    ✓ should NOT render SpeedDial when recommended_product is null (32ms)
    ✓ should open SpeedDial on FAB click (58ms)
    ✓ should call onAddToCart once for "Buy Marking Only" (67ms)
    ✓ should call onAddToCart twice for "Buy with Recommended" (89ms)
    ✓ should use selected discount for marking product (54ms)
    ✓ should always use standard price for recommended product (62ms)
    ✓ should disable SpeedDial when all deadlines expired (41ms)
    ... (14 tests total)

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Time:        2.345s
```

---

### Run Coverage Report

```bash
npm test -- MarkingProductCard.recommendations.test.js --coverage --watchAll=false
```

**Expected Coverage** (minimum thresholds):
```
File                          | Statements | Branches | Functions | Lines |
------------------------------|------------|----------|-----------|-------|
MarkingProductCard.js         |     85.2%  |   78.3%  |   90.1%   | 85.2% |
```

**Threshold**: 80% minimum coverage for new code

---

## Integration Testing Workflow

### Test with Real Backend Data

**Prerequisites**: Backend running, database populated

**Steps**:
1. Start backend: `python manage.py runserver 8888`
2. Start frontend: `npm start`
3. Navigate to `/products?subject_code=CB1&product_type=Marking`
4. Verify real marking products display SpeedDial
5. Purchase marking product + recommended product
6. Check Django admin for order items

**Expected Result**:
- ✅ Order contains 2 items (marking + recommended)
- ✅ Prices match expected values
- ✅ Price types correct (marking: selected, recommended: standard)

---

## Rollback Procedure

### If Feature Breaks Production

**Quick Rollback** (5 minutes):
```bash
# From repository root
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

## Troubleshooting

### Issue 1: SpeedDial Not Rendering

**Symptoms**: Marking products show standard button, no SpeedDial

**Checks**:
1. Verify `recommended_product` in API response (browser network tab)
2. Check `currentVariation` has `recommended_product` (React DevTools)
3. Validate `recommended_product.prices` is non-empty
4. Ensure "standard" price type exists in `prices` array

**Solution**: If `recommended_product` is null, backend serializer may not be including it. Check product variation relationships.

---

### Issue 2: Recommended Product Not Added to Cart

**Symptoms**: Only marking product added when "Buy with Recommended" clicked

**Checks**:
1. Verify `onAddToCart` called twice (add `console.log` in callback)
2. Check `recommendedProduct.prices` has valid data
3. Inspect cart state after action (React DevTools)

**Solution**: Ensure both `onAddToCart` calls execute sequentially. Check for early returns or exceptions.

---

### Issue 3: Incorrect Price Types

**Symptoms**: Recommended product has "retaker" price instead of "standard"

**Checks**:
1. Verify recommended product `priceType = "standard"` in code
2. Check `getPrice()` function logic
3. Inspect cart item metadata

**Solution**: Ensure recommended product always uses `"standard"` price type (hardcoded, NOT user-selected).

---

### Issue 4: SpeedDial Not Disabled When Deadlines Expired

**Symptoms**: Can click SpeedDial when all deadlines expired

**Checks**:
1. Verify `allExpired` boolean is `true` (React DevTools)
2. Check `disabled` prop on SpeedDial component
3. Inspect deadline data structure

**Solution**: Ensure `disabled` prop includes `allExpired` condition.

---

## Success Criteria Checklist

### Functionality
- [ ] SpeedDial renders for marking products with recommendations
- [ ] SpeedDial does NOT render for products without recommendations
- [ ] "Buy Marking Only" adds 1 item to cart
- [ ] "Buy with Recommended" adds 2 items to cart
- [ ] Discount selection affects marking product only
- [ ] Recommended product always uses "standard" price
- [ ] SpeedDial disabled when all deadlines expired
- [ ] All existing marking product features preserved (deadlines, pricing, modals)

### Testing
- [ ] 14 unit tests pass (MarkingProductCard.recommendations.test.js)
- [ ] Test coverage ≥ 80% for new code
- [ ] Manual testing completed (10 test cases above)
- [ ] Integration testing with real backend data

### Accessibility
- [ ] ARIA labels present on SpeedDial and actions
- [ ] Keyboard navigation works (Tab, Enter, Arrow keys, Escape)
- [ ] Screen reader announces all interactive elements
- [ ] Touch targets ≥ 44px × 44px on mobile

### Performance
- [ ] Component render time < 200ms
- [ ] SpeedDial animations run at 60fps
- [ ] No console errors or warnings
- [ ] No layout reflow during animations

### User Experience
- [ ] Visual consistency with MaterialProductCard SpeedDial
- [ ] Smooth animations (open/close)
- [ ] Clear tooltips with product names
- [ ] Responsive behavior on mobile viewports

---

## Quickstart Complete

✅ **Prerequisites verified**
✅ **Manual testing workflow defined** (10 test cases)
✅ **Automated testing workflow defined** (14 unit tests)
✅ **Integration testing workflow defined**
✅ **Troubleshooting guide provided**
✅ **Success criteria checklist provided**

**Estimated Testing Time**: 45-60 minutes (manual + automated)
**Rollback Time**: 5 minutes (if needed)
**Risk Level**: LOW (proven pattern, isolated changes)

---

**Next Step**: Run `/tasks` to generate implementation task list
