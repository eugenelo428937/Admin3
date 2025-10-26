# Research: Cart Synchronization Fix

**Feature**: Fix Cart Synchronization Issue
**Date**: 2025-10-26
**Status**: Complete

## Research Questions

### 1. Root Cause Analysis

**Question**: What causes the "second tutorial overwrites first" bug?

**Research Approach**:
- Analyzed story file hypotheses (lines 197-225 of story document)
- Reviewed touch points: TutorialSummaryBarContainer.js, TutorialChoiceContext.js, CartContext.js
- Examined state flow and timing dependencies

**Findings**:
The bug likely stems from one or more of these root causes:

1. **Race Condition in Rapid Additions** (Hypothesis 1)
   - User adds tutorials in quick succession (< 500ms apart)
   - First API call still pending when second call starts
   - Second call may find stale existingCartItem detection
   - React state batching may cause updates to be lost

2. **updateCartItem vs addToCart Logic** (Hypothesis 2)
   - `cartItems.find()` for existingCartItem may return stale closure value
   - First tutorial becomes existingCartItem, second tutorial tries to update instead of merge
   - PUT operation replaces entire cart item instead of merging tutorial metadata

3. **markChoicesAsAdded Timing** (Hypothesis 3)
   - `markChoicesAsAdded` called before cart API response completes
   - Context state change triggers re-render mid-operation
   - Subsequent operations see inconsistent state

4. **localStorage Overwrite** (Hypothesis 4)
   - Rapid useEffect triggers writing to localStorage
   - Second write overwrites first before cart sync completes
   - No debouncing on localStorage persistence

**Decision**: Implement logging-based investigation first (as specified in story lines 124-189), then fix confirmed root cause(s).

**Rationale**:
- Story provides detailed investigation approach with debug logging strategy
- Need empirical data to confirm which hypothesis (or combination) is actual cause
- Premature fix without confirmation risks missing the real issue

### 2. React Concurrent State Management Patterns

**Question**: What's the best pattern for handling concurrent async operations in React Context?

**Research Findings**:

**Pattern 1: Operation Queue**
```javascript
const [queue, setQueue] = useState([]);
const [isProcessing, setIsProcessing] = useState(false);

useEffect(() => {
  if (!isProcessing && queue.length > 0) {
    processNextOperation();
  }
}, [queue, isProcessing]);
```
- ✅ Prevents race conditions by serializing operations
- ✅ Clear operation order
- ❌ May introduce latency for rapid operations
- ❌ More complex state management

**Pattern 2: Optimistic Updates with Rollback**
```javascript
const addToCart = async (item) => {
  // Optimistic update
  setCart(prev => [...prev, item]);

  try {
    await api.addToCart(item);
  } catch (error) {
    // Rollback on failure
    setCart(prev => prev.filter(i => i.id !== item.id));
    throw error;
  }
};
```
- ✅ Immediate UI feedback
- ✅ Handles failures gracefully
- ❌ Complex rollback logic for nested state
- ❌ May show flickering if rollback occurs

**Pattern 3: Single Atomic Operation**
```javascript
const handleAddToCart = async (subjectCode) => {
  const choices = getSubjectChoices(subjectCode);

  // Build complete payload with ALL choices BEFORE API call
  const payload = buildCompletePayload(choices);

  // Single atomic API call
  const result = await api.addToCart(payload);

  // Update all state AFTER success
  updateContextsAtomically(result);
};
```
- ✅ Simple and atomic
- ✅ No race conditions
- ✅ Easy to reason about
- ❌ No optimistic updates (slower perceived performance)

**Decision**: Use Pattern 3 (Single Atomic Operation) with optional Pattern 1 (Queue) if concurrent calls detected

**Rationale**:
- Story already suggests atomic payload building (lines 252-265)
- Simpler to implement and test
- Matches current architecture (optimistic updates not critical for this workflow)
- Can add queueing later if needed

### 3. localStorage Synchronization Best Practices

**Question**: How to prevent localStorage overwrites in rapid state changes?

**Research Findings**:

**Approach 1: Debounced Writes**
```javascript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, 300);

  return () => clearTimeout(timeoutId);
}, [state]);
```
- ✅ Prevents excessive writes
- ✅ Simple implementation
- ❌ 300ms delay before persistence
- ❌ Data loss risk if tab closes during delay

**Approach 2: Write-Through Cache**
```javascript
const updateState = (newState) => {
  setState(newState);
  localStorage.setItem(key, JSON.stringify(newState));
};
```
- ✅ Immediate persistence
- ✅ No data loss risk
- ❌ May cause performance issues with rapid updates
- ❌ Synchronous writes block main thread

**Approach 3: Batched Writes with requestIdleCallback**
```javascript
let pendingWrite = null;

useEffect(() => {
  if (pendingWrite) cancelIdleCallback(pendingWrite);

  pendingWrite = requestIdleCallback(() => {
    localStorage.setItem(key, JSON.stringify(state));
  });
}, [state]);
```
- ✅ Non-blocking writes
- ✅ Batches rapid updates
- ✅ Browser-optimized timing
- ❌ Not supported in all browsers (needs polyfill)

**Decision**: Use Approach 1 (Debounced Writes) with 300ms delay

**Rationale**:
- Story suggests debouncing (lines 268-276)
- Balances performance and data safety
- Simple, widely-supported implementation
- 300ms is imperceptible for this use case

### 4. Testing Strategy for Race Conditions

**Question**: How to reliably test race condition fixes?

**Research Findings**:

**Strategy 1: Timing-Based Tests**
```javascript
test('handles rapid sequential additions', async () => {
  addTutorial('CS1-30-25S');
  await wait(100); // Simulate timing
  addTutorial('CS1-20-25S');

  await waitFor(() => {
    expect(cart).toHaveLength(2);
  });
});
```
- ✅ Simulates real user behavior
- ❌ Brittle (timing-dependent)
- ❌ May pass/fail randomly

**Strategy 2: Mock-Based Control**
```javascript
test('handles concurrent API calls', async () => {
  let resolveFirst, resolveSecond;
  mockAddToCart
    .mockReturnValueOnce(new Promise(r => resolveFirst = r))
    .mockReturnValueOnce(new Promise(r => resolveSecond = r));

  const promise1 = addTutorial('CS1-30-25S');
  const promise2 = addTutorial('CS1-20-25S');

  // Resolve in specific order
  resolveSecond({id: 2});
  resolveFirst({id: 1});

  await Promise.all([promise1, promise2]);
  expect(cart).toContainEqual({id: 1});
  expect(cart).toContainEqual({id: 2});
});
```
- ✅ Deterministic
- ✅ Tests exact race condition scenario
- ✅ Reliable in CI/CD
- ❌ More complex setup

**Strategy 3: Property-Based Testing**
```javascript
test('any sequence of additions results in all items in cart', async () => {
  const tutorials = generateRandomTutorials(10);

  await Promise.all(tutorials.map(addTutorial));

  expect(cart).toHaveLength(tutorials.length);
  tutorials.forEach(t => {
    expect(cart).toContainEqual(expect.objectContaining(t));
  });
});
```
- ✅ Tests many scenarios
- ✅ Catches edge cases
- ❌ Harder to debug failures
- ❌ Requires property-based testing library

**Decision**: Use Strategy 2 (Mock-Based Control) for unit tests, Strategy 1 (Timing-Based) for integration tests

**Rationale**:
- Mock-based tests give deterministic race condition coverage
- Integration tests validate real-world timing
- Combination provides confidence without brittleness
- Aligns with TDD mandate (write tests first)

### 5. Error Handling and Rollback Patterns

**Question**: How should the system handle partial failures in cart operations?

**Research Findings**:

**Pattern: Transaction-Like State Management**
```javascript
const handleAddToCart = async (subjectCode) => {
  // Save original state for rollback
  const snapshot = {
    tutorialChoices: getTutorialChoices(),
    cart: getCart()
  };

  try {
    // Update local state optimistically
    const updatedChoices = markAsDraft(false);

    // Make API call
    await api.addToCart(buildPayload(updatedChoices));

  } catch (error) {
    // Rollback to snapshot
    restoreTutorialChoices(snapshot.tutorialChoices);
    restoreCart(snapshot.cart);

    // Show user error
    showError('Failed to add to cart. Please try again.');
    throw error;
  }
};
```

**Decision**: Implement snapshot-based rollback for cart operations

**Rationale**:
- Story requires rollback on API failure (FR-020)
- Simple state snapshot before mutation
- Clear error recovery path
- Maintains data consistency

## Alternatives Considered

### Operation Queueing
**Considered**: Implement full operation queue for all cart operations
**Rejected**: Over-engineering for current problem scope - atomic operations should suffice
**Revisit if**: Multiple cart operations from different sources (not just tutorial selection)

### WebSocket State Sync
**Considered**: Real-time sync across browser tabs via WebSocket
**Rejected**: Out of scope (marked as "SHOULD" not "MUST" in edge cases)
**Revisit if**: User complaints about multi-tab confusion

### Redux Migration
**Considered**: Migrate from Context API to Redux for better state management
**Rejected**: Breaking change, high risk, unnecessary for fixing current bug
**Revisit if**: State management complexity grows beyond current contexts

## Implementation Recommendations

### Phase 1: Investigation with Debug Logging
1. Add comprehensive logging as specified in story lines 124-189
2. Reproduce bug with logging enabled
3. Analyze timestamp sequences to confirm root cause
4. Document findings

### Phase 2: Fix Implementation
Based on confirmed root cause:
1. Implement atomic state updates in handleAddToCart
2. Add debounced localStorage writes
3. Implement snapshot-based rollback
4. Remove debug logging

### Phase 3: Testing
1. Write failing integration tests for multi-tutorial scenarios
2. Implement fix to make tests pass
3. Add unit tests for race condition handling
4. Performance validation (<2s sync, <3s add-to-cart)

## Key Takeaways

1. **Root cause unknown until investigation**: Must add logging and gather empirical data
2. **Atomic operations preferred**: Simpler than complex queue/rollback mechanisms
3. **Debounce localStorage**: Prevents rapid write conflicts
4. **Mock-based race condition tests**: Deterministic and reliable
5. **Backward compatibility critical**: No breaking changes to existing Context APIs

## Next Steps

Phase 1 (Architecture & Contracts) should:
- Define contract for TutorialChoiceContext methods (no signature changes)
- Define contract for CartContext methods (no signature changes)
- Specify data model for snapshot state (for rollback)
- Create integration test scenarios (from acceptance criteria)
- Document state flow with sequence diagrams
