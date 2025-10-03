# Research: Tutorial Cart Integration Fix

**Date**: 2025-10-03
**Feature**: Tutorial Cart Integration Fix (Epic 1)

---

## Research Questions

1. How should we extend React Context API state without breaking changes?
2. What is the best pattern for localStorage data format migration?
3. How to test React Context with React Testing Library?
4. How to maintain backward compatibility with existing data?
5. What pattern prevents cart item duplication?

---

## 1. React Context API State Extension

### Question
How should we extend existing TutorialChoiceContext with new `isDraft` property without breaking existing functionality?

### Research Findings

**Options Evaluated**:
1. Add new DraftStateContext (separate context)
2. Refactor to useReducer pattern
3. Extend existing Context with new methods (chosen)
4. Migrate to Redux/Zustand

**Decision**: Extend existing TutorialChoiceContext with new methods and state properties

**Rationale**:
- Maintains single source of truth for tutorial choice state
- No breaking changes to existing API (new methods are additive)
- Follows React best practices for gradual API evolution
- Existing code continues to work without modification
- Zero new dependencies

**Implementation Pattern**:
```javascript
export const TutorialChoiceProvider = ({ children }) => {
  const [tutorialChoices, setTutorialChoices] = useState({});

  // Existing methods (unchanged)
  const addTutorialChoice = (subjectCode, choiceLevel, eventData) => {
    setTutorialChoices(prev => ({
      ...prev,
      [subjectCode]: {
        ...prev[subjectCode],
        [choiceLevel]: {
          ...eventData,
          choiceLevel,
          timestamp: new Date().toISOString(),
          isDraft: true  // NEW: Add isDraft flag
        }
      }
    }));
  };

  // NEW methods (additive)
  const markChoicesAsAdded = (subjectCode) => { /* implementation */ };
  const getDraftChoices = (subjectCode) => { /* implementation */ };
  const getCartedChoices = (subjectCode) => { /* implementation */ };
  const hasCartedChoices = (subjectCode) => { /* implementation */ };

  const value = {
    // Existing exports (unchanged)
    tutorialChoices,
    addTutorialChoice,
    removeTutorialChoice,
    // ...

    // NEW exports (additive)
    markChoicesAsAdded,
    getDraftChoices,
    getCartedChoices,
    hasCartedChoices,
  };

  return <TutorialChoiceContext.Provider value={value}>{children}</TutorialChoiceContext.Provider>;
};
```

**Alternatives Rejected**:
- **Separate DraftStateContext**: Would require synchronizing state between two contexts, creating race conditions and complexity
- **useReducer refactor**: Adds unnecessary complexity for simple state updates, no performance benefit for this use case
- **Redux/Zustand**: Over-engineering, adds new dependency, increases bundle size, violates simplicity principle

**References**:
- React Docs: Context API best practices
- Kent C. Dodds: "How to use React Context effectively"

---

## 2. localStorage Data Format Migration

### Question
What is the safest pattern for migrating localStorage data from old format (without isDraft) to new format (with isDraft)?

### Research Findings

**Options Evaluated**:
1. In-place migration with backup
2. Versioned storage keys (e.g., tutorialChoices_v2)
3. Server-side migration
4. Dual-read support (read both formats)

**Decision**: In-place migration with backup creation and rollback support

**Rationale**:
- Industry standard for client-side data migrations
- Allows safe rollback if issues discovered post-deployment
- Guarantees zero data loss (backup preserved)
- Transparent to user (automatic on first load)
- Single storage key (simpler UX, no confusion)

**Migration Pattern**:
```javascript
// In TutorialChoiceProvider useEffect on mount
useEffect(() => {
  try {
    const saved = localStorage.getItem('tutorialChoices');
    if (!saved) return; // No existing data

    const data = JSON.parse(saved);

    // Detect if migration needed (check first choice for isDraft field)
    const needsMigration = Object.values(data).some(subjectChoices =>
      Object.values(subjectChoices).some(choice => choice.isDraft === undefined)
    );

    if (needsMigration) {
      console.log('[Migration] Migrating tutorialChoices to isDraft format');

      // Step 1: Create backup
      localStorage.setItem('tutorialChoices_backup', saved);

      // Step 2: Transform data (add isDraft: false to existing choices)
      const migrated = Object.fromEntries(
        Object.entries(data).map(([subject, choices]) => [
          subject,
          Object.fromEntries(
            Object.entries(choices).map(([level, choice]) => [
              level,
              { ...choice, isDraft: false } // Assume existing = in cart
            ])
          )
        ])
      );

      // Step 3: Save migrated data
      localStorage.setItem('tutorialChoices', JSON.stringify(migrated));
      setTutorialChoices(migrated);

      console.log('[Migration] Success - backup saved to tutorialChoices_backup');
    } else {
      setTutorialChoices(data);
    }
  } catch (error) {
    console.error('[Migration] Failed:', error);
    // Fail gracefully - start with empty state
    setTutorialChoices({});
  }
}, []);
```

**Rollback Pattern**:
```javascript
// Utility function for emergency rollback
const rollbackToOldFormat = () => {
  const backup = localStorage.getItem('tutorialChoices_backup');
  if (backup) {
    localStorage.setItem('tutorialChoices', backup);
    localStorage.removeItem('tutorialChoices_backup');
    console.log('[Rollback] Restored from backup');
    return true;
  }
  console.warn('[Rollback] No backup found');
  return false;
};
```

**Alternatives Rejected**:
- **Versioned keys**: Would confuse users seeing multiple "tutorial choices" in DevTools, complicates cleanup
- **Server-side migration**: N/A - tutorial choices are client-side only (no backend storage)
- **Dual-read**: Increases code complexity, harder to test, no clear migration completion

**References**:
- MDN: Web Storage API best practices
- Google Developers: Client-side storage migration patterns

---

## 3. React Context Testing with React Testing Library

### Question
How to properly test React Context hooks and state updates with React Testing Library?

### Research Findings

**Options Evaluated**:
1. renderHook from @testing-library/react (chosen)
2. Full component integration tests only
3. Mock Context Provider
4. Enzyme (deprecated)

**Decision**: Use renderHook with custom wrapper for Context testing

**Rationale**:
- renderHook is the standard approach for testing custom hooks
- Allows isolation of context logic from UI components
- Supports act() wrapping for state updates
- Follows React Testing Library philosophy (test behavior, not implementation)

**Test Pattern**:
```javascript
import { renderHook, act } from '@testing-library/react';
import { TutorialChoiceProvider, useTutorialChoice } from '../TutorialChoiceContext';

describe('TutorialChoiceContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('addTutorialChoice initializes choice with isDraft: true', () => {
    const { result } = renderHook(() => useTutorialChoice(), {
      wrapper: TutorialChoiceProvider
    });

    act(() => {
      result.current.addTutorialChoice('CS2', '1st', {
        eventId: 'evt-123',
        eventCode: 'TUT-CS2-BRI',
        location: 'Bristol'
      });
    });

    const choices = result.current.getSubjectChoices('CS2');
    expect(choices['1st'].isDraft).toBe(true);
    expect(choices['1st'].eventId).toBe('evt-123');
  });

  test('markChoicesAsAdded sets isDraft: false for all subject choices', () => {
    const { result } = renderHook(() => useTutorialChoice(), {
      wrapper: TutorialChoiceProvider
    });

    // Setup: Add 2 draft choices
    act(() => {
      result.current.addTutorialChoice('CS2', '1st', mockEventData1);
      result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
    });

    // Act: Mark as added
    act(() => {
      result.current.markChoicesAsAdded('CS2');
    });

    // Assert: Both choices now have isDraft: false
    const choices = result.current.getSubjectChoices('CS2');
    expect(choices['1st'].isDraft).toBe(false);
    expect(choices['2nd'].isDraft).toBe(false);
  });
});
```

**Component Integration Test Pattern**:
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('Adding second tutorial choice updates existing cart item', async () => {
  render(
    <TutorialChoiceProvider>
      <CartProvider>
        <TutorialProductCard subjectCode="CS2" />
      </CartProvider>
    </TutorialChoiceProvider>
  );

  // Add first choice
  const addButton1 = screen.getByText(/add.*bristol/i);
  await userEvent.click(addButton1);

  // Verify 1 cart item created
  await waitFor(() => {
    expect(mockCartContext.cartItems).toHaveLength(1);
  });

  // Add second choice
  const addButton2 = screen.getByText(/add.*london/i);
  await userEvent.click(addButton2);

  // Assert: Still only 1 cart item, but with 2 choices
  await waitFor(() => {
    expect(mockCartContext.cartItems).toHaveLength(1);
    expect(mockCartContext.cartItems[0].choices).toHaveLength(2);
  });
});
```

**Alternatives Rejected**:
- **Full component tests only**: Harder to isolate context logic, slower tests, harder to debug failures
- **Mock Context**: Tests mock implementation, not real behavior
- **Enzyme**: Deprecated, not compatible with React 18

**References**:
- React Testing Library: renderHook documentation
- Kent C. Dodds: "How to test Custom React Hooks"

---

## 4. Backward Compatibility Strategy

### Question
How to ensure existing localStorage data (without isDraft field) continues to work without errors?

### Research Findings

**Options Evaluated**:
1. Defensive reading with default values (chosen)
2. Strict validation with error throwing
3. Silent data deletion
4. Force user logout/data reset

**Decision**: Defensive reading with default values in getter methods

**Rationale**:
- Gracefully handles both old and new format data
- No user-facing errors or data loss
- Allows gradual migration across user base
- Simple to implement and test

**Implementation Pattern**:
```javascript
const getSubjectChoices = (subjectCode) => {
  const choices = tutorialChoices[subjectCode] || {};

  // Normalize legacy choices (add isDraft if missing)
  return Object.fromEntries(
    Object.entries(choices).map(([level, choice]) => [
      level,
      {
        ...choice,
        isDraft: choice.isDraft ?? false // Default to "in cart" for legacy data
      }
    ])
  );
};

const getDraftChoices = (subjectCode) => {
  const normalized = getSubjectChoices(subjectCode);
  return Object.values(normalized).filter(choice => choice.isDraft === true);
};

const getCartedChoices = (subjectCode) => {
  const normalized = getSubjectChoices(subjectCode);
  return Object.values(normalized).filter(choice => choice.isDraft === false);
};
```

**Default Value Rationale**:
- `isDraft: false` for legacy data (assume existing choices were "in cart")
- Safer default: Prevents accidental deletion of user's saved choices
- User can manually remove unwanted choices if needed

**Alternatives Rejected**:
- **Strict validation**: Would throw errors for valid legacy data, bad UX
- **Silent deletion**: Data loss unacceptable
- **Force logout**: Terrible UX, unnecessary

**References**:
- JavaScript: Nullish coalescing operator (??)
- Defensive programming patterns

---

## 5. Cart Duplication Prevention Pattern

### Question
What pattern prevents duplicate cart items when adding multiple tutorial choices for the same subject?

### Research Findings

**Current Bug Root Cause**:
```javascript
// BUGGY CODE (current implementation)
const addToCart = (tutorialChoices) => {
  // Always creates NEW cart item
  const cartItem = {
    type: 'Tutorial',
    subject_code: subjectCode,
    choices: tutorialChoices
  };
  setCartItems(prev => [...prev, cartItem]); // BUG: Always appends
};
```

**Options Evaluated**:
1. Lookup-then-merge pattern (chosen)
2. Delete-then-recreate pattern
3. Server-side deduplication
4. Cart item versioning

**Decision**: Lookup-then-merge pattern with state transition

**Rationale**:
- Prevents duplicate cart items at source
- Maintains cart item metadata and references
- No UI flash (update in place)
- Atomic operation (lookup + merge in single state update)

**Implementation Pattern**:
```javascript
const addTutorialToCart = (subjectCode) => {
  const { getDraftChoices, markChoicesAsAdded } = useTutorialChoice();
  const { cartItems, addToCart, updateCartItem } = useCart();

  // 1. Get draft choices for this subject
  const draftChoices = getDraftChoices(subjectCode);
  if (draftChoices.length === 0) {
    console.warn('No draft choices to add');
    return;
  }

  // 2. Look for existing cart item for this subject
  const existingItem = cartItems.find(
    item => item.subject_code === subjectCode && item.type === 'Tutorial'
  );

  if (existingItem) {
    // 3a. MERGE: Update existing cart item with new choices
    updateCartItem(existingItem.id, {
      ...existingItem,
      choices: [...existingItem.choices, ...draftChoices],
      totalChoiceCount: existingItem.choices.length + draftChoices.length
    });
  } else {
    // 3b. CREATE: Add new cart item
    addToCart({
      type: 'Tutorial',
      subject_code: subjectCode,
      choices: draftChoices,
      totalChoiceCount: draftChoices.length
    });
  }

  // 4. Mark choices as added to cart (isDraft: false)
  markChoicesAsAdded(subjectCode);
};
```

**Cart Removal Sync**:
```javascript
const handleRemoveFromCart = (cartItemId) => {
  const { removeFromCart } = useCart();
  const { markChoicesAsDraft } = useTutorialChoice();

  // Find cart item to get subject code
  const cartItem = cartItems.find(item => item.id === cartItemId);
  if (cartItem && cartItem.type === 'Tutorial') {
    // Remove from cart
    removeFromCart(cartItemId);

    // Restore draft state (isDraft: true)
    markChoicesAsDraft(cartItem.subject_code);
  }
};
```

**Alternatives Rejected**:
- **Delete-then-recreate**: Would lose cart item ID, break references, cause UI flash
- **Server-side deduplication**: N/A - client-side cart only
- **Cart versioning**: Over-engineering for this use case

**Edge Case Handling**:
```javascript
// Handle cart item deleted externally (e.g., timeout)
useEffect(() => {
  // On cart change, sync tutorial choice states
  const tutorialCartItems = cartItems.filter(item => item.type === 'Tutorial');
  const cartSubjects = new Set(tutorialCartItems.map(item => item.subject_code));

  // Find subjects in TutorialChoiceContext but not in cart
  Object.keys(tutorialChoices).forEach(subject => {
    const hasCartedChoices = getCartedChoices(subject).length > 0;
    const inCart = cartSubjects.has(subject);

    if (hasCartedChoices && !inCart) {
      // Cart item was deleted externally - restore draft state
      console.log(`[Sync] Cart item for ${subject} deleted, restoring draft state`);
      markChoicesAsDraft(subject);
    }
  });
}, [cartItems]);
```

**References**:
- React: useEffect for state synchronization
- Array.find() for lookup efficiency

---

## Research Summary

| Question | Decision | Rationale |
|----------|----------|-----------|
| Context extension | Extend existing Context | Single source of truth, no breaking changes |
| localStorage migration | In-place with backup | Industry standard, safe rollback, zero data loss |
| Testing approach | renderHook + integration tests | Standard for Context testing, isolates logic |
| Backward compatibility | Defensive reading with defaults | Graceful handling, no errors, no data loss |
| Cart deduplication | Lookup-then-merge | Prevents duplicates at source, maintains integrity |

---

## Technical Decisions Log

1. **No new dependencies**: Feature uses only existing React, Context API, localStorage
2. **TDD mandatory**: Follow RED-GREEN-REFACTOR per CLAUDE.md
3. **Coverage targets**: 80%+ for state management, 100% for cart logic
4. **Migration default**: isDraft: false for legacy data (safer assumption)
5. **Choice level order**: Independent (1st, 2nd, 3rd can be selected in any order)

---

**Research Status**: ✅ COMPLETE - All technical decisions documented and justified
