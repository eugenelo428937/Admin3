# Quickstart Testing Guide: Tutorial Product Card Speed Dial Enhancement

**Feature**: Tutorial Product Card Speed Dial UI Enhancement
**Spec**: `specs/spec-2025-10-01-124427.md`
**Plan**: `plans/spec-2025-10-01-124427-plan.md`

## Purpose

This quickstart guide provides step-by-step manual testing instructions to validate the Tutorial Product Card Speed Dial enhancement. Execute these steps after implementation to verify all requirements are met.

## Prerequisites

1. Development environment running:
   ```bash
   cd frontend/react-Admin3
   npm start
   ```

2. Navigate to tutorial products page (URL varies by environment)

3. Ensure you have at least one tutorial product available for testing

## Test Scenarios

### Scenario 1: Visual Simplification (FR-001, FR-002, FR-003)

**Objective**: Verify Speed Dial button replaces separate action buttons

**Steps**:
1. Navigate to tutorial products catalog page
2. Locate a tutorial product card (e.g., CS1 Tutorial - Birmingham)
3. Look at the card actions area (bottom section of card)

**Expected Results**:
- ✅ Single floating action button (Speed Dial) is visible in bottom-right
- ✅ Speed Dial displays a "+" icon
- ✅ No separate "Select Tutorial" button in card body
- ✅ No separate "View Selection" button in card body
- ✅ Only discount options and price display remain in CardActions section

**Pass Criteria**: All 5 expected results confirmed

---

### Scenario 2: Speed Dial Opening Behavior (FR-004, FR-005, FR-007)

**Objective**: Verify Speed Dial opens with proper animation and backdrop

**Steps**:
1. Ensure no tutorials are selected (clear any existing selections)
2. Click the "+" Speed Dial button

**Expected Results**:
- ✅ Speed Dial expands upward
- ✅ "+" icon rotates 45 degrees to become "×"
- ✅ At least one action appears (Select Tutorial)
- ✅ Backdrop overlay appears behind actions
- ✅ Animation is smooth (< 300ms)

**Pass Criteria**: All 5 expected results confirmed

---

### Scenario 3: Conditional Action Visibility - No Selections (FR-011, FR-012, FR-013)

**Objective**: Verify only "Select Tutorial" action is visible when no tutorials selected

**Steps**:
1. Ensure no tutorials are selected (clear any existing selections)
2. Click the Speed Dial button to open it
3. Count the visible actions

**Expected Results**:
- ✅ Only 1 action is visible: "Select Tutorial"
- ✅ "Add to Cart" action is NOT visible
- ✅ "View Selections" action is NOT visible
- ✅ "Select Tutorial" action has calendar icon
- ✅ Tooltip shows "Select Tutorial" on hover

**Pass Criteria**: All 5 expected results confirmed

---

### Scenario 4: Conditional Action Visibility - With Selections (FR-011, FR-012, FR-013)

**Objective**: Verify all 3 actions are visible when tutorials are selected

**Steps**:
1. Click "Select Tutorial" action to open dialog
2. Select at least one tutorial from the dialog
3. Close the dialog
4. Click the Speed Dial button again

**Expected Results**:
- ✅ 3 actions are visible
- ✅ "Add to Cart" action is visible with cart icon
- ✅ "Select Tutorial" action is visible with calendar icon
- ✅ "View Selections" action is visible with view/list icon
- ✅ All actions have proper tooltips

**Pass Criteria**: All 5 expected results confirmed

---

### Scenario 5: "Select Tutorial" Action Integration (FR-014)

**Objective**: Verify "Select Tutorial" action opens the tutorial selection dialog

**Steps**:
1. Open the Speed Dial
2. Click the "Select Tutorial" action (calendar icon)

**Expected Results**:
- ✅ Tutorial selection dialog opens
- ✅ Speed Dial closes automatically
- ✅ Dialog displays tutorial variations for the product
- ✅ Can select tutorials from dialog
- ✅ Closing dialog returns to product card

**Pass Criteria**: All 5 expected results confirmed

---

### Scenario 6: "View Selections" Action Integration (FR-015)

**Objective**: Verify "View Selections" action opens the selections panel

**Prerequisites**: Must have selected tutorials from Scenario 5

**Steps**:
1. Open the Speed Dial
2. Click the "View Selections" action (view icon)

**Expected Results**:
- ✅ Tutorial selections panel slides up from bottom
- ✅ Speed Dial closes automatically
- ✅ Panel shows selected tutorials for this subject
- ✅ Can modify selections from panel
- ✅ Panel displays correct subject code

**Pass Criteria**: All 5 expected results confirmed

---

### Scenario 7: Speed Dial Closing Behavior (FR-006, FR-017)

**Objective**: Verify Speed Dial closes properly

**Steps**:
1. Open the Speed Dial (don't click any action)
2. Click on the backdrop overlay (outside the Speed Dial)

**Expected Results**:
- ✅ Speed Dial closes
- ✅ "×" icon rotates back to "+"
- ✅ Actions disappear
- ✅ Backdrop overlay disappears

**Alternative Test**:
1. Open the Speed Dial again
2. Click the "×" close button

**Expected Results**:
- ✅ Same closing behavior as backdrop click

**Pass Criteria**: All closing behaviors work correctly

---

### Scenario 8: Keyboard Navigation (FR-022)

**Objective**: Verify Speed Dial supports keyboard navigation

**Steps**:
1. Use Tab key to navigate to the Speed Dial button
2. Press Enter to open it
3. Use Tab to navigate between actions
4. Press Enter on an action
5. Press Escape to close Speed Dial

**Expected Results**:
- ✅ Speed Dial receives focus on Tab
- ✅ Enter opens Speed Dial
- ✅ Tab navigates through actions
- ✅ Enter activates selected action
- ✅ Escape closes Speed Dial
- ✅ Focus management is logical

**Pass Criteria**: All 6 expected results confirmed

---

### Scenario 9: Mobile Responsiveness (FR-024, FR-025)

**Objective**: Verify Speed Dial works on mobile devices

**Steps**:
1. Resize browser to mobile width (375px) or use device emulator
2. Tap the Speed Dial button
3. Tap an action
4. Tap outside to close

**Expected Results**:
- ✅ Speed Dial is appropriately sized for mobile
- ✅ Touch events work correctly
- ✅ Actions are easily tappable (adequate spacing)
- ✅ Backdrop tap closes Speed Dial
- ✅ No layout issues or overlaps

**Pass Criteria**: All 5 expected results confirmed

---

### Scenario 10: Regression Testing (FR-018, FR-019, FR-020, FR-021)

**Objective**: Verify no existing functionality is broken

**Steps**:
1. Complete a full tutorial selection workflow:
   - Select tutorials via dialog
   - View selections in panel
   - Modify tutorial choices
   - Add tutorials to cart
2. Verify tutorial information section displays correctly
3. Verify discount options still work
4. Verify price displays correctly

**Expected Results**:
- ✅ Tutorial selection dialog works exactly as before
- ✅ Tutorial selections panel works exactly as before
- ✅ Tutorial information section renders correctly
- ✅ Discount radio buttons function correctly
- ✅ Price updates based on discount selection
- ✅ Shopping cart integration works
- ✅ Loading states display correctly
- ✅ Error states display correctly

**Pass Criteria**: All 8 expected results confirmed - no regressions

---

## Performance Validation (NFR-003, NFR-004)

**Animation Performance**:
1. Open/close Speed Dial multiple times
2. Verify animations are smooth (< 300ms)
3. No lag or stuttering

**Page Load Performance**:
1. Measure page load time before implementation
2. Measure page load time after implementation
3. Verify no significant increase (< 50ms difference acceptable)

---

## Cross-Browser Testing (NFR-005)

Test all scenarios in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

---

## Accessibility Validation (FR-023)

**Screen Reader Testing**:
1. Use screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate to Speed Dial
3. Verify proper announcements:
   - Speed Dial button label
   - Action names
   - State changes (open/closed)

**Expected**:
- ✅ All elements have proper ARIA labels
- ✅ State changes are announced
- ✅ Action purpose is clear

---

## Success Criteria Summary

The feature passes quickstart testing when:

1. ✅ All 10 scenarios pass
2. ✅ Performance validation passes
3. ✅ Cross-browser testing passes (4 browsers)
4. ✅ Accessibility validation passes
5. ✅ No regressions identified

---

## Rollback Procedure

If critical issues are found:

1. Create rollback branch:
   ```bash
   git checkout -b rollback-speed-dial
   ```

2. Revert the commit:
   ```bash
   git revert <commit-hash>
   ```

3. Test rollback:
   - Verify separate buttons return
   - Verify all existing functionality works

4. Push rollback if needed:
   ```bash
   git push origin rollback-speed-dial
   ```

---

## Notes for Testers

- Clear browser cache between tests
- Test with and without browser extensions disabled
- Document any unexpected behaviors with screenshots
- Record animation performance issues with screen recording
- Test on actual mobile devices if available (not just emulator)

---

**Last Updated**: 2025-10-01
**Tester**: _________________
**Date Tested**: _________________
**Result**: PASS / FAIL (circle one)
