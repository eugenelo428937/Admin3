# Quickstart Guide: SearchBox Redux Migration

**Date**: 2025-10-20
**Feature**: Migrate SearchBox to Redux State Management

## Purpose

This quickstart guide provides step-by-step instructions to verify that the SearchBox Redux migration is working correctly. It covers both developer testing (Redux DevTools) and user-facing functionality (filter persistence, navigation).

## Prerequisites

- Admin3 application running (`npm start` in frontend directory)
- Redux DevTools browser extension installed
- Browser: Chrome, Firefox, or Edge (latest version)

## Part 1: Basic Filter Selection

### Step 1: Open Search Modal and Redux DevTools

**Action**:
1. Navigate to homepage: `http://localhost:3000`
2. Press `F12` to open browser DevTools
3. Click "Redux" tab in DevTools
4. Press `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac) to open search modal
   - OR click the search icon in the navbar

**Expected Result - UI**:
- ✅ Search modal opens
- ✅ Search input is auto-focused with white capsule background
- ✅ **No default/popular filters shown** (simplified UX)
- ✅ Search results area is empty until you type

**Expected Result - Redux DevTools**:
- ✅ Click "State" subtab in Redux DevTools
- ✅ See `filters.subjects: []` (empty initially)
- ✅ See `filters.searchQuery: ''` (empty initially)
- ✅ See `filters.product_types: []` (empty initially)

### Step 2: Enter Search Query

**IMPORTANT**: You must enter a search query to see results. No default/popular filters are shown.

**Action**:
1. Type "mock" into the search input (or "pack", "tutorial", "materials", etc.)
2. Wait for search results to load (~250ms debounce)

**Expected Result - UI**:
- ✅ Search input displays "mock"
- ✅ Loading spinner appears briefly
- ✅ Search results appear with products matching "mock"
- ✅ "Suggested Filters" section appears on the left with subjects/types relevant to search results

**Expected Result - Redux DevTools**:
1. Check "Action" subtab
2. ✅ See action: `filters/setSearchQuery` with payload `"mock"`
3. Check "State" subtab
4. ✅ See updated state: `filters.searchQuery: "mock"`

### Step 3: Select Subject Filter

**Action**:
1. In search modal, look at the left column "Suggested Filters" section
2. Click on a subject filter chip under "Subjects" (e.g., "CB1", "CB2", or any subject shown)

**Expected Result - UI**:
- ✅ Chip changes from outlined to filled (blue/primary color)
- ✅ Subject chip appears in SearchBox "Selected Filters" section above search input
- ✅ Chip has blue "primary" color and shows an X icon
- ✅ Product list filters to show only matching products
- ✅ Response time < 50ms (feels instant)

**Expected Result - Redux DevTools**:
1. Switch to "Action" subtab in Redux DevTools
2. ✅ See dispatched action: `filters/toggleSubjectFilter` with payload (e.g., `"CB1"`)
3. Switch to "State" subtab
4. ✅ See updated state: `filters.subjects: ["CB1"]`

### Step 4: Select Product Type Filter

**Action**:
1. In search modal, in the "Suggested Filters" section
2. Click on a product type filter chip under "Product Types" section (e.g., "Printed" or "Ebook")

**Expected Result - UI**:
- ✅ Chip changes from outlined to filled (blue/primary color)
- ✅ Product type chip appears in SearchBox "Selected Filters" section
- ✅ Total filter count updates: "Selected Filters (2)" if displayed
- ✅ Product list further refined to match both subject AND product type

**Expected Result - Redux DevTools**:
1. Check "Action" subtab
2. ✅ See action: `filters/toggleProductTypeFilter` with product type ID
3. Check "State" subtab
4. ✅ See updated state: `filters.product_types: ["8"]` (or relevant ID)

## Part 2: Filter Persistence

### Step 5: Close and Reopen Modal

**Action**:
1. Press `Esc` to close search modal
2. Wait 1 second
3. Press `Ctrl+K` to reopen search modal

**Expected Result - UI**:
- ✅ Modal opens
- ✅ Search input contains "mock" (persisted)
- ✅ **Search results automatically load** (search query persisted)
- ✅ Selected filter chips in "Suggested Filters" are filled/blue (persisted)
- ✅ Filter chips display in SearchBox "Selected Filters" section

**Expected Result - Redux DevTools**:
- ✅ State unchanged during modal close
- ✅ `filters.subjects: ["CB1"]` still present (if selected)
- ✅ `filters.product_types: ["8"]` still present (if selected)
- ✅ `filters.searchQuery: "mock"` still present

**Verification**:
This confirms filters persist across component unmount/remount cycles.

## Part 3: Navigation to Products Page

### Step 6: Navigate with Filters Applied

**Action**:
1. With filters selected (CB1, Materials, "mock pack")
2. Click "Show Matching Products" button in SearchResults

**Expected Result - Navigation**:
- ✅ Modal closes
- ✅ Browser navigates to `/products`
- ✅ URL contains filter parameters:
  - `?subject_code=CB1`
  - `&group=Materials` (or product type ID)
  - `&search=mock pack`

**Expected Result - Product List**:
- ✅ Product list displays filtered results
- ✅ Only products matching CB1 + Materials + "mock pack" shown
- ✅ Filter panel shows CB1 as active filter
- ✅ Search query "mock pack" visible in search UI

**Expected Result - Redux DevTools**:
- ✅ `filters.subjects: ["CB1"]` (unchanged)
- ✅ `filters.product_types: ["8"]` (unchanged)
- ✅ `filters.searchQuery: "mock pack"` (unchanged)
- ✅ No additional dispatches needed (filters already in Redux)

## Part 4: URL Synchronization

### Step 7: Verify URL → Redux Sync

**Action**:
1. Copy current URL: `http://localhost:3000/products?subject_code=CB1&group=8&search=mock+pack`
2. Open new browser tab
3. Paste URL and navigate

**Expected Result - Redux State Restored**:
- ✅ Product list displays filtered results immediately
- ✅ Redux DevTools shows restored state:
  - `filters.subjects: ["CB1"]`
  - `filters.product_types: ["8"]`
  - `filters.searchQuery: "mock pack"`
- ✅ Filter panel shows active filters

**Expected Result - Search Modal**:
1. Press `Ctrl+K` to open search modal
2. ✅ Filters pre-selected (CB1, Materials)
3. ✅ Search query pre-filled ("mock pack")

**Verification**:
This confirms bidirectional URL ↔ Redux synchronization works correctly.

## Part 5: Rapid Filter Changes

### Step 8: Test Performance with Rapid Clicks

**Action**:
1. Open search modal (`Ctrl+K`)
2. Rapidly click multiple filter chips in "Suggested Filters" section:
   - Click CB1 subject chip (select - turns blue)
   - Click CB2 subject chip (select - turns blue)
   - Click CB3 subject chip (select - turns blue)
   - Click CB1 chip again (deselect - turns gray/outlined)
   - Click CB2 chip again (deselect - turns gray/outlined)
3. Perform clicks as fast as possible (> 10 clicks/second)

**Expected Result - UI**:
- ✅ All chip state changes render correctly (outlined ↔ filled)
- ✅ No lag or delayed UI updates
- ✅ Filter chips in SearchBox "Selected Filters" update in real-time
- ✅ No chips stuck in wrong state

**Expected Result - Redux DevTools**:
1. Check "Action" subtab
2. ✅ All actions logged in correct order
3. ✅ Final state matches final UI:
   - If CB3 is checked: `filters.subjects: ["CB3"]`
4. ✅ No dropped actions
5. ✅ No race conditions

**Expected Result - Performance**:
- ✅ Each click response time < 50ms
- ✅ No frame drops or stuttering
- ✅ Smooth animations

## Part 6: Clear Filters

### Step 9: Clear All Filters

**Action**:
1. With multiple filters selected
2. Click "Clear All" button in SearchBox

**Expected Result - UI**:
- ✅ All "Suggested Filters" chips return to outlined/gray state (unselected)
- ✅ All filter chips removed from SearchBox "Selected Filters" section
- ✅ "Selected Filters" section hidden in SearchBox
- ✅ Search query remains (not cleared by "Clear All")

**Expected Result - Redux DevTools**:
1. Check "Action" subtab
2. ✅ See action: `filters/clearAllFilters` (or individual remove actions)
3. Check "State" subtab
4. ✅ See cleared state:
   - `filters.subjects: []`
   - `filters.product_types: []`
   - `filters.products: []`
5. ✅ Search query unchanged: `filters.searchQuery: "mock pack"`

### Step 11: Clear Individual Filter

**Action**:
1. Select multiple filters by clicking chips: CB1, CB2, and a product type
2. Click the "X" icon on CB1 chip in SearchBox "Selected Filters" section

**Expected Result - UI**:
- ✅ CB1 chip removed from SearchBox "Selected Filters" section
- ✅ CB1 chip in "Suggested Filters" returns to outlined/gray state (unselected)
- ✅ CB2 and product type remain selected (filled/blue)
- ✅ Filter count updates: "Selected Filters (2)"

**Expected Result - Redux DevTools**:
1. Check "Action" subtab
2. ✅ See action: `filters/removeSubjectFilter` with payload `"CB1"`
3. Check "State" subtab
4. ✅ See updated state: `filters.subjects: ["CB2"]`

## Part 7: Edge Cases

### Step 12: Filter Selection While on Products Page

**Action**:
1. Navigate to `/products` (product list page)
2. Open search modal (`Ctrl+K`)
3. Current filters from FilterPanel should pre-populate modal

**Expected Result**:
- ✅ Search modal opens with current filters pre-selected
- ✅ Filter chips in SearchModal match FilterPanel active checkboxes
- ✅ FilterPanel checkboxes (on Products page) match SearchModal selected chips
- ✅ Search query matches URL search parameter

**Verification**:
This confirms filter state is shared between SearchModal and FilterPanel (single source of truth).
Note: FilterPanel (on Products page) uses checkboxes, SearchModal uses clickable chips.

### Step 13: Navigate Away and Return

**Action**:
1. Select filters in search modal: CB1, Materials
2. Click "Show Matching Products" (navigate to `/products`)
3. Click "Home" in navbar (navigate away)
4. Click "Products" in navbar (return)

**Expected Result**:
- ✅ Filters cleared (navigation cleared state)
- ✅ Product list shows all products
- ✅ Redux state reset

**Alternative Flow**:
1. Select filters in search modal
2. Navigate to `/products`
3. Close browser tab
4. Reopen application with URL: `/products?subject_code=CB1`

**Expected Result**:
- ✅ Filters restored from URL
- ✅ Redux state initialized from URL parameters

## Success Criteria Summary

All test steps in this quickstart must be ✅ PASS for successful migration.

### Functional Requirements ✅
- [x] Filter selections persist across modal close/reopen
- [x] Search query persists across modal close/reopen
- [x] Filters visible in Redux DevTools
- [x] All filter types work (subjects, product_types, products)
- [x] Clear All clears filters
- [x] Individual filter removal works
- [x] Navigation to products page applies filters
- [x] URL synchronization works (Redux → URL and URL → Redux)

### Performance Requirements ✅
- [x] Filter chip click response < 50ms
- [x] Handles rapid filter changes (> 10/second)
- [x] No UI lag or stuttering
- [x] No frame drops during interactions

### Edge Cases ✅
- [x] Filters pre-populate when modal opened from products page
- [x] State persists across navigation
- [x] URL restoration works on page load

## Troubleshooting

### Issue: Filters don't persist across modal close/reopen

**Diagnosis**:
1. Check Redux DevTools → State tab
2. Verify state not cleared when modal closes
3. Look for unwanted `clearAllFilters` or `resetFilters` action

**Fix**:
- Remove any filter clearing logic from SearchModal `onClose` handler
- Ensure Redux state only cleared intentionally (not on component unmount)

### Issue: Redux DevTools shows no actions

**Diagnosis**:
1. Check Redux store configuration in `src/store/index.js`
2. Verify `devTools: true` in configureStore
3. Check Redux DevTools extension is installed and enabled

**Fix**:
- Reinstall Redux DevTools browser extension
- Ensure running in development mode (not production build)

### Issue: URL not updating with filter changes

**Diagnosis**:
1. Check Redux DevTools → Action tab
2. Verify filter actions dispatched (e.g., `toggleSubjectFilter`)
3. Check browser URL bar (should update automatically)

**Fix**:
- Verify `urlSyncMiddleware.js` is included in store middleware
- Check middleware listens to correct action types

### Issue: Performance degradation (lag on filter clicks)

**Diagnosis**:
1. Open React DevTools → Profiler tab
2. Record interaction (click filter chip in SearchModal or FilterPanel checkbox)
3. Check SearchBox render time

**Fix**:
- Add `React.memo` to SearchBox component
- Use memoized selectors (reselect)
- Check for unnecessary re-renders

## Conclusion

If all steps in this quickstart pass, the SearchBox Redux migration is complete and working correctly. The feature meets all functional requirements, performance targets, and handles edge cases properly.

**Next Steps**:
- Run automated test suite: `npm test`
- Performance validation: `npm test -- searchBoxPerformance.test.js`
- Code review before merging to main branch
