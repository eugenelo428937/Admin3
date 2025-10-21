# Manual Testing Checklist: Search-Only Modal Implementation

**Date**: 2025-10-21
**Feature**: Search Modal Filter Removal and Simplification
**Spec**: `specs/spec-filter-searching-refinement-20251021.md`
**Status**: Ready for Manual Execution

## Purpose

This checklist provides step-by-step instructions to verify the search-only modal implementation. It replaces the outdated `plans/spec-2025-10-20-000000/quickstart.md` which tests filter selection functionality that was removed.

**Key Change**: Search modal now provides **search-only functionality**. All filtering happens on the products page via FilterPanel.

**Total Steps**: 7 manual tests

## Prerequisites

- Admin3 application running (`npm start` in `frontend/react-Admin3` directory)
- Redux DevTools browser extension installed
- Browser: Chrome, Firefox, or Edge (latest version)

---

## V007: Basic Search

### Step 1: Open Search Modal

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
- ✅ Search results area shows helpful message: "Enter search query..."

**Expected Result - Redux DevTools**:
- ✅ Click "State" subtab in Redux DevTools
- ✅ See `filters.searchQuery: ''` (empty initially)
- ✅ See `filters.subjects: []` (empty)
- ✅ **No filter-related state changes** when modal opens

### Step 2: Enter Search Query

**Action**:
1. Type "mock" into the search input
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

**Result**: [ ] PASS / [ ] FAIL

---

## V008: Search Query Persistence

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
- ✅ **No filter state** changes

**Verification**:
This confirms search query persists across component unmount/remount cycles (FR-001, FR-013).

**Result**: [ ] PASS / [ ] FAIL

---

## V009: Navigation to Products Page

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
- ✅ `filters.subjects: []` (no filters)
- ✅ `filters.product_types: []` (no filters)

**Note**: Search query persists in Redux for UI purposes but is NOT sent as a filter to the products page. Users must use FilterPanel to filter products.

**Result**: [ ] PASS / [ ] FAIL

---

## V010: Enter Key Navigation

### Step 5: Navigate via Enter Key

**Action**:
1. Open search modal (`Ctrl+K`)
2. Type "tutorial" into search input
3. Press `Enter` key

**Expected Result - Navigation**:
- ✅ Modal closes
- ✅ Browser navigates to `/products`
- ✅ Search query "tutorial" persisted in Redux

**Expected Result - Redux DevTools**:
- ✅ `filters.searchQuery: "tutorial"`

**Verification**:
This confirms FR-006: "Users MUST be able to navigate to products page by pressing Enter in search input"

**Result**: [ ] PASS / [ ] FAIL

---

## V011: Error Handling

### Step 6A: No Matches

**Action**:
1. Open search modal (`Ctrl+K`)
2. Type "zzzzzzzzz" (nonsense query with no matches)
3. Wait for search to complete

**Expected Result - UI**:
- ✅ "No results found" message displayed (FR-009)
- ✅ Helpful message shown (e.g., "Try different search terms")
- ✅ No products displayed
- ✅ **No filter UI** shown

**Result**: [ ] PASS / [ ] FAIL

### Step 6B: Short Query (< 2 characters)

**Action**:
1. Open search modal (`Ctrl+K`)
2. Type single character "a"
3. Wait for debounce (300ms)

**Expected Result - UI**:
- ✅ No search executed (query too short)
- ✅ Helpful message shown: "Enter at least 2 characters to search"
- ✅ No products displayed
- ✅ No loading spinner

**Expected Result - Redux DevTools**:
- ✅ `filters.searchQuery: "a"` (state updated)
- ✅ No API call made (query too short)

**Result**: [ ] PASS / [ ] FAIL

---

## V012: Redux DevTools Visibility

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

**Result**: [ ] PASS / [ ] FAIL

---

## V013: Escape Key Closes Modal

### Step 8: Close Modal with Escape

**Action**:
1. Open search modal (`Ctrl+K`)
2. Type search query "mock"
3. Press `Esc` key

**Expected Result - UI**:
- ✅ Modal closes immediately
- ✅ Search query persisted in Redux (verified by reopening modal)

**Expected Result - Redux DevTools**:
- ✅ `filters.searchQuery: "mock"` (unchanged - not cleared on Esc)
- ✅ No actions dispatched on modal close

**Verification**:
This confirms FR-008: "Search modal MUST close when user presses Escape key"

**Result**: [ ] PASS / [ ] FAIL

---

## Success Criteria Summary

All 7 manual tests above must **PASS** for successful validation.

### Functional Requirements Validated
- [x] FR-001: Search query persists across modal close/reopen (V008)
- [x] FR-002: Search debounced by 300ms (V007 Step 2)
- [x] FR-003: Top 3 products displayed (V007 Step 2)
- [x] FR-005: "Show All Matching Products" navigates to /products (V009)
- [x] FR-006: Enter key navigates to /products (V010)
- [x] FR-008: Escape key closes modal (V013)
- [x] FR-009: "No results found" message shown (V011 Step 6A)
- [x] FR-012: No filter UI in modal (V007, V008, V009)
- [x] FR-013: Search query persists across modal cycles (V008)
- [x] FR-016: Search query visible in Redux DevTools (V012)
- [x] FR-017: `filters/setSearchQuery` action logged (V012)

### Non-Functional Requirements Validated
- [ ] NFR-002: Modal render time < 100ms (requires React DevTools Profiler)
- [ ] NFR-003: Search debounce = 300ms (observe timing in V007)

---

## Differences from Original quickstart.md

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

## Next Steps After Manual Testing

1. **Document Results**: Record PASS/FAIL for each step (V007-V013)
2. **Create Issues**: For any FAIL results, create GitHub issues with reproduction steps
3. **Update Coverage**: If tests pass, proceed to Phase V3 (Documentation Validation)
4. **Performance Validation**: Run Phase V4 tests (React DevTools Profiler measurements)

---

**Manual Testing Status**: ⏳ Pending User Execution
**Created**: 2025-10-21
**Replaces**: `plans/spec-2025-10-20-000000/quickstart.md` (outdated)
