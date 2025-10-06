# Epic 2: Tutorial Selection UX Refactoring - Brownfield Enhancement

**Epic ID:** EPIC-2-Tutorial-UX-Refactor
**Status:** Ready for Development (Epic 1 Complete ✅)
**Priority:** Medium (UX Enhancement)
**Created:** 2025-10-03
**Epic 1 Completed:** 2025-10-05
**Stories:** 3
**Dependency:** Epic 1 (Tutorial Cart Integration Fix) - COMPLETE ✅

---

## Epic Goal

Refactor tutorial selection components to comply with SOLID principles, improve mobile responsiveness, and enhance the user experience with intuitive visual feedback and simplified component responsibilities.

---

## Epic Description

### Existing System Context

- **Current relevant functionality:** TutorialChoiceDialog and TutorialChoicePanel manage tutorial selection UI. TutorialProductCard displays products with SpeedDial actions.
- **Technology stack:** React 18, Material-UI v5 (Dialog, Snackbar, SpeedDial, Grid components)
- **Integration points:**
  - TutorialChoiceContext: State management with `isDraft` flag (from Epic 1)
  - Material-UI components and theming
  - Responsive breakpoints (lg/md/sm)

### Enhancement Details

**What's being added/changed:**

1. **Component Refactoring:**
   - Extract `TutorialDetailCard` as standalone component
   - Rename `TutorialChoicePanel` → `TutorialSelectionSummaryBar` (MUI Snackbar implementation)
   - Rename `TutorialChoiceDialog` → `TutorialSelectionDialog`

2. **UI/UX Improvements:**
   - Implement MUI Snackbar-based summary with collapsible sections per subject
   - Add edit/add to cart/remove action buttons to snackbar
   - Responsive grid layout (3-col lg / 2-col md / 1-col sm)
   - Choice selection visual feedback (outlined → contained buttons)
   - Fix SpeedDial behavior (hover-based expansion, consistent collapse)
   - Implement working price info button with variation-specific pricing tables

3. **SOLID Compliance:**
   - Single Responsibility: Separate concerns (detail display, selection, summary)
   - Clear component boundaries and prop interfaces

**How it integrates:**
- Builds on `isDraft` state from Epic 1
- Follows MaterialProductCard patterns for price info display
- Uses Material-UI component library conventions
- Maintains integration with TutorialChoiceContext

**Success criteria:**
- ✅ Components follow SOLID principles with clear responsibilities
- ✅ Responsive layouts work on mobile, tablet, desktop
- ✅ Price info displays correctly with variation-specific tables
- ✅ SpeedDial behavior is consistent and intuitive
- ✅ Visual feedback clearly indicates selection state
- ✅ Snackbar summaries are collapsible and actionable
- ✅ No regression in tutorial selection functionality

---

## Stories

### Story 2.1: Extract TutorialDetailCard Component
**File:** TBD - `docs/stories/epic-tutorial-ux-refactor/2.1-extract-tutorial-detail-card.md`

**Summary:**
- Create standalone `TutorialDetailCard` component with fixed dimensions
- Define clear prop interface (event data, variation, choice handlers, selection state)
- Implement responsive sizing (adjust for lg/md/sm breakpoints)
- Update choice selection buttons with outlined/contained variants
- Add visual indicators for draft vs cart-added state
- Write unit tests for component rendering and interactions

**Coverage Requirement:** 80%+

### Story 2.2: Refactor TutorialSelectionDialog
**File:** TBD - `docs/stories/epic-tutorial-ux-refactor/2.2-refactor-tutorial-selection-dialog.md`

**Summary:**
- Rename `TutorialChoiceDialog` → `TutorialSelectionDialog`
- Implement responsive grid layout using Material-UI Grid (3/2/1 columns for lg/md/sm)
- Integrate `TutorialDetailCard` component
- Remove "current choices" card from dialog
- Update choice button behavior (circular buttons with 1st/2nd/3rd labels)
- Trigger TutorialSelectionSummaryBar visibility on selection changes
- Update all import references across codebase
- Write component tests for responsive behavior

**Coverage Requirement:** 80%+

### Story 2.3: Implement TutorialSelectionSummaryBar & UI Polish
**File:** TBD - `docs/stories/epic-tutorial-ux-refactor/2.3-implement-summary-bar-ui-polish.md`

**Summary:**
- Create `TutorialSelectionSummaryBar` component using MUI Snackbar
- Implement collapsible subject sections with edit/add/remove action buttons
- Format summary content: subject title + ordered list of choices with location and event code
- Auto-collapse to single line when all choices are `isDraft: false`
- Fix SpeedDial behavior (hover-based expansion, collapse on action or mouse exit)
- Implement working price info button (reference MaterialProductCard implementation)
- Display variation-specific pricing tables in modal/popover
- Ensure mobile responsiveness across all refactored components
- Write integration tests for component interactions
- Perform regression testing

**Coverage Requirement:** 80%+

---

## Current Issues to Fix

### Issue 1: Overlapping Component Responsibilities
**Problem:** TutorialChoiceDialog and TutorialChoicePanel have overlapping functionality
**Solution:** Clear separation - Dialog for selection, SummaryBar for display, DetailCard for event info

### Issue 2: Inconsistent SpeedDial Behavior
**Problem:** SpeedDial button control logic is complex and inconsistent
**Solution:** Simplify to hover-based expansion, collapse on action click or mouse exit

### Issue 3: Broken Price Info Button
**Problem:** Price info button doesn't work
**Solution:** Implement functional price info display with variation-specific pricing tables (reference MaterialProductCard)

### Issue 4: Non-Responsive Layouts
**Problem:** Layouts not optimized for mobile/tablet
**Solution:** Implement responsive grid (3-col lg, 2-col md, 1-col sm) with Material-UI Grid

### Issue 5: Unclear Visual Feedback
**Problem:** Choice selection state not visually clear
**Solution:** Outlined buttons for unselected, contained with white text for selected choices

---

## Compatibility Requirements

- [x] Existing TutorialChoiceContext API remains unchanged
- [x] Database schema changes are N/A (frontend-only)
- [x] UI changes follow Material-UI patterns (consistent with MaterialProductCard)
- [x] Performance impact is minimal (React component rendering optimizations)
- [x] Maintains feature parity with existing components

---

## Risk Mitigation

**Primary Risk:** UI refactoring introduces visual bugs or breaks mobile responsiveness

**Mitigation:**
- Feature flag to toggle between old/new components during development
- Comprehensive component testing across device sizes
- Visual regression testing using screenshots
- Incremental rollout: Test on staging with various screen sizes first
- Reference existing MaterialProductCard implementation for proven patterns

**Rollback Plan:**
- Keep old component files as backups (`.legacy` suffix)
- Feature flag allows instant toggle back to legacy components
- No state management changes means UI rollback is safe
- Git branch strategy isolates changes

---

## Definition of Done

- [x] All stories completed with acceptance criteria met
- [x] Components follow SOLID principles (code review verification)
- [x] Responsive layouts tested on mobile (iOS/Android), tablet, desktop
- [x] Visual regression tests passing
- [x] Component documentation updated with prop interfaces
- [x] Integration tests verify component interactions
- [x] No regression in tutorial selection UX
- [x] Performance benchmarks meet current standards (React DevTools profiling)
- [x] Accessibility standards met (ARIA labels, keyboard navigation)

---

## Component Architecture

### New Component Structure

```
TutorialProductCard (existing)
├── SpeedDial (refactored behavior)
├── TutorialSelectionDialog (renamed from TutorialChoiceDialog)
│   └── TutorialDetailCard (new extracted component) × N
└── TutorialSelectionSummaryBar (renamed from TutorialChoicePanel)
    └── Subject Snackbars (one per subject with choices)
        ├── Title (subject code)
        ├── Choice List (ordered 1st/2nd/3rd)
        └── Actions (edit/add to cart/remove)
```

### TutorialSelectionSummaryBar Format

**Expanded State (has draft choices):**
```
┌─────────────────────────────────────────────┐
│ CS2 Tutorials                           [X] │
│ 1. 1st Choice - Bristol                    │
│    TUT-CS2-BRI-001                         │
│ 2. 2nd Choice - London                     │
│    TUT-CS2-LON-002                         │
│                                             │
│ [Edit] [Add to Cart] [Remove]              │
└─────────────────────────────────────────────┘
```

**Collapsed State (all choices in cart):**
```
┌─────────────────────────────────────────────┐
│ CS2 Tutorials                    [Edit] [X] │
└─────────────────────────────────────────────┘
```

### Responsive Grid Layout (TutorialSelectionDialog)

- **Large (lg):** 3 tutorial detail cards per row
- **Medium (md):** 2 tutorial detail cards per row
- **Small (sm):** 1 tutorial detail card per row

---

## Files Affected

**Components to Create:**
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialDetailCard.js` (new)
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionDialog.js` (renamed)
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js` (renamed)

**Components to Modify:**
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js` (SpeedDial fix, import updates)

**Components to Archive:**
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialChoiceDialog.js.legacy` (backup)
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialChoicePanel.js.legacy` (backup)

**Tests to Create:**
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialDetailCard.test.js`
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSelectionDialog.test.js`
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSelectionSummaryBar.test.js`

---

## Dependencies

**Epic 1 Completion Status:**

- ✅ `isDraft` state management implemented and tested (Story 1.1)
- ✅ Cart integration fixed with merge logic (Story 1.2)
- ✅ TutorialChoiceContext helper methods available:
  - `markChoicesAsAdded(subjectCode)` - Sets isDraft: false for all choices
  - `restoreChoicesToDraft(subjectCode)` - Sets isDraft: true for all choices
  - `getDraftChoices(subjectCode)` - Returns only draft choices
  - `getCartedChoices(subjectCode)` - Returns only carted choices
  - `hasCartedChoices(subjectCode)` - Checks if subject has carted choices

**Epic 1 Implementation Files (Completed):**

**State Management:**
- `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js` - Complete with isDraft methods
- `frontend/react-Admin3/src/utils/tutorialMetadataBuilder.js` - Metadata builder utilities

**Tests:**
- `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js` - 39 tests passing
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js` - 9 cart integration tests passing

**Key Implementation Details:**
- Choice data structure includes `isDraft: boolean` field
- Cart uses `product_type: "tutorial"` for tutorial items
- Cart lookup by `item.product_type === "tutorial" && item.subject_code === subjectCode`
- Metadata structure includes `type: "tutorial"`, `subjectCode`, `totalChoiceCount`, `locations` array

**Material-UI Documentation:**

- Snackbar component API
- SpeedDial component API
- Grid responsive breakpoints
- Button variants (outlined/contained)

---

## Next Steps

1. **Wait for Epic 1 completion** and verification
2. **Create detailed user stories** for Stories 2.1, 2.2, 2.3
3. **Assign Story 2.1** to developer (extract TutorialDetailCard)
4. **Sequential development** (2.1 → 2.2 → 2.3)
5. **Comprehensive visual and functional testing**

---

## Related Epics

**Epic 1: Tutorial Cart Integration Fix**

- **Status:** Complete ✅
- **Completion Date:** 2025-10-05
- **Stories Completed:**
  - Story 1.1: isDraft State Management (39 tests passing)
  - Story 1.2: Cart Integration Fix (9 tests passing)
- **File:** `docs/stories/epic-tutorial-cart-fix/EPIC-1-Tutorial-Cart-Integration-Fix.md`

---

**Epic Created By:** Product Manager (John)
**Epic Approved By:** Pending Review
**Target Completion:** TBD (After Epic 1)
