# Quickstart Guide: Search-Only Modal Implementation

**Date**: 2025-10-20 (Updated: 2025-10-21 for search-only implementation)
**Feature**: Search Modal Filter Removal and Simplification
**Original Feature**: SearchBox Redux Migration (now simplified to search-only)

---

## ⚠️ **Important Notice**

This quickstart guide has been **completely replaced** to reflect the current search-only modal implementation.

**What Changed**:
- **Original implementation** (spec-2025-10-20-000000.md): SearchBox with Redux filter selection
- **Current implementation** (spec-filter-searching-refinement-20251021.md): Search-only modal, NO filter selection

**Key Change**: ALL filter selection functionality was removed from the search modal during implementation. The search modal now provides **search query input only**. All filtering happens on the products page via FilterPanel.

---

## Purpose

This quickstart guide provides step-by-step instructions to verify that the search-only modal is working correctly. It covers both developer testing (Redux DevTools) and user-facing functionality (search query persistence, navigation).

**Total Steps**: 7 manual testing steps

For detailed manual testing checklist, see: `plans/spec-filter-searching-refinement-20251021-manual-tests.md`

---

## Prerequisites

- Admin3 application running (`npm start` in frontend directory)
- Redux DevTools browser extension installed
- Browser: Chrome, Firefox, or Edge (latest version)

---

## Part 1: Basic Search

### Step 1: Open Search Modal and Redux DevTools

**Action**:
1. Navigate to homepage: `http://localhost:3000`
2. Press `F12` to open browser DevTools
3. Click "Redux" tab in DevTools
4. Press `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac) to open search modal

**Expected Result - UI**:
- ✅ Search modal opens
- ✅ Search input is auto-focused
- ✅ **No default/popular filters shown** (search-only implementation)
- ✅ **No "Suggested Filters" section** (filter UI completely removed)
- ✅ Search results area shows helpful message

**Expected Result - Redux DevTools**:
- ✅ Click "State" subtab in Redux DevTools
- ✅ See `filters.searchQuery: ''` (empty initially)
- ✅ **No filter actions** when modal opens

### Step 2: Enter Search Query

**Action**:
1. Type "mock" into the search input (or "pack", "tutorial", "materials")
2. Wait for search results to load (~300ms debounce)

**Expected Result - UI**:
- ✅ Search input displays "mock"
- ✅ Loading spinner appears briefly
- ✅ Top 3 matching products displayed in search results area
- ✅ **No "Suggested Filters" section** (filter UI removed)
- ✅ **No filter chips** anywhere in modal
- ✅ Result count displayed: "3 of X results matching 'mock'"
- ✅ "Show All Matching Products" button visible at bottom

**Expected Result - Redux DevTools**:
1. Check "Action" subtab
2. ✅ See action: `filters/setSearchQuery` with payload `"mock"`
3. Check "State" subtab
4. ✅ See updated state: `filters.searchQuery: "mock"`
5. ✅ **No filter actions** dispatched (no `toggleSubjectFilter`, etc.)

---

## Part 2: Search Query Persistence

### Step 3: Close and Reopen Modal

**Action**:
1. Press `Esc` to close search modal
2. Wait 1 second
3. Press `Ctrl+K` to reopen search modal

**Expected Result - UI**:
- ✅ Modal opens
- ✅ Search input contains "mock" (persisted from Redux)
- ✅ Search results automatically reload (search query persisted)
- ✅ Top 3 products displayed matching "mock"
- ✅ **No filter chips** displayed (search-only)

**Expected Result - Redux DevTools**:
- ✅ State unchanged during modal close
- ✅ `filters.searchQuery: "mock"` still present

**Verification**:
This confirms search query persists across component unmount/remount cycles (FR-001, FR-013 from spec).

---

## Part 3: Navigation to Products Page

### Step 4: Navigate via "Show All Matching Products" Button

**Action**:
1. With search query "mock" active in modal
2. Click "Show All Matching Products" button at bottom of search results

**Expected Result - Navigation**:
- ✅ Modal closes
- ✅ Browser navigates to `/products`
- ✅ **URL does NOT contain search query** (search query in Redux only, NOT URL)
- ✅ **URL does NOT contain filter parameters** (no filters set)

**Expected Result - Product List**:
- ✅ Product list displays ALL products (not filtered by search)
- ✅ FilterPanel on left shows NO active filters

**Expected Result - Redux DevTools**:
- ✅ `filters.searchQuery: "mock"` (unchanged - persisted in Redux)

**Note**: Search query persists in Redux for UI purposes but is NOT sent as a filter to the products page. Users must use FilterPanel to filter products.

---

## Part 4: Enter Key Navigation

### Step 5: Navigate via Enter Key

**Action**:
1. Open search modal (`Ctrl+K`)
2. Type "tutorial" into search input
3. Press `Enter` key

**Expected Result - Navigation**:
- ✅ Modal closes
- ✅ Browser navigates to `/products`
- ✅ Search query "tutorial" persisted in Redux

**Verification**:
This confirms FR-006: "Users MUST be able to navigate to products page by pressing Enter in search input"

---

## Part 5: Error Handling

### Step 6: Test No Matches and Short Query

**Test 6A: No Matches**:
1. Open search modal (`Ctrl+K`)
2. Type "zzzzzzzzz" (nonsense query with no matches)
3. Wait for search to complete

**Expected Result**:
- ✅ "No results found" message displayed (FR-009)
- ✅ Helpful message shown (e.g., "Try different search terms")
- ✅ No products displayed

**Test 6B: Short Query (< 2 characters)**:
1. Open search modal (`Ctrl+K`)
2. Type single character "a"
3. Wait for debounce (300ms)

**Expected Result**:
- ✅ No search executed (query too short)
- ✅ No products displayed
- ✅ No loading spinner
- ✅ Redux state: `filters.searchQuery: "a"` (state updated but no API call)

---

## Part 6: Redux DevTools Visibility

### Step 7: Verify Redux Actions

**Action**:
1. Open search modal (`Ctrl+K`)
2. Open Redux DevTools (F12 → Redux tab)
3. Click "Action" subtab
4. Type "pack" into search input
5. Observe actions logged

**Expected Result - Redux DevTools**:
- ✅ Action logged: `filters/setSearchQuery` with payload `"pack"`
- ✅ State updated: `filters.searchQuery: "pack"`
- ✅ **No filter actions** logged (no `toggleSubjectFilter`, `toggleProductTypeFilter`, etc.)
- ✅ Action visible in action history
- ✅ Can time-travel debug (click action to view state at that point)

**Verification**:
This confirms FR-016, FR-017: Search query changes visible in Redux DevTools for debugging.

---

## Part 7: Escape Key Closes Modal

### Step 8: Close Modal with Escape

**Action**:
1. Open search modal (`Ctrl+K`)
2. Type search query "mock"
3. Press `Esc` key

**Expected Result**:
- ✅ Modal closes immediately
- ✅ Search query persisted in Redux (verified by reopening modal)
- ✅ No actions dispatched on modal close

**Verification**:
This confirms FR-008: "Search modal MUST close when user presses Escape key"

---

## Success Criteria Summary

All test steps in this quickstart must be ✅ PASS for successful validation.

### Functional Requirements ✅
- [x] Search query persists across modal close/reopen (Step 3)
- [x] Search debounced by 300ms (Step 2)
- [x] Top 3 products displayed (Step 2)
- [x] "Show All Matching Products" navigates to /products (Step 4)
- [x] Enter key navigates to /products (Step 5)
- [x] "No results found" message shown (Step 6A)
- [x] No filter UI in modal (Steps 1-2)
- [x] Search query visible in Redux DevTools (Step 7)
- [x] Escape key closes modal (Step 8)

### Non-Functional Requirements ✅
- [x] Search debounce = 300ms (Step 2)
- [x] Modal render time acceptable (Step 1)

---

## Differences from Original Quickstart (spec-2025-10-20-000000.md)

**Removed Steps** (filter functionality no longer exists):
- ~~Step 3: Select Subject Filter~~ - Filter selection removed from modal
- ~~Step 4: Select Product Type Filter~~ - Filter selection removed from modal
- ~~Step 6: Navigate with Filters Applied~~ - No filters in search modal
- ~~Step 7: Verify URL → Redux Sync~~ - No filters in search modal
- ~~Step 8: Test Performance with Rapid Clicks~~ - No filter chips to click
- ~~Step 9: Clear All Filters~~ - No filter clearing in search modal
- ~~Step 10: Clear Individual Filter~~ - No filter chips to remove
- ~~Step 11: Filter Selection While on Products Page~~ - No filters in search modal
- ~~Step 12: Navigate Away and Return~~ - No filters to persist

**New Focus**: Search-only functionality, search query persistence, navigation behavior

---

## What Search Modal Does vs. What It Doesn't Do

### ✅ Search Modal DOES:
- Provide search query input
- Display top 3 matching products
- Persist search query in Redux across modal open/close
- Navigate to products page on "Show All Matching Products" or Enter key
- Show loading indicators during search
- Handle error cases (no matches, short queries)

### ❌ Search Modal DOES NOT:
- Display filter chips or "Suggested Filters" section
- Allow subject/category/product type selection
- Manage filter state (only search query state)
- Pre-populate filters from URL or Redux
- Show default/popular products on mount
- Apply filters when navigating to products page

### 🎯 Where Filtering Happens:
All filtering happens on the **products page** (`/products`) via the **FilterPanel** component on the left side. The search modal is exclusively for search query input.

---

## Troubleshooting

### Issue: Search query doesn't persist across modal close/reopen

**Diagnosis**:
1. Check Redux DevTools → State tab
2. Verify state not cleared when modal closes
3. Look for unwanted `resetFilters` or `clearSearchQuery` action

**Fix**:
- Remove any search query clearing logic from SearchModal `onClose` handler
- Ensure Redux state only cleared intentionally (not on component unmount)

### Issue: Redux DevTools shows no actions

**Diagnosis**:
1. Check Redux store configuration in `src/store/index.js`
2. Verify `devTools: true` in configureStore
3. Check Redux DevTools extension is installed and enabled

**Fix**:
- Reinstall Redux DevTools browser extension
- Ensure running in development mode (not production build)

### Issue: Search results not loading

**Diagnosis**:
1. Check browser console for errors
2. Verify search API endpoint responding (Network tab)
3. Check search query length (must be >= 2 characters)

**Fix**:
- Verify backend server running
- Check search service configuration
- Test search API directly with Postman/curl

---

## Conclusion

If all steps in this quickstart pass, the search-only modal implementation is working correctly. The feature meets all functional requirements for search query persistence, navigation, and user experience.

**Next Steps**:
- Run automated test suite: `npm test`
- Code review before merging to main branch
- Performance validation with React DevTools Profiler

---

**Quickstart Status**: ✅ Updated for Search-Only Implementation (2025-10-21)
**Replaces**: Original filter-based quickstart (outdated)
**Spec Reference**: `specs/spec-filter-searching-refinement-20251021.md`
**Detailed Testing**: `plans/spec-filter-searching-refinement-20251021-manual-tests.md`
