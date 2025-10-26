# Quickstart: Cart Synchronization Fix

**Feature**: Fix Cart Synchronization Issue
**Purpose**: Validate that multi-tutorial selections work correctly
**Estimated Time**: 5-10 minutes
**Prerequisites**: Frontend and backend running locally

## Pre-Execution Checklist

- [ ] Backend server running on port 8888
- [ ] Frontend server running on port 3000
- [ ] Test database populated with tutorial events
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] User logged in to application

## Test Scenario 1: Add Two Tutorials Sequentially (Core Bug Fix)

**Goal**: Verify both tutorials appear in cart after sequential addition

### Steps

1. **Navigate to CS1 Product Page**
   ```
   URL: http://localhost:3000/products?subject_code=CS1
   ```

2. **Open Tutorial Selection Dialog**
   - Click "Select Tutorial" button for CS1 product
   - Wait for dialog to fully load

3. **Add First Tutorial (Edinburgh)**
   - In dialog, select "CS1-30-25S (Edinburgh)" for Choice Level 1
   - Click "Confirm" button
   - Dialog should close

4. **Verify First Tutorial in Summary Bar**
   ```
   Expected: Summary bar shows "CS1-30-25S (Edinburgh)"
   Badge shows: "1 Choice Selected"
   ```

5. **Re-open Tutorial Selection Dialog**
   - Click "Select Tutorial" button again

6. **Add Second Tutorial (London)**
   - In dialog, select "CS1-20-25S (London)" for Choice Level 2
   - Click "Confirm" button
   - Dialog should close

7. **Verify BOTH Tutorials in Summary Bar**
   ```
   Expected: Summary bar shows BOTH:
   - CS1-30-25S (Edinburgh)
   - CS1-20-25S (London)
   Badge shows: "2 Choices Selected"
   ```

8. **Click "Add to Cart" on Summary Bar**
   - Wait for "Adding to cart..." loading state
   - Wait for success message

9. **Open Cart Panel**
   - Click cart icon in header
   - Cart panel slides open

10. **Verify BOTH Tutorials in Cart**
    ```
    Expected: Cart shows single CS1 item with metadata:
    - Tutorial 1: CS1-30-25S (Edinburgh)
    - Tutorial 2: CS1-20-25S (London)

    Cart badge shows: "1 item"
    ```

### Success Criteria
- ✅ Both tutorials visible in summary bar before adding to cart
- ✅ Both tutorials visible in cart after adding
- ✅ No console errors during workflow
- ✅ Network tab shows single cart API call (POST or PUT)

### Failure Indicators
- ❌ Only second tutorial (London) appears in cart (BUG REPRODUCES)
- ❌ Console errors about state updates
- ❌ Multiple rapid API calls in Network tab
- ❌ Summary bar and cart show different selections

## Test Scenario 2: Page Refresh State Persistence

**Goal**: Verify selections persist correctly after page refresh

### Steps

1. **Complete Scenario 1 First**
   - Ensure cart contains 2 tutorial selections

2. **Refresh Page**
   ```
   Press F5 or Cmd+R
   ```

3. **Wait for Page Load**
   - Backend cart fetch completes
   - localStorage loaded

4. **Verify Cart Badge**
   ```
   Expected: Cart badge shows "1 item"
   ```

5. **Open Cart Panel**
   - Click cart icon

6. **Verify Tutorial Selections Restored**
   ```
   Expected: Cart shows BOTH tutorials:
   - CS1-30-25S (Edinburgh)
   - CS1-20-25S (London)
   ```

7. **Check Summary Bar**
   ```
   Expected: If on CS1 product page, summary bar shows:
   - Both tutorials with "Added in Cart" badge
   - isDraft flag is false for both
   ```

### Success Criteria
- ✅ Cart state fully restored after refresh
- ✅ Both tutorials still present
- ✅ Summary bar shows correct "Added in Cart" status
- ✅ No console errors during load

## Test Scenario 3: Remove Individual Tutorial

**Goal**: Verify removing one tutorial doesn't affect the other

### Steps

1. **Complete Scenario 1 First**
   - Cart contains 2 tutorials

2. **Open Cart Panel**
   - Click cart icon

3. **Find Remove Button for Edinburgh Tutorial**
   - Locate "X" or "Remove" button for CS1-30-25S

4. **Click Remove**
   - Wait for API call to complete
   - Wait for cart update

5. **Verify Only London Tutorial Remains**
   ```
   Expected: Cart shows only:
   - CS1-20-25S (London)

   Cart badge still shows: "1 item"
   ```

6. **Check Summary Bar**
   ```
   Expected: If on CS1 product page, summary bar shows:
   - CS1-30-25S (Edinburgh) with "Select" button (removed from cart)
   - CS1-20-25S (London) with "Added in Cart" badge (still in cart)
   ```

### Success Criteria
- ✅ Only one tutorial removed
- ✅ Other tutorial remains in cart
- ✅ Summary bar reflects change
- ✅ No orphaned data in localStorage

## Test Scenario 4: Clear Cart

**Goal**: Verify clearing cart removes all selections

### Steps

1. **Complete Scenario 1 First**
   - Cart contains 2 tutorials

2. **Open Cart Panel**
   - Click cart icon

3. **Click "Clear Cart" Button**
   - Confirm action if prompted
   - Wait for all items to be removed

4. **Verify Cart Empty**
   ```
   Expected:
   - Cart badge shows "0" or hidden
   - Cart panel shows "Your cart is empty" message
   ```

5. **Check Summary Bar**
   ```
   Expected: If on CS1 product page, summary bar shows:
   - CS1-30-25S (Edinburgh) with "Select" button (draft)
   - CS1-20-25S (London) with "Select" button (draft)
   - Both marked as isDraft=true
   ```

6. **Refresh Page**
   - Press F5

7. **Verify Cart Still Empty**
   ```
   Expected:
   - Cart badge still shows "0"
   - No selections in cart
   ```

### Success Criteria
- ✅ All tutorials removed from cart
- ✅ Summary bar resets to draft state
- ✅ Cart stays empty after refresh
- ✅ No localStorage orphans

## Test Scenario 5: Rapid Sequential Additions (Race Condition Test)

**Goal**: Verify system handles rapid additions without data loss

### Steps

1. **Open Tutorial Selection Dialog**
   - Navigate to CS1 product page
   - Click "Select Tutorial"

2. **Add Tutorials Rapidly**
   - Select CS1-30-25S (Edinburgh) for Level 1
   - **Immediately** click Confirm (don't wait)
   - **Immediately** click "Select Tutorial" again
   - Select CS1-20-25S (London) for Level 2
   - **Immediately** click Confirm
   - Time between additions: < 500ms

3. **Verify Both in Summary Bar**
   ```
   Expected: Both tutorials appear
   (May take 1-2 seconds to stabilize)
   ```

4. **Add to Cart**
   - Click "Add to Cart" on summary bar

5. **Verify Both in Cart**
   ```
   Expected: Cart contains both tutorials
   ```

### Success Criteria
- ✅ Both tutorials successfully added despite rapid timing
- ✅ No console errors about race conditions
- ✅ Operations queued or handled atomically

### Acceptable Behavior
- Operation queue may cause slight delay (< 2s) before both appear
- Loading states may show during concurrent operations

## Debugging Steps (If Tests Fail)

### Check Console Logs
Look for:
- `[DIALOG] onConfirm triggered` - Verify dialog events fire
- `[CONTEXT] addTutorialChoice called` - Verify choices added
- `[CONTAINER] handleAddToCart started` - Verify cart operations
- `[CONTAINER] Cart API call` - Verify API calls made

### Check Network Tab
Look for:
- POST /api/cart/items/ - New cart item creation
- PUT /api/cart/items/{id}/ - Cart item updates
- Response payloads should include all tutorial selections

### Check localStorage
In DevTools Console:
```javascript
JSON.parse(localStorage.getItem('tutorialChoices'))
```
Verify:
- All selections present
- isDraft flags correct
- No orphaned entries

### Check React DevTools
Look at context state:
- TutorialChoiceContext.tutorialChoices
- CartContext.cartItems
- Verify both contexts in sync

## Performance Validation

### Timing Checks
- Cart synchronization on page load: < 2 seconds (FR-024)
- Add to cart operation: < 3 seconds (FR-025)
- State updates: < 200ms p95 (from constraints)

### Measurement
Use Performance tab in DevTools:
1. Start recording
2. Execute test scenario
3. Stop recording
4. Measure time from button click to state update

## Rollback Test

**Goal**: Verify system rolls back on API failure

### Steps

1. **Simulate API Failure**
   - In DevTools Network tab, enable "Offline" mode
   - Or use backend proxy to return 500 error

2. **Attempt to Add to Cart**
   - Select tutorials
   - Click "Add to Cart"

3. **Verify Error Shown**
   ```
   Expected: Error message displayed to user
   ```

4. **Verify State Rolled Back**
   ```
   Expected:
   - Tutorials remain as draft (isDraft=true)
   - Cart unchanged
   - Summary bar shows "Add to Cart" button (not "Added")
   ```

5. **Re-enable Network**
   - Disable "Offline" mode

6. **Retry Operation**
   - Click "Add to Cart" again
   - Should succeed now

### Success Criteria
- ✅ Error message shown on failure
- ✅ State rolled back (not partially updated)
- ✅ Retry succeeds after network restored

## Expected Test Duration

- Scenario 1 (Core bug fix): 2 minutes
- Scenario 2 (Page refresh): 1 minute
- Scenario 3 (Remove individual): 1 minute
- Scenario 4 (Clear cart): 1 minute
- Scenario 5 (Rapid additions): 2 minutes
- Debugging (if needed): 5-10 minutes

**Total**: 5-10 minutes for happy path, 15-20 minutes with debugging

## Post-Test Cleanup

1. Clear cart via UI or API
2. Clear localStorage: `localStorage.clear()`
3. Refresh page to reset state
4. Close DevTools if not needed

## Success Definition

**Fix is successful if**:
- ✅ All 5 test scenarios pass
- ✅ No console errors during normal workflows
- ✅ Performance targets met
- ✅ Rollback behavior works correctly
- ✅ State persists correctly across page refresh

**Fix requires iteration if**:
- ❌ Scenario 1 fails (core bug still reproduces)
- ❌ Race conditions detected in rapid additions
- ❌ State sync broken after page refresh
- ❌ Cart and summary bar show different selections
