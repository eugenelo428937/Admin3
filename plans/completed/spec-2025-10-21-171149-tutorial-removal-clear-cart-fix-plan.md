# Implementation Plan: Tutorial Selection Removal and Cart Clearing

**Branch**: `epic-4-story-1-fix-remove-and-clear-cart` | **Date**: 2025-10-21 | **Spec**: `specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix.md`
**Input**: Feature specification from `/specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅
   → Spec loaded successfully
2. Fill Technical Context ✅
   → Project Type: web (React frontend + Django backend)
   → Structure Decision: Option 2 (frontend/ + backend/)
3. Fill Constitution Check section ✅
   → No constitution file found - proceeding without gates
4. Evaluate Constitution Check section ✅
   → No violations (no constitution defined)
5. Execute Phase 0 → research.md ✅
   → No NEEDS CLARIFICATION markers in spec (comprehensive story document)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md ✅
7. Re-evaluate Constitution Check ✅
   → No new violations
8. Plan Phase 2 → Task generation approach described ✅
9. STOP - Ready for /tasks command ✅
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Primary Requirement**: Fix tutorial selection removal functionality to ensure complete removal from all storage locations (TutorialChoiceContext, localStorage, backend cart) when Remove button is clicked or Clear Cart is executed.

**Technical Approach**:
- Update `TutorialSummaryBarContainer.handleRemove()` to remove both draft (`isDraft: true`) and carted (`isDraft: false`) tutorial selections
- Add backend cart API DELETE calls via `CartContext.removeFromCart()` for carted selections
- Update `CartPanel.handleClearCart()` to ensure complete tutorial selection reset via `TutorialChoiceContext.removeAllChoices()`
- Add proper error handling, loading states, and state rollback on failures
- Follow existing TDD patterns with comprehensive test coverage

## Technical Context

**Language/Version**: JavaScript ES6+ (React 18), Python 3.14 (Django 5.1)
**Primary Dependencies**:
- Frontend: React 18, Material-UI v5, Context API
- Backend: Django 5.1, Django REST Framework, PostgreSQL

**Storage**:
- Frontend: localStorage (draft tutorial choices), Context API state (in-memory)
- Backend: PostgreSQL database (cart items, orders)

**Testing**:
- Frontend: Jest, React Testing Library
- Backend: Django TestCase, APITestCase

**Target Platform**: Web application (Chrome, Firefox, Safari modern versions)
**Project Type**: web (React frontend + Django backend)

**Performance Goals**:
- Remove operation: < 500ms (perceived as instant)
- Cart API DELETE call: < 300ms
- localStorage clear: < 50ms (synchronous)

**Constraints**:
- Must maintain backward compatibility with existing localStorage format
- No breaking changes to Context API method signatures
- Desktop experience must remain unchanged
- All existing tests must continue passing

**Scale/Scope**:
- Active users: ~5000 tutorial purchasers
- Concurrent cart operations: Low (per-user operations)
- Tutorial selections per subject: Max 3 (1st, 2nd, 3rd choice)

## Constitution Check

*No constitution file found - proceeding without constitutional gates*

**Status**: N/A (no constitution defined)

## Project Structure

### Documentation (this feature)
```
specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix/
├── spec.md                      # Feature specification (COMPLETED)
├── plan.md                      # This file (/plan command output)
├── research.md                  # Phase 0 output (to be created)
├── data-model.md                # Phase 1 output (to be created)
├── quickstart.md                # Phase 1 output (to be created)
├── contracts/                   # Phase 1 output (to be created)
│   ├── remove-tutorial-contract.json
│   └── clear-cart-contract.json
└── tasks.md                     # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (React frontend + Django backend)
backend/django_Admin3/
├── apps/
│   └── cart/
│       ├── models.py            # Existing - Cart, CartItem models
│       ├── views.py             # Existing - CartViewSet with remove/clear endpoints
│       ├── serializers.py       # Existing - Cart serializers
│       └── tests/
│           ├── test_cart_removal.py       # NEW - Remove item tests
│           └── test_cart_clear.py         # NEW - Clear cart tests

frontend/react-Admin3/
├── src/
│   ├── components/
│   │   ├── Product/ProductCard/Tutorial/
│   │   │   ├── TutorialSummaryBarContainer.js       # MODIFY - Fix handleRemove
│   │   │   ├── TutorialSelectionSummaryBar.js       # EXISTING - No changes
│   │   │   └── __tests__/
│   │   │       ├── TutorialSummaryBarContainer.test.js   # MODIFY - Add removal tests
│   │   │       └── TutorialSummaryBarContainer.integration.test.js  # NEW - Full workflow
│   │   └── Ordering/
│   │       ├── CartPanel.js                 # MODIFY - Fix handleClearCart
│   │       └── __tests__/
│   │           ├── CartPanel.clearCart.test.js      # EXISTING - Enhance tests
│   │           └── CartPanel.integration.test.js     # NEW - Full clear workflow
│   ├── contexts/
│   │   ├── TutorialChoiceContext.js         # VERIFY - removeAllChoices, removeSubjectChoices
│   │   ├── CartContext.js                   # VERIFY - removeFromCart, clearCart
│   │   └── __tests__/
│   │       ├── TutorialChoiceContext.test.js        # MODIFY - Add removal tests
│   │       └── CartContext.test.js                  # MODIFY - Add removal tests
│   └── services/
│       └── cartService.js                   # EXISTING - removeItem, clearCart (no changes)
└── tests/
    └── integration/
        └── tutorial-removal-workflow.test.js        # NEW - End-to-end removal tests
```

**Structure Decision**: Option 2 (Web application) - React frontend + Django backend

## Phase 0: Outline & Research

### Research Tasks

Since the specification is comprehensive and no NEEDS CLARIFICATION markers exist, Phase 0 research focuses on **existing implementation patterns** rather than unknowns:

1. **Existing Cart Removal Pattern Research**
   - **Goal**: Understand how non-tutorial cart items are currently removed
   - **Files to review**:
     - `frontend/react-Admin3/src/contexts/CartContext.js` (removeFromCart method) ✅ Reviewed
     - `frontend/react-Admin3/src/services/cartService.js` (removeItem API call) ✅ Reviewed
     - `backend/django_Admin3/apps/cart/views.py` (DELETE endpoint logic)
   - **Key findings**:
     - `CartContext.removeFromCart(productId)` finds item by productId, calls `cartService.removeItem(item.id)`
     - `cartService.removeItem(itemId)` makes DELETE to `/api/cart/remove/` with `{ item_id: itemId }`
     - Response updates `cartData` and `cartItems` state
   - **Pattern to follow**: Same API call structure for tutorial removal

2. **TutorialChoiceContext State Management Research**
   - **Goal**: Understand state update patterns and localStorage synchronization
   - **Files to review**:
     - `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js` (removeSubjectChoices, removeAllChoices) ✅ Reviewed
   - **Key findings**:
     - `removeSubjectChoices(subjectCode)` deletes entire subject from `tutorialChoices` state
     - `removeAllChoices()` sets `tutorialChoices` to `{}`
     - useEffect hook automatically syncs state to localStorage: `localStorage.setItem(STORAGE_KEY, JSON.stringify(tutorialChoices))`
   - **Pattern to follow**: State update triggers localStorage sync automatically

3. **Error Handling Pattern Research**
   - **Goal**: Identify existing error handling patterns for cart operations
   - **Files to review**:
     - `frontend/react-Admin3/src/contexts/CartContext.js` (try-catch patterns)
     - `frontend/react-Admin3/src/components/Ordering/CartPanel.js` (error display)
   - **Key findings**:
     - Current pattern: try-catch with console.error (no user-facing error messages)
     - **Gap identified**: Need to add Material-UI Snackbar for user error feedback
   - **Decision**: Add Snackbar component for error messages (Material-UI Alert)

4. **Loading State Pattern Research**
   - **Goal**: Identify existing loading state patterns for async operations
   - **Files to review**:
     - `frontend/react-Admin3/src/components/Ordering/CartPanel.js`
     - `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
   - **Key findings**:
     - Pattern: useState for loading boolean, Material-UI CircularProgress component
     - Set loading=true before async operation, loading=false in finally block
   - **Pattern to follow**: Same loading state management

### Research Output Summary

**research.md** (to be created in Phase 0):

#### Decision 1: Cart Item Removal API Integration
- **What**: Use existing `CartContext.removeFromCart(itemId)` method
- **Why**: Proven pattern, maintains consistency with non-tutorial cart items
- **Implementation**:
  - Find cart item by subject code: `cartItems.find(item => item.metadata?.subjectCode === subjectCode && item.product_type === "tutorial")`
  - Call `removeFromCart(cartItem.id)` for each carted tutorial selection
- **Alternatives considered**: Direct `cartService.removeItem()` call (rejected - bypasses CartContext state management)

#### Decision 2: Error Handling Approach
- **What**: Add Material-UI Snackbar for user-facing error messages
- **Why**: Current console.error pattern insufficient for user experience
- **Implementation**:
  - Add `useState` for Snackbar open/message state
  - Display error message from API response or generic message
  - Auto-dismiss after 6 seconds
- **Alternatives considered**: Alert component (rejected - too intrusive for transient errors)

#### Decision 3: State Rollback Strategy
- **What**: Optimistic UI update with rollback on API failure
- **Why**: Provides instant feedback while ensuring consistency on failure
- **Implementation**:
  - Snapshot current state before removal
  - Update UI immediately (optimistic)
  - On API failure, restore snapshot state
- **Alternatives considered**: Pessimistic (wait for API) - rejected for poor UX

#### Decision 4: Loading State Management
- **What**: Show CircularProgress during async removal operations
- **Why**: Standard pattern in codebase, provides user feedback
- **Implementation**:
  - Add `isRemoving` useState boolean
  - Show loading indicator on Remove button during operation
  - Disable button during loading to prevent double-clicks
- **Alternatives considered**: No loading state - rejected for poor UX on slow connections

## Phase 1: Design & Contracts

### Data Model

**data-model.md** (to be created in Phase 1):

#### Entity 1: Tutorial Choice (Frontend State)
**Purpose**: Represents user's tutorial selection for a subject

**Structure**:
```javascript
{
  subjectCode: string,          // e.g., "CS1"
  choiceLevel: string,          // "1st" | "2nd" | "3rd"
  eventId: number,              // Tutorial event ID
  eventCode: string,            // e.g., "CS1-30-25S"
  location: string,             // e.g., "Edinburgh"
  isDraft: boolean,             // true = not in cart, false = in cart
  productId: number,            // Product ID for cart integration
  productName: string,          // Display name
  subjectName: string,          // Subject display name
  timestamp: string             // ISO 8601 timestamp
}
```

**State Transitions**:
```
DRAFT (isDraft: true)
  → Add to Cart → CARTED (isDraft: false)
  → Remove → REMOVED (deleted from state)

CARTED (isDraft: false)
  → Remove → REMOVED (deleted from state + cart API call)
```

**Validation Rules**:
- `subjectCode` must be valid subject code (e.g., "CS1", "CM2")
- `choiceLevel` must be one of: "1st", "2nd", "3rd"
- `eventId` must be positive integer
- `isDraft` must be boolean

#### Entity 2: Cart Item (Backend Model)
**Purpose**: Persisted cart item in database

**Fields** (existing Django model):
```python
class CartItem:
    id: int                      # Primary key
    cart: ForeignKey(Cart)       # Parent cart
    product: ForeignKey(Product) # Tutorial product
    quantity: int                # Always 1 for tutorials
    price_type: str              # "standard"
    actual_price: Decimal        # Tutorial price
    metadata: JSONField          # Contains tutorial selections
```

**Metadata Structure** (for tutorials):
```json
{
  "subjectCode": "CS1",
  "tutorialChoices": [
    {
      "choiceLevel": "1st",
      "eventCode": "CS1-30-25S",
      "eventId": 123,
      "location": "Edinburgh"
    },
    {
      "choiceLevel": "2nd",
      "eventCode": "CS1-20-25S",
      "eventId": 124,
      "location": "London"
    }
  ]
}
```

**Deletion Rules**:
- When cart item deleted: Cascade delete from cart
- When cart cleared: All cart items deleted

### API Contracts

**contracts/** (to be created in Phase 1):

#### Contract 1: Remove Tutorial Selection
**File**: `contracts/remove-tutorial-contract.json`

```json
{
  "endpoint": "/api/cart/remove/",
  "method": "DELETE",
  "description": "Remove a specific cart item (including tutorial selections)",
  "request": {
    "headers": {
      "Authorization": "Bearer {token}",
      "Content-Type": "application/json"
    },
    "body": {
      "item_id": {
        "type": "integer",
        "required": true,
        "description": "ID of cart item to remove"
      }
    }
  },
  "responses": {
    "200": {
      "description": "Item removed successfully",
      "schema": {
        "type": "object",
        "properties": {
          "id": "integer",
          "items": "array",
          "total": "decimal",
          "item_count": "integer"
        }
      }
    },
    "404": {
      "description": "Cart item not found",
      "schema": {
        "error": "string"
      }
    },
    "401": {
      "description": "Unauthorized",
      "schema": {
        "error": "string"
      }
    }
  },
  "test_scenarios": [
    {
      "name": "Remove tutorial cart item successfully",
      "given": "User has tutorial item in cart with item_id=123",
      "when": "DELETE /api/cart/remove/ with {item_id: 123}",
      "then": "Returns 200 with updated cart, item removed from items array"
    },
    {
      "name": "Remove non-existent item",
      "given": "Cart does not have item_id=999",
      "when": "DELETE /api/cart/remove/ with {item_id: 999}",
      "then": "Returns 404 with error message"
    }
  ]
}
```

#### Contract 2: Clear Cart
**File**: `contracts/clear-cart-contract.json`

```json
{
  "endpoint": "/api/cart/clear/",
  "method": "POST",
  "description": "Remove all items from shopping cart",
  "request": {
    "headers": {
      "Authorization": "Bearer {token}",
      "Content-Type": "application/json"
    },
    "body": {}
  },
  "responses": {
    "200": {
      "description": "Cart cleared successfully",
      "schema": {
        "type": "object",
        "properties": {
          "id": "integer",
          "items": {
            "type": "array",
            "items": [],
            "description": "Empty array after clearing"
          },
          "total": "0.00",
          "item_count": 0
        }
      }
    },
    "401": {
      "description": "Unauthorized",
      "schema": {
        "error": "string"
      }
    }
  },
  "test_scenarios": [
    {
      "name": "Clear cart with tutorials and other items",
      "given": "Cart has 3 items (2 tutorials, 1 book)",
      "when": "POST /api/cart/clear/",
      "then": "Returns 200 with empty items array, total=0, item_count=0"
    },
    {
      "name": "Clear already empty cart",
      "given": "Cart has 0 items",
      "when": "POST /api/cart/clear/",
      "then": "Returns 200 with empty items array (idempotent)"
    }
  ]
}
```

### Contract Tests

**Contract test files** (to be created in Phase 1):

1. `frontend/react-Admin3/src/__tests__/contracts/remove-tutorial.contract.test.js`
2. `frontend/react-Admin3/src/__tests__/contracts/clear-cart.contract.test.js`

**Status**: These tests MUST FAIL initially (no implementation changes yet)

### Integration Test Scenarios

**Extracted from specification user stories** (to be created in Phase 1):

#### Scenario 1: Remove Draft Tutorial Selection
**File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSummaryBarContainer.integration.test.js`

```javascript
describe('Remove draft tutorial selection', () => {
  it('removes draft tutorial and hides summary bar', async () => {
    // Given: User has draft tutorial selection for CS1
    // When: User clicks Remove button
    // Then: Tutorial selection removed from context
    // And: Summary bar hidden
    // And: localStorage cleared
    // And: Selection does not reappear after refresh
  });
});
```

#### Scenario 2: Remove Tutorial Already in Cart
**File**: `frontend/react-Admin3/src/components/Ordering/__tests__/CartPanel.integration.test.js`

```javascript
describe('Remove tutorial from cart', () => {
  it('removes carted tutorial from cart and context', async () => {
    // Given: User has tutorial in cart
    // When: User clicks Remove button on summary bar
    // Then: API DELETE call made
    // And: Cart item removed
    // And: Cart total recalculated
    // And: Summary bar hidden
  });
});
```

#### Scenario 3: Clear Entire Cart
**File**: `frontend/react-Admin3/src/components/Ordering/__tests__/CartPanel.integration.test.js`

```javascript
describe('Clear entire cart', () => {
  it('clears all items and tutorial selections', async () => {
    // Given: Cart has tutorials and other items
    // When: User clicks Clear Cart
    // Then: All cart items removed
    // And: All tutorial selections cleared
    // And: All summary bars hidden
    // And: Page refresh shows empty state
  });
});
```

### Quickstart Validation Test

**quickstart.md** (to be created in Phase 1):

```markdown
# Tutorial Removal & Clear Cart - Quickstart Validation

## Prerequisites
- Frontend dev server running: `npm start` (port 3000)
- Backend dev server running: `python manage.py runserver 8888`
- Test user authenticated

## Validation Steps

### Test 1: Remove Draft Tutorial Selection (2 minutes)
1. Navigate to `/products`
2. Click "Select tutorial" on any CS1 tutorial product card
3. Select 1st choice: CS1-30-25S (Edinburgh)
4. Close dialog (don't add to cart)
5. **Verify**: Summary bar appears at bottom showing CS1-30-25S
6. Click Remove button (trash icon) on summary bar
7. **Verify**: Summary bar disappears
8. Refresh page (F5)
9. **Verify**: No summary bar reappears (localStorage cleared)
10. ✅ PASS if summary bar gone and stays gone after refresh

### Test 2: Remove Tutorial from Cart (3 minutes)
1. Navigate to `/products`
2. Click "Select tutorial" on CS1 tutorial
3. Select 1st choice: CS1-30-25S (Edinburgh)
4. Click "Add to Cart" in dialog
5. **Verify**: Cart icon shows 1 item
6. **Verify**: Summary bar shows "Added in Cart" badge
7. Click Remove button on summary bar
8. **Verify**: Loading indicator appears briefly
9. **Verify**: Summary bar disappears
10. Open cart panel
11. **Verify**: Cart is empty (0 items)
12. Refresh page
13. **Verify**: Cart still empty, no summary bar
14. ✅ PASS if cart cleared and stays cleared after refresh

### Test 3: Clear Cart with Tutorials (3 minutes)
1. Add 2 tutorials to cart (CS1 and CM2)
2. Add 1 book to cart
3. **Verify**: Cart shows 3 items
4. **Verify**: 2 summary bars visible (CS1, CM2)
5. Open cart panel
6. Click "Clear Cart" button
7. **Verify**: Cart panel shows 0 items
8. **Verify**: All summary bars disappear
9. Close cart panel
10. Refresh page
11. **Verify**: Cart still empty, no summary bars
12. ✅ PASS if all items cleared and stay cleared after refresh

### Test 4: Error Handling (2 minutes)
1. Add tutorial to cart
2. Disconnect network (browser dev tools offline mode)
3. Click Remove button on summary bar
4. **Verify**: Error message displayed (Snackbar)
5. **Verify**: Summary bar still visible (rollback)
6. **Verify**: Cart item still present
7. Reconnect network
8. Click Remove button again
9. **Verify**: Removal succeeds
10. ✅ PASS if error handled gracefully with rollback

## Total Validation Time: ~10 minutes

## Success Criteria
- All 4 tests pass
- No console errors
- Smooth user experience with loading states
- Clear error messages on failures
```

### Update Agent Context

**CLAUDE.md Update** (to be performed in Phase 1):

Run: `.specify/scripts/bash/update-agent-context.sh claude`

**Additions to CLAUDE.md**:
```markdown
## Recent Changes (2025-10-21)

### Epic 4 Story 1: Tutorial Removal & Clear Cart Fix
- Fixed `TutorialSummaryBarContainer.handleRemove()` to remove both draft and carted tutorial selections
- Added backend cart API integration for carted item removal
- Fixed `CartPanel.handleClearCart()` to completely reset tutorial selections
- Added error handling with Material-UI Snackbar user feedback
- Added loading states with CircularProgress during async operations
- Comprehensive test coverage: unit tests, integration tests, contract tests

**Key Files Modified**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`
- `frontend/react-Admin3/src/components/Ordering/CartPanel.js`
- `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js` (verified)
- `frontend/react-Admin3/src/contexts/CartContext.js` (verified)

**Testing Patterns**:
- Contract tests validate API request/response schemas
- Integration tests validate full user workflows
- Unit tests validate individual function behavior
- Manual quickstart validates end-to-end user experience
```

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

The `/tasks` command will generate tasks from Phase 1 artifacts in strict TDD order:

**Source Documents**:
- `contracts/remove-tutorial-contract.json` → Contract test tasks
- `contracts/clear-cart-contract.json` → Contract test tasks
- `data-model.md` (Tutorial Choice, Cart Item) → Model validation tasks
- `quickstart.md` (4 validation scenarios) → Integration test tasks

**Task Categories**:
1. **Contract Tests** [P] - Can run in parallel (independent files)
   - Task: Write failing contract test for /api/cart/remove/
   - Task: Write failing contract test for /api/cart/clear/

2. **Context Method Tests** [P] - Can run in parallel
   - Task: Write unit tests for TutorialChoiceContext.removeSubjectChoices
   - Task: Write unit tests for TutorialChoiceContext.removeAllChoices
   - Task: Write unit tests for CartContext.removeFromCart with tutorials

3. **Component Tests** (Sequential - depend on context methods)
   - Task: Write failing tests for TutorialSummaryBarContainer.handleRemove (draft selections)
   - Task: Write failing tests for TutorialSummaryBarContainer.handleRemove (carted selections)
   - Task: Write failing tests for TutorialSummaryBarContainer.handleRemove (mixed selections)
   - Task: Write failing tests for CartPanel.handleClearCart with tutorials

4. **Integration Tests** (Sequential - depend on components)
   - Task: Write integration test for remove draft tutorial workflow
   - Task: Write integration test for remove carted tutorial workflow
   - Task: Write integration test for clear cart with tutorials workflow

5. **Implementation Tasks** (Sequential - make tests pass)
   - Task: Implement handleRemove for draft selections (make test pass)
   - Task: Implement handleRemove for carted selections with API calls (make test pass)
   - Task: Implement handleRemove error handling and rollback (make test pass)
   - Task: Implement handleRemove loading states (make test pass)
   - Task: Verify handleClearCart completeness (make test pass)

6. **UI Enhancement Tasks** (Sequential - after implementation)
   - Task: Add Material-UI Snackbar for error messages
   - Task: Add loading indicators to Remove button
   - Task: Add accessibility attributes (aria-labels, aria-busy)

7. **Validation Tasks** (Final)
   - Task: Run full test suite (all tests must pass)
   - Task: Execute quickstart manual validation (all scenarios pass)
   - Task: Performance validation (< 500ms remove operation)

### Ordering Strategy

**TDD Order**:
1. Write failing tests first (contract → unit → integration)
2. Implement minimum code to make tests pass
3. Refactor while keeping tests green

**Dependency Order**:
1. Contracts → Context methods → Components → Integration
2. Tests before implementation at each level

**Parallel Execution** [P]:
- Contract tests can run in parallel (independent files)
- Context method tests can run in parallel (isolated contexts)
- Component implementation runs sequentially (shared dependencies)

### Estimated Output

**tasks.md Structure**:
```markdown
# Epic 4 Story 1: Tutorial Removal & Clear Cart Fix - Task Breakdown

## Phase 1: Contract Tests [P] (30 minutes)
- [ ] Task 1: Write failing contract test for /api/cart/remove/ [P]
- [ ] Task 2: Write failing contract test for /api/cart/clear/ [P]

## Phase 2: Unit Tests [P] (45 minutes)
- [ ] Task 3: Write unit tests for removeSubjectChoices [P]
- [ ] Task 4: Write unit tests for removeAllChoices [P]
- [ ] Task 5: Write unit tests for CartContext.removeFromCart [P]
- [ ] Task 6: Write unit tests for handleRemove (draft) [P]
- [ ] Task 7: Write unit tests for handleRemove (carted) [P]
- [ ] Task 8: Write unit tests for handleRemove (mixed) [P]
- [ ] Task 9: Write unit tests for handleClearCart [P]

## Phase 3: Integration Tests (1 hour)
- [ ] Task 10: Write integration test - remove draft tutorial
- [ ] Task 11: Write integration test - remove carted tutorial
- [ ] Task 12: Write integration test - clear cart with tutorials

## Phase 4: Implementation (2 hours)
- [ ] Task 13: Implement handleRemove for draft selections
- [ ] Task 14: Implement handleRemove for carted selections (API)
- [ ] Task 15: Implement error handling and state rollback
- [ ] Task 16: Implement loading states with CircularProgress
- [ ] Task 17: Verify handleClearCart completeness

## Phase 5: UI Enhancements (45 minutes)
- [ ] Task 18: Add Snackbar component for error messages
- [ ] Task 19: Add loading indicators to Remove button
- [ ] Task 20: Add accessibility attributes (ARIA)

## Phase 6: Validation (30 minutes)
- [ ] Task 21: Run full test suite (Jest + React Testing Library)
- [ ] Task 22: Execute quickstart manual validation
- [ ] Task 23: Performance validation (< 500ms operations)
- [ ] Task 24: Cross-browser testing (Chrome, Firefox, Safari)

Total Tasks: 24
Estimated Time: 5.5 hours
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

*No complexity deviations - using existing patterns and infrastructure*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No constitutional gates defined | N/A |

## Progress Tracking

### Phase Status
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

### Gate Status
- [x] Initial Constitution Check: N/A (no constitution defined)
- [x] Post-Design Constitution Check: N/A
- [x] All NEEDS CLARIFICATION resolved (none in spec)
- [x] Complexity deviations documented (none)

### Artifact Status
- [x] Specification created: `specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix.md`
- [x] Implementation plan created: `plans/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix-plan.md`
- [ ] Research document: `specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix/research.md` (ready to create)
- [ ] Data model: `specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix/data-model.md` (ready to create)
- [ ] Contracts: `specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix/contracts/` (ready to create)
- [ ] Quickstart: `specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix/quickstart.md` (ready to create)
- [ ] Tasks: `specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix/tasks.md` (/tasks command)

---

## Next Steps

**Ready for `/tasks` command** to generate detailed TDD task breakdown from Phase 1 artifacts.

**Command**: `/tasks specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix/plan.md`

This will create `tasks.md` with ~24 numbered tasks in strict TDD order.

---

*Implementation plan generated following SpecKit template v2.1.1*
