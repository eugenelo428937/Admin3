# Price Type Implementation Testing Guide

## Overview
This guide provides step-by-step instructions to test the complete price type functionality we've implemented.

## Prerequisites
- ✅ Django backend running on port 8888
- ✅ React frontend running on port 3000
- ✅ Application accessible at http://127.0.0.1:3000

## Test Scenarios

### 1. Product Browsing and Price Type Selection

#### Test 1.1: Browse Products
1. Navigate to http://127.0.0.1:3000
2. Browse through the product catalog
3. Look for products that have "Discounts" section
4. Click on the "Discounts ▶" link to expand price options

#### Test 1.2: Price Type Options
1. For products with expanded discounts:
   - [ ] Check if "Retaker" checkbox is available (when applicable)
   - [ ] Check if "Additional Copy" checkbox is available (when applicable)
   - [ ] Verify disabled checkboxes are grayed out (for unavailable price types)
   - [ ] Verify price updates when selecting different price types

#### Test 1.3: Price Information Modal
1. Click the blue "ℹ️" icon next to prices
2. Verify a modal opens showing all available price types and variations
3. Check that the table shows:
   - Variation names
   - Price types (standard, retaker, additional)
   - Actual prices for each combination

### 2. Add to Cart Functionality

#### Test 2.1: Add Standard Price Items
1. Select a product with standard pricing
2. Choose appropriate variation (if applicable)
3. Click "Add to Cart" button
4. Verify item appears in cart with standard pricing

#### Test 2.2: Add Retaker Price Items
1. Select a product that supports retaker pricing
2. Expand "Discounts" and check "Retaker"
3. Verify price changes in the display
4. Click "Add to Cart" button
5. Verify item appears in cart

#### Test 2.3: Add Additional Copy Items
1. Select a product that supports additional copy pricing
2. Expand "Discounts" and check "Additional Copy"
3. Verify price changes in the display
4. Click "Add to Cart" button
5. Verify item appears in cart

#### Test 2.4: Multiple Price Types for Same Product
1. Add the same product with standard price
2. Add the same product with retaker price
3. Add the same product with additional copy price
4. Verify they appear as separate items in cart

### 3. Cart Panel Testing

#### Test 3.1: Price Type Badges
Open the cart panel and verify:
- [ ] Standard price items show NO badge
- [ ] Retaker items show "Retaker" badge with blue background
- [ ] Additional copy items show "Additional Copy" badge with blue background

#### Test 3.2: Actual Price Display
For non-standard price items:
- [ ] Verify actual price is displayed in green
- [ ] Verify format is "£XX.XX"
- [ ] Verify price matches the selected price type

#### Test 3.3: Cart Operations
- [ ] Verify removing items works correctly
- [ ] Verify clearing cart removes all items
- [ ] Verify cart totals are calculated correctly

### 4. Checkout Process Testing

#### Test 4.1: Checkout Page Display
1. Add items with different price types to cart
2. Click "Proceed to Checkout"
3. Verify checkout page shows:
   - [ ] Price type badges for non-standard items
   - [ ] Actual prices in green for discounted items
   - [ ] Correct total calculations

#### Test 4.2: Complete Checkout
1. Fill in required checkout information
2. Complete the checkout process
3. Verify order is created successfully
4. Note the order ID for order history testing

### 5. Order History Testing

#### Test 5.1: View Order History
1. Navigate to order history page
2. Find the order created in previous test
3. Verify order history displays:
   - [ ] Price type badges for non-standard items
   - [ ] Actual prices for all items
   - [ ] Correct order totals

#### Test 5.2: Historical Orders
1. Check other existing orders in history
2. Verify price information is displayed correctly
3. Verify orders without price type info still display properly

### 6. Admin Interface Testing

#### Test 6.1: Django Admin Access
1. Navigate to http://127.0.0.1:8888/admin/
2. Log in with admin credentials
3. Look for "Acted Orders" and "Acted Order Items" sections

#### Test 6.2: Order Verification
1. Find the order created during testing
2. Verify order details show:
   - [ ] Price type information
   - [ ] Actual price information
   - [ ] Correct total calculations

### 7. Edge Cases and Error Handling

#### Test 7.1: Unavailable Price Types
1. Try products that don't support certain price types
2. Verify:
   - [ ] Checkboxes are disabled for unavailable types
   - [ ] Price doesn't change when clicking disabled options
   - [ ] UI clearly indicates unavailable options

#### Test 7.2: Products Without Variations
1. Navigate to the products list page
2. Look for products that show no variation options (empty variations array)
3. Verify these products still display correctly:
   - [ ] Product information is shown properly
   - [ ] No variation dropdown/selection appears
   - [ ] Price is displayed (if available at product level)
   - [ ] Add to cart functionality works (if applicable)
4. Check the API response contains empty variations array: `"variations": []`
5. Verify no JavaScript errors occur when rendering products without variations

#### Test 7.3: Marking Products
1. Test marking products specifically
2. Verify they support price type selection
3. Verify deadline information is still displayed correctly

### 8. Browser Compatibility
Test the above scenarios in:
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari (if available)

## Expected Results Summary

### Visual Indicators
- **Standard Price**: No badge, regular price display
- **Retaker Price**: Blue "Retaker" badge + green actual price
- **Additional Copy**: Blue "Additional Copy" badge + green actual price

### Data Flow
1. **Product Selection**: Price type selected on product card
2. **Cart Storage**: Each price type creates separate cart item
3. **Checkout**: Price information preserved through checkout
4. **Order History**: Price information displayed in order history
5. **Admin**: Full price information visible in Django admin

### API Endpoints Used
- `POST /api/cart/add/` - With price_type and actual_price
- `GET /api/cart/` - Returns items with price information
- `POST /api/cart/checkout/` - Creates orders with price info
- `GET /api/cart/orders/` - Returns orders with price info

## Troubleshooting

### Common Issues
1. **Price badges not showing**: Check browser console for React errors
2. **Cart items not separating**: Verify API is receiving price_type parameter
3. **Checkout failing**: Check Django logs for validation errors
4. **Order history empty**: Verify orders were created with price information

### Debug Steps
1. Open browser developer tools
2. Check Network tab for API calls
3. Verify request/response data includes price_type and actual_price
4. Check Console tab for JavaScript errors
5. Check Django admin for data verification

## Success Criteria
- [ ] All test scenarios pass
- [ ] No JavaScript errors in browser console
- [ ] No Django errors in server logs
- [ ] Price information flows correctly through entire system
- [ ] UI is intuitive and user-friendly
- [ ] Admin interface provides complete visibility

## Notes
- The implementation leverages existing backend infrastructure
- No database migrations were required
- All changes are backward compatible
- Standard price items maintain existing behavior
