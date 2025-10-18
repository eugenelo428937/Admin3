# Hardcoded VAT Audit - Phase 8

**Date:** 2025-10-16
**Status:** Audit Complete

## Summary

Comprehensive audit of frontend code to identify hardcoded VAT logic. Most components are already using dynamic VAT data from the API, but `vatUtils.js` contains hardcoded VAT rates and frontend calculation logic that must be removed.

---

## Files with Hardcoded VAT Logic

### ❌ REQUIRES ACTION: `src/utils/vatUtils.js`

**Issue:** Contains hardcoded VAT rates and frontend VAT calculation logic

**Lines 55-77: Hardcoded `getVatRate()` function**
```javascript
export const getVatRate = (region, productCode = '') => {
  // ...hardcoded logic...
  const standardRates = {
    'UK': 0.20,    // 20% ❌ HARDCODED
    'SA': 0.15,    // 15% ❌ HARDCODED
    'EU': 0.00,    // Zero-rated for EU customers ❌ HARDCODED
    'ROW': 0.00    // Zero-rated for ROW customers ❌ HARDCODED
  };
  return standardRates[region] || 0.00;
};
```

**Lines 85-97: Frontend VAT calculation**
```javascript
export const calculateVat = (netAmount, vatRate) => {
  // ❌ Frontend VAT calculation - should use backend API
  const net = parseFloat(netAmount) || 0;
  const rate = parseFloat(vatRate) || 0;
  const vatAmount = net * rate;
  const grossAmount = net + vatAmount;
  // ...
};
```

**Action Required:**
- ❌ Remove `getVatRate()` function (lines 55-77)
- ❌ Remove `calculateVat()` function (lines 85-97)
- ✅ Keep `formatVatLabel()` - Used for formatting only
- ✅ Keep `getVatStatusDisplay()` - Used for display text mapping
- ✅ Keep `formatPrice()` - Currency formatting only

**Used By:**
- `src/components/Product/ProductCard/MaterialProductCard.js` (lines 289, 290)

---

### ✅ CORRECT: Product Card Components

These components are already using dynamic VAT data from the API:

#### `src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
- **Line 700:** `product.vat_status_display || "Price includes VAT"` ✅ Dynamic with fallback
- **Line 847:** `product.vat_status_display || "Prices include VAT"` ✅ Dynamic with fallback
- **Status:** Already correct - uses API data

#### `src/components/Product/ProductCard/MaterialProductCard.js`
- **Line 581:** `product.vat_status_display || "Price includes VAT"` ✅ Dynamic with fallback
- **Lines 289-290:** Uses `getVatRate()` and `calculateVat()` ❌ Needs update to use API data
- **Status:** Partially correct - needs to remove `getVatRate()` and `calculateVat()` usage

#### Other Product Cards
- `OnlineClassroomProductCard.js` - Uses `product.vat_status_display` ✅
- `MarkingProductCard.js` - Uses `product.vat_status_display` ✅
- `BundleCard.js` - Uses `product.vat_status_display` ✅

---

### ✅ CORRECT: Cart Components

#### `src/components/Cart/CartVATDisplay.js`
- **Status:** ✅ Correct - Uses dynamic props
- Component accepts `vatAmount`, `vatRate`, `vatRegion` as props
- No hardcoded VAT logic

#### `src/components/Ordering/CheckoutSteps/CartSummaryPanel.js`
- **Status:** ✅ Mostly correct - Uses `vatCalculations` from API
- **Lines 91-98:** TODO comment for Phase 8 VATBreakdown component
- No hardcoded VAT display currently
- Needs VATBreakdown component for detailed VAT display

---

## Files Checked (No Issues)

### Test Files (Hardcoded values for testing - EXPECTED)
- `src/components/Ordering/__tests__/CheckoutSteps.integration.test.js` ✅
- `src/components/Ordering/CheckoutSteps/__tests__/CartSummaryPanel.test.js` ✅
- `src/components/Ordering/CheckoutSteps/__tests__/CartReviewStep.test.js` ✅
- `src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js` ✅

### Style Guide Components (Demo/Prototype - Not Production)
- `src/components/styleguide/ProductCards/*.js` - Style guide components only

---

## Action Items

### Priority 1: Remove Frontend VAT Calculation Logic
- [ ] **TASK-802:** Update `vatUtils.js` - Remove hardcoded `getVatRate()` and `calculateVat()`
- [ ] **TASK-803:** Update `MaterialProductCard.js` - Remove usage of `getVatRate()` and `calculateVat()`

### Priority 2: Update Cart Components
- [ ] **TASK-803:** Update `CartSummaryPanel.js` - Implement VATBreakdown component
- [ ] **TASK-804:** Update `CartReviewStep.js` - Verify uses dynamic VAT

### Priority 3: Update Product Cards (Already Mostly Correct)
- [ ] **TASK-805:** Verify `TutorialProductCard.js` - Already correct
- [ ] Verify other product cards - Already correct

---

## Search Patterns Used

```bash
# Search for hardcoded "VAT (20%)"
grep -r "VAT \(20%\)" src/

# Search for hardcoded "Price includes VAT"
grep -r "Price includes VAT" src/

# Search for hardcoded VAT rates
grep -r "0.20" src/ | grep -i vat
grep -r "20%" src/ | grep -i vat
```

---

## Key Findings Summary

✅ **Good News:**
- Most product cards already use `product.vat_status_display` from API
- Cart components already use `vatCalculations` from API
- Only 1 file (`vatUtils.js`) has hardcoded VAT logic

❌ **Action Required:**
- Remove hardcoded VAT rates from `vatUtils.js`
- Remove frontend VAT calculation from `vatUtils.js`
- Update `MaterialProductCard.js` to stop using hardcoded functions

---

## Next Steps

1. Proceed with **TASK-802**: Update `vatUtils.js` (remove hardcoded functions)
2. Proceed with **TASK-803**: Update cart components
3. Run regression tests to ensure no hardcoded VAT remains

---

*Audit completed by Claude Code - Phase 8 VAT Frontend Cleanup*
