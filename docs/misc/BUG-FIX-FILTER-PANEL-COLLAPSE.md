# Bug Fix: Filter Panel Collapsing After Selection

**Issue**: When selecting a subject filter, the filter panel accordion collapses immediately, preventing users from selecting multiple subjects.

**Date**: 2025-10-23
**Story**: 1.10 - Centralized URL Parameter Utility
**Status**: FIXED

## Root Causes Identified

### 1. React.StrictMode Remounting Components (Primary Cause)
**Problem**: The app uses `<React.StrictMode>` (index.js:15) which intentionally causes components to mount → unmount → remount in development to detect side effects.

**Evidence**:
```
[FilterPanel] MOUNTED
[FilterPanel] UNMOUNTED  ← StrictMode remount
[FilterPanel] MOUNTED    ← Fresh state, accordion reset!
```

**Impact**: FilterPanel's `useState` for `expandedPanels` was reset to initial values on remount, collapsing the subjects accordion.

### 2. State Key Mismatch (Contributing Factor)
**Problem**: Accordion state used camelCase keys (`producttypes`, `modesOfDelivery`) but filter sections used snake_case (`product_types`, `modes_of_delivery`).

**Before** (BROKEN):
```javascript
const [expandedPanels, setExpandedPanels] = useState({
    subjects: true,
    producttypes: false,      // ❌ Wrong!
    modesOfDelivery: false    // ❌ Wrong!
});
```

When code tried `expandedPanels['product_types']`, it returned `undefined`, causing state corruption.

### 3. Unused useLocation Hook (Contributing Factor)
**Problem**: ProductList had `const location = useLocation();` which was never used. This hook causes re-renders on every URL change, even with `replaceState`.

## Fixes Applied

### Fix 1: Persist Accordion State Across Remounts ✅
**File**: `FilterPanel.js`

```javascript
// Before: State reset on every remount
const [expandedPanels, setExpandedPanels] = useState({
    subjects: true,
    // ...
});

// After: State persists using sessionStorage
const [expandedPanels, setExpandedPanels] = useState(() => {
    try {
        const saved = sessionStorage.getItem('filterPanelExpandedState');
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.warn('Failed to restore filter panel state:', e);
    }
    return { subjects: true, categories: false, ... };
});

// Persist changes
useEffect(() => {
    sessionStorage.setItem('filterPanelExpandedState', JSON.stringify(expandedPanels));
}, [expandedPanels]);
```

**Why sessionStorage?**
- Survives component remounts (React.StrictMode)
- Cleared when browser tab closes
- No server-side state needed
- Lightweight solution

### Fix 2: Correct State Key Names ✅
**File**: `FilterPanel.js`

```javascript
const [expandedPanels, setExpandedPanels] = useState({
    subjects: true,
    categories: false,
    product_types: false,      // ✅ Matches Redux key
    products: false,
    modes_of_delivery: false   // ✅ Matches Redux key
});
```

### Fix 3: Remove Unused useLocation Hook ✅
**File**: `ProductList.js`

```javascript
// Before:
import { useLocation, useNavigate } from 'react-router-dom';
const location = useLocation(); // ← Never used, causes re-renders

// After:
import { useNavigate } from 'react-router-dom';
// location removed
```

### Fix 4: Optimize Component Re-renders ✅
**File**: `FilterPanel.js`

```javascript
// Wrap component in React.memo to prevent unnecessary re-renders
export default React.memo(FilterPanel);
```

**File**: `ProductList.js`
```javascript
// Add stable key to FilterPanel
<FilterPanel key="desktop-filter-panel" isSearchMode={isSearchMode} />
```

## Testing

### Test Case: Select Multiple Subjects
**Steps**:
1. Navigate to `/products`
2. Expand "Subjects" filter accordion (should be open by default)
3. Click first subject checkbox (e.g., "CB1")
4. **Verify**: Accordion remains open
5. **Verify**: URL updates to `?subject_code=CB1`
6. Click second subject checkbox (e.g., "CB2")
7. **Verify**: Accordion remains open
8. **Verify**: URL updates to `?subject_code=CB1&subject_1=CB2`
9. Click third subject checkbox (e.g., "CB3")
10. **Verify**: Accordion remains open
11. **Verify**: URL updates to `?subject_code=CB1&subject_1=CB2&subject_2=CB3`

### Test Case: Accordion State Persists Across Navigation
**Steps**:
1. On `/products`, collapse "Subjects" accordion
2. Expand "Categories" accordion
3. Navigate away (e.g., to `/home`)
4. Navigate back to `/products`
5. **Verify**: "Subjects" still collapsed, "Categories" still expanded

### Test Case: State Cleared on Browser Tab Close
**Steps**:
1. On `/products`, expand/collapse various accordions
2. Close browser tab
3. Open new tab, navigate to `/products`
4. **Verify**: Accordions return to default state (Subjects open, others closed)

## Performance Impact

**Before**:
- ProductList re-rendered on every URL change (useLocation dependency)
- FilterPanel re-rendered on every Redux state change
- Accordion state lost on remounts

**After**:
- ProductList only re-renders on actual prop/state changes
- FilterPanel memoized, reduces unnecessary re-renders
- Accordion state persists across remounts
- Minimal overhead: ~2KB sessionStorage usage

## Additional Benefits

1. **Better UX**: Users can select multiple filters without accordion collapsing
2. **State Persistence**: Accordion state remembered during session
3. **Debugging**: Added comprehensive logging (can be removed in production)
4. **React Best Practices**: Proper handling of StrictMode remounts
5. **Performance**: Deep equality checks prevent unnecessary re-renders when filterCounts update from API

## Performance Optimization: Preventing Visual "Refresh"

### Issue
After selecting a filter, the FilterPanel would visibly "refresh" (flicker) as it re-rendered multiple times:

1. User clicks checkbox → Redux updates
2. URL updates
3. API call fetches new data
4. FilterCounts update in Redux → FilterPanel re-renders
5. All checkboxes destroyed and recreated → **visual flicker**

### Solution
Added deep equality checks to Redux selectors:

```javascript
// Deep equality check for objects
const deepEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (let key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
};

// Use deep equality in selectors
const filters = useSelector(selectFilters, deepEqual);
const filterCounts = useSelector(selectFilterCounts, deepEqual);
```

This prevents re-renders when:
- filterCounts object reference changes but values are identical
- Redux state updates don't actually change filter values

### Custom React.memo Comparison

```javascript
const arePropsEqual = (prevProps, nextProps) => {
    return (
        prevProps.isSearchMode === nextProps.isSearchMode &&
        prevProps.showMobile === nextProps.showMobile
    );
};

export default React.memo(FilterPanel, arePropsEqual);
```

This prevents re-renders from parent component updates.

## Files Modified

1. `frontend/react-Admin3/src/components/Product/FilterPanel.js`
   - Added sessionStorage persistence for accordion state
   - Fixed state key naming (camelCase → snake_case)
   - Added React.memo wrapper with custom comparison function
   - Added deep equality checks on Redux selectors (prevents re-renders from reference changes)
   - Added debug logging

2. `frontend/react-Admin3/src/components/Product/ProductList.js`
   - Removed unused useLocation hook
   - Added stable key prop to FilterPanel
   - Added debug logging

3. `frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js`
   - Added debug logging (can be removed)

## Production Considerations

### Remove Debug Logging
Before deploying to production, remove all `console.log` statements:
```bash
# Search for debug logs
grep -r "console.log.*FilterPanel\|console.log.*ProductList\|console.log.*urlSyncMiddleware" frontend/react-Admin3/src/
```

### Monitor Performance
- SessionStorage read/write is synchronous but very fast
- 2KB storage per user session is negligible
- No impact on page load time

### Browser Compatibility
sessionStorage is supported in all modern browsers:
- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- IE11+: ✅

## Notes

- React.StrictMode only affects development builds
- In production, remounting is less frequent but can still occur
- sessionStorage solution works in both development and production
- Alternative solutions considered:
  - Redux state: Overkill for UI-only state
  - URL parameters: Would clutter URL with accordion state
  - localStorage: Would persist across sessions (not desired)
  - useRef: Would not trigger re-renders

## Related Issues

- Story 1.10: Centralized URL Parameter Utility
- FilterUrlManager integration
- URL synchronization middleware
