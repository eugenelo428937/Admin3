# Bug Fixes: Issues #1 and #2

**Date**: 2025-10-06
**Branch**: 001-docs-stories-epic
**Related**: Epic 2 - Tutorial Selection UX Refactoring

---

## Issue #1: Multiple Choice Levels for Same Tutorial Event

### Problem
When selecting multiple choice levels (1st, 2nd, 3rd) for the **same tutorial event**, all choices were being added to the summary bar instead of replacing the previous selection.

**Steps to Reproduce:**
1. Click "Select Tutorial" on a product card
2. Select **1st Choice** for tutorial event "SP1-55-25S"
3. Summary bar shows: "SP1-55-25S : 1st" ✓
4. Select **2nd Choice** for the **same** event "SP1-55-25S"
5. Summary bar shows: "SP1-55-25S : 1st, SP1-55-25S : 2nd" ❌

**Expected Behavior:**
- Each tutorial event can only be selected at ONE choice level
- Selecting a different level for the same event should REPLACE the previous selection
- Summary bar should show: "SP1-55-25S : 2nd" ✓

### Root Cause
The `addTutorialChoice` function in `TutorialChoiceContext.js` did not check if the same `eventId` was already selected at a different choice level before adding the new choice.

### Fix Applied

**File**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`

**Changes:**
- Modified `addTutorialChoice` function to remove any existing selection of the same event before adding the new choice level
- Added logic to iterate through all existing choices and filter out any that match the incoming `eventId` (unless it's the same level being updated)

**Code:**
```javascript
const addTutorialChoice = (subjectCode, choiceLevel, eventData) => {
  setTutorialChoices(prev => {
    const subjectChoices = prev[subjectCode] || {};

    // Remove this event from any other choice level if it exists
    const cleanedChoices = {};
    Object.entries(subjectChoices).forEach(([level, choice]) => {
      // Keep the choice only if it's a different event OR it's the same level we're updating
      if (choice.eventId !== eventData.eventId || level === choiceLevel) {
        cleanedChoices[level] = choice;
      }
    });

    // Add the new choice at the specified level
    return {
      ...prev,
      [subjectCode]: {
        ...cleanedChoices,
        [choiceLevel]: {
          ...eventData,
          choiceLevel,
          timestamp: new Date().toISOString(),
          isDraft: true
        }
      }
    };
  });
};
```

### Tests Added

**File**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js`

Added 2 new tests in "Single choice per event constraint" suite:
1. ✅ **should allow only one choice level per event (replacing previous selection)**
   - Verifies same event at 1st → 2nd → 3rd replaces correctly

2. ✅ **should allow different events at different choice levels**
   - Verifies different events can coexist at different levels

**Test Results:** 41/41 tests passing ✅

---

## Issue #2: Summary Bar Blocking SpeedDial Button

### Problem
When the product list has only a single row of tutorial product cards, the summary bar overlays on the SpeedDial button (bottom-right of each card), making it inaccessible.

### Expected Behavior
1. Summary bar should be positioned at **bottom-left** on large screens (≥lg breakpoint)
2. Summary bar background color should use theme color: `colorTheme.cobalt["060"]`

### Fix Applied

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`

**Changes:**

1. **Imported `useTheme` hook:**
   ```javascript
   import { useTheme } from '@mui/material';
   const theme = useTheme();
   ```

2. **Updated Snackbar positioning:**
   - Changed from bottom-center to bottom-left on large screens
   - Added responsive positioning with proper overrides

   ```javascript
   <Snackbar
     anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
     sx={{
       maxWidth: { xs: '100%', sm: '600px' },
       width: '100%',
       px: { xs: 1, sm: 0 },
       // Position on bottom-left for large screens
       left: { xs: '0', lg: '24px !important' },
       right: { lg: 'auto !important' },
       transform: { lg: 'none !important' },
       bottom: { xs: '0', lg: '24px !important' },
     }}
   >
   ```

3. **Updated background color:**
   - Changed from hardcoded `#323232` to theme color
   - Added fallback color `#1a365d`

   ```javascript
   sx={{
     backgroundColor: theme.palette.colorTheme?.bpp?.cobalt?.['060'] || '#1a365d',
     color: '#fff',
     width: '100%',
     flexWrap: 'wrap',
   }}
   ```

### Visual Impact

**Before:**
- Summary bar: Bottom-center on all screens
- Overlaps SpeedDial button on single row layouts
- Background: Dark gray (#323232)

**After:**
- Summary bar: Bottom-left on large screens (≥lg), center on mobile/tablet
- 24px margin from bottom and left edges (prevents overlap)
- Background: Cobalt blue (theme color)

---

## Verification Steps

### Issue #1: Test the Single Choice Constraint
1. Navigate to `/tutorials`
2. Open selection dialog for any subject
3. Select **1st Choice** for Event A → Check summary bar shows "Event A : 1st"
4. Select **2nd Choice** for **same Event A** → Verify summary bar shows only "Event A : 2nd"
5. Select **3rd Choice** for **same Event A** → Verify summary bar shows only "Event A : 3rd"
6. Select **1st Choice** for **different Event B** → Verify summary bar shows both events

### Issue #2: Test Summary Bar Positioning
1. Navigate to `/tutorials` on a large screen (≥1200px width)
2. Select 1st choice for any tutorial
3. Verify summary bar appears at **bottom-left** corner (not bottom-center)
4. Verify 24px margin from bottom and left edges
5. Verify SpeedDial button remains accessible (not overlapped)
6. Resize to mobile (<600px) and verify summary bar centers properly
7. Check background color matches theme blue (not dark gray)

---

## Test Results Summary

✅ **TutorialChoiceContext Tests**: 41/41 passing
✅ **New constraint tests**: 2/2 passing
✅ **Epic 1 regression**: No regressions detected

---

## Files Changed

1. `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`
   - Modified `addTutorialChoice` function

2. `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
   - Added `useTheme` import
   - Updated Snackbar positioning (responsive)
   - Updated background color to theme

3. `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js`
   - Added 2 new test cases

---

## Next Steps

1. ✅ Run full test suite to verify no regressions
2. ⏳ Manual validation using T033 checklist
3. ⏳ Verify in browser on multiple screen sizes
4. ⏳ Test with real tutorial data

---

**Status**: ✅ **FIXED - Ready for Testing**
