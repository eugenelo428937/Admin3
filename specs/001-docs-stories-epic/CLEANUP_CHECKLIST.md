# Cleanup Checklist - Remove Incorrect Implementation

**Task**: T002 - Audit and document files for removal
**Date**: 2025-10-07
**Status**: Complete

---

## Files to DELETE

### 1. TutorialProductList.js
**Path**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductList.js`
**Reason**: Incorrect architecture - tutorials should display in main ProductList, not separate component
**Action**: Delete entire file

---

## Files to MODIFY

### 1. App.js
**Path**: `frontend/react-Admin3/src/App.js`
**Search for**: Routes with `/tutorials` path
**Action**: Remove `/tutorials` route entirely

### 2. MobileNavigation.js
**Path**: `frontend/react-Admin3/src/components/Navigation/MobileNavigation.js`
**Search for**: Links to `/tutorials`
**Action**: Change to `/products?main_category=Tutorials`

### 3. tutorialService.js
**Path**: `frontend/react-Admin3/src/services/tutorialService.js`
**Action**: Verify no references to removed route (likely safe)

### 4. TutorialProductCard.test.js
**Path**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js`
**Action**: Verify no references to TutorialProductList (likely safe)

---

## Verification Steps

After deletion/modification:
1. [ ] Run `npm test` to ensure no import errors
2. [ ] Search codebase for `TutorialProductList` imports
3. [ ] Search codebase for `/tutorials` route references
4. [ ] Verify navigation links work correctly

---

## Cleanup Task: T020

This checklist will be executed during **T020: Remove incorrect TutorialProductList.js** after new implementation is validated in T019.

**CRITICAL**: Do not execute cleanup until T019 (Manual validation) passes all tests!
