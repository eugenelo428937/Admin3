# Quickstart: Mobile Responsive Summary Bar Testing Guide

**Feature**: Mobile Responsive Tutorial Summary Bar
**Branch**: `epic-4-story-3-mobile-responsive-summary-bar`
**Last Updated**: 2025-10-26

## Purpose

This guide provides step-by-step instructions for testing the mobile responsive tutorial summary bar across different devices, breakpoints, and accessibility scenarios.

## Prerequisites

- ✅ Frontend development server running (`npm start`)
- ✅ User account with tutorial selections in at least one subject
- ✅ Chrome DevTools or equivalent browser developer tools
- ✅ Optional: Real mobile devices for final validation

## Quick Test Flow

### 1. Desktop Regression Test (≥ 900px)

**Goal**: Verify desktop experience is unchanged

**Steps**:
1. Open browser to `http://localhost:3000/products`
2. Set viewport to 1920px × 1080px (Desktop)
3. Navigate to a tutorial product and add tutorial selections (1st, 2nd, 3rd choices)
4. Observe summary bar appears at **bottom-left** corner
5. Verify summary bar is **expanded by default** showing all choices
6. Verify **maximum width is 24rem** (~384px)
7. Verify all action buttons visible (Edit, Add to Cart, Remove)
8. Click **collapse button** (X icon) → bar collapses to single line
9. Click **collapsed bar** → bar expands back to full view

**Expected**: Identical to pre-responsive behavior

**Pass Criteria**:
- ✅ Bottom-left positioning preserved
- ✅ Expanded by default
- ✅ Max width 24rem
- ✅ All buttons visible and functional
- ✅ Collapse/expand works smoothly

---

### 2. Mobile Compact View Test (< 900px)

**Goal**: Verify mobile collapsed view by default

**Steps**:
1. Set viewport to **375px × 812px** (iPhone 12/13/14)
2. Navigate to tutorial product page
3. Add tutorial selections (1st, 2nd, 3rd choices)
4. Observe summary bar appears at **bottom** of viewport
5. Verify summary bar is **collapsed by default** (single line)
6. Verify displays: `{SUBJECT_CODE} Tutorial Choices` + expand icon
7. Verify bar uses **full viewport width** (minus safe margins)
8. Verify **positioned at bottom-0** (no gap from bottom)

**Expected**: Collapsed compact bar at viewport bottom

**Pass Criteria**:
- ✅ Collapsed by default on mobile
- ✅ Subject code visible
- ✅ Expand icon visible
- ✅ Full viewport width
- ✅ Bottom-0 positioning

---

### 3. Mobile Expand/Collapse Test

**Goal**: Verify Drawer interaction on mobile

**Steps**:
1. With mobile viewport (375px × 812px) and collapsed summary bar visible
2. **Tap collapsed bar** or **tap expand icon**
3. Observe **Drawer slides up from bottom** with backdrop
4. Verify Drawer shows:
   - Subject code title
   - All tutorial choices (1st, 2nd, 3rd)
   - Edit, Add to Cart, Remove buttons
   - Collapse button (X icon)
5. Verify **backdrop darkens** main content
6. Verify Drawer **max height ≤ 50% of viewport**
7. **Tap collapse button (X)** or **tap backdrop** → Drawer closes
8. Verify summary bar returns to collapsed state

**Expected**: Smooth Drawer animation, no layout shift

**Pass Criteria**:
- ✅ Drawer opens on tap
- ✅ All choices visible in Drawer
- ✅ Action buttons visible
- ✅ Backdrop present
- ✅ Max height ≤ 50vh
- ✅ Closes on collapse button or backdrop tap
- ✅ Smooth animation (no jank)

---

### 4. Touch Target Accessibility Test

**Goal**: Verify touch targets ≥ 44px × 44px

**Steps**:
1. Set viewport to mobile (375px × 812px)
2. Expand summary bar (Drawer visible)
3. **Inspect action buttons** using DevTools:
   - Edit button (pencil icon)
   - Add to Cart button (cart icon)
   - Remove button (trash icon)
   - Collapse button (X icon)
4. For each button, verify in DevTools:
   - `minWidth: 3rem` (48px) ✓
   - `minHeight: 3rem` (48px) ✓
   - Computed width ≥ 44px ✓
   - Computed height ≥ 44px ✓
5. Verify button spacing ≥ 8px (use DevTools ruler)

**Expected**: All buttons meet WCAG 2.1 AA touch target minimum

**Pass Criteria**:
- ✅ All buttons ≥ 44px × 44px
- ✅ Button spacing ≥ 8px
- ✅ No overlapping tap areas

---

### 5. Responsive Breakpoint Transition Test

**Goal**: Verify smooth transitions at 900px boundary

**Steps**:
1. Set viewport to **901px × 800px** (just above md breakpoint)
2. Verify summary bar in **desktop mode** (bottom-left, expanded)
3. **Slowly resize viewport** to **899px width** (just below md breakpoint)
4. Observe summary bar transitions to **mobile mode** (bottom-0, collapsed)
5. Verify **no layout shift** or visual glitches during transition
6. Verify tutorial selection data **persists** (same choices visible after transition)
7. Resize back to **901px** → verify returns to desktop mode
8. Test **exactly at 900px** → should be in desktop mode (≥ 900px)

**Expected**: Smooth transition, no data loss, no visual artifacts

**Pass Criteria**:
- ✅ 901px: Desktop mode
- ✅ 900px: Desktop mode (boundary inclusive)
- ✅ 899px: Mobile mode
- ✅ Smooth transition (no jumps)
- ✅ Data preserved across transitions
- ✅ No console errors

---

### 6. Multi-Subject Stacking Test (Mobile)

**Goal**: Verify multiple summary bars stack correctly on mobile

**Steps**:
1. Set viewport to mobile (375px × 812px)
2. Add tutorial selections for **2-3 different subjects** (e.g., CM2, SA1, CB1)
3. Verify summary bars **stack vertically** at bottom of viewport
4. Verify each bar maintains **independent collapse/expand state**:
   - Expand CM2 bar → only CM2 Drawer opens
   - Collapse CM2 bar → CM2 collapses, others unchanged
5. Verify **total height** of all expanded Drawers ≤ 50% viewport height
6. Verify bars have **gap spacing** between them (check TutorialSummaryBarContainer)

**Expected**: Clean vertical stacking, independent states

**Pass Criteria**:
- ✅ Bars stack vertically
- ✅ Independent collapse/expand states
- ✅ Total height ≤ 50vh when all expanded
- ✅ Gap spacing present

---

### 7. Z-index Coordination Test

**Goal**: Verify no UI element conflicts

**Steps**:
1. Set viewport to mobile (375px × 812px)
2. Add tutorial selections (summary bar visible)
3. **Expand summary bar** → Drawer opens (z-index 1200)
4. Verify **Drawer appears above** main content
5. **Open a modal dialog** (e.g., product details modal, cart modal)
6. Verify **modal appears above** summary bar Drawer (modal z-index 1300)
7. Verify **SpeedDial button** (if present) is **not blocked** by summary bar
   - SpeedDial z-index: 1050 (should be below summary bar)
8. Close modal → Drawer still visible
9. Collapse Drawer → collapsed bar visible

**Expected**: Correct stacking order maintained

**Pass Criteria**:
- ✅ Drawer (1200) above main content
- ✅ Modals (1300) above Drawer
- ✅ SpeedDial (1050) not blocked
- ✅ No overlapping conflicts

---

### 8. Keyboard Navigation Test

**Goal**: Verify keyboard accessibility

**Steps**:
1. Set viewport to mobile (375px × 812px)
2. Collapsed summary bar visible
3. **Tab through page** until summary bar is focused
4. Press **Enter** or **Space** → Drawer opens
5. **Tab through Drawer elements**:
   - Focus should move to: Title → Edit button → Add to Cart button → Remove button → Collapse button
6. Press **Escape** key → Drawer closes
7. Repeat on desktop (901px width):
   - Tab to summary bar
   - Tab through all action buttons
   - Enter/Space to activate buttons

**Expected**: Full keyboard navigation support

**Pass Criteria**:
- ✅ Summary bar focusable via Tab
- ✅ Enter/Space opens Drawer
- ✅ Tab cycles through all buttons
- ✅ Escape closes Drawer
- ✅ Focus trap works in Drawer (Tab doesn't escape to background)

---

### 9. Screen Reader Announcement Test

**Goal**: Verify screen reader accessibility

**Tools**: NVDA (Windows), JAWS (Windows), VoiceOver (macOS/iOS)

**Steps**:
1. Enable screen reader
2. Navigate to page with summary bar
3. Verify screen reader announces: `"{SUBJECT_CODE} Tutorial Choices, collapsed, button"`
4. Activate expand → Verify announces: `"Dialog opened"` or `"Tutorial selections"`
5. Navigate through Drawer content → Verify announces:
   - Choice details (1st - {eventCode} ({location}))
   - Button labels ("Edit", "Add to Cart", "Remove", "Collapse")
6. Close Drawer → Verify announces: `"Dialog closed"`

**Expected**: Clear announcements at each state change

**Pass Criteria**:
- ✅ Collapsed state announced
- ✅ Drawer opening announced
- ✅ Button labels clear
- ✅ Drawer closing announced

---

### 10. Reduced Motion Test

**Goal**: Verify animations respect user preference

**Steps**:
1. **Enable reduced motion** in OS settings:
   - **Windows**: Settings → Accessibility → Visual effects → Animation effects OFF
   - **macOS**: System Preferences → Accessibility → Display → Reduce motion ON
2. Set viewport to mobile (375px × 812px)
3. Expand summary bar → Verify **instant open** (no slide animation)
4. Collapse summary bar → Verify **instant close** (no slide animation)
5. Verify functionality **unchanged** (only animation disabled)
6. **Disable reduced motion** → Verify animations return

**Expected**: Smooth animations when enabled, instant transitions when disabled

**Pass Criteria**:
- ✅ Reduced motion preference respected
- ✅ Functionality works without animations
- ✅ Animations return when preference disabled

---

### 11. Animation Performance Test

**Goal**: Verify 60fps performance

**Tools**: Chrome DevTools Performance tab

**Steps**:
1. Open Chrome DevTools → **Performance** tab
2. Set viewport to mobile (375px × 812px)
3. Click **Record** button
4. **Expand summary bar** (Drawer opens)
5. **Collapse summary bar** (Drawer closes)
6. Stop recording
7. Analyze timeline:
   - Check **FPS meter** → should stay green (≥ 60fps)
   - Check **Layout shift** → should be 0 (no reflow)
   - Check **Paint operations** → should be minimal
8. Verify no **long tasks** (> 50ms) during animation

**Expected**: 60fps, no layout shift, GPU-accelerated transforms

**Pass Criteria**:
- ✅ Animation runs at 60fps
- ✅ No layout shift (CLS = 0)
- ✅ No long tasks during animation
- ✅ GPU-accelerated (check "Composited layers" in DevTools)

---

### 12. Cross-Device Real Device Testing

**Goal**: Validate on real mobile devices (not just emulation)

**Devices to Test**:
- **iPhone** (iOS Safari)
- **Android** (Chrome mobile)
- **iPad** (Safari tablet)

**Steps**:
1. Connect device to local dev server (use network IP, e.g., `http://192.168.1.100:3000`)
2. Navigate to products page
3. Add tutorial selections
4. Run through tests 1-10 on real device
5. Pay special attention to:
   - Touch responsiveness (no delays or mis-taps)
   - Smooth animations (real device performance)
   - Drawer swipe-to-dismiss (if Material-UI supports it)
   - Viewport rotation (portrait → landscape)

**Expected**: Identical behavior to browser DevTools emulation

**Pass Criteria**:
- ✅ All tests pass on real devices
- ✅ Touch interactions feel natural
- ✅ Animations smooth on real hardware
- ✅ No visual differences from emulation

---

## Regression Test Checklist

**Critical Desktop Behaviors to Preserve**:
- [ ] Summary bar positioned at bottom-left (16px from bottom, 16px from left)
- [ ] Summary bar expanded by default on desktop
- [ ] Summary bar max width 24rem on desktop
- [ ] All action buttons visible on desktop
- [ ] Collapse/expand functionality works on desktop
- [ ] Multiple subjects stack correctly on desktop (vertical stack with gap)
- [ ] Z-index coordination unchanged (1200 for summary bar)
- [ ] Summary bar hides when no selections remain
- [ ] Edit, Add to Cart, Remove buttons functional

**Critical Mobile Behaviors to Verify**:
- [ ] Summary bar collapsed by default on mobile
- [ ] Summary bar positioned at bottom-0 on mobile
- [ ] Summary bar full viewport width on mobile
- [ ] Drawer opens on expand (mobile expanded state)
- [ ] Drawer shows all choices and action buttons
- [ ] Touch targets ≥ 44px × 44px
- [ ] Keyboard navigation works
- [ ] Screen reader announces state changes
- [ ] Reduced motion preference respected
- [ ] 60fps animation performance

---

## Test Data Setup

**Create Test Tutorial Selections**:
1. Navigate to `/products?subject_code=CM2`
2. Click a tutorial product card
3. Select tutorial events:
   - 1st choice: Any tutorial event
   - 2nd choice: Different tutorial event (same or different location)
   - 3rd choice: Another tutorial event
4. Summary bar should appear at bottom

**Create Multi-Subject Test Data**:
1. Repeat above for multiple subjects (CM2, SA1, CB1)
2. Verify multiple summary bars stack correctly

**Reset Test Data**:
- Click "Remove" button on summary bar to clear all selections
- OR clear localStorage/sessionStorage
- OR use "Clear all choices" action (if available)

---

## Common Issues & Troubleshooting

### Issue: Summary bar not appearing on mobile
**Check**:
- Viewport width < 900px?
- Tutorial selections exist in context?
- Console errors?

**Fix**: Verify `useMediaQuery(theme.breakpoints.down('md'))` returns `true`

---

### Issue: Drawer not opening on mobile
**Check**:
- `isCollapsed` state changing?
- Drawer `open` prop set correctly?
- Material-UI Drawer imported?

**Fix**: Debug state in React DevTools

---

### Issue: Touch targets too small
**Check**:
- `touchIconButtonStyle` applied to all buttons?
- Computed styles showing `minWidth: 3rem`?

**Fix**: Verify import from `tutorialStyles.js`

---

### Issue: Desktop layout broken
**Check**:
- Responsive sx prop values correct?
- `theme.breakpoints.up('md')` applied for desktop?

**Fix**: Review responsive styling in `sx` prop

---

### Issue: Animation janky or slow
**Check**:
- Using CSS transforms?
- GPU acceleration enabled?
- Long tasks in Performance tab?

**Fix**: Material-UI Drawer handles animations internally - check for custom CSS overrides

---

## Automated Test Validation

After manual testing, run automated tests:

```bash
# Run all tests
npm test

# Run specific test files
npm test -- TutorialSelectionSummaryBar.test.js
npm test -- TutorialSummaryBarContainer.test.js

# Run with coverage
npm test -- --coverage --watchAll=false
```

**Expected**:
- All tests pass ✅
- Coverage ≥ 80% for modified components

---

## Sign-off Checklist

Before marking feature complete:

**Functional Requirements** (26 total):
- [ ] FR-001 to FR-008: Mobile behavior tests pass
- [ ] FR-009 to FR-012: Desktop behavior tests pass
- [ ] FR-013 to FR-018: Touch & accessibility tests pass
- [ ] FR-019 to FR-021: Multi-subject tests pass
- [ ] FR-022 to FR-026: Integration tests pass

**Cross-Device Testing**:
- [ ] iPhone 12/13/14 (375px × 812px) - Safari
- [ ] iPhone SE (375px × 667px) - Safari
- [ ] Samsung Galaxy S21 (360px × 800px) - Chrome
- [ ] iPad (768px × 1024px) - Safari
- [ ] Desktop (1920px × 1080px) - Chrome, Firefox, Safari

**Accessibility Validation**:
- [ ] Keyboard navigation works
- [ ] Screen reader announces state changes
- [ ] Touch targets ≥ 44px
- [ ] Reduced motion respected
- [ ] ARIA labels correct

**Performance Validation**:
- [ ] 60fps animations
- [ ] No layout shift
- [ ] No console errors
- [ ] Lighthouse accessibility score ≥ 90

**Regression Testing**:
- [ ] Desktop experience unchanged
- [ ] All existing functionality works
- [ ] No breaking changes to props/API

---

**Feature Status**: 🚧 Ready for Testing

**Next Steps**: Run through this quickstart guide, document any failures, fix issues, and re-test until all criteria pass.
