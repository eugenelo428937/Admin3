# ⚠️ DEPRECATED: Architectural Change: Summary Bar Vertical Stacking

**Date**: 2025-10-06 (DEPRECATED 2025-10-07)
**Branch**: 001-docs-stories-epic
**Type**: Architectural Refactoring
**Status**: ⚠️ **DEPRECATED - INCORRECT APPROACH**

---

## 🚨 DEPRECATION NOTICE

**This document describes an INCORRECT architectural approach.**

The implementation described here created a separate `/tutorials` route with `TutorialProductList.js`, which violates the principle that **tutorials are just products**.

**Please refer to the correct architecture:**
📄 **`ARCHITECTURE_CORRECTION_GLOBAL_SUMMARY_BARS.md`**

### Why This Was Wrong
- ❌ Created unnecessary `/tutorials` route
- ❌ Tutorials should be displayed in main `ProductList.js` with all products
- ❌ Summary bars should be global (App-level), not managed by ProductList
- ❌ Summary bars should be controlled by `TutorialChoiceContext`, not parent components

---

## Original Document (For Historical Reference Only)

---

## Problem Statement

**Original Architecture:**
- Each `TutorialProductCard` rendered its own `TutorialSelectionSummaryBar`
- Multiple cards = multiple summary bars trying to occupy the same space
- All summary bars positioned at `bottom-left` with fixed positioning
- Result: **Summary bars overlapped instead of stacking vertically**

---

## Solution: Centralized Summary Bar Rendering

### New Architecture

**Summary bars are now rendered centrally in `TutorialProductList`:**

1. ✅ Removed `TutorialSelectionSummaryBar` from individual `TutorialProductCard` components
2. ✅ Created a single fixed container in `TutorialProductList` that renders ALL summary bars
3. ✅ Summary bars stack vertically using flexbox (`flexDirection: 'column'`)
4. ✅ Handlers (edit, addToCart, remove) managed at the list level

---

## Files Changed

### 1. `TutorialProductCard.js`
**Changes:**
- ❌ Removed import of `TutorialSelectionSummaryBar`
- ❌ Removed summary bar rendering from component JSX
- ❌ Removed unused handlers: `handleSummaryBarEdit`, `handleSummaryBarRemove`

**Why:** Individual cards should not manage their own summary bars when multiple subjects need stacking.

---

### 2. `TutorialProductList.js` ⭐ Main Changes
**Added:**
- ✅ Import `TutorialSelectionSummaryBar`, `Box` from MUI
- ✅ Import `useCart`, tutorial metadata builders
- ✅ State: `dialogOpenForSubject` (for future dialog management)
- ✅ Context hooks: `removeTutorialChoice`, `getSubjectChoices`, `markChoicesAsAdded`

**New Handlers:**
```javascript
// Edit: Opens dialog for subject (not fully implemented yet)
const handleEdit = (subjectCode) => {
  setDialogOpenForSubject(subjectCode);
};

// Add to Cart: Builds metadata and adds choices to cart
const handleAddToCart = async (subjectCode) => {
  const product = currentTutorialData.find(p => p.subject_code === subjectCode);
  const subjectChoices = getSubjectChoices(subjectCode);
  const metadata = buildTutorialMetadata(subjectChoices, subjectCode, product.subject_name);
  const productData = buildTutorialProductData(product, metadata);
  const priceData = buildTutorialPriceData(subjectChoices['1st']);
  await addToCart(productData, priceData);
  markChoicesAsAdded(subjectCode);
};

// Remove: Removes all draft choices for subject
const handleRemove = (subjectCode) => {
  const subjectChoices = getSubjectChoices(subjectCode);
  Object.entries(subjectChoices).forEach(([level, choice]) => {
    if (choice.isDraft) {
      removeTutorialChoice(subjectCode, level);
    }
  });
};
```

**New Rendering:**
```javascript
{/* Fixed container at bottom-left */}
<Box
  sx={{
    position: 'fixed',
    bottom: { xs: 8, lg: 24 },
    left: { xs: 8, lg: 24 },
    zIndex: 1300,
    display: 'flex',
    flexDirection: 'column', // ✅ Vertical stacking
    gap: 1, // 8px gap between bars
    maxWidth: { xs: 'calc(100% - 16px)', sm: '600px' },
  }}
>
  {subjectsWithChoices.map((subjectCode) => (
    <TutorialSelectionSummaryBar
      key={subjectCode}
      subjectCode={subjectCode}
      onEdit={() => handleEdit(subjectCode)}
      onAddToCart={() => handleAddToCart(subjectCode)}
      onRemove={() => handleRemove(subjectCode)}
    />
  ))}
</Box>
```

---

### 3. `TutorialSelectionSummaryBar.js`
**Changes:**
- ❌ Removed `Snackbar` and `SnackbarContent` components (these position themselves)
- ✅ Changed to `Paper` component (allows parent to control positioning)
- ✅ Simplified structure: direct rendering without absolute positioning
- ✅ Layout: Flexbox with `flexDirection: { xs: 'column', sm: 'row' }`

**Before (Snackbar):**
```javascript
<Snackbar
  open={visible}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
  sx={{ position: 'fixed', bottom: '24px', left: '24px' }}
>
  <SnackbarContent message={...} action={...} />
</Snackbar>
```

**After (Paper):**
```javascript
<Paper
  elevation={6}
  sx={{
    backgroundColor: theme.palette.colorTheme?.bpp?.cobalt?.['060'],
    width: '100%',
    p: 2,
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    justifyContent: 'space-between',
  }}
>
  <Box sx={{ flex: 1 }}>
    {/* Title and choices */}
  </Box>
  <Box>
    {/* Action buttons */}
  </Box>
</Paper>
```

---

## Visual Result

### Before:
```
┌─────────────────────────┐
│  Tutorial Cards Grid    │
│  [Card1] [Card2] [Card3]│
└─────────────────────────┘

Bottom of screen:
[CS2 Summary] ← All 3 overlapping!
[CP1 Summary] ←
[SP1 Summary] ←
```

### After:
```
┌─────────────────────────┐
│  Tutorial Cards Grid    │
│  [Card1] [Card2] [Card3]│
└─────────────────────────┘

Bottom-left corner:
┌───────────────────────┐
│ CS2 Summary Bar       │ ← First subject
├───────────────────────┤
│ CP1 Summary Bar       │ ← Second subject
├───────────────────────┤
│ SP1 Summary Bar       │ ← Third subject
└───────────────────────┘
```

---

## Benefits of New Architecture

1. ✅ **Proper vertical stacking**: Each subject's summary bar is clearly visible
2. ✅ **Single source of truth**: All summary bars managed in one place
3. ✅ **No overlapping**: Fixed container prevents position conflicts
4. ✅ **Responsive**: Works on mobile (stacks better) and desktop
5. ✅ **Cleaner separation**: Cards focus on displaying products, list handles UI coordination

---

## Known Limitations / Future Work

### ~~Edit Handler Not Fully Implemented~~ ✅ RESOLVED

**Status:** ✅ **FULLY FUNCTIONAL** (2025-10-07)

**Solution Applied:** Lift dialog state to `TutorialProductList` level
- ✅ Dialogs are now controlled by parent via `dialogOpen` and `onDialogClose` props
- ✅ Cards support both controlled and uncontrolled modes (backward compatible)
- ✅ Edit button opens the correct dialog for the selected subject
- ✅ Only one dialog can be open at a time
- ✅ All tests passing (41/41)

**See:** `EDIT_HANDLER_COMPLETE.md` for implementation details and verification flow

---

## Testing Checklist

### Manual Testing Steps:
1. ✅ Navigate to `/tutorials`
2. ✅ Select 1st choice for CS2 tutorial
3. ✅ Summary bar appears at bottom-left
4. ✅ Select 1st choice for CP1 tutorial
5. ✅ Second summary bar appears BELOW the first (stacked)
6. ✅ Select 1st choice for SP1 tutorial
7. ✅ Third summary bar appears BELOW the second
8. ✅ All three bars visible and accessible
9. ✅ Click "Edit" on CS2 bar → CS2 selection dialog opens
10. ✅ Click "Edit" on SP1 bar → SP1 dialog opens (CS2 closes)
11. ✅ Click "Add to Cart" on CS2 bar → cart increments, bar collapses
12. ✅ Click "Remove" on CP1 bar → CP1 bar disappears, choices removed

### Automated Tests:
- Run `npm test -- --testPathPattern=Tutorial` to verify no regressions
- Expected: All existing tests should still pass

---

## Migration Notes for Developers

**If you're working on tutorial-related features:**

1. **Don't add summary bars to `TutorialProductCard`**
   - They're now managed by `TutorialProductList`

2. **Summary bar handlers are at list level**
   - To customize behavior, edit handlers in `TutorialProductList.js`

3. **Edit functionality needs completion**
   - If you need Edit to work, implement one of the solutions in "Known Limitations"

4. **Testing summary bars**
   - Test from `TutorialProductList` level, not individual cards

---

**Status**: ✅ **FULLY IMPLEMENTED**
**Last Updated**: 2025-10-06
**Edit Handler**: ✅ Implemented and tested (see FEATURE_EDIT_HANDLER_IMPLEMENTATION.md)
