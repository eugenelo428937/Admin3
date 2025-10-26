# Contract: TutorialChoiceContext API

**Feature**: Fix Cart Synchronization Issue
**Context**: Frontend React Context for managing tutorial selections
**File**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`

## Contract Version
**Version**: 1.0.0 (No breaking changes - backward compatible)
**Date**: 2025-10-26

## Purpose
Manages user's tutorial selection state, including draft selections (not yet in cart) and carted selections (added to cart). Provides methods for adding, removing, and marking selections.

## State Shape
```javascript
{
  tutorialChoices: {
    [subjectCode: string]: {
      [choiceLevel: number]: {
        subjectCode: string,
        choiceLevel: number,
        eventData: {
          eventId: string,
          location: string,
          startDate: string,
          endDate: string,
          sessionCode: string
        },
        productMetadata: {
          productId: string,
          price: number,
          currency: string
        },
        isDraft: boolean,
        timestamp: number
      }
    }
  }
}
```

## Context Methods

### addTutorialChoice
**Purpose**: Add a new tutorial selection (always as draft initially)

**Signature**:
```javascript
addTutorialChoice(
  subjectCode: string,
  choiceLevel: number,
  eventData: object,
  productMetadata: object
): void
```

**Parameters**:
- `subjectCode`: Subject code (e.g., "CS1", "CM2")
- `choiceLevel`: Choice level (1, 2, or 3)
- `eventData`: Event details (eventId, location, dates, sessionCode)
- `productMetadata`: Product details (productId, price, currency)

**Behavior**:
- Creates choice with `isDraft: true`
- Sets `timestamp: Date.now()`
- Triggers localStorage update (debounced 300ms)
- If choice already exists at this level, overwrites it

**Postconditions**:
- Choice exists in state at `tutorialChoices[subjectCode][choiceLevel]`
- Choice has `isDraft: true`
- localStorage will be updated within 300ms

**Contract Test**:
```javascript
test('addTutorialChoice creates draft selection', () => {
  const { result } = renderHook(() => useTutorialChoice());

  act(() => {
    result.current.addTutorialChoice(
      'CS1',
      1,
      { eventId: 'evt_123', location: 'Edinburgh' },
      { productId: 'prod_cs1', price: 100 }
    );
  });

  const choice = result.current.getChoice('CS1', 1);
  expect(choice).toBeDefined();
  expect(choice.isDraft).toBe(true);
  expect(choice.subjectCode).toBe('CS1');
});
```

### removeTutorialChoice
**Purpose**: Remove a tutorial selection completely

**Signature**:
```javascript
removeTutorialChoice(
  subjectCode: string,
  choiceLevel: number
): void
```

**Behavior**:
- Deletes choice from state
- Triggers localStorage update (debounced 300ms)
- No-op if choice doesn't exist

**Postconditions**:
- Choice no longer exists in state
- localStorage updated within 300ms

**Contract Test**:
```javascript
test('removeTutorialChoice deletes selection', () => {
  const { result } = renderHook(() => useTutorialChoice());

  act(() => {
    result.current.addTutorialChoice('CS1', 1, eventData, productData);
    result.current.removeTutorialChoice('CS1', 1);
  });

  const choice = result.current.getChoice('CS1', 1);
  expect(choice).toBeUndefined();
});
```

### markChoicesAsAdded
**Purpose**: Mark all draft choices for a subject as carted (isDraft=false)

**Signature**:
```javascript
markChoicesAsAdded(subjectCode: string): void
```

**Behavior**:
- Finds all choices for subject with `isDraft: true`
- Sets `isDraft: false` for each
- Triggers localStorage update (debounced 300ms)
- No-op if no draft choices exist

**Postconditions**:
- All subject choices have `isDraft: false`
- localStorage updated within 300ms

**Contract Test**:
```javascript
test('markChoicesAsAdded changes isDraft flag', () => {
  const { result } = renderHook(() => useTutorialChoice());

  act(() => {
    result.current.addTutorialChoice('CS1', 1, eventData1, productData1);
    result.current.addTutorialChoice('CS1', 2, eventData2, productData2);
    result.current.markChoicesAsAdded('CS1');
  });

  const choice1 = result.current.getChoice('CS1', 1);
  const choice2 = result.current.getChoice('CS1', 2);
  expect(choice1.isDraft).toBe(false);
  expect(choice2.isDraft).toBe(false);
});
```

### getSubjectChoices
**Purpose**: Get all choices for a specific subject

**Signature**:
```javascript
getSubjectChoices(
  subjectCode: string,
  draftOnly?: boolean
): TutorialChoice[]
```

**Parameters**:
- `subjectCode`: Subject to get choices for
- `draftOnly`: If true, only return draft choices (default: false)

**Returns**: Array of TutorialChoice objects (empty array if none)

**Contract Test**:
```javascript
test('getSubjectChoices returns all choices for subject', () => {
  const { result } = renderHook(() => useTutorialChoice());

  act(() => {
    result.current.addTutorialChoice('CS1', 1, eventData1, productData1);
    result.current.addTutorialChoice('CS1', 2, eventData2, productData2);
    result.current.addTutorialChoice('CM2', 1, eventData3, productData3);
  });

  const cs1Choices = result.current.getSubjectChoices('CS1');
  expect(cs1Choices).toHaveLength(2);
});

test('getSubjectChoices with draftOnly returns only draft choices', () => {
  const { result } = renderHook(() => useTutorialChoice());

  act(() => {
    result.current.addTutorialChoice('CS1', 1, eventData1, productData1);
    result.current.addTutorialChoice('CS1', 2, eventData2, productData2);
    result.current.markChoicesAsAdded('CS1');
    result.current.addTutorialChoice('CS1', 3, eventData3, productData3);
  });

  const draftChoices = result.current.getSubjectChoices('CS1', true);
  expect(draftChoices).toHaveLength(1);
  expect(draftChoices[0].choiceLevel).toBe(3);
});
```

### clearSubjectChoices
**Purpose**: Remove all choices for a subject

**Signature**:
```javascript
clearSubjectChoices(subjectCode: string): void
```

**Behavior**:
- Deletes all choices for subject
- Triggers localStorage update (debounced 300ms)

**Contract Test**:
```javascript
test('clearSubjectChoices removes all selections for subject', () => {
  const { result } = renderHook(() => useTutorialChoice());

  act(() => {
    result.current.addTutorialChoice('CS1', 1, eventData1, productData1);
    result.current.addTutorialChoice('CS1', 2, eventData2, productData2);
    result.current.clearSubjectChoices('CS1');
  });

  const choices = result.current.getSubjectChoices('CS1');
  expect(choices).toHaveLength(0);
});
```

## Side Effects

### localStorage Synchronization
**Trigger**: Any state mutation (add, remove, mark, clear)
**Behavior**: Debounced write to localStorage after 300ms
**Storage Key**: `tutorialChoices`
**Format**: JSON string of entire `tutorialChoices` object

**Implementation**:
```javascript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    localStorage.setItem('tutorialChoices', JSON.stringify(tutorialChoices));
  }, 300);

  return () => clearTimeout(timeoutId);
}, [tutorialChoices]);
```

### Page Load Reconciliation
**Trigger**: Context initialization / component mount
**Behavior**: Load from localStorage, reconcile with cart state

**Implementation**:
```javascript
useEffect(() => {
  // Load from localStorage
  const stored = localStorage.getItem('tutorialChoices');
  if (stored) {
    const parsed = JSON.parse(stored);
    setTutorialChoices(parsed);
  }

  // Reconcile with cart (mark carted items as isDraft=false)
  reconcileWithCart(cartItems);
}, []);
```

## Error Handling

### localStorage Failures
**Scenario**: localStorage.setItem throws (quota exceeded, private mode)
**Behavior**: Log warning, continue without persistence
**User Impact**: Selections lost on page refresh (acceptable degradation)

**Implementation**:
```javascript
try {
  localStorage.setItem('tutorialChoices', JSON.stringify(tutorialChoices));
} catch (error) {
  console.warn('Failed to save to localStorage:', error);
  // Continue without persistence
}
```

### Invalid Data in localStorage
**Scenario**: Corrupted JSON in localStorage
**Behavior**: Reset to empty state, log warning
**User Impact**: Selections lost (acceptable - corrupted data)

**Implementation**:
```javascript
try {
  const stored = localStorage.getItem('tutorialChoices');
  const parsed = JSON.parse(stored);
  setTutorialChoices(parsed);
} catch (error) {
  console.warn('Failed to parse localStorage, resetting');
  setTutorialChoices({});
}
```

## Backward Compatibility

### Existing Code Support
- ✅ All existing method signatures unchanged
- ✅ Existing localStorage format supported
- ✅ No breaking changes to return types
- ✅ New behavior (debouncing) is invisible to consumers

### Migration Path
No migration required - existing localStorage data will load correctly:
```javascript
const ensureChoiceDefaults = (choice) => ({
  ...choice,
  isDraft: choice.isDraft ?? true,  // Default to draft if missing
  timestamp: choice.timestamp ?? Date.now()
});
```

## Performance Characteristics

### Time Complexity
- `addTutorialChoice`: O(1)
- `removeTutorialChoice`: O(1)
- `markChoicesAsAdded`: O(n) where n = choices for subject
- `getSubjectChoices`: O(n) where n = choices for subject
- `clearSubjectChoices`: O(1)

### Space Complexity
- State: O(subjects × levels) typically O(1) per subject
- localStorage: Same as state (JSON stringified)

### Timing Guarantees
- localStorage writes: Within 300ms of last state change
- State updates: Synchronous (immediate re-render)
- No blocking operations

## Compliance Requirements

### TDD Mandate
- ✅ All contract tests written before implementation
- ✅ Tests must fail before fix implemented
- ✅ 80% minimum coverage for modified code

### Testing Strategy
1. **Contract tests**: Verify each method signature and postconditions
2. **Integration tests**: Test localStorage synchronization
3. **Edge case tests**: Test debouncing, error handling, migrations

## Dependencies

### Required Contexts
- `CartContext`: For reconciliation on page load

### External APIs
- `localStorage`: Browser storage API
- React hooks: `useState`, `useEffect`, `useContext`

## Breaking Changes (None)
This is a bug fix with no breaking changes. All existing consumers continue to work without modification.
