# T033: Manual Validation Checklist for Epic 2 - Tutorial Selection UX Refactoring

**Date**: 2025-10-06
**Epic**: Epic 2 - Tutorial Selection UX Refactoring
**Branch**: 001-docs-stories-epic

---

## Test Coverage Summary (T032)

### ✅ Coverage Results:
| Component | Statements | Branches | Functions | Lines | Status |
|-----------|------------|----------|-----------|-------|--------|
| **TutorialDetailCard.js** | 100% | 100% | 100% | 100% | ✅ EXCELLENT |
| **TutorialSelectionDialog.js** | 100% | 100% | 100% | 100% | ✅ EXCELLENT |
| **TutorialSelectionSummaryBar.js** | 100% | 100% | 100% | 100% | ✅ EXCELLENT |
| **tutorialStyles.js** | 100% | 100% | 100% | 100% | ✅ EXCELLENT |
| **TutorialProductCard.js** | 80.99% | 68.81% | 87.17% | 80% | ✅ PASS (≥80%) |
| **Overall Tutorial Directory** | 76.63% | 64.74% | 85% | 75.96% | ⚠️ Slightly Below Target |

**Key Achievements:**
- ✅ All Epic 2 components (Stories 2.1, 2.2, 2.3) have 100% coverage
- ✅ TutorialProductCard has 80% coverage (meets ≥80% requirement)
- ✅ 147 tests passing, 2 skipped (by design)
- ✅ All mobile responsiveness optimizations in place

---

## Manual Validation Checklist

### Part A: Summary Bar Functionality

#### A1: Summary Bar Visibility
- [ ] **Test**: Navigate to /tutorials page
- [ ] **Expected**: No summary bar visible initially (no choices made)
- [ ] **Status**: _______________

#### A2: Summary Bar Appearance After Selection
- [ ] **Test**: Select "1st Choice" on any tutorial event
- [ ] **Expected**: Summary bar appears at bottom center of screen with:
  - Subject title: "{SubjectCode} Tutorials"
  - Choice detail: "1. 1st Choice - {Location} ({EventCode})"
  - Action buttons: Edit, Add to Cart, Remove, Close (X)
- [ ] **Status**: _______________

#### A3: Summary Bar Expansion
- [ ] **Test**: Add a 2nd choice to the same subject
- [ ] **Expected**: Summary bar updates to show:
  - "1. 1st Choice - {Location} ({EventCode})"
  - "2. 2nd Choice - {Location} ({EventCode})"
  - All action buttons visible
- [ ] **Status**: _______________

#### A4: Summary Bar Edit Function
- [ ] **Test**: Click "Edit" button in summary bar
- [ ] **Expected**:
  - Selection dialog opens
  - Previously selected choices are visually indicated (contained/filled buttons)
  - Can modify choices
- [ ] **Status**: _______________

#### A5: Summary Bar Add to Cart
- [ ] **Test**: Click "Add to Cart" button in summary bar
- [ ] **Expected**:
  - Choices added to cart
  - Summary bar collapses to single line: "{SubjectCode} Tutorials [Edit] [X]"
  - Cart counter increments
- [ ] **Status**: _______________

#### A6: Summary Bar Remove Function
- [ ] **Test**: Click "Remove" button in expanded summary bar
- [ ] **Expected**:
  - All draft choices for subject cleared
  - Summary bar disappears
  - Choices removed from context
- [ ] **Status**: _______________

#### A7: Summary Bar Close Function
- [ ] **Test**: Click "X" (close) button on summary bar
- [ ] **Expected**:
  - Summary bar hides (but choices remain in draft state)
  - Can be reopened by making new selection
- [ ] **Status**: _______________

---

### Part B: SpeedDial Behavior

#### B1: SpeedDial Initial State
- [ ] **Test**: Load tutorial product card
- [ ] **Expected**: SpeedDial button visible at bottom-right of card with cart badge if items in cart
- [ ] **Status**: _______________

#### B2: SpeedDial Hover Expansion
- [ ] **Test**: Hover mouse over SpeedDial button
- [ ] **Expected**:
  - SpeedDial expands upward showing action buttons
  - Actions visible: "Select Tutorial", "View selections" (if choices exist), "Add to Cart" (if choices exist)
- [ ] **Status**: _______________

#### B3: SpeedDial Mouse Leave Collapse
- [ ] **Test**: Move mouse away from SpeedDial
- [ ] **Expected**: SpeedDial collapses back to closed state
- [ ] **Status**: _______________

#### B4: SpeedDial Action Click Collapse
- [ ] **Test**: Click "Select Tutorial" action
- [ ] **Expected**:
  - SpeedDial collapses
  - Tutorial selection dialog opens
- [ ] **Status**: _______________

#### B5: SpeedDial "View Selections" Action
- [ ] **Test**: Make tutorial selections, click "View selections" SpeedDial action
- [ ] **Expected**:
  - SpeedDial collapses
  - Page scrolls smoothly to summary bar at bottom
- [ ] **Status**: _______________

#### B6: SpeedDial Cart Badge
- [ ] **Test**: Add tutorials to cart
- [ ] **Expected**: SpeedDial shows green badge with count of tutorials in cart for that subject
- [ ] **Status**: _______________

---

### Part C: Responsive Design (Mobile)

#### C1: Desktop Layout (≥1200px)
- [ ] **Test**: View selection dialog on desktop screen
- [ ] **Expected**: Tutorial detail cards displayed in 3-column grid
- [ ] **Status**: _______________

#### C2: Tablet Layout (600px - 1200px)
- [ ] **Test**: Resize browser to tablet width
- [ ] **Expected**: Tutorial detail cards displayed in 2-column grid
- [ ] **Status**: _______________

#### C3: Mobile Layout (<600px)
- [ ] **Test**: Resize browser to mobile width
- [ ] **Expected**:
  - Tutorial detail cards displayed in 1-column grid
  - Summary bar full-width with padding
- [ ] **Status**: _______________

#### C4: Touch Targets (Mobile)
- [ ] **Test**: Use browser dev tools mobile emulation, inspect button sizes
- [ ] **Expected**: All interactive elements (buttons, icons) ≥44px in height/width
- [ ] **Components to check**:
  - [ ] TutorialDetailCard choice buttons (1st, 2nd, 3rd)
  - [ ] TutorialSelectionDialog close button
  - [ ] TutorialSelectionSummaryBar action buttons (Edit, Add to Cart, Remove, Close)
- [ ] **Status**: _______________

#### C5: Mobile Scrolling
- [ ] **Test**: Open selection dialog on mobile, scroll through events
- [ ] **Expected**: Smooth scrolling, no layout shift, cards maintain spacing
- [ ] **Status**: _______________

---

### Part D: Visual Feedback & Accessibility

#### D1: Choice Selection Visual Feedback
- [ ] **Test**: Click "1st" button on tutorial event
- [ ] **Expected**:
  - Button changes from outlined style to contained (filled) style
  - Button text changes to white
  - Previously selected choice at same level (if any) reverts to outlined style
- [ ] **Status**: _______________

#### D2: Keyboard Navigation - Dialog
- [ ] **Test**: Use Tab, Shift+Tab to navigate through dialog
- [ ] **Expected**:
  - Can tab through all choice buttons
  - Can tab to close button
  - Escape key closes dialog
- [ ] **Status**: _______________

#### D3: Keyboard Navigation - Summary Bar
- [ ] **Test**: Tab to summary bar action buttons
- [ ] **Expected**:
  - Can tab through Edit, Add to Cart, Remove, Close buttons
  - Enter activates buttons
- [ ] **Status**: _______________

#### D4: Screen Reader Compatibility
- [ ] **Test**: Enable screen reader (NVDA on Windows or VoiceOver on Mac)
- [ ] **Expected**:
  - Dialog announces as "{SubjectName} Tutorials - {Location}"
  - Choice buttons announce as "1st", "2nd", "3rd" with pressed state
  - Summary bar announces choice details
- [ ] **Status**: _______________

#### D5: Focus Management
- [ ] **Test**: Open dialog, close dialog
- [ ] **Expected**:
  - Focus returns to SpeedDial button that opened it
  - Focus visible indicator on all focusable elements
- [ ] **Status**: _______________

---

### Part E: Integration Testing

#### E1: Cart Integration
- [ ] **Test**: Add tutorial choices to cart, view cart panel
- [ ] **Expected**:
  - Cart shows tutorial item with all choices
  - Metadata includes totalChoiceCount
  - Price shows only for 1st choice
- [ ] **Status**: _______________

#### E2: Multi-Subject Selections
- [ ] **Test**: Select tutorials for multiple subjects (e.g., CS2 and CP1)
- [ ] **Expected**:
  - Separate summary bars for each subject
  - Each summary bar independently expandable/collapsible
  - Can add to cart separately or together
- [ ] **Status**: _______________

#### E3: Choice Level Constraints
- [ ] **Test**: Try to select same choice level twice for one subject
- [ ] **Expected**: Previous selection at that level is replaced with new selection
- [ ] **Status**: _______________

#### E4: Draft vs Carted State
- [ ] **Test**:
  1. Select 2 choices (draft state)
  2. Add to cart
  3. Select 3rd choice
- [ ] **Expected**:
  - Summary bar expands showing all 3 choices
  - First 2 choices marked as in cart
  - 3rd choice marked as draft
  - Can add 3rd choice to cart (merges with existing cart item)
- [ ] **Status**: _______________

---

## Common Issues to Watch For

### Known Issues:
1. ⚠️ **window.scrollTo not implemented in jsdom** - Causes console error in tests but works in browser
2. ⚠️ **MUI Grid v2 migration warnings** - Harmless warnings about deprecated props

### Potential Issues:
- [ ] Summary bar overlapping footer content
- [ ] SpeedDial button overlapping other UI elements
- [ ] Choice buttons not responding on first click
- [ ] Dialog not closing with Escape key
- [ ] Summary bar not updating after cart operations

---

## Sign-Off

### Tester Information:
- **Name**: _________________________
- **Date**: _________________________
- **Environment**:
  - [ ] Windows / [ ] Mac / [ ] Linux
  - [ ] Chrome / [ ] Firefox / [ ] Safari / [ ] Edge
  - **Version**: _________________________

### Overall Assessment:
- [ ] All Part A tests passed
- [ ] All Part B tests passed
- [ ] All Part C tests passed
- [ ] All Part D tests passed
- [ ] All Part E tests passed

### Issues Found:
```
(List any issues found during manual testing)
```

### Recommendations:
```
(Any recommendations for improvement)
```

---

## Next Steps After Validation:
1. Address any issues found during manual testing
2. Proceed with T034: Integration tests for full workflow
3. Proceed with T035: Epic 1 regression tests
4. Proceed with T036-T038: Performance, accessibility, and visual regression validation

---

**Manual Validation Complete**: [ ] Yes / [ ] No
**Ready for Production**: [ ] Yes / [ ] No
