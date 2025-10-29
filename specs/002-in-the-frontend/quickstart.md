# Quickstart: Scrollable Filter Groups User Acceptance Test

**Feature**: 002-in-the-frontend
**Date**: 2025-10-28
**Test Duration**: ~10 minutes
**Prerequisites**: Feature branch deployed to test environment

---

## Overview
This quickstart guide validates that scrollable filter groups work correctly from a user perspective, covering visual behavior, keyboard navigation, and responsive design across desktop and mobile viewports.

---

## Test Environment Setup

### Prerequisites
- [ ] Feature branch `002-in-the-frontend` merged and deployed
- [ ] Test environment URL accessible
- [ ] Chrome/Firefox/Safari browsers available
- [ ] Responsive design mode or mobile device for mobile testing

### Test Data Requirements
- Product catalog with **≥20 subjects** (to ensure scrolling is triggered)
- FilterPanel accessible from Products page (`/products`)

---

## Test Scenario 1: Desktop Scrollable Behavior

### Objective
Verify that long filter lists display with scrollbars on desktop viewports.

### Steps
1. **Navigate to Products page**
   - Open browser to test environment
   - Click "Products" in navigation menu
   - URL should be `/products`

2. **Open Subjects filter group**
   - Locate "Subjects" accordion in left sidebar filter panel
   - Click to expand the accordion
   - ✅ **PASS**: Accordion expands smoothly

3. **Verify scrollbar appears**
   - Observe the Subjects filter options list
   - If list has >~15 subjects (varies by viewport height):
     - ✅ **PASS**: Vertical scrollbar visible on right side of list
     - ✅ **PASS**: List height capped (doesn't extend beyond viewport)
   - If list has few subjects:
     - ✅ **PASS**: No scrollbar (list displays at natural height)

4. **Test scrolling functionality**
   - Use mouse wheel to scroll through subjects list
   - ✅ **PASS**: List scrolls smoothly without page scroll
   - ✅ **PASS**: Accordion header ("Subjects") remains visible (doesn't scroll)
   - ✅ **PASS**: Filter panel sidebar doesn't scroll with content

5. **Verify other filter groups**
   - Expand "Categories" accordion
   - Expand "Product Types" accordion
   - ✅ **PASS**: Each long list has independent scrollbar
   - ✅ **PASS**: Multiple expanded groups don't cause page overflow

---

## Test Scenario 2: Keyboard Navigation & Accessibility

### Objective
Verify that keyboard-only users can navigate scrollable filter lists effectively.

### Steps
1. **Start with Subjects filter expanded**
   - Navigate to Products page
   - Expand Subjects accordion (mouse click is OK for setup)

2. **Tab through filter options**
   - Press `Tab` repeatedly to focus each checkbox
   - ✅ **PASS**: Focus moves to next checkbox with each Tab press
   - ✅ **PASS**: Focus indicator (blue outline) clearly visible

3. **Verify auto-scroll on focus**
   - Continue tabbing until focused checkbox is below visible area
   - ✅ **PASS**: List automatically scrolls to bring focused checkbox into view
   - ✅ **PASS**: Scroll is smooth (not jarring jump)
   - ✅ **PASS**: Focused checkbox positioned near center/bottom of visible area

4. **Test Space key selection**
   - With checkbox focused, press `Space` key
   - ✅ **PASS**: Checkbox toggles checked/unchecked state
   - ✅ **PASS**: Products list updates to reflect filter

5. **Test Arrow key navigation (if implemented)**
   - With checkbox focused, try `Arrow Down` and `Arrow Up`
   - If arrow keys move focus:
     - ✅ **PASS**: Auto-scroll works with arrow keys too
   - If arrow keys don't work:
     - ✅ **PASS**: Tab/Shift+Tab navigation sufficient (acceptable)

### Screen Reader Test (Optional - Manual)
**Note**: Requires NVDA (Windows), JAWS (Windows), or VoiceOver (macOS)

1. Enable screen reader
2. Navigate to Subjects filter group
3. ✅ **PASS**: Screen reader announces "Subjects filter options, scrollable, region"
4. ✅ **PASS**: Number of checkboxes announced

---

## Test Scenario 3: Mobile Responsive Behavior

### Objective
Verify that scrollable behavior works correctly on mobile viewports with adjusted max-heights.

### Steps
1. **Switch to mobile viewport**
   - **Option A (Chrome DevTools)**: Press F12 → Click device toolbar → Select iPhone or Android
   - **Option B (Actual Device)**: Open test environment on mobile phone

2. **Open filter drawer**
   - Click "Filter" button at top of page
   - ✅ **PASS**: Filter drawer slides in from bottom/side

3. **Expand Subjects filter**
   - Tap Subjects accordion to expand
   - ✅ **PASS**: Accordion expands within drawer

4. **Verify mobile scrolling**
   - Observe list height
   - ✅ **PASS**: List height is shorter than desktop (40vh vs 50vh)
   - ✅ **PASS**: Scrollbar visible if many subjects
   - Use finger/trackpad to scroll list
   - ✅ **PASS**: Touch scrolling smooth and responsive

5. **Verify drawer behavior**
   - Scroll within Subjects list
   - ✅ **PASS**: Only filter list scrolls (not entire drawer)
   - Swipe down on drawer header
   - ✅ **PASS**: Drawer can still be closed (doesn't interfere with scrolling)

6. **Test landscape orientation (mobile devices)**
   - Rotate device to landscape mode
   - ✅ **PASS**: Max-height adjusts to 40vh (smaller viewport height)
   - ✅ **PASS**: Scrolling still works smoothly

---

## Test Scenario 4: Multiple Expanded Panels

### Objective
Verify that multiple expanded filter groups with scrollable content don't cause layout issues.

### Steps
1. **Expand multiple filter groups**
   - Expand Subjects accordion
   - Expand Categories accordion
   - Expand Product Types accordion
   - ✅ **PASS**: All three panels expand simultaneously

2. **Verify viewport constraint**
   - Observe entire filter panel height
   - ✅ **PASS**: Total filter panel doesn't exceed viewport height
   - ✅ **PASS**: Page-level scrollbar doesn't appear (or is minimal)

3. **Test scrolling in each panel**
   - Scroll within Subjects list
   - Scroll within Categories list
   - ✅ **PASS**: Each panel scrolls independently
   - ✅ **PASS**: Scrolling in one panel doesn't affect others

4. **Collapse panels**
   - Click each accordion header to collapse
   - ✅ **PASS**: Panels collapse smoothly
   - ✅ **PASS**: No layout jumps or visual glitches

---

## Test Scenario 5: Viewport Resize & Browser Compatibility

### Objective
Verify that scrollable behavior adapts to viewport changes and works across browsers.

### Steps
1. **Test viewport resize (Desktop)**
   - Start with browser at full screen (>1200px wide)
   - Expand Subjects filter
   - Observe max-height
   - Slowly resize browser window narrower
   - ✅ **PASS**: At 899px width, max-height switches from 50vh to 40vh
   - ✅ **PASS**: Scrollbar adjusts smoothly (no flicker)

2. **Test in Chrome**
   - Run all Test Scenario 1 steps
   - ✅ **PASS**: All behaviors work correctly

3. **Test in Firefox**
   - Run all Test Scenario 1 steps
   - ✅ **PASS**: All behaviors work correctly
   - ✅ **PASS**: Scrollbar styling may differ (acceptable browser variation)

4. **Test in Safari (if macOS available)**
   - Run all Test Scenario 1 steps
   - ✅ **PASS**: All behaviors work correctly
   - ✅ **PASS**: Scrollbar may be invisible until scroll starts (acceptable Safari behavior)

---

## Test Scenario 6: Accessibility Validation (Optional)

### Objective
Verify WCAG 2.1 Level AA compliance for scrollable regions.

### Prerequisites
- Axe DevTools browser extension installed
- Or use Chrome Lighthouse accessibility audit

### Steps
1. **Run automated accessibility audit**
   - Navigate to Products page with filters expanded
   - Run Axe DevTools or Lighthouse
   - ✅ **PASS**: No ARIA or keyboard navigation violations
   - ✅ **PASS**: Contrast ratios meet AA standards
   - ✅ **PASS**: Focus indicators visible

2. **Manual keyboard-only test**
   - Disconnect mouse/trackpad (or hide cursor)
   - Navigate entire FilterPanel using only keyboard
   - ✅ **PASS**: All filters reachable via Tab key
   - ✅ **PASS**: All filters selectable via Space/Enter
   - ✅ **PASS**: Focus always visible during scroll

---

## Acceptance Criteria Summary

### Required for PASS (All must be ✅)
- [ ] Desktop scrollable behavior works (Scenario 1)
- [ ] Keyboard navigation and auto-scroll work (Scenario 2)
- [ ] Mobile responsive scrolling works (Scenario 3)
- [ ] Multiple expanded panels don't cause overflow (Scenario 4)
- [ ] Viewport resize adapts max-heights (Scenario 5 - Chrome/Firefox)

### Optional but Recommended
- [ ] Screen reader announces scrollable regions (Scenario 2)
- [ ] Safari testing complete (Scenario 5)
- [ ] Accessibility audit passes (Scenario 6)

---

## Troubleshooting

### Issue: Scrollbar not appearing on desktop
**Possible Causes**:
- Not enough filter options to exceed max-height (50vh)
- Browser zoom level causing viewport calculation errors
- CSS styling not applied

**Debug Steps**:
1. Inspect AccordionDetails element in DevTools
2. Verify `maxHeight: 50vh` and `overflowY: auto` present in computed styles
3. Check element's `scrollHeight` vs `clientHeight` (scrollHeight should be greater)

### Issue: Auto-scroll not working on keyboard focus
**Possible Causes**:
- `scrollIntoView()` not called on focus event
- Browser blocking smooth scroll (check browser settings)

**Debug Steps**:
1. Open browser console
2. Add breakpoint in FilterPanel.js `handleCheckboxFocus` function
3. Verify function is called when checkbox receives focus

### Issue: Mobile drawer interferes with scrolling
**Possible Causes**:
- Touch event handlers conflict
- Drawer scroll vs content scroll competing

**Debug Steps**:
1. Check if drawer has `overflow: hidden` or similar on parent
2. Verify only AccordionDetails has `overflowY: auto`

---

## Test Report Template

**Tester Name**: __________________
**Date**: __________________
**Environment**: __________________
**Browser**: __________________

| Scenario | Result | Notes |
|----------|--------|-------|
| 1. Desktop Scrollable Behavior | ✅ PASS / ❌ FAIL | |
| 2. Keyboard Navigation | ✅ PASS / ❌ FAIL | |
| 3. Mobile Responsive | ✅ PASS / ❌ FAIL | |
| 4. Multiple Expanded Panels | ✅ PASS / ❌ FAIL | |
| 5. Viewport Resize | ✅ PASS / ❌ FAIL | |
| 6. Accessibility (Optional) | ✅ PASS / ❌ FAIL / ⏭️ SKIP | |

**Overall Result**: ✅ PASS / ❌ FAIL

**Issues Found**: _________________________________

**Sign-off**: _________________________________
