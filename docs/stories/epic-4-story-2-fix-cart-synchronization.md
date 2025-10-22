# Epic 4 - Story 2: Investigate and Fix Cart Synchronization Issue - Brownfield Addition

## User Story

As a **tutorial purchaser**,
I want the tutorial summary bar and shopping cart to always show the same tutorial selections,
So that I have a consistent view of my choices and can trust that what I see in the summary bar matches what will be purchased.

## Story Context

### Existing System Integration

**Integrates with:**
- TutorialChoiceContext (manages draft and carted tutorial choices with localStorage persistence)
- CartContext (shopping cart state with backend API synchronization)
- TutorialSummaryBarContainer (orchestrates add-to-cart operations)
- TutorialSelectionDialog (where users select tutorials)
- localStorage (persistence layer for draft choices)

**Technology:**
- React 18 with functional components and hooks
- Context API for state management (async state updates)
- localStorage for client-side persistence
- Django REST API backend (asynchronous cart operations)
- Material-UI for UI components

**Follows pattern:**
- Async/await for API calls with proper error handling
- Context state updates trigger re-renders
- useEffect hooks for side effects (localStorage sync, API calls)
- Optimistic UI updates with rollback on failure

**Touch points:**
- `TutorialSummaryBarContainer.js` lines 114-171 (`handleAddToCart` function) - REQUIRES INVESTIGATION
- `TutorialChoiceContext.js` lines 54-85 (`addTutorialChoice` function) - CHECK TIMING
- `CartContext.js` (`addToCart`, `updateCartItem` methods) - CHECK STATE UPDATES
- `TutorialSelectionDialog.js` (selection flow) - CHECK EVENT HANDLING
- Backend cart API POST/PUT endpoints

## Acceptance Criteria

### Functional Requirements

1. **Consistent Selection Display**
   - Given user adds CS1-30-25S (Edinburgh) from TutorialSelectionDialog
   - When the dialog closes and summary bar appears
   - Then summary bar shows CS1-30-25S (Edinburgh)
   - And cart item count increases by 1
   - And cart panel shows CS1-30-25S (Edinburgh) when opened

2. **Multiple Tutorial Addition**
   - Given user adds CS1-30-25S (Edinburgh) followed by CS1-20-25S (London)
   - When both selections are added from TutorialSelectionDialog
   - Then summary bar shows BOTH CS1-30-25S AND CS1-20-25S
   - And cart shows BOTH tutorials (not just the second one)
   - And cart item metadata correctly reflects both selections

3. **Add to Cart from Summary Bar**
   - Given summary bar shows draft tutorial selections
   - When user clicks "Add to Cart" button on summary bar
   - Then ALL draft selections for that subject are added to cart
   - And summary bar choices show "Added in Cart" badge
   - And cart panel displays all selections correctly
   - And choices are marked as `isDraft: false` in TutorialChoiceContext

4. **State Synchronization After Page Refresh**
   - Given tutorials added to cart
   - When user refreshes the page
   - Then cart loads tutorial selections from backend
   - And TutorialChoiceContext restores from localStorage
   - And summary bar shows choices matching cart state
   - And `isDraft` flags are consistent with cart state

### Integration Requirements

5. **TutorialChoiceContext ↔ CartContext Synchronization**
   - Context state updates occur in correct order (TutorialChoice → Cart → localStorage)
   - State updates are atomic (no race conditions between contexts)
   - Failed cart operations rollback TutorialChoiceContext changes

6. **localStorage ↔ Backend Cart Consistency**
   - localStorage persists draft choices (`isDraft: true`)
   - Backend cart is source of truth for carted choices (`isDraft: false`)
   - On mount, context reconciles localStorage with backend cart state
   - No orphaned selections in localStorage after cart operations

7. **API Integration Maintains State Integrity**
   - POST /api/cart/items/ response updates both CartContext and TutorialChoiceContext
   - PUT /api/cart/items/{id}/ (update) maintains choice level associations
   - Concurrent API calls handled correctly (queue or debounce)

### Quality Requirements

8. **Detailed Investigation Logging**
   - Add temporary debug logging to trace state flow:
     - TutorialSelectionDialog: onConfirm event
     - TutorialChoiceContext: addTutorialChoice calls with timestamp
     - CartContext: addToCart/updateCartItem calls with payload
     - localStorage: setItem calls with data snapshot
     - Backend API: request/response payloads
   - Log entries include timestamps for timing analysis
   - Logging removed after root cause identified and fixed

9. **Test Coverage**
   - Integration test: Add CS1-30-25S → Add CS1-20-25S → Verify both in cart and summary
   - Integration test: Add multiple tutorials → Refresh page → Verify state restored correctly
   - Integration test: Add to cart from summary bar → Verify choices marked as carted
   - Unit test: Race condition handling in concurrent addToCart calls
   - Unit test: State rollback on API failure

10. **Manual Testing Reproduces Bug**
    - [ ] Follow exact reproduction steps from bug report
    - [ ] Add CS1-30-25S (Edinburgh) from dialog
    - [ ] Add CS1-20-25S (London) from dialog
    - [ ] Verify cart shows CS1-20-25S ONLY (bug reproduction)
    - [ ] Click "Add to Cart" on summary bar
    - [ ] Verify BOTH tutorials now appear in cart
    - [ ] Document timing observations from logs

## Technical Notes

### Investigation Approach

**Step 1: Add Debug Logging**
```javascript
// TutorialSelectionDialog.js - onConfirm handler
const handleConfirm = () => {
  console.log('[DIALOG] onConfirm triggered:', {
    timestamp: new Date().toISOString(),
    selections: currentSelections,
    subjectCode
  });

  // Existing onConfirm logic...
};

// TutorialChoiceContext.js - addTutorialChoice
const addTutorialChoice = (subjectCode, choiceLevel, eventData, productMetadata) => {
  console.log('[CONTEXT] addTutorialChoice called:', {
    timestamp: new Date().toISOString(),
    subjectCode,
    choiceLevel,
    eventId: eventData.eventId,
    isDraft: true
  });

  setTutorialChoices(prev => {
    const updated = { /* ...existing logic */ };
    console.log('[CONTEXT] State updated:', {
      timestamp: new Date().toISOString(),
      newState: updated
    });
    return updated;
  });
};

// TutorialSummaryBarContainer.js - handleAddToCart
const handleAddToCart = async (subjectCode) => {
  console.log('[CONTAINER] handleAddToCart started:', {
    timestamp: new Date().toISOString(),
    subjectCode,
    choices: getSubjectChoices(subjectCode)
  });

  try {
    // Existing logic...
    console.log('[CONTAINER] Cart API call:', {
      timestamp: new Date().toISOString(),
      existingItem: existingCartItem,
      action: existingCartItem ? 'update' : 'add'
    });

    if (existingCartItem) {
      await updateCartItem(existingCartItem.id, productData, priceData);
    } else {
      await addToCart(productData, priceData);
    }

    console.log('[CONTAINER] markChoicesAsAdded:', {
      timestamp: new Date().toISOString(),
      subjectCode
    });
    markChoicesAsAdded(subjectCode);

  } catch (error) {
    console.error('[CONTAINER] Error in handleAddToCart:', error);
  }
};
```

**Step 2: Analyze Timing**
- Run reproduction steps with logging enabled
- Analyze timestamp gaps to identify delays or race conditions
- Check if state updates occur before API responses complete
- Identify if multiple rapid addToCart calls cause conflicts

**Step 3: Hypotheses to Test**

**Hypothesis 1: Race Condition in Rapid Additions**
- User adds CS1-30-25S, immediately adds CS1-20-25S
- First API call (CS1-30-25S) still pending when second call (CS1-20-25S) starts
- Second call overwrites first due to concurrent state update

**Test:** Add 500ms delay between additions, verify if both appear correctly

**Hypothesis 2: updateCartItem vs addToCart Logic**
- Existing cart item detection logic (`cartItems.find`) may be stale
- First tutorial added → becomes existingCartItem
- Second tutorial tries to update instead of merge

**Test:** Log `existingCartItem` value for both additions

**Hypothesis 3: markChoicesAsAdded Timing**
- `markChoicesAsAdded` called before cart API completes
- Context state changes trigger re-render mid-operation
- Causes second addition to lose first selection data

**Test:** Move `markChoicesAsAdded` to finally block after API success

**Hypothesis 4: localStorage Overwrite**
- localStorage.setItem called for each tutorial addition
- Second addition overwrites first before cart sync completes

**Test:** Check useEffect dependency array, ensure debounce for rapid updates

### Root Cause Identification Criteria

The root cause is identified when:
1. Debug logs show exact sequence of events leading to inconsistency
2. Timing analysis reveals delay or race condition window
3. Hypothesis testing confirms which scenario causes the bug
4. Fix can be implemented to prevent identified failure mode

### Potential Fixes (Based on Hypotheses)

**Fix 1: Queue Cart Operations**
```javascript
const [cartOperationQueue, setCartOperationQueue] = useState([]);
const [isProcessingQueue, setIsProcessingQueue] = useState(false);

const queueCartOperation = (operation) => {
  setCartOperationQueue(prev => [...prev, operation]);
};

useEffect(() => {
  if (!isProcessingQueue && cartOperationQueue.length > 0) {
    processNextOperation();
  }
}, [cartOperationQueue, isProcessingQueue]);
```

**Fix 2: Atomic State Updates**
```javascript
const handleAddToCart = async (subjectCode) => {
  const choices = getSubjectChoices(subjectCode);

  // Build complete payload with ALL choices BEFORE API call
  const tutorialMetadata = buildTutorialMetadata(choices, subjectCode, location, actualPrice);

  // Single atomic API call with all selections
  await addToCart(productData, priceData);

  // Mark as added ONLY after successful API response
  markChoicesAsAdded(subjectCode);
};
```

**Fix 3: Debounce localStorage Writes**
```javascript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tutorialChoices));
  }, 300); // Debounce 300ms

  return () => clearTimeout(timeoutId);
}, [tutorialChoices]);
```

### Key Constraints

1. **Backward Compatibility**: Existing tutorial selections in localStorage must load correctly
2. **No Breaking Changes**: All Context API method signatures remain unchanged
3. **Performance**: Fix must not introduce noticeable delays in add-to-cart workflow
4. **Minimal Refactoring**: Leverage existing patterns, avoid architectural changes

## Definition of Done

- [x] Functional requirements met (all 10 acceptance criteria pass)
- [x] Root cause identified with evidence from debug logs
- [x] Hypothesis testing confirms failure mode
- [x] Fix implemented to prevent identified race condition/timing issue
- [x] Debug logging removed from production code
- [x] Bug reproduction steps no longer reproduce issue:
  - [x] Add CS1-30-25S → Add CS1-20-25S → Both appear in cart
  - [x] Summary bar matches cart state at all times
  - [x] Clear cart → No selections persist after refresh
- [x] Integration requirements verified
  - [x] TutorialChoiceContext ↔ CartContext synchronized
  - [x] localStorage ↔ Backend cart consistent
  - [x] API integration maintains state integrity
- [x] Existing functionality regression tested
  - [x] Single tutorial addition works
  - [x] Edit tutorial choices works
  - [x] Remove tutorial choices works (from Story 1)
  - [x] Page refresh restores state correctly
- [x] Code follows existing patterns and standards
- [x] Tests pass (existing and new)
  - [x] Integration tests cover multi-tutorial workflows
  - [x] Unit tests for race condition handling
  - [x] All existing tests still pass
- [x] Manual testing checklist completed
- [x] Code review completed and approved

## Risk Mitigation

### Primary Risk
**Risk:** Fix introduces performance degradation in add-to-cart workflow (especially for queuing or debouncing approaches)

**Mitigation:**
- Measure add-to-cart operation time before and after fix
- Target: < 500ms for single tutorial addition (perceived as instant)
- If queuing required, use optimistic UI updates to show immediate feedback
- Ensure loading states communicate progress during operations

### Secondary Risk
**Risk:** Fix breaks existing tutorial selections stored in localStorage (user data loss)

**Mitigation:**
- Add migration logic to handle old localStorage format if structure changes
- Test with various localStorage states (empty, single subject, multiple subjects)
- Provide fallback to clear localStorage if parsing fails (with console warning)

### Rollback
- Git revert of changes (no database migrations)
- Debug logging can be temporarily re-enabled if issues arise
- Fallback: Disable rapid multi-tutorial addition (add debounce to dialog)

## Implementation Checklist

### Phase 1: Investigation & Logging
- [ ] Add debug logging to TutorialSelectionDialog.onConfirm
- [ ] Add debug logging to TutorialChoiceContext.addTutorialChoice
- [ ] Add debug logging to TutorialSummaryBarContainer.handleAddToCart
- [ ] Add debug logging to CartContext.addToCart/updateCartItem
- [ ] Add localStorage monitoring (setItem calls)
- [ ] Add backend API request/response logging (if not already present)

### Phase 2: Reproduce Bug with Logging
- [ ] Run exact reproduction steps from bug report
- [ ] Collect debug log output
- [ ] Analyze timestamp sequence
- [ ] Identify timing gaps or overlaps
- [ ] Document observations in investigation notes

### Phase 3: Hypothesis Testing
- [ ] Test Hypothesis 1: Add 500ms delay between additions
- [ ] Test Hypothesis 2: Log existingCartItem detection logic
- [ ] Test Hypothesis 3: Move markChoicesAsAdded timing
- [ ] Test Hypothesis 4: Check localStorage write frequency
- [ ] Confirm which hypothesis explains bug behavior

### Phase 4: Implement Fix
- [ ] Based on confirmed hypothesis, implement appropriate fix
- [ ] Write unit tests for fix (TDD approach)
- [ ] Run tests to verify fix works
- [ ] Manually test with reproduction steps
- [ ] Verify bug no longer reproduces

### Phase 5: Clean Up & Final Testing
- [ ] Remove all debug logging code
- [ ] Run full test suite
- [ ] Manual end-to-end testing
- [ ] Performance testing (measure add-to-cart time)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

### Phase 6: Code Review & Documentation
- [ ] Document root cause in commit message
- [ ] Add inline comments explaining fix rationale
- [ ] Request code review from team
- [ ] Address review feedback
- [ ] Update story with investigation findings

---

## References

- **Epic:** `docs/prd/epic-4-tutorial-summary-bar-stability-and-mobile-ux.md`
- **Bug Report:** `docs/prompt-dump/tutorial-summary-bar-and-add-to-cart-inconsistency.md` (lines 13-22)
- **Component:** `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js` (lines 114-171)
- **Context:** `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js` (lines 54-85)
- **Dialog:** `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionDialog.js`

---

**Story Status:** Ready for Development
**Story Points:** 8 (High complexity - requires investigation and root cause analysis)
**Priority:** Critical (Causes data inconsistency in tutorial purchasing)
**Estimate:** 4-6 hours
**Dependencies:** Story 1 should be completed first (stable remove functionality aids testing)
