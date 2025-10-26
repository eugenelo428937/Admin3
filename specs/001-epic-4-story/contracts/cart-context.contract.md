# Contract: CartContext API

**Feature**: Fix Cart Synchronization Issue
**Context**: Frontend React Context for shopping cart management
**File**: `frontend/react-Admin3/src/contexts/CartContext.js`

## Contract Version
**Version**: 1.0.0 (No breaking changes - backward compatible)
**Date**: 2025-10-26

## Purpose
Manages shopping cart state with backend API synchronization. Handles adding items, updating quantities/metadata, removing items, and clearing cart.

## State Shape
```javascript
{
  cartItems: [
    {
      id: string,              // Backend cart item ID
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
        tutorialSelections: [  // Array supports multiple tutorials
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
  ],
  isLoading: boolean,
  error: string | null
}
```

## Context Methods

### addToCart
**Purpose**: Add new item to cart (POST to backend API)

**Signature**:
```javascript
addToCart(
  productData: object,
  priceData: object,
  metadata?: object
): Promise<CartItem>
```

**Parameters**:
- `productData`: Product information (productId, name, description)
- `priceData`: Price information (amount, currency)
- `metadata`: Optional metadata (e.g., tutorialSelections)

**Behavior**:
- Makes POST /api/cart/items/ to backend
- Adds returned cart item to state
- Sets isLoading during operation
- Clears error on success

**Returns**: Promise resolving to created CartItem

**Errors**: Throws on API failure

**Contract Test**:
```javascript
test('addToCart creates new cart item', async () => {
  mockAPI.post.mockResolvedValue({
    data: { id: 'cart_123', product: productData, metadata }
  });

  const { result } = renderHook(() => useCart());

  await act(async () => {
    const item = await result.current.addToCart(productData, priceData, metadata);
    expect(item.id).toBe('cart_123');
  });

  expect(result.current.cartItems).toHaveLength(1);
  expect(mockAPI.post).toHaveBeenCalledWith(
    '/api/cart/items/',
    { product: productData, price: priceData, metadata }
  );
});

test('addToCart sets loading state during operation', async () => {
  const { result } = renderHook(() => useCart());

  act(() => {
    result.current.addToCart(productData, priceData);
  });

  expect(result.current.isLoading).toBe(true);

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
});
```

### updateCartItem
**Purpose**: Update existing cart item (PUT to backend API)

**Signature**:
```javascript
updateCartItem(
  itemId: string,
  productData: object,
  priceData: object,
  metadata?: object
): Promise<CartItem>
```

**Parameters**:
- `itemId`: Existing cart item ID
- `productData`: Updated product information
- `priceData`: Updated price information
- `metadata`: Updated metadata (merged with existing)

**Behavior**:
- Makes PUT /api/cart/items/{itemId}/ to backend
- **CRITICAL**: Backend must merge metadata.tutorialSelections, not replace
- Updates cart item in state
- Sets isLoading during operation

**Returns**: Promise resolving to updated CartItem

**Contract Test**:
```javascript
test('updateCartItem merges tutorial selections', async () => {
  const existingItem = {
    id: 'cart_123',
    metadata: {
      tutorialSelections: [
        { choiceLevel: 1, eventId: 'evt_123' }
      ]
    }
  };

  const newMetadata = {
    tutorialSelections: [
      { choiceLevel: 2, eventId: 'evt_456' }
    ]
  };

  mockAPI.put.mockResolvedValue({
    data: {
      id: 'cart_123',
      metadata: {
        tutorialSelections: [
          { choiceLevel: 1, eventId: 'evt_123' },  // Existing preserved
          { choiceLevel: 2, eventId: 'evt_456' }   // New added
        ]
      }
    }
  });

  const { result } = renderHook(() => useCart());

  await act(async () => {
    const updated = await result.current.updateCartItem(
      'cart_123',
      productData,
      priceData,
      newMetadata
    );

    expect(updated.metadata.tutorialSelections).toHaveLength(2);
  });
});
```

### removeFromCart
**Purpose**: Remove item from cart (DELETE to backend API)

**Signature**:
```javascript
removeFromCart(itemId: string): Promise<void>
```

**Parameters**:
- `itemId`: Cart item ID to remove

**Behavior**:
- Makes DELETE /api/cart/items/{itemId}/ to backend
- Removes item from state on success
- Sets isLoading during operation

**Contract Test**:
```javascript
test('removeFromCart deletes item', async () => {
  const { result } = renderHook(() => useCart());

  // Setup: Add item first
  await act(async () => {
    await result.current.addToCart(productData, priceData);
  });

  const itemId = result.current.cartItems[0].id;

  await act(async () => {
    await result.current.removeFromCart(itemId);
  });

  expect(result.current.cartItems).toHaveLength(0);
  expect(mockAPI.delete).toHaveBeenCalledWith(`/api/cart/items/${itemId}/`);
});
```

### clearCart
**Purpose**: Remove all items from cart

**Signature**:
```javascript
clearCart(): Promise<void>
```

**Behavior**:
- Calls removeFromCart for each item sequentially
- Clears state after all successful
- Partial failure: stops on first error, leaves remaining items

**Contract Test**:
```javascript
test('clearCart removes all items', async () => {
  const { result } = renderHook(() => useCart());

  // Setup: Add multiple items
  await act(async () => {
    await result.current.addToCart(productData1, priceData);
    await result.current.addToCart(productData2, priceData);
  });

  expect(result.current.cartItems).toHaveLength(2);

  await act(async () => {
    await result.current.clearCart();
  });

  expect(result.current.cartItems).toHaveLength(0);
});

test('clearCart stops on first error', async () => {
  const { result } = renderHook(() => useCart());

  await act(async () => {
    await result.current.addToCart(productData1, priceData);
    await result.current.addToCart(productData2, priceData);
  });

  mockAPI.delete
    .mockResolvedValueOnce({ data: {} })  // First succeeds
    .mockRejectedValueOnce(new Error('API error'));  // Second fails

  await act(async () => {
    await expect(result.current.clearCart()).rejects.toThrow();
  });

  // First item removed, second remains
  expect(result.current.cartItems).toHaveLength(1);
});
```

### fetchCart
**Purpose**: Load cart from backend (on page load)

**Signature**:
```javascript
fetchCart(): Promise<CartItem[]>
```

**Behavior**:
- Makes GET /api/cart/items/ to backend
- Replaces entire cart state with response
- Called on context mount

**Contract Test**:
```javascript
test('fetchCart loads items from backend', async () => {
  mockAPI.get.mockResolvedValue({
    data: [
      { id: 'cart_123', product: productData1 },
      { id: 'cart_456', product: productData2 }
    ]
  });

  const { result } = renderHook(() => useCart());

  await waitFor(() => {
    expect(result.current.cartItems).toHaveLength(2);
  });

  expect(mockAPI.get).toHaveBeenCalledWith('/api/cart/items/');
});
```

### findCartItemByProduct
**Purpose**: Find existing cart item for a product

**Signature**:
```javascript
findCartItemByProduct(productId: string): CartItem | undefined
```

**Parameters**:
- `productId`: Product ID to search for

**Returns**: CartItem if found, undefined if not

**Contract Test**:
```javascript
test('findCartItemByProduct returns existing item', () => {
  const { result } = renderHook(() => useCart());

  // Setup state directly for test
  act(() => {
    result.current.setCartItems([
      { id: 'cart_123', product: { productId: 'prod_cs1' } }
    ]);
  });

  const found = result.current.findCartItemByProduct('prod_cs1');
  expect(found).toBeDefined();
  expect(found.id).toBe('cart_123');

  const notFound = result.current.findCartItemByProduct('prod_cm2');
  expect(notFound).toBeUndefined();
});
```

## Side Effects

### Automatic Cart Loading
**Trigger**: Context mount (page load)
**Behavior**: Calls fetchCart() to load from backend

**Implementation**:
```javascript
useEffect(() => {
  fetchCart();
}, []);
```

### Error State Management
**Trigger**: Any API call failure
**Behavior**: Sets error in state, preserves previous cart state

**Implementation**:
```javascript
try {
  await api.post('/api/cart/items/', payload);
  setError(null);
} catch (error) {
  setError(error.message);
  throw error;  // Re-throw for caller
}
```

## Error Handling

### Network Failures
**Scenario**: Backend API unreachable
**Behavior**: Set error state, throw exception, preserve cart state
**User Impact**: Show error message, allow retry

### Validation Errors
**Scenario**: Backend returns 400 (invalid data)
**Behavior**: Set error state with validation message
**User Impact**: Show specific validation error to user

### Optimistic Update Rollback
**Scenario**: API call fails after optimistic state update
**Behavior**: Revert state to pre-operation snapshot
**Implementation**: See OperationSnapshot in data-model.md

**Contract Test**:
```javascript
test('addToCart rolls back on API failure', async () => {
  mockAPI.post.mockRejectedValue(new Error('API error'));

  const { result } = renderHook(() => useCart());

  const initialCount = result.current.cartItems.length;

  await act(async () => {
    await expect(
      result.current.addToCart(productData, priceData)
    ).rejects.toThrow();
  });

  // Cart unchanged after failure
  expect(result.current.cartItems).toHaveLength(initialCount);
  expect(result.current.error).toBeTruthy();
});
```

## Atomicity Guarantees

### Single Operation Atomicity
Each cart operation (add, update, remove) is atomic:
- Either completes fully or rolls back completely
- No partial state corruption

### Multi-Operation Atomicity
For operations that update multiple cart items (clearCart):
- Sequential execution (not parallel)
- Stop on first failure
- Partial completion possible (by design - allows retry)

## Performance Characteristics

### Time Complexity
- `addToCart`: O(1) + network
- `updateCartItem`: O(1) + network
- `removeFromCart`: O(n) + network (n = cart items, to find and remove)
- `clearCart`: O(n × network) (sequential DELETE calls)
- `findCartItemByProduct`: O(n) where n = cart items

### Network Characteristics
- addToCart: 1 POST request
- updateCartItem: 1 PUT request
- removeFromCart: 1 DELETE request
- clearCart: n DELETE requests (n = cart items)

### Timing Guarantees
- Operations complete within 3s under normal conditions (FR-025)
- Loading state shown for operations > 1s (FR-026)

## Compliance Requirements

### TDD Mandate
- ✅ All contract tests written before implementation
- ✅ Tests must fail before fix implemented
- ✅ 80% minimum coverage for modified code

### Integration with TutorialChoiceContext
- After successful addToCart/updateCartItem: Caller must update TutorialChoiceContext
- After successful removeFromCart: Caller may update TutorialChoiceContext
- CartContext does NOT directly modify TutorialChoiceContext (separation of concerns)

## Backward Compatibility

### Existing Code Support
- ✅ All method signatures unchanged
- ✅ Return types unchanged
- ✅ Error handling behavior unchanged
- ✅ Cart item structure unchanged

### Backend API Contract
**CRITICAL**: Backend must merge tutorialSelections in PUT operations:
```python
# Backend (Django)
def update(self, request, pk):
    cart_item = self.get_object()
    new_metadata = request.data.get('metadata', {})
    new_selections = new_metadata.get('tutorialSelections', [])

    # MERGE existing with new
    existing_selections = cart_item.metadata.get('tutorialSelections', [])
    merged_selections = existing_selections + new_selections

    cart_item.metadata['tutorialSelections'] = merged_selections
    cart_item.save()
    return Response(CartItemSerializer(cart_item).data)
```

## Dependencies

### Required Services
- Backend cart API at `/api/cart/items/`
- Axios or similar HTTP client

### External Contexts
- May be called by TutorialSummaryBarContainer
- Integrates with TutorialChoiceContext (via container)

## Breaking Changes (None)
This is a bug fix with no breaking changes. All existing consumers continue to work without modification.
