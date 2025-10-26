# Quickstart Testing Guide - Navbar Filters Display Feature

**Feature**: Stories 1.7-1.8 - Display Navbar Filters in FilterPanel and ActiveFilters
**Branch**: `006-docs-stories-story`
**Date**: 2025-10-19

## Prerequisites

Before testing, ensure:
- ✅ Story 1.2 complete (navbar filters in Redux state)
- ✅ Story 1.1 complete (URL synchronization working)
- ✅ Story 1.4 complete (backend filtering working)
- ✅ Development server running (`npm start` in frontend directory)
- ✅ Redux DevTools extension installed in browser

## Quick Validation (5 minutes)

### Test 1: Tutorial Format Filter Visibility and Interaction

**Goal**: Verify Tutorial Format filter section appears and works

1. Navigate to `/products` page
2. Open FilterPanel sidebar (click filter icon if on mobile)
3. **Verify**: "Tutorial Format" accordion section visible
4. Expand "Tutorial Format" section
5. **Verify**: Three radio options visible: "Online", "In-Person", "Hybrid"
6. Click "Online" radio button
7. **Verify**:
   - ✅ "Online" radio is checked
   - ✅ Chip appears in chip bar: "Tutorial Format: Online"
   - ✅ URL updates to include `?tutorial_format=online`
   - ✅ Product list refreshes (shows only online tutorial products)

**Expected Result**: Tutorial format filter is visible, functional, and updates UI correctly

---

### Test 2: Distance Learning Filter Visibility and Interaction

**Goal**: Verify Distance Learning filter section appears and works

1. From products page, open FilterPanel
2. **Verify**: "Distance Learning" accordion section visible
3. Expand "Distance Learning" section
4. **Verify**: Checkbox labeled "Distance Learning Only" visible
5. Check the "Distance Learning Only" checkbox
6. **Verify**:
   - ✅ Checkbox is checked
   - ✅ Chip appears in chip bar: "Distance Learning"
   - ✅ URL updates to include `?distance_learning=1`
   - ✅ Product list refreshes (shows only distance learning products)

**Expected Result**: Distance learning filter is visible, functional, and updates UI correctly

---

### Test 3: Tutorial Products Filter Visibility and Interaction

**Goal**: Verify Tutorial Products filter section appears and works

1. From products page, open FilterPanel
2. **Verify**: "Tutorial" accordion section visible
3. Expand "Tutorial" section
4. **Verify**: Checkbox labeled "Tutorial Products Only" visible
5. Check the "Tutorial Products Only" checkbox
6. **Verify**:
   - ✅ Checkbox is checked
   - ✅ Chip appears in chip bar: "Tutorial Products"
   - ✅ URL updates to include `?tutorial=1`
   - ✅ Product list refreshes (shows only tutorial products)

**Expected Result**: Tutorial products filter is visible, functional, and updates UI correctly

---

### Test 4: Chip Removal Functionality

**Goal**: Verify navbar filter chips can be removed via × button

**Setup**: Apply Tutorial Format: Online filter (from Test 1)

1. Locate "Tutorial Format: Online" chip in chip bar
2. **Verify**: Chip has × delete icon
3. Click × icon on chip
4. **Verify**:
   - ✅ Chip disappears immediately
   - ✅ "Online" radio unchecks in FilterPanel
   - ✅ URL parameter `tutorial_format=online` removed
   - ✅ Product list refreshes (shows all tutorial formats)

**Expected Result**: Clicking chip × removes filter from all locations (chip bar, FilterPanel, URL, results)

---

### Test 5: Clear All Filters

**Goal**: Verify "Clear All Filters" button clears navbar filters

**Setup**: Apply multiple filters:
- Subject: CB1 (existing filter)
- Tutorial Format: Online (navbar filter)
- Distance Learning: checked (navbar filter)

1. **Verify**: Multiple chips visible (Subject, Tutorial Format, Distance Learning)
2. Click "Clear All Filters" button
3. **Verify**:
   - ✅ All chips disappear (including navbar filter chips)
   - ✅ All FilterPanel checkboxes/radios unchecked
   - ✅ URL resets to `/products` (no query parameters)
   - ✅ Product list shows all products (no filters applied)

**Expected Result**: Clear All removes navbar filters along with existing filters

---

### Test 6: Multiple Navbar Filters Simultaneously

**Goal**: Verify multiple navbar filters work together

1. From products page, apply:
   - Tutorial Format: Hybrid
   - Distance Learning: checked
   - Tutorial Products: checked
2. **Verify**:
   - ✅ Three navbar filter chips visible
   - ✅ URL contains all three parameters: `?tutorial_format=hybrid&distance_learning=1&tutorial=1`
   - ✅ Product list shows only products matching ALL three criteria (AND logic)
3. Remove Tutorial Format chip (click ×)
4. **Verify**:
   - ✅ Tutorial Format chip disappears
   - ✅ Distance Learning and Tutorial chips remain
   - ✅ URL only has `?distance_learning=1&tutorial=1`
   - ✅ Product list updates (now includes all tutorial formats)

**Expected Result**: Multiple navbar filters combine with AND logic and can be independently removed

---

### Test 7: URL Shareability

**Goal**: Verify navbar filters persist via URL

**Setup**: Apply Tutorial Format: Online and Distance Learning filters

1. Copy URL from address bar (should be `/products?tutorial_format=online&distance_learning=1`)
2. Open URL in new browser tab
3. **Verify**:
   - ✅ "Tutorial Format: Online" chip appears
   - ✅ "Distance Learning" chip appears
   - ✅ "Online" radio checked in FilterPanel
   - ✅ "Distance Learning Only" checkbox checked in FilterPanel
   - ✅ Product list shows filtered results matching both criteria

**Expected Result**: Opening URL with navbar filter parameters restores full filter state

---

### Test 8: Browser Back/Forward Buttons

**Goal**: Verify browser navigation works with navbar filters

1. Start at `/products` (no filters)
2. Apply Tutorial Format: Online (`/products?tutorial_format=online`)
3. Apply Distance Learning (`/products?tutorial_format=online&distance_learning=1`)
4. Click browser Back button
5. **Verify**:
   - ✅ URL reverts to `/products?tutorial_format=online`
   - ✅ Distance Learning chip disappears
   - ✅ Distance Learning checkbox unchecks
   - ✅ Tutorial Format chip remains
   - ✅ Product list updates
6. Click browser Forward button
7. **Verify**:
   - ✅ URL returns to `/products?tutorial_format=online&distance_learning=1`
   - ✅ Both chips reappear
   - ✅ Both filters reapply

**Expected Result**: Browser back/forward correctly navigates through filter state changes

---

## Mobile Responsiveness Testing (3 minutes)

### Test 9: Mobile FilterPanel Drawer

**Goal**: Verify navbar filters work on mobile devices

**Setup**: Resize browser to mobile width (< 600px) or use Chrome DevTools mobile emulation

1. Navigate to `/products`
2. **Verify**: FilterPanel is hidden (drawer closed)
3. Click filter icon to open drawer
4. **Verify**:
   - ✅ FilterPanel drawer slides in from side
   - ✅ "Tutorial Format", "Distance Learning", "Tutorial" sections visible
5. Expand "Tutorial Format" section
6. **Verify**: Radio buttons have adequate touch target size (at least 44×44px)
7. Tap "Online" radio button
8. **Verify**:
   - ✅ Filter applies successfully
   - ✅ Drawer closes (or remains open - depends on UX design)
   - ✅ Chip appears in chip bar

**Expected Result**: FilterPanel drawer works smoothly on mobile with proper touch targets

---

### Test 10: Mobile Chip Wrapping

**Goal**: Verify chips wrap correctly on narrow screens

**Setup**: Mobile viewport with multiple filters active

1. Apply 5+ filters (mix of existing and navbar filters):
   - Subject: CB1
   - Category: Bundle
   - Tutorial Format: Online
   - Distance Learning: checked
   - Tutorial Products: checked
2. **Verify**:
   - ✅ Chips wrap to multiple rows on narrow screen
   - ✅ No horizontal scrolling required
   - ✅ All chips remain readable
   - ✅ × delete icons on chips are easily tappable (44×44px minimum)

**Expected Result**: Chip bar is fully responsive and usable on mobile

---

## Redux DevTools Verification (2 minutes)

### Test 11: Redux State Inspection

**Goal**: Verify navbar filters update Redux state correctly

**Prerequisites**: Redux DevTools browser extension installed

1. Open browser DevTools (F12)
2. Click "Redux" tab
3. Navigate to `/products` in app
4. In Redux DevTools, view State tab
5. **Verify initial state**:
   ```json
   {
     "filters": {
       "tutorial_format": null,
       "distance_learning": false,
       "tutorial": false
     }
   }
   ```
6. Apply Tutorial Format: Online filter
7. In Redux DevTools, view Action tab
8. **Verify action dispatched**:
   ```
   filters/setTutorialFormat
   payload: "online"
   ```
9. View State tab again
10. **Verify state updated**:
    ```json
    {
      "filters": {
        "tutorial_format": "online",
        "distance_learning": false,
        "tutorial": false
      }
    }
    ```

**Expected Result**: Redux state updates match user interactions

---

## Performance Validation (2 minutes)

### Test 12: FilterPanel Render Performance

**Goal**: Verify no noticeable slowdown when adding navbar filter sections

1. Open browser DevTools > Performance tab
2. Start recording
3. Navigate to `/products`
4. Open FilterPanel
5. Stop recording
6. **Verify**: FilterPanel render time < 100ms (target: < 5ms for navbar sections)

**Expected Result**: No performance degradation from adding navbar filter sections

---

### Test 13: API Call Debouncing

**Goal**: Verify rapid filter toggling doesn't spam API

1. Open browser DevTools > Network tab
2. Filter network requests to show only `/api/products/unified-search/`
3. Rapidly toggle Distance Learning checkbox on/off 5 times in 1 second
4. **Verify**:
   - ✅ NOT 10 API calls (5 on, 5 off)
   - ✅ Only 1-2 API calls made (debounced to 250ms)

**Expected Result**: API calls are properly debounced to prevent server overload

---

## Accessibility Testing (3 minutes)

### Test 14: Keyboard Navigation

**Goal**: Verify navbar filters are keyboard-accessible

1. Navigate to `/products`
2. Press Tab key repeatedly to move through page
3. **Verify**:
   - ✅ Focus moves to FilterPanel sections
   - ✅ Focus indicators clearly visible on filter sections
   - ✅ Enter key expands/collapses accordion sections
4. Tab to "Online" radio button
5. **Verify**: Focus indicator visible on radio button
6. Press Space key
7. **Verify**: Radio button selects, filter applies
8. Tab to "Distance Learning Only" checkbox
9. Press Space key
10. **Verify**: Checkbox checks, filter applies
11. Tab to Tutorial Format chip × button
12. Press Enter key
13. **Verify**: Chip removes, filter clears

**Expected Result**: All navbar filter interactions work via keyboard alone (no mouse required)

---

### Test 15: Screen Reader Support

**Goal**: Verify navbar filters work with screen readers

**Prerequisites**: Screen reader software (NVDA, JAWS, VoiceOver)

1. Enable screen reader
2. Navigate to `/products`
3. Tab to "Tutorial Format" accordion section
4. **Verify**: Screen reader announces "Tutorial Format, collapsed, button"
5. Press Enter to expand
6. **Verify**: Screen reader announces "Tutorial Format, expanded"
7. Tab to "Online" radio button
8. **Verify**: Screen reader announces "Online, radio button, not checked"
9. Press Space to select
10. **Verify**: Screen reader announces "Online, radio button, checked"
11. Tab to Tutorial Format chip
12. **Verify**: Screen reader announces "Tutorial Format: Online, button, deletable"

**Expected Result**: All navbar filter elements have proper ARIA labels and screen reader support

---

## Edge Case Validation (2 minutes)

### Test 16: Invalid URL Parameters

**Goal**: Verify system handles invalid navbar filter values gracefully

1. Manually navigate to `/products?tutorial_format=invalid_value`
2. **Verify**:
   - ✅ No error message shown
   - ✅ No chip appears for invalid tutorial format
   - ✅ Tutorial Format section shows no radio selected
   - ✅ Product list shows all products (filter ignored)
3. Manually navigate to `/products?distance_learning=invalid`
4. **Verify**:
   - ✅ No chip appears
   - ✅ Checkbox unchecked (treats as false)

**Expected Result**: Invalid values are silently ignored without breaking UI

---

### Test 17: Combination with Existing Filters

**Goal**: Verify navbar filters work alongside existing filters

1. Apply existing filter: Subject = CB1
2. **Verify**: Subject chip appears, product list filters
3. Apply navbar filter: Tutorial Format = Online
4. **Verify**:
   - ✅ Both chips visible (Subject: CB1 and Tutorial Format: Online)
   - ✅ URL: `/products?subject_code=CB1&tutorial_format=online`
   - ✅ Product list shows products matching BOTH filters (AND logic)
5. Remove Subject chip
6. **Verify**:
   - ✅ Subject chip disappears
   - ✅ Tutorial Format chip remains
   - ✅ Product list shows all online tutorials (not limited to CB1)

**Expected Result**: Navbar filters integrate seamlessly with existing filters

---

## Success Criteria

**All tests must pass** for feature acceptance:
- ✅ All 17 test scenarios pass without errors
- ✅ FilterPanel renders in < 100ms
- ✅ API calls debounced to prevent spam
- ✅ Keyboard navigation works for all interactions
- ✅ Screen reader support functional
- ✅ Mobile responsive with proper touch targets
- ✅ Redux state updates correctly
- ✅ URL synchronization working
- ✅ Browser back/forward functional
- ✅ Invalid values handled gracefully

**Estimated Total Testing Time**: 17 minutes

---

## Troubleshooting

### Problem: Chips not appearing when filters applied

**Solution**: Check Redux DevTools to verify filter state is updating. If state updates but chips don't appear, check FILTER_CONFIG in ActiveFilters.js.

### Problem: FilterPanel sections not visible

**Solution**: Verify FilterPanel.js has been updated with new accordion sections. Check browser console for any React errors.

### Problem: URL not updating when filters change

**Solution**: Verify urlSyncMiddleware is running. Check Redux DevTools Action tab to see if filter actions are dispatched.

### Problem: API calls not including navbar filters

**Solution**: Verify useProductsSearch hook includes navbar filters in payload. Check Network tab to inspect request body.

---

**Status**: ✅ Quickstart guide ready for manual validation testing
**Last Updated**: 2025-10-19
