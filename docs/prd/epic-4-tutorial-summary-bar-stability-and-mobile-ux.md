# Epic 4: Tutorial Summary Bar - Stability & Mobile UX Improvements - Brownfield Enhancement

## Epic Goal

Fix critical bugs in the tutorial selection summary bar system and improve mobile user experience to ensure reliable cart synchronization, complete removal functionality, and responsive design across all device sizes.

## Epic Description

### Existing System Context

**Current Relevant Functionality:**
- Tutorial selection system allows users to choose up to 3 tutorial events per subject (1st, 2nd, 3rd choice)
- Persistent summary bar displays selected tutorials at bottom-left of screen
- Summary bar includes Edit, Add to Cart, and Remove action buttons
- Integration with shopping cart for purchasing tutorial registrations
- State managed via TutorialChoiceContext with localStorage persistence

**Technology Stack:**
- React 18 with functional components and hooks
- Material-UI for UI components
- Context API for state management (TutorialChoiceContext, CartContext)
- localStorage for draft choice persistence
- Django REST API backend for cart operations

**Integration Points:**
- `TutorialChoiceContext.js` - Draft choice state management and localStorage sync
- `CartContext.js` - Shopping cart state and backend API integration
- `TutorialSummaryBarContainer.js` - Business logic orchestration layer
- `TutorialSelectionSummaryBar.js` - Presentation component
- `CartPanel.js` - Cart UI with Clear Cart functionality
- Backend cart API endpoints (add/update/remove)

### Enhancement Details

**What's Being Added/Changed:**

1. **Remove Button Functionality** (Critical Bug)
   - Current: Remove button has no effect, no backend calls made
   - Fix: Implement complete removal of tutorial choices including:
     - Remove from TutorialChoiceContext (both draft and carted choices)
     - Remove from shopping cart via backend API
     - Clear from localStorage
     - Hide summary bar when all choices removed

2. **Clear Cart Completeness** (Critical Bug)
   - Current: Clear Cart doesn't fully reset tutorial selections (selections persist after clearing)
   - Fix: Ensure Clear Cart button completely resets:
     - All tutorial choices cleared from TutorialChoiceContext
     - localStorage cleared
     - Summary bars hidden for all subjects

3. **Cart Synchronization** (Critical Bug)
   - Current: Cart and summary bar show different tutorial selections (reproducible inconsistency)
   - Issue: Adding CS1-30-25S and CS1-20-25S from dialog only shows CS1-20-25S in cart, but summary bar shows both
   - Fix: Investigate and resolve state synchronization issues between:
     - TutorialChoiceContext state
     - CartContext state
     - Backend cart state
     - localStorage persistence

4. **Mobile Responsive Design** (UX Enhancement)
   - Current: Summary bar fixed at bottom-left obstructs screen on mobile (sm or smaller)
   - Enhancement: Implement collapsible/responsive design:
     - Compact view for mobile devices
     - Slide-up or swipe-away interaction
     - Ensure no screen obstruction
     - Maintain easy access to actions

**How It Integrates:**
- Updates existing `TutorialSummaryBarContainer.handleRemove` to include cart API calls
- Extends `CartPanel.handleClearCart` to ensure complete tutorial selection reset
- Adds mobile-responsive styling to `TutorialSelectionSummaryBar` component
- Fixes state synchronization timing in add-to-cart workflow
- Maintains all existing functionality and API contracts

**Success Criteria:**
1. ✅ Remove button removes both draft and carted tutorial choices
2. ✅ Remove button calls backend API to remove from cart (if isDraft: false)
3. ✅ Remove button clears choices from TutorialChoiceContext and localStorage
4. ✅ Summary bar hides when all choices removed for a subject
5. ✅ Clear Cart button completely resets all tutorial selections (context + localStorage)
6. ✅ Tutorial selections don't reappear after clearing cart
7. ✅ Cart and summary bar always show consistent tutorial selections
8. ✅ Adding multiple tutorials to cart works correctly (no missing selections)
9. ✅ Mobile summary bar doesn't obstruct screen content
10. ✅ Mobile users can easily collapse/expand summary bar
11. ✅ All existing tutorial selection functionality remains intact
12. ✅ No regression in cart operations

## Stories

### Story 1: Fix Remove Button and Clear Cart Functionality
**Description:** Implement complete removal functionality for tutorial choices including backend cart integration and localStorage cleanup. Fix Clear Cart to fully reset tutorial selections.

**Key Requirements:**
- Update `handleRemove` in TutorialSummaryBarContainer to:
  - Remove both draft (isDraft: true) and carted (isDraft: false) choices
  - Call cart API to remove tutorial items from backend cart
  - Clear from TutorialChoiceContext
  - Clear from localStorage
- Update `handleClearCart` in CartPanel to:
  - Ensure `removeAllChoices()` fully clears context and localStorage
  - Verify no state restoration occurs after clear operation
- Add error handling for failed removal API calls
- Add loading states during removal operations

**Acceptance Criteria:**
- Remove button successfully removes all tutorial choices (draft and carted)
- Remove button makes backend API call when removing carted items
- Summary bar hides when all choices removed
- Clear Cart completely resets tutorial selections (no persistence)
- No tutorial selections reappear after cart is cleared
- Error states handled gracefully with user feedback

**Estimate:** 4-6 hours

---

### Story 2: Investigate and Fix Cart Synchronization Issue
**Description:** Root cause analysis and fix for cart/context state inconsistency where summary bar and cart show different tutorial selections.

**Key Requirements:**
- Add detailed logging to track state flow during add-to-cart operations
- Investigate race conditions between:
  - TutorialChoiceContext updates
  - CartContext updates
  - Backend cart API responses
  - localStorage persistence
- Identify why CS1-30-25S and CS1-20-25S show different states
- Fix state synchronization issues
- Ensure atomic updates across Context → Cart → localStorage
- Add integration tests for multi-tutorial selection workflows

**Acceptance Criteria:**
- Cart and summary bar always display same tutorial selections
- Adding multiple tutorials works consistently (no missing items)
- State synchronization verified with detailed logging
- No race conditions in add-to-cart workflow
- localStorage stays in sync with Context and Cart
- Integration tests cover full selection → add to cart → display workflow

**Estimate:** 4-6 hours

---

### Story 3: Mobile Responsive Summary Bar Design
**Description:** Implement responsive design for tutorial summary bar to prevent screen obstruction on mobile devices while maintaining easy access to actions.

**Key Requirements:**
- Design mobile-specific layout for summary bar:
  - Compact view with slide-up/collapse interaction
  - Swipe gestures or tap-to-expand
  - Bottom sheet or slide-up panel pattern
- Implement responsive breakpoints:
  - Full view for md and larger
  - Compact/collapsible view for sm and smaller
- Ensure touch targets meet accessibility standards (44px minimum)
- Maintain all action buttons (Edit, Add to Cart, Remove) in compact view
- Test on various mobile devices and screen sizes

**Acceptance Criteria:**
- Summary bar doesn't obstruct screen content on mobile (sm or smaller)
- Users can easily collapse/expand summary bar on mobile
- Compact view includes all essential actions
- Touch targets meet accessibility standards
- Responsive design works across all mobile devices
- Smooth animations for collapse/expand interactions
- Desktop experience unchanged

**Estimate:** 3-4 hours

## Compatibility Requirements

- [x] Existing APIs remain unchanged (cart removal endpoint already exists)
- [x] Database schema changes: None required
- [x] UI changes follow existing Material-UI patterns
- [x] Performance impact is minimal (add-to-cart latency unchanged)
- [x] Backward compatible with existing tutorial selection workflow
- [x] localStorage format remains compatible

## Risk Mitigation

### Primary Risk
**Risk:** Regression in critical cart functionality during removal/sync fixes could break tutorial purchasing flow

**Mitigation:**
1. Implement comprehensive integration tests covering full workflows:
   - Select tutorials → Add to cart → Display in cart
   - Remove from summary bar → Verify cart updated
   - Clear cart → Verify all selections cleared
2. Add detailed logging for state transitions during development/testing
3. Test with real-world scenarios matching bug report reproduction steps
4. Conduct manual QA on all user flows before release

### Secondary Risk
**Risk:** Mobile responsive changes could break desktop layout or accessibility

**Mitigation:**
1. Use Material-UI responsive breakpoints (existing pattern)
2. Progressive enhancement approach (desktop first, add mobile optimizations)
3. Test on multiple device sizes and screen resolutions
4. Accessibility audit for touch targets and screen reader compatibility

### Rollback Plan
1. All changes isolated to tutorial summary bar components (no shared utilities modified)
2. Feature can be disabled via feature flag if critical issues arise
3. Git revert of specific commits (no database migrations involved)
4. Fallback: Hide summary bar completely and rely on cart panel for selection review

## Definition of Done

- [x] All three stories completed with acceptance criteria met
- [x] Remove button removes both draft and carted choices with backend API integration
- [x] Clear Cart completely resets tutorial selections (no persistence)
- [x] Cart and summary bar always show consistent selections
- [x] Mobile summary bar doesn't obstruct screen (responsive design implemented)
- [x] All existing tutorial selection functionality verified through testing
- [x] Integration tests pass for full tutorial selection workflows
- [x] Manual testing reproduces and verifies fixes for all reported issues
- [x] No regression in cart operations or tutorial purchasing flow
- [x] Code review completed and approved
- [x] Documentation updated (if applicable)

---

## References

- **Bug Report:** `docs/prompt-dump/tutorial-summary-bar-and-add-to-cart-inconsistency.md`
- **Key Components:**
  - `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js` (lines 114-186)
  - `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
  - `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js` (lines 54-125)
  - `frontend/react-Admin3/src/components/Ordering/CartPanel.js` (lines 63-67)

---

## Reproduction Steps (From Bug Report)

1. Add CS1-30-25S (Edinburgh) to cart from TutorialSelectionDialog
2. Add CS1-20-25S (London) to cart from TutorialSelectionDialog
3. Cart only shows CS1-20-25S (London) but Summary bar shows CS1-30-25S and CS1-20-25S
4. Click Add to Cart in summary bar → both tutorials appear in cart
5. Clear cart from CartPanel → click any CS1 tutorial "Select tutorial" button
6. Before selecting any tutorial, summary bar appears with CS1-20-25S (London) already in selection

**Expected Behavior:**
- Cart and summary bar always show same selections
- Clear cart completely removes all tutorial choices
- Remove button works and calls backend API
- Mobile summary bar doesn't obstruct screen

---

**Epic Status:** Ready for Story Development
**Epic Owner:** Product Manager
**Target Sprint:** TBD (High Priority - Critical Bug Fixes)
