# Data Model: Cart Synchronization Fix

**Feature**: Fix Cart Synchronization Issue
**Date**: 2025-10-26
**Status**: Complete

## Overview

This feature modifies existing data structures rather than creating new models. The focus is on ensuring consistent state management across three React contexts and localStorage.

## Existing Entities (No Schema Changes)

### TutorialChoice (TutorialChoiceContext)

**Purpose**: Represents a user's draft or carted tutorial selection

**Structure** (existing, preserved):
```javascript
{
  subjectCode: string,           // e.g., "CS1"
  choiceLevel: number,           // 1, 2, or 3
  eventData: {
    eventId: string,
    location: string,            // e.g., "Edinburgh"
    startDate: string,
    endDate: string,
    sessionCode: string          // e.g., "CS1-30-25S"
  },
  productMetadata: {
    productId: string,
    price: number,
    currency: string
  },
  isDraft: boolean,              // true = not in cart, false = added to cart
  timestamp: number              // When choice was made
}
```

**Key Constraints**:
- ✅ No breaking changes to structure
- ✅ `isDraft` flag is source of truth for cart status
- ✅ Must support existing localStorage format

**State Transitions**:
```
[Not Selected]
    ↓ (user selects in dialog)
[Draft: isDraft=true]
    ↓ (handleAddToCart called)
[Adding to Cart: API call in progress]
    ↓ (API success)
[Carted: isDraft=false]
    ↓ (cart item removed)
[Removed: deleted from context]
```

**Validation Rules**:
- `subjectCode` must be valid subject (CS1, CM2, etc.)
- `choiceLevel` must be 1, 2, or 3
- `eventData.eventId` must exist in tutorial events
- `productMetadata.productId` must exist in products
- `isDraft` must sync with cart state on page load

### CartItem (CartContext)

**Purpose**: Represents an item in the user's shopping cart (backend-persisted)

**Structure** (existing, preserved):
```javascript
{
  id: string,                    // Backend cart item ID
  product: {
    productId: string,
    name: string,
    description: string
  },
  quantity: number,
  price: {
    amount: number,
    currency: string
  },
  metadata: {
    tutorialSelections: [        // Array of tutorial selections
      {
        choiceLevel: number,
        eventId: string,
        location: string,
        sessionCode: string,
        timestamp: number
      }
    ]
  }
}
```

**Key Constraints**:
- ✅ No breaking changes to structure
- ✅ `metadata.tutorialSelections` is array (supports multiple tutorials per cart item)
- ✅ Must merge new selections with existing selections (not replace)

**Critical Operations**:
1. **Add to Cart** (POST /api/cart/items/):
   - Check for existing cart item for this subject
   - If exists: Merge tutorial selections (use UPDATE)
   - If not: Create new cart item (use CREATE)

2. **Update Cart Item** (PUT /api/cart/items/{id}/):
   - Merge new tutorialSelections with existing
   - Recalculate price based on all selections
   - Return updated cart item

3. **Remove from Cart** (DELETE /api/cart/items/{id}/):
   - Remove entire cart item
   - Update TutorialChoiceContext (mark as draft again if partial removal)

### OperationSnapshot (New Internal Structure)

**Purpose**: Snapshot of state before cart operations for rollback on failure

**Structure** (internal, not persisted):
```javascript
{
  tutorialChoices: {             // Deep copy of TutorialChoiceContext state
    [subjectCode]: {
      [choiceLevel]: TutorialChoice
    }
  },
  cartItems: CartItem[],         // Deep copy of CartContext state
  timestamp: number              // When snapshot was taken
}
```

**Usage**:
- Created before any cart-mutating operation
- Used for rollback if API call fails
- Discarded after successful operation

**Rollback Logic**:
```javascript
const rollback = (snapshot) => {
  // Restore TutorialChoiceContext
  setTutorialChoices(snapshot.tutorialChoices);

  // Restore CartContext
  setCartItems(snapshot.cartItems);

  // Show error to user
  showError('Operation failed. Your cart has been restored.');
};
```

## State Flow Diagrams

### Normal Flow: Add Multiple Tutorials to Cart

```
User Action: Add CS1-30-25S (Edinburgh)
    ↓
TutorialSelectionDialog.onConfirm()
    ↓
TutorialChoiceContext.addTutorialChoice()
    ↓
TutorialChoice created with isDraft=true
    ↓
localStorage.setItem (debounced, 300ms)
    ↓
User Action: Add CS1-20-25S (London)
    ↓
[Same flow, second TutorialChoice created]
    ↓
User Action: Click "Add to Cart" on Summary Bar
    ↓
TutorialSummaryBarContainer.handleAddToCart(subjectCode="CS1")
    ↓
1. Get all draft choices for CS1: [Edinburgh, London]
    ↓
2. Create snapshot of current state
    ↓
3. Build complete payload with BOTH tutorials
    ↓
4. Check if cart item exists for CS1 product
    ↓
5a. IF EXISTS: PUT /api/cart/items/{id}/ (merge selections)
5b. IF NOT: POST /api/cart/items/ (create new)
    ↓
6. Wait for API response
    ↓
7. ON SUCCESS:
   - Update CartContext with returned cart item
   - Mark tutorial choices as isDraft=false
   - Trigger localStorage update (debounced)
   - Show success message
    ↓
8. ON FAILURE:
   - Rollback to snapshot
   - Show error message
   - Choices remain as isDraft=true
```

### Race Condition Prevention Flow

```
User adds Tutorial A
    ↓
handleAddToCart(A) starts
    ↓
    API call for A pending...
        ↓
        User adds Tutorial B (rapid)
            ↓
            handleAddToCart(B) called
                ↓
                [PROBLEM DETECTED: Previous operation in progress]
                    ↓
                    [SOLUTION: Queue operation B]
                        ↓
                        Wait for operation A to complete
                            ↓
                            Process operation B with updated state
```

**Implementation Note**: Initially we'll use atomic operations (build complete payload before API call). If race conditions persist, we'll implement operation queueing as described in research.md Pattern 1.

## Data Consistency Rules

### Rule 1: Backend Cart is Source of Truth for Carted Items
```javascript
// On page load / mount
const reconcileState = async () => {
  // 1. Load from backend
  const cartItems = await fetchCart();

  // 2. Load from localStorage
  const localChoices = JSON.parse(localStorage.getItem('tutorialChoices'));

  // 3. Mark localStorage choices as isDraft=false if they exist in cart
  const reconciledChoices = markCartedChoices(localChoices, cartItems);

  // 4. Update context with reconciled state
  setTutorialChoices(reconciledChoices);
  setCartItems(cartItems);
};
```

### Rule 2: localStorage Only Persists Draft Choices
- Cart operations write to backend first
- Only after backend success do we update localStorage with isDraft=false
- On failure, localStorage retains isDraft=true

### Rule 3: Atomic State Updates
```javascript
// WRONG: Sequential updates (creates race condition)
await updateCartItem(id, payload);
markChoicesAsAdded(subjectCode);  // May execute before cart update completes

// CORRECT: Atomic update after success
try {
  const result = await updateCartItem(id, payload);
  // Only mark as added AFTER confirmed success
  markChoicesAsAdded(subjectCode);
} catch (error) {
  // Rollback, choices stay as draft
  rollback(snapshot);
}
```

## Data Migrations

**Migration Required**: None - no schema changes

**Backward Compatibility**:
```javascript
// Support existing localStorage format
const loadFromLocalStorage = () => {
  const stored = localStorage.getItem('tutorialChoices');
  if (!stored) return {};

  try {
    const parsed = JSON.parse(stored);

    // Ensure all choices have required fields
    return ensureDefaults(parsed, {
      isDraft: true,  // Default to draft if missing
      timestamp: Date.now()
    });
  } catch (error) {
    console.warn('Failed to parse localStorage, resetting');
    return {};
  }
};
```

## Performance Considerations

### localStorage Debouncing
```javascript
let debounceTimeout = null;

const saveToLocalStorage = (choices) => {
  clearTimeout(debounceTimeout);

  debounceTimeout = setTimeout(() => {
    localStorage.setItem('tutorialChoices', JSON.stringify(choices));
  }, 300);  // 300ms debounce
};
```

**Rationale**: Prevents rapid writes during sequential additions, improves performance

### Cart API Batching
```javascript
// CORRECT: Single API call with all selections
const payload = {
  product: productData,
  metadata: {
    tutorialSelections: [
      ...existingSelections,    // Preserve existing
      ...newSelections          // Add new
    ]
  }
};

await api.updateCartItem(id, payload);
```

**Rationale**: Reduces network requests, ensures atomic updates

## Validation Requirements

### Client-Side Validation
Before any cart operation:
1. ✅ All draft choices have valid eventIds
2. ✅ All draft choices have valid productIds
3. ✅ No duplicate eventIds within same subject
4. ✅ At least one draft choice exists for subject

### Server-Side Validation
Backend must validate:
1. ✅ Tutorial event exists and is bookable
2. ✅ Product exists and is available
3. ✅ User is authorized to purchase
4. ✅ No conflicting bookings for user

**Error Handling**: If validation fails, rollback and show specific error message to user

## Testing Data Structures

### Test Fixtures
```javascript
// fixtures/tutorialChoices.js
export const draftChoiceEdinburgh = {
  subjectCode: 'CS1',
  choiceLevel: 1,
  eventData: {
    eventId: 'evt_123',
    location: 'Edinburgh',
    sessionCode: 'CS1-30-25S'
  },
  isDraft: true,
  timestamp: Date.now()
};

export const draftChoiceLondon = {
  subjectCode: 'CS1',
  choiceLevel: 2,
  eventData: {
    eventId: 'evt_456',
    location: 'London',
    sessionCode: 'CS1-20-25S'
  },
  isDraft: true,
  timestamp: Date.now()
};

export const cartedChoiceEdinburgh = {
  ...draftChoiceEdinburgh,
  isDraft: false
};
```

### Mock Cart Items
```javascript
// fixtures/cartItems.js
export const cartItemWithOneSelection = {
  id: 'cart_789',
  product: {
    productId: 'prod_cs1',
    name: 'CS1 Tutorial Package'
  },
  metadata: {
    tutorialSelections: [
      {
        choiceLevel: 1,
        eventId: 'evt_123',
        location: 'Edinburgh',
        sessionCode: 'CS1-30-25S'
      }
    ]
  }
};

export const cartItemWithTwoSelections = {
  id: 'cart_789',
  product: {
    productId: 'prod_cs1',
    name: 'CS1 Tutorial Package'
  },
  metadata: {
    tutorialSelections: [
      {
        choiceLevel: 1,
        eventId: 'evt_123',
        location: 'Edinburgh',
        sessionCode: 'CS1-30-25S'
      },
      {
        choiceLevel: 2,
        eventId: 'evt_456',
        location: 'London',
        sessionCode: 'CS1-20-25S'
      }
    ]
  }
};
```

## Key Takeaways

1. **No schema changes**: All entities remain backward compatible
2. **isDraft flag is critical**: Source of truth for cart status
3. **Snapshots enable rollback**: Simple state preservation for error recovery
4. **Atomic operations prevent races**: Build complete payload, single API call, update after success
5. **Backend is authoritative**: localStorage only for drafts, cart API for carted items
