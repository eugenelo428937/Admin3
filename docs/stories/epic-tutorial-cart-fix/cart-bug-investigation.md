# Cart Bug Investigation: Tutorial Duplicate Cart Items

**Date**: 2025-10-03
**Epic**: Tutorial Cart Integration Fix
**Story**: 1.2 - Fix Cart Integration for Incremental Updates
**Task**: T018

---

## Executive Summary

**Root Cause**: The `handleAddToCart` function in `TutorialProductCard.js` always creates a new cart item without checking if one already exists for the subject. This causes duplicate cart items when users add multiple tutorial choices for the same subject.

**Impact**: Users see multiple cart items for the same subject (CS2, CP1, etc.), leading to confusion and incorrect cart totals.

**Solution**: Implement lookup-then-merge pattern to find existing cart items by `subject_code` and update them instead of creating duplicates.

---

## Current Behavior (Bug)

### User Flow with Bug

1. User selects **CS2 1st choice** (Bristol) and clicks "Add to Cart"
   - ✅ Cart item created: "CS2 Tutorial - Bristol"
   - Cart count: **1 item**

2. User selects **CS2 2nd choice** (London) and clicks "Add to Cart"
   - ❌ **NEW** cart item created: "CS2 Tutorial - Bristol" (duplicate!)
   - Cart count: **2 items** (WRONG!)

3. User selects **CS2 3rd choice** (Manchester) and clicks "Add to Cart"
   - ❌ **THIRD** cart item created: "CS2 Tutorial - Bristol"
   - Cart count: **3 items** (WRONG!)

**Expected**: Cart should have exactly **1 item** with all 3 choices.

**Actual**: Cart has **3 duplicate items**.

---

## Code Analysis

### TutorialProductCard.js (Lines 101-166)

```javascript
const handleAddToCart = useCallback(() => {
    // ... choice building logic ...

    // ❌ BUG: Always calls addToCart without checking for existing item
    addToCart({
        id: productId,
        essp_id: productId,
        product_id: productId,
        subject_code: subjectCode,  // 👈 Unique identifier
        subject_name: subjectName,
        product_name: `${subjectCode} Tutorial - ${location}`,
        type: "Tutorial",
        quantity: 1
    }, {
        priceType: "standard",
        actualPrice: actualPrice,
        metadata: tutorialMetadata
    });
}, [addToCart, hasChoices, subjectChoices, product, productId, subjectCode, subjectName, location]);
```

**Problem**: No lookup to check if cart already contains an item with matching `subject_code`.

---

### CartContext.js (Lines 30-44)

```javascript
const addToCart = async (product, priceInfo = {}) => {
    try {
        // ❌ BUG: Directly calls backend without duplicate checking
        const res = await cartService.addToCart(product, 1, priceInfo);

        if (res.data && res.data.items) {
            setCartData(res.data);
            setCartItems(res.data.items);
        }
    } catch (err) {
        console.error('🛒 [CartContext] Error adding to cart:', err);
    }
};
```

**Problem**: No frontend logic to detect and prevent duplicates.

---

### cartService.js (Lines 8-40)

```javascript
addToCart: (product, quantity = 1, priceInfo = {}) => {
    const payload = {
        current_product: product.essp_id || product.id,
        quantity,
        price_type: priceInfo.priceType || 'standard',
        actual_price: priceInfo.actualPrice,
        metadata: { /* ... */ }
    };

    // ❌ BUG: Always POSTs to /add/ endpoint (creates new item)
    return httpService.post(`${API_BASE}/add/`, payload);
}
```

**Problem**: No logic to detect existing tutorial items and update instead of create.

---

## Root Cause Analysis

### Why Duplicates Occur

1. **Missing Lookup Logic**: No code checks if `cartItems` already contains a tutorial for `subject_code`
2. **No Merge Strategy**: No logic to merge new choices into existing cart item metadata
3. **No Update Path**: No mechanism to call update instead of create when item exists

### Data Flow

```
User Action: "Add to Cart" clicked
    ↓
TutorialProductCard.handleAddToCart()
    ↓
CartContext.addToCart(product, priceInfo)
    ↓
cartService.addToCart() → POST /api/cart/add/
    ↓
Backend creates NEW cart item
    ↓
Frontend updates cartItems with new array
    ↓
❌ Result: Duplicate cart items
```

---

## Expected Behavior (Fix)

### User Flow After Fix

1. User selects **CS2 1st choice** (Bristol) and clicks "Add to Cart"
   - ✅ Cart item created: "CS2 Tutorial"
   - Cart count: **1 item**

2. User selects **CS2 2nd choice** (London) and clicks "Add to Cart"
   - ✅ **UPDATES** existing CS2 cart item with 2nd choice
   - Cart count: **1 item** (CORRECT!)

3. User selects **CS2 3rd choice** (Manchester) and clicks "Add to Cart"
   - ✅ **UPDATES** existing CS2 cart item with 3rd choice
   - Cart count: **1 item** (CORRECT!)

**Expected**: Cart has exactly **1 item** showing all 3 choices.

---

## Solution Design

### Lookup-Then-Merge Pattern

```javascript
const handleAddToCart = useCallback(() => {
    // 1. BUILD: Prepare cart item data with all current choices
    const cartItemData = buildTutorialCartItem();

    // 2. LOOKUP: Check if cart already has item for this subject
    const existingCartItem = cartItems.find(item =>
        item.subject_code === subjectCode &&
        item.type === "Tutorial"
    );

    if (existingCartItem) {
        // 3a. UPDATE: Merge choices into existing item
        updateCartItem(existingCartItem.id, cartItemData);

        // 3b. SYNC STATE: Mark choices as isDraft: false
        markChoicesAsAdded(subjectCode);
    } else {
        // 3c. CREATE: Add new cart item
        addToCart(cartItemData);

        // 3d. SYNC STATE: Mark choices as isDraft: false
        markChoicesAsAdded(subjectCode);
    }
}, [cartItems, subjectCode, addToCart, updateCartItem, markChoicesAsAdded]);
```

### Key Changes Required

1. **Add Lookup Logic** in `TutorialProductCard.handleAddToCart`:
   - Search `cartItems` for matching `subject_code` + `type: "Tutorial"`
   - Use result to decide: create vs. update

2. **Add Update Path** in `CartContext`:
   - New method: `updateCartItem(itemId, updatedData)`
   - Calls backend to update existing item

3. **Sync TutorialChoiceContext State**:
   - Call `markChoicesAsAdded(subjectCode)` after successful cart operation
   - Sets `isDraft: false` for all choices

4. **Handle Cart Removal**:
   - Listen for cart item removal
   - Restore choices to draft state: `isDraft: true`

---

## Affected Components

### Frontend

- **TutorialProductCard.js** (PRIMARY)
  - Update `handleAddToCart` with lookup-then-merge logic
  - Add cart item update path
  - Sync with TutorialChoiceContext

- **CartContext.js**
  - Add `updateCartItem(itemId, data)` method
  - Expose `updateCartItem` in context value

- **TutorialChoiceContext.js** ✅ COMPLETE (Story 1.1)
  - Methods already implemented:
    - `markChoicesAsAdded(subjectCode)` - sets isDraft: false
    - `getDraftChoices(subjectCode)` - filter draft choices
    - `getCartedChoices(subjectCode)` - filter carted choices
    - `hasCartedChoices(subjectCode)` - check if any carted

### Backend

- **Cart API** (Likely no changes needed)
  - Existing `/add/` endpoint creates items
  - Existing `/update_item/` endpoint updates items
  - Frontend will choose correct endpoint

---

## Testing Strategy

### TDD RED Phase (T019-T024)

1. **T019**: Test first choice creates cart item
2. **T020**: Test second choice UPDATES cart item (no duplicate)
3. **T021**: Test third choice continues to update same item
4. **T022**: Test cart removal restores draft state (`isDraft: true`)
5. **T023**: Test multiple subjects (CS2 + CP1) have separate cart items
6. **T024**: Test external cart deletion syncs state

### TDD GREEN Phase (T025-T029)

1. **T025**: Implement lookup-then-merge pattern
2. **T026**: Implement state transition on add (`isDraft: false`)
3. **T027**: Implement state restore on remove (`isDraft: true`)
4. **T028**: Implement cart polling/sync mechanism
5. **T029**: Verify all T019-T024 tests pass

---

## Success Criteria

✅ **Functional Requirements**
- Adding 1st choice creates exactly 1 cart item
- Adding 2nd choice updates existing cart item (no duplicate created)
- Adding 3rd choice continues updating same cart item
- Cart shows exactly 1 item per subject with all choices
- Removing cart item restores choices to draft state

✅ **Technical Requirements**
- Lookup logic uses `subject_code` + `type: "Tutorial"` as key
- State synced between CartContext and TutorialChoiceContext
- No duplicate cart items created
- All TDD tests passing (100% coverage for cart integration)

---

## Risk Assessment

### High Risk

- **State Sync Complexity**: TutorialChoiceContext and CartContext must stay in sync
  - Mitigation: Use `markChoicesAsAdded` callback after successful cart operations

- **Backend API Compatibility**: Update endpoint must accept tutorial metadata
  - Mitigation: Test with actual backend, verify metadata preservation

### Medium Risk

- **Cart Polling**: External cart changes (timeout, admin removal) need detection
  - Mitigation: Implement cart refresh polling or event listeners

### Low Risk

- **Multiple Subjects**: CS2 and CP1 might interfere
  - Mitigation: Use `subject_code` as unique key per cart item

---

## Investigation Complete

**Status**: ✅ Root cause identified and documented
**Next Step**: T019-T024 - Write failing tests (TDD RED phase)
**Time Estimate**: 6 hours for T019-T024 test implementation

---

**Reviewed By**: Dev Agent (Devynn)
**Approved By**: [Pending User Approval]
