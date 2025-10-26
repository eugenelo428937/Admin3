# GitHub Issues: Search-Only Modal Manual Testing Failures

**Date**: 2025-10-21
**Manual Test Reference**: `plans/spec-filter-searching-refinement-20251021-manual-tests.md`
**Validation Summary**: `plans/spec-filter-searching-refinement-20251021-validation-summary.md`

---

## Issue 1: Search results don't reload when modal reopens with persisted query

**Priority**: Medium
**Labels**: `bug`, `UX`, `search-modal`, `redux`
**Test**: V008 (Search Query Persistence)
**Finding**: Line 99 in manual-tests.md

### Bug Description

When the search modal is closed and reopened, the search query persists in the input field (correct), but the Top 3 matching products don't reload automatically.

### Steps to Reproduce

1. Open search modal (Ctrl+K)
2. Type "mock" in search input
3. Wait for Top 3 products to appear
4. Press Esc to close modal
5. Press Ctrl+K to reopen modal

**Expected**: Search input shows "mock" AND Top 3 products reload automatically

**Actual**: Search input shows "mock" but search results area is empty

### Root Cause

`frontend/react-Admin3/src/components/SearchBox.js` has no `useEffect` to trigger `performSearch()` on mount when `searchQuery` is present in Redux state.

### Suggested Fix

Add useEffect to trigger search when modal opens with persisted query:

```javascript
// In SearchBox.js, after line 36 (after autoFocus useEffect)
useEffect(() => {
  if (searchQuery && searchQuery.length >= 2) {
    performSearch(searchQuery);
  }
}, []); // Run once on mount
```

**Alternative approach**: Add dependency on `searchQuery` but prevent infinite loop:
```javascript
useEffect(() => {
  if (searchQuery && searchQuery.length >= 2 && !searchResults) {
    performSearch(searchQuery);
  }
}, [searchQuery, searchResults]);
```

### Additional Context

- Search query persistence works correctly (FR-001, FR-013)
- Redux state not cleared on modal unmount (correct behavior)
- Issue is only with triggering the search on mount

---

## Issue 2: Confusing search behavior on products page - label shows "Search Results" but doesn't filter

**Priority**: High
**Labels**: `bug`, `UX`, `search`, `needs-clarification`
**Test**: V009 (Navigation to Products Page)
**Finding**: Line 128-132 in manual-tests.md

### Bug Description

When navigating from search modal to products page with a search query:
1. ProductList shows "Search Results for 'mock'" label
2. But shows ALL products (not filtered by search query)
3. FilterPanel shows "1 Active filter" but doesn't display what the filter is

This creates a confusing UX - the label implies the products are filtered by the search query, but they're not.

### Steps to Reproduce

1. Open search modal (Ctrl+K)
2. Type "mock" in search input
3. Wait for Top 3 products to appear
4. Click "Show All Matching Products"
5. Navigate to `/products`

**Expected** (based on label): Only products matching "mock" shown

**Actual**: ALL products shown, but label says "Search Results for 'mock'"

### Root Cause

**Code Analysis**:

1. `frontend/react-Admin3/src/hooks/useProductsSearch.js` line 103-105:
   ```javascript
   // Note: searchQuery is NOT sent to unified_search endpoint
   // Text search is handled by the fuzzy-search endpoint in SearchBox
   // The unified_search endpoint only accepts: subjects, categories, product_types, products, modes_of_delivery
   ```

2. `frontend/react-Admin3/src/components/Product/ProductList.js` line 349-352:
   ```javascript
   {searchQuery && (
     <span style={{ marginLeft: 8 }}>
       for "{searchQuery}"
     </span>
   )}
   ```

So searchQuery is stored in Redux and displayed in the label, but NOT sent to the API.

### Decision Required

**Option A**: Search query should NOT filter products page (spec is correct)
- Fix: Remove "Search Results for {searchQuery}" label from ProductList
- Fix: Don't show search query as active filter in FilterPanel
- Fix: Clear searchQuery from Redux when navigating to products page

**Option B**: Search query SHOULD filter products page (user expectation is correct)
- Fix: Send searchQuery to fuzzy-search endpoint from products page
- Fix: Apply fuzzy search results as a filter
- Fix: Show search query clearly in FilterPanel active filters

**Recommendation**: Need product owner decision on intended behavior.

### Spec Reference

`specs/spec-filter-searching-refinement-20251021.md`:
- Line 125: "Search query persists in Redux for UI purposes but is NOT sent as a filter to the products page"
- Line 232: "FilterPanel on products page is the exclusive location for filtering"

But this creates confusion when the label says "Search Results for {query}".

---

## Issue 3: Short queries (< 2 characters) trigger API calls

**Priority**: Low
**Labels**: `bug`, `performance`, `search-modal`
**Test**: V011 Step 6B (Short Query)
**Finding**: Line 190 in manual-tests.md

### Bug Description

Typing a single character in the search input triggers an API call to `/api/products/current/fuzzy-search/?q=a&min_score=60&limit=50`, even though queries shorter than 2 characters should not trigger search.

### Steps to Reproduce

1. Open search modal (Ctrl+K)
2. Open browser Network tab
3. Type single character "a"
4. Wait 300ms (debounce)

**Expected**: No API call, helpful message "Enter at least 2 characters to search"

**Actual**: API call fires, no helpful message

### Root Cause

`frontend/react-Admin3/src/components/SearchBox.js` line 45-47:

```javascript
if (!query || query.length < 2) {
  // Get default data when no search query
  results = await searchService.getDefaultSearchData(); // ❌ Still makes API call!
}
```

The code calls `getDefaultSearchData()` for short queries instead of returning early.

### Suggested Fix

```javascript
if (!query || query.length < 2) {
  // Don't search for empty or short queries
  setSearchResults(null);
  if (onSearchResults) {
    onSearchResults(null, query);
  }
  setLoading(false);
  return; // Exit early
}

// Perform actual search (only for queries >= 2 chars)
results = await searchService.fuzzySearch(query);
```

### Additional Context

- Performance impact: Unnecessary API calls for every single character typed
- UX impact: No helpful message shown for short queries (spec requirement NFR-004)
- Backend impact: Increased server load for invalid queries

---

## Issue 4: Enter key behavior documentation mismatch (DOCUMENTATION FIX ONLY)

**Priority**: Low
**Labels**: `documentation`, `spec`
**Test**: V010 (Enter Key Navigation)
**Finding**: Line 152 in manual-tests.md

### Issue Description

Spec says: "Press Enter should change focus to 'Show All Matching Products' button"

**Actual behavior**: Enter key navigates directly to `/products` (bypasses button focus)

**Decision**: Keep actual implementation - it's better UX.

### Fix Required

Update documentation only:
1. `specs/spec-filter-searching-refinement-20251021.md` FR-006
2. `plans/spec-filter-searching-refinement-20251021-manual-tests.md` V010

### Code Reference

`frontend/react-Admin3/src/components/SearchBox.js` line 103-107:
```javascript
const handleKeyDown = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleShowMatchingProducts(); // Navigates directly ✅ Better UX
  }
};
```

**No code change needed** - actual implementation is correct.

---

## Summary

| Issue | Type | Priority | Action Required |
|-------|------|----------|-----------------|
| #1: Search results don't reload | Bug | Medium | Code fix (add useEffect) |
| #2: Confusing search behavior | Bug/UX | High | **Needs product owner decision** |
| #3: Short queries trigger API | Bug | Low | Code fix (return early) |
| #4: Enter key documentation | Docs | Low | Update spec/tests only |

---

## Create Issues

To create these as GitHub issues, run:

```bash
gh issue create --title "Bug: Search results don't reload when modal reopens" --body-file issue1.md --label "bug,UX,search-modal,redux"
gh issue create --title "Bug: Confusing search behavior on products page" --body-file issue2.md --label "bug,UX,search,needs-clarification"
gh issue create --title "Bug: Short queries trigger API calls" --body-file issue3.md --label "bug,performance,search-modal"
```

Or copy the content above and manually create issues in GitHub web UI.

---

**Created**: 2025-10-21
**Manual Testing Reference**: `plans/spec-filter-searching-refinement-20251021-manual-tests.md`
