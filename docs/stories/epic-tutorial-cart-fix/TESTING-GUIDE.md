Af# Epic 1: Tutorial Cart Integration Fix - Testing Guide

**Epic:** Tutorial Cart Integration Fix
**Stories:** 1.1 (isDraft State) + 1.2 (Cart Integration)
**Created:** 2025-10-03
**Test Duration:** ~15 minutes

---

## Prerequisites

### 1. Start Backend Server
```bash
cd C:/Code/Admin3/backend/django_Admin3
.venv/Scripts/activate
python manage.py runserver 8888
```
**Verify:** Backend running at http://localhost:8888

### 2. Start Frontend Server
```bash
cd C:/Code/Admin3/frontend/react-Admin3
npm start
```
**Verify:** Frontend running at http://localhost:3000

### 3. Login/Authentication
- Navigate to http://localhost:3000
- Login with your credentials
- Ensure you have access to tutorial products

---

## Test Scenarios

### 🧪 **Test 1: Single Choice Cart Creation** (Story 1.2 - T019)

**Goal:** Verify first choice creates exactly ONE cart item

**Steps:**
1. Navigate to Tutorials page/section
2. Find a tutorial product (e.g., CS2 Tutorial - Bristol)
3. Click "Select Tutorial" (SpeedDial button)
4. Select **1st choice** event from dialog
5. Click "Add to Cart"

**Expected Results:**
- ✅ Cart icon shows count = 1
- ✅ Success message/notification (if implemented)
- ✅ Tutorial choice badge shows "1 in cart" or similar
- ✅ Choice is no longer marked as draft (visual indicator if present)

**Verify in Browser DevTools:**
```javascript
// Open Console (F12)
localStorage.getItem('tutorialChoices')
// Should show: isDraft: false for the added choice
```

**Backend Log Check:**
```
🛒 [TutorialProductCard] Creating new cart item
✅ [TutorialProductCard] Successfully added/updated cart
```

---

### 🧪 **Test 2: Second Choice Updates (No Duplicate)** (Story 1.2 - T020)

**Goal:** Verify adding 2nd choice UPDATES existing cart item (no duplicate)

**Prerequisites:** Test 1 completed (1st choice in cart)

**Steps:**
1. Return to same tutorial product (CS2 Bristol)
2. Click "Select Tutorial" again
3. Select **2nd choice** event (different event)
4. Click "Add to Cart"

**Expected Results:**
- ✅ Cart icon STILL shows count = 1 (NOT 2!)
- ✅ No duplicate cart items created
- ✅ Existing cart item updated to include both choices
- ✅ Tutorial badge shows "1 in cart" (same item)

**Verify in Browser DevTools:**
```javascript
localStorage.getItem('tutorialChoices')
// Should show BOTH choices with isDraft: false
```

**Backend Log Check:**
```
🛒 [TutorialProductCard] Merging with existing cart item: [ID]
✅ [TutorialProductCard] Successfully added/updated cart
```

**Verify Cart Contents:**
- Open cart panel/modal
- Find CS2 Tutorial item
- Expand to see metadata
- Should show: 2 choices (1st and 2nd)

---

### 🧪 **Test 3: Third Choice Updates** (Story 1.2 - T021)

**Goal:** Verify 3rd choice continues updating same item

**Prerequisites:** Test 2 completed (1st + 2nd choices in cart)

**Steps:**
1. Return to same tutorial product
2. Select **3rd choice** event
3. Click "Add to Cart"

**Expected Results:**
- ✅ Cart count STILL = 1
- ✅ All 3 choices in single cart item
- ✅ Total choice count metadata = 3

**Verify Cart Metadata:**
```json
{
  "type": "tutorial",
  "subjectCode": "CS2",
  "totalChoiceCount": 3,
  "locations": [{
    "location": "Bristol",
    "choiceCount": 3,
    "choices": [
      {"choice": "1st", "eventId": "..."},
      {"choice": "2nd", "eventId": "..."},
      {"choice": "3rd", "eventId": "..."}
    ]
  }]
}
```

---

### 🧪 **Test 4: Multiple Subjects (Separate Items)** (Story 1.2 - T023)

**Goal:** Verify different subjects create separate cart items

**Prerequisites:** CS2 tutorial in cart from previous tests

**Steps:**
1. Navigate to different subject tutorial (e.g., CP1 Tutorial)
2. Select 1st choice for CP1
3. Click "Add to Cart"

**Expected Results:**
- ✅ Cart count = 2 (CS2 + CP1)
- ✅ TWO separate cart items (one per subject)
- ✅ CS2 item unchanged (still has 3 choices)
- ✅ CP1 item has 1 choice

**Verify:**
```javascript
// Cart should have 2 items:
// Item 1: CS2 Tutorial (3 choices)
// Item 2: CP1 Tutorial (1 choice)
```

---

### 🧪 **Test 5: Cart Removal Restores Draft** (Story 1.2 - T022)

**Goal:** Verify removing cart item restores choices to draft state

**Prerequisites:** CS2 tutorial with 2-3 choices in cart

**Steps:**
1. Open cart panel
2. Find CS2 Tutorial item
3. Click "Remove" or delete icon
4. Confirm removal

**Expected Results:**
- ✅ Cart item removed
- ✅ Cart count decreases
- ✅ Choices REMAIN in localStorage (not deleted)
- ✅ Choices restored to isDraft: true

**Verify in DevTools:**
```javascript
localStorage.getItem('tutorialChoices')
// CS2 choices should show: isDraft: true
// Choices not deleted, just marked as drafts
```

**Visual Verification:**
- Tutorial badge should NO LONGER show "in cart"
- Choices should be visible in "Select Tutorial" dialog
- Can re-add choices to cart

---

### 🧪 **Test 6: isDraft State Persistence** (Story 1.1 - T009)

**Goal:** Verify isDraft state persists across page refreshes

**Steps:**
1. Add tutorial choice to cart (isDraft: false)
2. Leave some choices as draft (isDraft: true)
3. **Refresh page (F5)**

**Expected Results:**
- ✅ Cart items persist
- ✅ Draft choices persist
- ✅ isDraft flags correct for each choice
- ✅ Cart count accurate after refresh

---

## Automated Test Verification

### Run Frontend Tests
```bash
cd C:/Code/Admin3/frontend/react-Admin3

# Run all tutorial cart tests
npm test -- --testPathPattern=TutorialProductCard --testNamePattern="Cart Integration" --watchAll=false

# Expected: 9 passed, 2 skipped (T024)
```

### Run Backend Tests (if applicable)
```bash
cd C:/Code/Admin3/backend/django_Admin3
python manage.py test vat.tests.test_models --keepdb -v 2
```

---

## Browser DevTools Inspection

### Check localStorage State
```javascript
// Open Console (F12)

// View tutorial choices
JSON.parse(localStorage.getItem('tutorialChoices'))

// View cart (if persisted client-side)
JSON.parse(localStorage.getItem('cart'))

// Check for migration backup
JSON.parse(localStorage.getItem('tutorialChoices_backup'))
```

### Network Tab Verification
1. Open Network tab (F12 → Network)
2. Filter by "cart" or "tutorial"
3. Add tutorial to cart
4. Check POST/PATCH requests:

**Expected Requests:**

**First Add:**
```
POST /api/cart/add/
{
  "current_product": 123,
  "metadata": {
    "type": "tutorial",
    "subjectCode": "CS2",
    "totalChoiceCount": 1
  }
}
```

**Second Add (Update):**
```
PATCH /api/cart/update_item/
{
  "item_id": 999,
  "metadata": {
    "type": "tutorial",
    "subjectCode": "CS2",
    "totalChoiceCount": 2
  }
}
```

---

## Console Logs to Watch

### Success Indicators
```
🛒 [TutorialProductCard] Creating new cart item
✅ [TutorialProductCard] Successfully added/updated cart

OR

🛒 [TutorialProductCard] Merging with existing cart item: 999
✅ [TutorialProductCard] Successfully added/updated cart
```

### Migration Indicators
```
[Migration] Migrating tutorialChoices to isDraft format
[Migration] Success - backup saved to tutorialChoices_backup
```

### Warning Signs
```
❌ [TutorialProductCard] Error adding to cart: [error]
Cannot add to cart: no choices selected
```

---

## Common Issues & Debugging

### Issue: Cart shows 2 items for same subject
**Diagnosis:** Cart integration bug NOT fixed
**Check:**
- Verify `updateCartItem` is imported in TutorialProductCard
- Check browser console for "Merging with existing cart item" log
- Verify `cartItems` lookup is working

**Fix:** Re-run refactoring steps from Story 1.2

---

### Issue: Choices lost after page refresh
**Diagnosis:** localStorage not persisting
**Check:**
```javascript
localStorage.getItem('tutorialChoices')
// Should return data, not null
```
**Fix:** Verify TutorialChoiceContext useEffect saves to localStorage

---

### Issue: isDraft always true/false
**Diagnosis:** State transitions not working
**Check:**
- Verify `markChoicesAsAdded` is called in handleAddToCart
- Check console for state update logs
**Fix:** Verify `markChoicesAsAdded` implementation in TutorialChoiceContext

---

### Issue: Tests fail but manual testing works
**Diagnosis:** Mock setup issue
**Check:** Test file mock configuration
**Fix:** Verify `mockCartState` getter functions in test file

---

## Acceptance Criteria Checklist

### Story 1.1: isDraft State Management
- [ ] New choices created with `isDraft: true`
- [ ] `markChoicesAsAdded()` sets `isDraft: false`
- [ ] `restoreChoicesToDraft()` sets `isDraft: true`
- [ ] State persists across refreshes

### Story 1.2: Cart Integration Fix
- [ ] First choice creates 1 cart item
- [ ] Second choice updates (not duplicates)
- [ ] Third choice continues updating
- [ ] Different subjects = separate items
- [ ] Cart removal restores draft state
- [ ] Choices persist in localStorage after removal
- [ ] No duplicate cart items EVER

---

## Test Report Template

```markdown
## Epic 1 Test Results

**Tester:** [Your Name]
**Date:** [Date]
**Environment:** Local Dev
**Browser:** [Chrome/Firefox/Edge] [Version]

### Test Results

| Test ID | Scenario | Status | Notes |
|---------|----------|--------|-------|
| T1 | Single choice creation | ✅ PASS | Cart count = 1 |
| T2 | Second choice update | ✅ PASS | No duplicate |
| T3 | Third choice update | ✅ PASS | All 3 in one item |
| T4 | Multiple subjects | ✅ PASS | 2 separate items |
| T5 | Cart removal | ✅ PASS | Draft restored |
| T6 | State persistence | ✅ PASS | Survives refresh |

### Automated Tests
- Frontend: 9/9 PASS
- Backend: N/A

### Issues Found
[List any issues]

### Overall Assessment
[ ] Epic 1 READY FOR PRODUCTION
[ ] Epic 1 NEEDS FIXES

**Signature:** _______________
```

---

## Quick Smoke Test (2 minutes)

If short on time, run this minimal test:

1. ✅ Add 1st choice → Cart count = 1
2. ✅ Add 2nd choice → Cart count STILL = 1 (no duplicate)
3. ✅ Remove from cart → Choices remain in localStorage
4. ✅ Refresh page → Everything persists

**If all pass:** Epic 1 core functionality works! ✅

---

**Testing Questions?** Check console logs, DevTools localStorage, and Network tab for detailed debugging information.
