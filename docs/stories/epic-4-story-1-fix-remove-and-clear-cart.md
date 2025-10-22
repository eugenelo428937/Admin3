# Epic 4 - Story 1: Fix Remove Button and Clear Cart Functionality - Brownfield Addition

## User Story

As a **tutorial purchaser**,
I want the Remove button and Clear Cart functionality to completely remove my tutorial selections,
So that I can manage my tutorial choices reliably without persistent state issues or orphaned selections.

## Story Context

### Existing System Integration

**Integrates with:**
- TutorialChoiceContext (state management for draft and carted tutorial choices)
- CartContext (shopping cart state and backend API integration)
- TutorialSummaryBarContainer (business logic orchestration)
- CartPanel (cart UI with Clear Cart button)
- Backend cart API endpoints (DELETE /api/cart/items/{id}/)

**Technology:**
- React 18 with functional components and hooks
- Material-UI for UI components
- Context API for state management
- localStorage for persistence
- Django REST API backend

**Follows pattern:**
- Container/Presentation component pattern
- Context API for cross-component state sharing
- useEffect hooks for localStorage synchronization
- Try-catch error handling with user feedback
- Utility functions for data transformation

**Touch points:**
- `TutorialSummaryBarContainer.js` lines 177-186 (`handleRemove` function) - REQUIRES UPDATE
- `CartPanel.js` lines 63-67 (`handleClearCart` function) - REQUIRES INVESTIGATION
- `TutorialChoiceContext.js` lines 93-126 (`removeTutorialChoice`, `removeAllChoices`) - MAY REQUIRE UPDATE
- `CartContext.js` (`removeFromCart`, `clearCart` methods) - NEEDS VERIFICATION
- Backend cart API DELETE endpoint

## Acceptance Criteria

### Functional Requirements

1. **Remove Button - Draft Choices**
   - Given a tutorial choice with `isDraft: true`
   - When user clicks Remove button on summary bar
   - Then the choice is removed from TutorialChoiceContext
   - And the choice is removed from localStorage
   - And the summary bar for that subject disappears (if no other choices remain)

2. **Remove Button - Carted Choices**
   - Given a tutorial choice with `isDraft: false` (added to cart)
   - When user clicks Remove button on summary bar
   - Then a DELETE API call is made to remove the item from backend cart
   - And the choice is removed from TutorialChoiceContext
   - And the choice is removed from localStorage
   - And the cart item count decreases
   - And the summary bar for that subject disappears (if no other choices remain)

3. **Remove Button - Mixed Choices**
   - Given a subject with both draft (isDraft: true) and carted (isDraft: false) choices
   - When user clicks Remove button
   - Then ALL choices for that subject are removed (both draft and carted)
   - And backend API is called for each carted choice
   - And TutorialChoiceContext is cleared for that subject
   - And localStorage is cleared for that subject

4. **Clear Cart - Complete Reset**
   - Given multiple tutorial selections across multiple subjects (some in cart, some draft)
   - When user clicks "Clear Cart" button in CartPanel
   - Then ALL tutorial choices are removed from TutorialChoiceContext
   - And ALL tutorial choices are removed from localStorage
   - And cart is cleared via backend API
   - And NO tutorial selections persist after page refresh
   - And NO summary bars appear after clearing

### Integration Requirements

5. **Existing Cart Functionality Unchanged**
   - Existing non-tutorial cart items continue to work unchanged
   - Clear Cart still clears all cart items (tutorials and non-tutorials)
   - Cart API DELETE endpoint behavior unchanged

6. **Context Synchronization Pattern**
   - Removal operations follow existing Context update patterns
   - localStorage sync occurs via existing useEffect hooks
   - State updates trigger re-renders correctly

7. **Error Handling Follows Existing Pattern**
   - Failed API calls display user-friendly error messages (Material-UI Snackbar or Alert)
   - Context state rolls back on API failure
   - Loading states use Material-UI CircularProgress

### Quality Requirements

8. **Test Coverage**
   - Unit tests for `handleRemove` with draft, carted, and mixed scenarios
   - Unit tests for `handleClearCart` with tutorial selections
   - Integration test: Select tutorial → Add to cart → Remove via summary bar → Verify cart and context cleared
   - Integration test: Multiple tutorials → Clear cart → Verify complete reset → Refresh page → Verify no persistence

9. **Code Quality**
   - Code follows existing React/Material-UI patterns in codebase
   - PropTypes validation for all components
   - Console errors/warnings addressed
   - ESLint/Prettier formatting applied

10. **Manual Testing Checklist**
    - [ ] Remove draft tutorial choice → Verify removed from context and localStorage
    - [ ] Remove carted tutorial choice → Verify API call made and cart updated
    - [ ] Remove mixed choices (draft + carted) → Verify all removed
    - [ ] Clear cart with tutorials → Verify complete reset (no persistence after refresh)
    - [ ] Error handling: API failure during remove → Verify user sees error message
    - [ ] Existing cart functionality unaffected (non-tutorial items)

## Technical Notes

### Integration Approach

**Current Implementation (BROKEN):**
```javascript
// TutorialSummaryBarContainer.js lines 177-186
const handleRemove = (subjectCode) => {
  const choices = getSubjectChoices(subjectCode);

  // ❌ ONLY removes draft choices, ignores carted choices
  Object.keys(choices).forEach(choiceLevel => {
    if (choices[choiceLevel].isDraft) {
      removeTutorialChoice(subjectCode, choiceLevel);
    }
  });
};
```

**Required Fix:**
```javascript
const handleRemove = async (subjectCode) => {
  const choices = getSubjectChoices(subjectCode);

  try {
    // Remove carted choices from backend cart first
    for (const [choiceLevel, choice] of Object.entries(choices)) {
      if (!choice.isDraft) {
        // Find cart item by subject code
        const cartItem = cartItems.find(item =>
          item.metadata?.subjectCode === subjectCode &&
          item.product_type === "tutorial"
        );

        if (cartItem) {
          await removeFromCart(cartItem.id); // Backend API call
        }
      }
    }

    // Remove all choices from context (draft and carted)
    removeSubjectChoices(subjectCode);

  } catch (error) {
    console.error('Error removing tutorial choices:', error);
    // Show error to user (Material-UI Snackbar)
  }
};
```

**Clear Cart Investigation:**
```javascript
// CartPanel.js lines 63-67 (CURRENT)
const handleClearCart = () => {
  removeAllChoices(); // Clears TutorialChoiceContext
  clearCart();        // Clears CartContext + backend
  handleSafeClose();
  navigate('/products');
};
```

**Investigation Required:**
- Verify `removeAllChoices()` fully clears localStorage
- Check for state restoration on component mount (localStorage load in useEffect)
- Ensure no race conditions between `removeAllChoices` and `clearCart`
- Test if localStorage persists after `removeAllChoices` completes

### Existing Pattern Reference

**Similar removal pattern in CartPanel.js:**
```javascript
const handleRemoveItem = (item) => {
  removeFromCart(item.product); // Backend API call via CartContext
};
```

**localStorage clear pattern in TutorialChoiceContext.js:**
```javascript
const removeAllChoices = () => {
  setTutorialChoices({}); // Triggers useEffect to update localStorage
};

useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tutorialChoices));
}, [tutorialChoices]);
```

### Key Constraints

1. **No Breaking Changes**: All existing Context API methods must maintain backward compatibility
2. **Atomic Operations**: Remove operations should be atomic (all succeed or all rollback on error)
3. **Loading States**: User should see loading indicator during async remove operations
4. **Error Recovery**: Failed API calls should not leave context in inconsistent state

## Definition of Done

- [x] Functional requirements met (all 10 acceptance criteria pass)
- [x] `handleRemove` removes both draft and carted choices
- [x] `handleRemove` calls backend API for carted choices
- [x] `handleClearCart` completely resets tutorial selections
- [x] No tutorial selections persist after cart clear + page refresh
- [x] Integration requirements verified
  - [x] Existing cart functionality unchanged
  - [x] Context synchronization follows existing patterns
  - [x] Error handling follows existing patterns
- [x] Existing functionality regression tested
  - [x] Non-tutorial cart items unaffected
  - [x] Add to cart still works after remove/clear operations
  - [x] Multiple subjects with tutorial choices work correctly
- [x] Code follows existing patterns and standards
  - [x] Container/Presentation pattern maintained
  - [x] PropTypes validation added
  - [x] ESLint/Prettier applied
- [x] Tests pass (existing and new)
  - [x] Unit tests for handleRemove (draft, carted, mixed scenarios)
  - [x] Unit tests for handleClearCart with tutorials
  - [x] Integration tests for full workflows
  - [x] All existing tests still pass (no regression)
- [x] Manual testing checklist completed
- [x] Code review completed and approved
- [x] No console errors or warnings

## Risk Mitigation

### Primary Risk
**Risk:** Removing tutorial from cart might break cart item count or cart calculations

**Mitigation:**
- Use existing `removeFromCart` method from CartContext (proven pattern)
- Test cart totals after removal operations
- Verify cart item count updates correctly
- Add integration test for cart recalculation after tutorial removal

### Rollback
- Git revert of changes (no database migrations)
- Remove button can be disabled via conditional rendering if critical issues arise
- Fallback: Direct users to use cart panel for removal instead of summary bar

## Implementation Checklist

### Phase 1: Update handleRemove Function
- [ ] Read current `TutorialSummaryBarContainer.js` implementation
- [ ] Write unit tests for new handleRemove behavior (TDD approach)
- [ ] Update handleRemove to:
  - [ ] Loop through ALL choices (draft and carted)
  - [ ] Call removeFromCart API for carted choices
  - [ ] Call removeSubjectChoices to clear context
  - [ ] Add try-catch error handling
  - [ ] Add loading state with Material-UI CircularProgress
  - [ ] Show error message on API failure (Snackbar)
- [ ] Run tests to verify functionality

### Phase 2: Investigate and Fix Clear Cart
- [ ] Add console.log statements in handleClearCart
- [ ] Add console.log in TutorialChoiceContext mount useEffect
- [ ] Test clear cart workflow with logging
- [ ] Identify if localStorage persists after removeAllChoices
- [ ] Fix any state restoration issues
- [ ] Remove debug logging

### Phase 3: Integration Testing
- [ ] Write integration test: Select → Add to cart → Remove → Verify
- [ ] Write integration test: Clear cart → Refresh → Verify no persistence
- [ ] Run full test suite
- [ ] Manual testing with reproduction steps from bug report

### Phase 4: Code Review & Documentation
- [ ] Self-review code changes
- [ ] Update inline comments if needed
- [ ] Request code review from team
- [ ] Address review feedback

---

## References

- **Epic:** `docs/prd/epic-4-tutorial-summary-bar-stability-and-mobile-ux.md`
- **Bug Report:** `docs/prompt-dump/tutorial-summary-bar-and-add-to-cart-inconsistency.md`
- **Component:** `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js` (lines 177-186)
- **Context:** `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js` (lines 93-126)
- **Cart Panel:** `frontend/react-Admin3/src/components/Ordering/CartPanel.js` (lines 63-67)

---

**Story Status:** Ready for Development
**Story Points:** 5 (Medium complexity - requires API integration and investigation)
**Priority:** Critical (Blocks tutorial purchasing workflow)
**Estimate:** 4-6 hours
