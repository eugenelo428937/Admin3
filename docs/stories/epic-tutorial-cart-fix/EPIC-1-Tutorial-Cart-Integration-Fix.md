# Epic 1: Tutorial Cart Integration Fix - Brownfield Enhancement

**Epic ID:** EPIC-1-Tutorial-Cart-Fix
**Status:** Ready for Development
**Priority:** High (Critical Bug Fix)
**Created:** 2025-10-03
**Stories:** 2
**Dependency:** None

---

## Epic Goal

Fix the tutorial cart integration bug that creates duplicate cart items when adding multiple choices for the same subject, and implement `isDraft` state tracking to distinguish between selections in progress and selections added to the cart.

---

## Epic Description

### Existing System Context

- **Current relevant functionality:** Tutorial selection uses TutorialChoiceContext to manage up to 3 choices per subject. Cart operations use CartContext with addToCart functionality.
- **Technology stack:** React 19.2, Context API (TutorialChoiceContext, CartContext), localStorage persistence
- **Integration points:**
  - TutorialChoiceContext: Manages tutorial choice state
  - CartContext: Handles cart item CRUD operations
  - localStorage: Persists tutorial choices across sessions

### Enhancement Details

**What's being added/changed:**
1. Add `isDraft` boolean flag to tutorial choice state structure
2. Fix cart integration to create/update a single cart item per subject containing all choices
3. Update TutorialChoiceContext methods to handle draft-to-cart state transitions
4. Implement proper cart item update logic (incremental, not duplicative)
5. Add helper methods to check draft status and filter choices by state

**How it integrates:**
- Extends TutorialChoiceContext state structure with `isDraft` property
- Updates CartContext integration logic in TutorialProductCard
- Maintains backward compatibility with existing choice data in localStorage
- No API or database schema changes required

**Success criteria:**
- ✅ Single cart item per subject containing multiple choices
- ✅ Clear state distinction between draft and cart-added choices
- ✅ Incremental updates when adding new choices to existing cart items
- ✅ No duplicate cart items for the same subject
- ✅ Existing tutorial selection functionality preserved

---

## Stories

### Story 1.1: Implement isDraft State Management
**File:** `docs/stories/epic-tutorial-cart-fix/1.1-implement-isDraft-state-management.md`

**Summary:**
- Add `isDraft` flag to tutorial choice data structure
- Update TutorialChoiceContext methods to initialize choices with `isDraft: true`
- Create helper methods: `markChoicesAsAdded()`, `getDraftChoices()`, `getCartedChoices()`, `hasCartedChoices()`
- Update localStorage serialization/deserialization to handle new property
- Add backward compatibility for existing localStorage data (migration logic)
- Write unit tests for new context methods

**Coverage Requirement:** 80%+ for state management

### Story 1.2: Fix Cart Integration for Incremental Updates
**File:** `docs/stories/epic-tutorial-cart-fix/1.2-fix-cart-integration-incremental-updates.md`

**Summary:**
- Investigate current cart mechanism for tutorial products (document findings)
- Implement cart item update logic: find existing tutorial cart item by subject, merge choices
- Update `addToCart` flow in TutorialProductCard to handle incremental updates
- Transition choices from `isDraft: true` → `isDraft: false` when added to cart
- Implement cart item removal synchronization (update choice `isDraft` flags)
- Add integration tests for cart flow scenarios (add, update, remove)
- Verify no regression in existing cart functionality

**Coverage Requirement:** 100% for critical cart logic

---

## Current Bug Description

When a user has tutorial choices in the cart and subsequently adds new choices for the same subject:
- **Current behavior:** Creates TWO cart items (one with original choice, one with original + new choices)
- **Expected behavior:** Updates existing cart item to include both original and new choices

**Example Scenario:**
1. User adds CS2 tutorial (1st choice - Bristol) to cart → 1 cart item created
2. User adds CS2 tutorial (2nd choice - London) → BUG: 2 cart items exist
3. Expected: 1 cart item with both Bristol (1st) and London (2nd) choices

---

## Compatibility Requirements

- [x] Existing TutorialChoiceContext API remains unchanged (new methods are additive)
- [x] CartContext API remains unchanged
- [x] Database schema changes are N/A (frontend-only changes)
- [x] UI changes follow existing patterns (no UI changes in this epic)
- [x] Performance impact is minimal (localStorage operations, Context updates)

---

## Risk Mitigation

**Primary Risk:** Breaking existing cart operations or losing tutorial choice data during migration

**Mitigation:**
- Comprehensive localStorage migration with fallback to current structure
- Feature flag to toggle new cart logic
- Extensive testing with existing data scenarios
- Maintain exact same user-facing behavior initially

**Rollback Plan:**
- Feature flag can disable new cart logic immediately
- localStorage structure is backward compatible (old code ignores `isDraft`)
- Git branch isolation for easy revert
- No database changes means instant rollback capability

---

## Definition of Done

- [x] All stories completed with acceptance criteria met
- [x] Existing cart functionality verified (regression testing)
- [x] Integration points working correctly (TutorialChoiceContext ↔ CartContext)
- [x] localStorage migration tested with various data states
- [x] Unit and integration tests passing (minimum 80% coverage, 100% for cart logic)
- [x] No regression in tutorial selection or cart operations
- [x] Code review completed with focus on state management correctness

---

## Technical Details

### Current State Structure
```javascript
{
  subjectCode: {
    "1st": { eventData, choiceLevel, timestamp },
    "2nd": { eventData, choiceLevel, timestamp },
    "3rd": { eventData, choiceLevel, timestamp }
  }
}
```

### New State Structure
```javascript
{
  subjectCode: {
    "1st": { eventData, choiceLevel, timestamp, isDraft: boolean },
    "2nd": { eventData, choiceLevel, timestamp, isDraft: boolean },
    "3rd": { eventData, choiceLevel, timestamp, isDraft: boolean }
  }
}
```

### Files Affected
- `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js` (primary)
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js` (cart integration)
- `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js` (new test file)
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js` (extend)

---

## Next Steps

1. **Assign Story 1.1** to developer (implement isDraft state management)
2. **Wait for Story 1.1 completion** and verification
3. **Assign Story 1.2** to developer (fix cart integration)
4. **Conduct comprehensive testing** across both stories
5. **Prepare for Epic 2** (Tutorial Selection UX Refactoring)

---

## Related Epics

**Epic 2: Tutorial Selection UX Refactoring**
- **Dependency:** Epic 1 must be completed first
- **Focus:** Component refactoring for SOLID compliance and improved UX
- **File:** `docs/stories/epic-tutorial-ux-refactor/EPIC-2-Tutorial-Selection-UX-Refactoring.md`

---

**Epic Created By:** Product Manager (John)
**Epic Approved By:** Pending Review
**Target Completion:** TBD
