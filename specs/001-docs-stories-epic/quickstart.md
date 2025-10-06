# Quickstart: Tutorial Selection UX Refactoring

**Feature**: Epic 2 - Tutorial Selection UX Refactoring
**Date**: 2025-10-05
**Purpose**: Manual validation scenarios for Stories 2.1, 2.2, 2.3

## Prerequisites

**Backend Running**:
```bash
cd backend/django_Admin3
.venv/Scripts/activate  # Windows
python manage.py runserver 8888
```

**Frontend Running**:
```bash
cd frontend/react-Admin3
npm start
# Navigate to http://localhost:3000
```

**Test Data**: Ensure tutorial products exist with multiple events

---

## Story 2.1: Extract TutorialDetailCard

**Goal**: Verify TutorialDetailCard displays event info correctly and selection feedback works

### Manual Test Steps

1. **Navigate to Tutorials Page**
   - Go to http://localhost:3000/tutorials
   - Find a tutorial product (e.g., "CS2 Tutorial - Bristol")

2. **Open Selection Dialog**
   - Click "Select Tutorial" SpeedDial button
   - Dialog opens with tutorial events

3. **Verify Event Display**
   - ✅ Each event card shows:
     - Event title (e.g., "CS2 Introduction Tutorial")
     - Event code (e.g., "TUT-CS2-BRI-001")
     - Location (e.g., "Bristol")
     - Venue (e.g., "Room 101, Main Building")
     - Start and end dates

4. **Verify Choice Buttons**
   - ✅ Three buttons visible: "1st", "2nd", "3rd"
   - ✅ All buttons have outlined style (unselected)
   - ✅ Buttons horizontally aligned or vertically stacked (mobile)

5. **Test Selection Feedback**
   - Click "1st Choice" button on any event card
   - ✅ Button changes to contained style (filled with primary color)
   - ✅ Other choice buttons remain outlined
   - Click "2nd Choice" on a different event card
   - ✅ "2nd Choice" button fills, "1st Choice" button remains filled
   - Click "1st Choice" on yet another event (replacement)
   - ✅ Previous "1st Choice" reverts to outlined
   - ✅ New "1st Choice" fills

6. **Verify Grid Alignment**
   - Resize browser window to desktop, tablet, mobile sizes
   - ✅ All cards maintain consistent height (no ragged bottom edges)
   - ✅ Grid columns adjust: 3 (desktop), 2 (tablet), 1 (mobile)

**Expected Outcome**: TutorialDetailCard displays correctly, choice selection provides immediate visual feedback

---

## Story 2.2: Refactor TutorialSelectionDialog

**Goal**: Verify responsive grid layout and context integration

### Manual Test Steps

1. **Open Dialog on Desktop** (window width >1280px)
   - Click "Select Tutorial" on tutorial product
   - ✅ Dialog opens with title "{Subject} Tutorials - {Location}"
   - ✅ Event cards displayed in 3 columns
   - ✅ Grid spacing consistent

2. **Test Responsive Layout**
   - Resize browser to tablet width (960-1280px)
   - ✅ Grid re-flows to 2 columns
   - ✅ No horizontal scrollbar
   - Resize to mobile width (<960px)
   - ✅ Grid re-flows to 1 column
   - ✅ Cards stack vertically

3. **Test Context Integration**
   - Select "1st Choice" on an event
   - ✅ Choice saved (check localStorage: `tutorialChoices`)
   - ✅ Summary bar appears at bottom
   - Close dialog
   - Re-open dialog
   - ✅ "1st Choice" still selected (persisted state)

4. **Test Multiple Selections**
   - Select "2nd Choice" on different event
   - ✅ Both "1st" and "2nd" show filled buttons
   - ✅ Summary bar updates with 2 choices
   - Select "3rd Choice"
   - ✅ All 3 choices visible in summary bar

5. **Test Dialog Close Behavior**
   - Click close button (X icon)
   - ✅ Dialog closes
   - ✅ Selections preserved
   - Click backdrop (outside dialog)
   - ✅ Dialog closes
   - Press Escape key
   - ✅ Dialog closes

**Expected Outcome**: Responsive grid works across screen sizes, selections persist via context

---

## Story 2.3: Implement TutorialSelectionSummaryBar & UI Polish

**Goal**: Verify summary bar, SpeedDial fixes, and price info

### Manual Test Steps

#### Part A: Summary Bar

1. **Verify Expanded State**
   - Select 2 tutorial choices (1st, 2nd)
   - ✅ Summary bar displays at bottom center
   - ✅ Shows subject title "CS2 Tutorials"
   - ✅ Shows ordered list:
     - "1. 1st Choice - Bristol (TUT-CS2-BRI-001)"
     - "2. 2nd Choice - London (TUT-CS2-LON-002)"
   - ✅ Three buttons visible: [Edit] [Add to Cart] [Remove]

2. **Test Edit Button**
   - Click [Edit] in summary bar
   - ✅ Dialog opens with pre-selected choices
   - ✅ Can modify selections
   - Close dialog
   - ✅ Summary bar reflects updates

3. **Test Add to Cart**
   - Click [Add to Cart] in summary bar
   - ✅ Cart count increases by 1
   - ✅ Summary bar collapses to single line
   - ✅ Collapsed state shows: "CS2 Tutorials [Edit] [X]"
   - ✅ Choice details hidden until Edit clicked

4. **Test Remove Button**
   - Select choices for new subject (CP1)
   - ✅ CP1 summary bar appears
   - Click [Remove] on CP1 summary bar
   - ✅ CP1 summary bar disappears
   - ✅ CP1 choices cleared from localStorage

5. **Test Close Button**
   - Click [X] on summary bar
   - ✅ Summary bar hides
   - Refresh page
   - ✅ Summary bar reappears (choices persist)

#### Part B: SpeedDial Behavior

1. **Test Hover Expansion**
   - Hover mouse over SpeedDial button
   - ✅ SpeedDial expands showing actions
   - Move mouse away
   - ✅ SpeedDial collapses

2. **Test Click Collapse**
   - Hover to expand SpeedDial
   - Click "Select Tutorial" action
   - ✅ SpeedDial collapses immediately
   - ✅ Dialog opens

#### Part C: Price Info

1. **Test Price Info Button**
   - Hover over SpeedDial
   - Click "Price Info" action
   - ✅ Modal/popover opens
   - ✅ Displays variation-specific pricing table
   - ✅ Shows all tutorial variations with prices
   - ✅ Can close modal/popover

2. **Verify Pricing Display**
   - ✅ Price table has columns: Variation, Price
   - ✅ Rows show different tutorial formats (if applicable)
   - ✅ Prices formatted as currency (£XX.XX)

#### Part D: Mobile Responsiveness

1. **Test on Mobile** (or use Chrome DevTools mobile emulation)
   - Resize to phone width (375px)
   - ✅ Dialog full-width
   - ✅ Event cards stack (1 column)
   - ✅ Summary bar full-width
   - ✅ Buttons stack vertically if needed
   - ✅ Touch targets ≥44px (accessible)

**Expected Outcome**: Summary bar works correctly, SpeedDial behavior consistent, price info displays

---

## Regression Testing

**Ensure Epic 1 Functionality Intact**:

1. **Test Cart Integration**
   - Add tutorial with 3 choices to cart
   - ✅ Cart shows 1 item (not 3 duplicates)
   - Add another choice to same subject
   - ✅ Cart item updates (still 1 item)

2. **Test isDraft State**
   - Select choices but don't add to cart
   - ✅ Choices have `isDraft: true` in localStorage
   - Add to cart
   - ✅ Choices transition to `isDraft: false`
   - Remove from cart
   - ✅ Choices revert to `isDraft: true`

3. **Test Other Product Types**
   - Navigate to Materials products
   - ✅ Materials selection still works
   - Navigate to Bundles
   - ✅ Bundles still work
   - ✅ No visual/functional regressions

---

## Performance Validation

**Use Chrome DevTools Performance Tab**:

1. **Record Dialog Open**
   - Start performance recording
   - Click "Select Tutorial"
   - Stop recording
   - ✅ Dialog open animation <200ms
   - ✅ No layout shift (CLS <0.1)

2. **Record Grid Re-layout**
   - Open dialog on desktop
   - Start recording
   - Resize to mobile width
   - Stop recording
   - ✅ Grid transition <100ms
   - ✅ Smooth animation (no jank)

3. **Record SpeedDial Interaction**
   - Start recording
   - Hover SpeedDial
   - Click action
   - Stop recording
   - ✅ Expansion <100ms
   - ✅ Collapse <100ms

---

## Accessibility Validation

**Keyboard Navigation**:
1. Tab through tutorial product page
2. ✅ SpeedDial receives focus
3. Enter opens SpeedDial
4. Arrow keys navigate actions
5. Enter activates action
6. Tab into dialog
7. ✅ Focus trapped in dialog
8. Tab through choice buttons
9. ✅ All buttons reachable
10. Escape closes dialog
11. ✅ Focus returns to trigger button

**Screen Reader** (VoiceOver on Mac, NVDA on Windows):
1. Navigate to tutorial product
2. ✅ SpeedDial announced with role
3. Open dialog
4. ✅ Dialog title announced
5. Navigate to choice button
6. ✅ Selection state announced ("pressed" or "not pressed")
7. Navigate to summary bar
8. ✅ Choices announced in order

---

## Success Criteria Checklist

**Story 2.1**:
- [ ] TutorialDetailCard renders event info correctly
- [ ] Choice button visual feedback works (outlined → contained)
- [ ] Card dimensions consistent in grid

**Story 2.2**:
- [ ] Responsive grid: 3/2/1 columns (lg/md/sm)
- [ ] Context integration: selections persist
- [ ] Dialog opens/closes correctly

**Story 2.3**:
- [ ] Summary bar expands with draft choices
- [ ] Summary bar collapses when carted
- [ ] Edit/Add to Cart/Remove buttons work
- [ ] SpeedDial hover/click behavior consistent
- [ ] Price info displays correctly
- [ ] Mobile responsive across all components

**Regression**:
- [ ] Epic 1 cart integration works (no duplicates)
- [ ] isDraft state transitions correctly
- [ ] Other product types unaffected

**Performance**:
- [ ] Dialog open <200ms
- [ ] Grid re-layout <100ms
- [ ] SpeedDial response <100ms

**Accessibility**:
- [ ] Keyboard navigation complete
- [ ] Screen reader announcements correct
- [ ] Focus management works

---

**Quickstart Status**: Ready for use after implementation
**Next Step**: Run `/tasks` to generate task breakdown
