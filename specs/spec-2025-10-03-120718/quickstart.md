# Quickstart: Tutorial Cart Integration Fix

**Feature**: Tutorial Cart Integration Fix (Epic 1)
**Purpose**: Verify the feature works end-to-end from user perspective

---

## Prerequisites

- Frontend development server running (`npm start` in `frontend/react-Admin3/`)
- Modern browser (Chrome, Firefox, Safari, Edge)
- Browser DevTools console open (for observing migration logs)

---

## Test Scenario 1: New User - Add Multiple Choices to Cart

**Goal**: Verify that adding multiple tutorial choices for the same subject creates a single cart item.

### Steps

1. **Navigate to tutorial selection page**
   - Open browser to `http://localhost:3000`
   - Navigate to Tutorials section
   - Select subject: **CS2 (Computer Science 2)**

2. **Add first tutorial choice**
   - Browse available tutorials for CS2
   - Select **Bristol** location tutorial
   - Click choice level **"1st"** button
   - Click **"Add to Cart"** button
   - ✅ **Verify**: Cart badge shows **1 item**

3. **Check cart contents**
   - Click cart icon to open cart panel
   - ✅ **Verify**: Cart shows **1 item** for CS2
   - ✅ **Verify**: Item shows "1st Choice: Bristol" with tutorial code
   - ✅ **Verify**: Price displays (only 1st choice price)

4. **Add second tutorial choice for same subject**
   - Return to tutorial selection
   - Select **London** location tutorial for CS2
   - Click choice level **"2nd"** button
   - Click **"Add to Cart"** button
   - ✅ **Verify**: Cart badge **still shows 1 item** (no duplicate!)

5. **Verify cart item updated (not duplicated)**
   - Open cart panel
   - ✅ **Verify**: Cart shows **1 item** for CS2 (not 2!)
   - ✅ **Verify**: Item now shows:
     - "1st Choice: Bristol - TUT-CS2-BRI-001"
     - "2nd Choice: London - TUT-CS2-LON-002"
   - ✅ **Verify**: Price unchanged (still only 1st choice price)

6. **Add third tutorial choice**
   - Return to tutorial selection
   - Select **Manchester** location tutorial for CS2
   - Click choice level **"3rd"** button
   - Click **"Add to Cart"** button
   - ✅ **Verify**: Cart badge **still shows 1 item**

7. **Verify all 3 choices in single cart item**
   - Open cart panel
   - ✅ **Verify**: Cart shows **1 item** for CS2
   - ✅ **Verify**: Item shows all 3 choices:
     - "1st Choice: Bristol"
     - "2nd Choice: London"
     - "3rd Choice: Manchester"

8. **Check localStorage state**
   - Open DevTools → Application → Local Storage
   - Find key: `tutorialChoices`
   - ✅ **Verify**: CS2 has 3 choices, all with `isDraft: false`

### Expected Outcome

- ✅ Cart contains **exactly 1 item** for CS2
- ✅ Cart item shows all 3 tutorial choices
- ✅ No duplicate cart items created
- ✅ Price reflects only 1st choice (2nd and 3rd are free)

---

## Test Scenario 2: Remove Cart Item Restores Draft State

**Goal**: Verify that removing a cart item restores tutorial choices to draft state.

### Steps

1. **Start with cart item from Scenario 1**
   - Cart contains CS2 tutorial item with 3 choices

2. **Remove cart item**
   - Open cart panel
   - Click **"Remove"** button for CS2 tutorial item
   - ✅ **Verify**: Cart badge shows **0 items**

3. **Check localStorage state**
   - Open DevTools → Application → Local Storage
   - Find key: `tutorialChoices`
   - ✅ **Verify**: CS2 still has 3 choices
   - ✅ **Verify**: All choices now have `isDraft: true` (restored to draft!)

4. **Verify choices can be re-added**
   - Navigate to tutorial selection
   - ✅ **Verify**: CS2 choices still visible in selection panel
   - Click **"Add to Cart"** again
   - ✅ **Verify**: Cart item recreated successfully

### Expected Outcome

- ✅ Removing cart item sets `isDraft: true` for all choices
- ✅ Choices remain in localStorage (not deleted)
- ✅ Choices can be re-added to cart without re-selecting

---

## Test Scenario 3: Multiple Subjects in Cart

**Goal**: Verify that multiple subjects can have tutorial cart items simultaneously.

### Steps

1. **Add CS2 tutorial to cart** (follow Scenario 1 steps 1-2)
   - ✅ **Verify**: Cart has 1 item (CS2)

2. **Add CP1 tutorial to cart**
   - Navigate to CP1 (Computer Programming 1) tutorials
   - Select Bristol location, 1st choice
   - Click **"Add to Cart"**
   - ✅ **Verify**: Cart badge shows **2 items**

3. **Verify both subjects in cart**
   - Open cart panel
   - ✅ **Verify**: Cart shows **2 items**:
     - CS2 Tutorial (1 choice)
     - CP1 Tutorial (1 choice)
   - ✅ **Verify**: Each item shows correct subject and choices

4. **Add more choices to CP1**
   - Add London location as 2nd choice for CP1
   - ✅ **Verify**: Cart still shows **2 items** (not 3!)
   - ✅ **Verify**: CP1 item now shows 2 choices

### Expected Outcome

- ✅ Multiple subjects can have separate cart items
- ✅ Each subject maintains single cart item
- ✅ Adding choices to existing subject updates (not duplicates)

---

## Test Scenario 4: Data Migration (Existing User)

**Goal**: Verify that users with old format data (no isDraft field) are migrated successfully.

### Setup

1. **Simulate old format data**
   - Open DevTools → Application → Local Storage
   - Find key: `tutorialChoices`
   - Manually edit to remove `isDraft` fields:
   ```json
   {
     "CS2": {
       "1st": {
         "eventId": "evt-cs2-bri-001",
         "eventCode": "TUT-CS2-BRI-001",
         "location": "Bristol",
         "variation": { ... },
         "choiceLevel": "1st",
         "timestamp": "2025-10-03T14:30:00.000Z"
       }
     }
   }
   ```
   - Save changes

2. **Trigger migration**
   - Refresh the page (F5)
   - ✅ **Verify**: Console shows migration log: `"[Migration] Migrating tutorialChoices to isDraft format"`

3. **Check migrated data**
   - Open DevTools → Application → Local Storage
   - Find key: `tutorialChoices`
   - ✅ **Verify**: CS2 choice now has `isDraft: false`
   - Find key: `tutorialChoices_backup`
   - ✅ **Verify**: Backup exists with original data (without isDraft)

4. **Verify functionality after migration**
   - Check cart
   - ✅ **Verify**: CS2 tutorial appears in cart (because `isDraft: false`)
   - Navigate to tutorial selection
   - ✅ **Verify**: Can add more choices to CS2
   - ✅ **Verify**: Adding new choice updates existing cart item

### Expected Outcome

- ✅ Old format data migrated automatically on first load
- ✅ Backup created for rollback safety
- ✅ Migrated data works correctly with new functionality
- ✅ No data loss during migration

---

## Test Scenario 5: Backward Compatibility

**Goal**: Verify that mixed old/new format data is handled gracefully.

### Setup

1. **Create mixed format data**
   - Open DevTools → Application → Local Storage
   - Manually edit `tutorialChoices`:
   ```json
   {
     "CS2": {
       "1st": {
         "eventId": "evt-cs2-bri-001",
         "eventCode": "TUT-CS2-BRI-001",
         "location": "Bristol",
         "variation": { ... },
         "choiceLevel": "1st",
         "timestamp": "2025-10-03T14:30:00.000Z"
         // NO isDraft field (old format)
       },
       "2nd": {
         "eventId": "evt-cs2-lon-002",
         "eventCode": "TUT-CS2-LON-002",
         "location": "London",
         "variation": { ... },
         "choiceLevel": "2nd",
         "timestamp": "2025-10-03T14:35:00.000Z",
         "isDraft": true  // NEW format
       }
     }
   }
   ```

2. **Refresh page**
   - ✅ **Verify**: No JavaScript errors
   - ✅ **Verify**: Console shows migration log

3. **Check normalized data**
   - Open DevTools → Application → Local Storage
   - ✅ **Verify**: Both choices now have `isDraft` field
   - ✅ **Verify**: 1st choice has `isDraft: false` (default for legacy)
   - ✅ **Verify**: 2nd choice has `isDraft: true` (preserved)

### Expected Outcome

- ✅ Mixed format data handled without errors
- ✅ Legacy choices get default `isDraft: false`
- ✅ New format choices preserve their isDraft value

---

## Test Scenario 6: Choice Level Independence

**Goal**: Verify that choice levels (1st, 2nd, 3rd) can be selected in any order.

### Steps

1. **Select 3rd choice first**
   - Navigate to CS2 tutorials
   - Select Bristol location
   - Click **"3rd"** choice button (skip 1st and 2nd)
   - Click **"Add to Cart"**
   - ✅ **Verify**: Cart created successfully with 3rd choice

2. **Add 1st choice next**
   - Select London location
   - Click **"1st"** choice button
   - Click **"Add to Cart"**
   - ✅ **Verify**: Cart item updated to show both 1st and 3rd choices

3. **Add 2nd choice last**
   - Select Manchester location
   - Click **"2nd"** choice button
   - Click **"Add to Cart"**
   - ✅ **Verify**: Cart item shows all 3 choices (3rd, 1st, 2nd order in state)

4. **Verify cart display ordering**
   - Open cart panel
   - ✅ **Verify**: Choices displayed in logical order (1st, 2nd, 3rd) despite selection order

### Expected Outcome

- ✅ Choice levels can be selected in any order
- ✅ No enforced sequential selection
- ✅ Cart displays choices in logical order (1st → 2nd → 3rd)

---

## Performance Validation

### Metrics to Check

1. **localStorage Operations**
   - Open DevTools → Performance
   - Start recording
   - Add 3 tutorial choices to cart
   - Stop recording
   - ✅ **Verify**: localStorage operations < 10ms each

2. **Context State Updates**
   - Use React DevTools Profiler
   - Record adding choices and updating cart
   - ✅ **Verify**: State updates < 5ms
   - ✅ **Verify**: No unnecessary re-renders (check Profiler flame graph)

3. **Migration Performance**
   - Create large dataset (10 subjects × 3 choices = 30 total choices)
   - Trigger migration by refreshing
   - Check console timestamp logs
   - ✅ **Verify**: Migration completes < 50ms

---

## Error Handling

### Test Corrupted Data

1. **Set invalid JSON in localStorage**
   ```javascript
   localStorage.setItem('tutorialChoices', '{invalid json}');
   ```

2. **Refresh page**
   - ✅ **Verify**: Console shows error log
   - ✅ **Verify**: App doesn't crash
   - ✅ **Verify**: User can start fresh (empty state)

### Test Missing Data

1. **Clear localStorage**
   ```javascript
   localStorage.removeItem('tutorialChoices');
   ```

2. **Refresh page**
   - ✅ **Verify**: No errors
   - ✅ **Verify**: App initializes with empty tutorial choices

---

## Regression Testing

### Verify Other Product Types Unaffected

1. **Add Material product to cart**
   - Navigate to Materials
   - Add a textbook to cart
   - ✅ **Verify**: Material cart item created correctly
   - ✅ **Verify**: No interference with tutorial cart logic

2. **Add Bundle product to cart**
   - Navigate to Bundles
   - Add a bundle to cart
   - ✅ **Verify**: Bundle cart item created correctly

3. **Mixed cart**
   - Cart should contain: Tutorials, Materials, Bundles
   - ✅ **Verify**: All product types coexist correctly
   - ✅ **Verify**: Tutorial cart logic doesn't affect other types

---

## Success Criteria

### All scenarios must pass:
- ✅ Scenario 1: Multiple choices create single cart item
- ✅ Scenario 2: Removing cart item restores draft state
- ✅ Scenario 3: Multiple subjects work correctly
- ✅ Scenario 4: Data migration succeeds
- ✅ Scenario 5: Backward compatibility maintained
- ✅ Scenario 6: Choice level independence works

### Performance targets met:
- ✅ localStorage operations < 10ms
- ✅ State updates < 5ms
- ✅ Migration < 50ms

### Error handling verified:
- ✅ Corrupted data handled gracefully
- ✅ Missing data handled gracefully

### Regression testing passed:
- ✅ Other product types unaffected

---

**Quickstart Status**: ✅ COMPLETE - Ready for manual validation testing
