# Implementation Plan: Tutorial Cart Integration Fix

**Branch**: `epic-1-tutorial-cart-fix` | **Date**: 2025-10-03 | **Spec**: [spec-2025-10-03-120718.md](../spec-2025-10-03-120718.md)
**Input**: Feature specification from `specs/spec-2025-10-03-120718.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path → ✅ DONE
2. Fill Technical Context → ✅ DONE
3. Fill Constitution Check section → ✅ DONE
4. Evaluate Constitution Check section → ✅ PASS
5. Execute Phase 0 → research.md → ✅ DONE
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md → ✅ DONE
7. Re-evaluate Constitution Check → ✅ PASS
8. Plan Phase 2 → Describe task generation approach → ✅ DONE
9. STOP - Ready for /tasks command → ✅ READY
```

**IMPORTANT**: The /plan command STOPS here. Phase 2 is executed by the /tasks command.

---

## Summary

**Feature**: Fix tutorial cart integration bug that creates duplicate cart items when adding multiple tutorial choices for the same subject. Add draft state tracking to distinguish between selections being considered versus selections added to cart.

**Primary Requirement**: System must maintain exactly one cart item per subject containing all tutorial choices (up to 3), with clear state distinction between "draft" and "in cart" selections.

**Technical Approach** (from research):
- Extend existing TutorialChoiceContext with `isDraft` boolean flag
- Implement helper methods for draft/cart state filtering
- Add localStorage migration logic with rollback support
- Update cart integration in TutorialProductCard to merge choices instead of duplicating
- Maintain backward compatibility with existing data format
- Frontend-only changes (no backend API modifications)

---

## Technical Context

**Language/Version**: JavaScript ES6+ (React 18.2.0)
**Primary Dependencies**:
- React 18 (UI library)
- Material-UI v5 (component library)
- React Context API (state management)
- localStorage (browser storage)
- Jest + React Testing Library (testing)

**Storage**: Browser localStorage (key: "tutorialChoices")
**Testing**: Jest + React Testing Library (TDD with RED-GREEN-REFACTOR workflow)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge - ES6+ support required)
**Project Type**: Web application (frontend + backend, but this feature is frontend-only)
**Performance Goals**:
- localStorage operations <10ms
- Context state updates <5ms
- No UI blocking during migration
- Minimal re-renders (use React.memo, useCallback)

**Constraints**:
- Maximum 3 tutorial choices per subject (business rule)
- Must support rollback from new to old localStorage format
- Zero data loss during migration
- 80%+ test coverage minimum (100% for critical cart logic)
- TDD mandatory per CLAUDE.md

**Scale/Scope**:
- Affects 2 core files (TutorialChoiceContext.js, TutorialProductCard.js)
- 4 new helper methods
- ~200-300 lines of new code
- 25+ test cases
- Single subject can have up to 3 choices
- Typical user: 1-5 subjects with choices

---

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Gates**:
- ✅ **Single Technology**: Using existing React + Context API (no new state management libraries)
- ✅ **Minimal Dependencies**: Zero new npm dependencies required
- ✅ **No Over-Engineering**: Extending existing Context, not creating new architecture
- ✅ **Direct Solutions**: localStorage migration is straightforward JSON transformation
- ✅ **Test-Driven**: TDD workflow enforced per project CLAUDE.md

**Complexity Justification**: N/A - No violations, feature extends existing patterns

**Re-evaluation After Phase 1**: ✅ PASS - Design maintains simplicity, no new patterns introduced

---

## Project Structure

### Documentation (this feature)
```
specs/spec-2025-10-03-120718/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (localStorage contract)
```

### Source Code (repository root)
```
# Existing Admin3 structure (Web application - Option 2)

frontend/react-Admin3/
├── src/
│   ├── contexts/
│   │   ├── TutorialChoiceContext.js     # PRIMARY: Extend with isDraft
│   │   └── __tests__/
│   │       └── TutorialChoiceContext.test.js  # NEW: Unit tests
│   │
│   ├── components/
│   │   └── Product/
│   │       └── ProductCard/
│   │           └── Tutorial/
│   │               ├── TutorialProductCard.js  # MODIFY: Fix cart integration
│   │               └── __tests__/
│   │                   └── TutorialProductCard.test.js  # EXTEND: Integration tests
│   │
│   └── utils/
│       └── tutorialChoiceMigration.js   # NEW: Migration utilities (if extracted)
│
└── package.json

backend/django_Admin3/
└── (No changes required - frontend-only feature)
```

**Structure Decision**: Web application (Option 2) - Frontend changes only

---

## Phase 0: Outline & Research

### Research Tasks Completed

**1. React Context API Best Practices for State Extension**
- **Decision**: Extend existing TutorialChoiceContext with new methods and state properties
- **Rationale**:
  - Maintains single source of truth
  - No breaking changes to existing API
  - Follows React best practices for gradual API evolution
- **Alternatives Considered**:
  - Separate DraftStateContext: Rejected (creates state synchronization issues)
  - Redux/Zustand: Rejected (over-engineering, new dependency)
  - useReducer refactor: Rejected (unnecessary complexity for this feature)

**2. localStorage Migration Patterns**
- **Decision**: Implement forward migration with backup creation and rollback support
- **Rationale**:
  - Industry standard for data format changes
  - Allows safe rollback if issues discovered
  - No data loss guarantee
- **Pattern**:
  ```javascript
  // On context initialization
  1. Read localStorage 'tutorialChoices'
  2. Detect format version (check for isDraft field)
  3. If old format:
     a. Create backup 'tutorialChoices_backup'
     b. Transform: Add isDraft: false to all existing choices
     c. Write new format to 'tutorialChoices'
     d. Log migration success
  4. If corrupted: Log error, start fresh (empty state)
  ```
- **Alternatives Considered**:
  - Versioned storage keys: Rejected (complicates UX, confuses users)
  - Server-side migration: N/A (no server-side tutorial choice storage)

**3. React Testing Library Patterns for Context Testing**
- **Decision**: Use renderHook from @testing-library/react-hooks for context testing
- **Rationale**:
  - Standard approach for testing custom hooks and contexts
  - Allows isolation of context logic from components
  - Supports act() wrapping for state updates
- **Test Structure**:
  ```javascript
  describe('TutorialChoiceContext', () => {
    it('initializes choices with isDraft: true', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });
      // assertions
    });
  });
  ```
- **Alternatives Considered**:
  - Full component integration tests only: Rejected (harder to isolate context logic)
  - Mock Context: Rejected (want to test real implementation)

**4. Backward Compatibility Strategies**
- **Decision**: Defensive reading with default values
- **Rationale**:
  - Getter methods check for isDraft field existence
  - Default to isDraft: false for legacy data (assume was in cart)
  - No errors thrown for old format data
- **Implementation**:
  ```javascript
  const getSubjectChoices = (subjectCode) => {
    const choices = tutorialChoices[subjectCode] || {};
    // Normalize legacy choices
    return Object.fromEntries(
      Object.entries(choices).map(([level, choice]) => [
        level,
        { ...choice, isDraft: choice.isDraft ?? false }
      ])
    );
  };
  ```

**5. Cart Integration Fix Pattern**
- **Decision**: Lookup-then-merge pattern for cart operations
- **Rationale**:
  - Prevents duplicate cart items
  - Maintains referential integrity between context and cart
  - Follows single source of truth principle
- **Pattern**:
  ```javascript
  const addTutorialToCart = (subjectCode) => {
    // 1. Find existing cart item for subject
    const existingItem = cartItems.find(
      item => item.subject_code === subjectCode && item.type === 'Tutorial'
    );

    // 2. Get all draft choices for subject
    const draftChoices = getDraftChoices(subjectCode);

    if (existingItem) {
      // 3a. Merge: Update existing item with new choices
      updateCartItem(existingItem.id, {
        choices: [...existingItem.choices, ...draftChoices]
      });
    } else {
      // 3b. Create: Add new cart item
      addToCart({ subject_code: subjectCode, choices: draftChoices });
    }

    // 4. Mark choices as added (isDraft: false)
    markChoicesAsAdded(subjectCode);
  };
  ```
- **Alternatives Considered**:
  - Delete-then-recreate: Rejected (loses metadata, flashes UI)
  - Server-side deduplication: N/A (client-side cart only)

**Output**: research.md with all technical decisions documented

---

## Phase 1: Design & Contracts

### 1. Data Model (`data-model.md`)

**TutorialChoice Entity**:
```javascript
{
  // Existing fields
  eventId: string,           // Tutorial event identifier
  eventCode: string,         // e.g., "TUT-CS2-BRI-001"
  location: string,          // e.g., "Bristol", "London"
  variation: {               // Product variation details
    id: number,
    name: string,
    prices: Array<{
      price_type: string,
      amount: number
    }>
  },
  choiceLevel: string,       // "1st", "2nd", "3rd"
  timestamp: string,         // ISO 8601 datetime

  // NEW field
  isDraft: boolean           // true = draft selection, false = in cart
}
```

**TutorialChoices State Structure**:
```javascript
{
  [subjectCode: string]: {
    "1st"?: TutorialChoice,
    "2nd"?: TutorialChoice,
    "3rd"?: TutorialChoice
  }
}
```

**Validation Rules**:
- Maximum 3 choices per subject (enforced by choice levels)
- Choice levels are independent (can select any order)
- isDraft must be boolean (default: true for new selections)
- Timestamp must be ISO 8601 format
- Subject code must be non-empty string

**State Transitions**:
```
NEW CHOICE: isDraft = true
  ↓ (user clicks "Add to Cart")
ADDED TO CART: isDraft = false
  ↓ (user removes cart item)
DRAFT RESTORED: isDraft = true
  ↓ (user deletes choice)
DELETED: Choice removed from state
```

### 2. API Contracts (`contracts/localStorage-contract.json`)

**Contract: localStorage "tutorialChoices" Key**

```json
{
  "storageKey": "tutorialChoices",
  "format": "JSON string",
  "schema": {
    "type": "object",
    "patternProperties": {
      "^[A-Z0-9]+$": {
        "type": "object",
        "properties": {
          "1st": { "$ref": "#/definitions/TutorialChoice" },
          "2nd": { "$ref": "#/definitions/TutorialChoice" },
          "3rd": { "$ref": "#/definitions/TutorialChoice" }
        },
        "additionalProperties": false
      }
    },
    "definitions": {
      "TutorialChoice": {
        "type": "object",
        "required": ["eventId", "choiceLevel", "timestamp", "isDraft"],
        "properties": {
          "eventId": { "type": "string" },
          "eventCode": { "type": "string" },
          "location": { "type": "string" },
          "variation": { "type": "object" },
          "choiceLevel": { "enum": ["1st", "2nd", "3rd"] },
          "timestamp": { "type": "string", "format": "date-time" },
          "isDraft": { "type": "boolean" }
        }
      }
    }
  },
  "backwardCompatibility": {
    "legacyFormat": "TutorialChoice without isDraft field",
    "migrationRule": "Add isDraft: false to all existing choices",
    "rollbackSupport": true,
    "backupKey": "tutorialChoices_backup"
  }
}
```

**Contract: TutorialChoiceContext Methods**

```typescript
// Existing methods (unchanged)
addTutorialChoice(subjectCode: string, choiceLevel: string, eventData: object): void
removeTutorialChoice(subjectCode: string, choiceLevel: string): void
removeSubjectChoices(subjectCode: string): void
getSubjectChoices(subjectCode: string): object
getOrderedChoices(subjectCode: string): array
isChoiceLevelAvailable(subjectCode: string, choiceLevel: string): boolean
getNextAvailableChoiceLevel(subjectCode: string): string | null
updateChoiceLevel(subjectCode: string, fromLevel: string, toLevel: string): void
getTotalSubjectsWithChoices(): number
getTotalChoices(): number
isEventSelected(subjectCode: string, eventId: string): boolean
getEventChoiceLevel(subjectCode: string, eventId: string): string | null

// NEW methods
markChoicesAsAdded(subjectCode: string): void
  // Pre: Subject has choices in state
  // Post: All choices for subject have isDraft = false
  // Side effect: localStorage updated

getDraftChoices(subjectCode: string): array
  // Pre: None
  // Post: Returns array of choices where isDraft = true
  // Side effect: None (read-only)

getCartedChoices(subjectCode: string): array
  // Pre: None
  // Post: Returns array of choices where isDraft = false
  // Side effect: None (read-only)

hasCartedChoices(subjectCode: string): boolean
  // Pre: None
  // Post: Returns true if any choice has isDraft = false
  // Side effect: None (read-only)
```

### 3. Contract Tests

**File**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js`

Sample contract test cases (these should FAIL initially):

```javascript
describe('TutorialChoiceContext - isDraft Contract', () => {
  test('NEW CHOICE: addTutorialChoice sets isDraft: true by default', () => {
    const { result } = renderHook(() => useTutorialChoice(), {
      wrapper: TutorialChoiceProvider
    });

    act(() => {
      result.current.addTutorialChoice('CS2', '1st', mockEventData);
    });

    const choices = result.current.getSubjectChoices('CS2');
    expect(choices['1st'].isDraft).toBe(true);
  });

  test('ADDED TO CART: markChoicesAsAdded sets isDraft: false', () => {
    // Setup: Add choice
    // Act: markChoicesAsAdded
    // Assert: isDraft = false
  });

  test('DRAFT FILTER: getDraftChoices returns only isDraft:true', () => {
    // Setup: Add 2 draft choices, 1 carted choice
    // Act: getDraftChoices
    // Assert: Returns only 2 draft choices
  });

  // ... more contract tests
});
```

### 4. Integration Test Scenarios

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js`

Sample integration test (from user story acceptance criteria):

```javascript
describe('Tutorial Cart Integration', () => {
  test('Scenario 2: Adding second tutorial choice updates existing cart item', () => {
    // Given: Cart contains CS2 Tutorial with Bristol (1st choice)
    // When: User adds CS2 Tutorial London (2nd choice) to cart
    // Then: Cart still contains exactly 1 item for CS2 with both choices

    // Setup
    const { getByText, queryAllByText } = render(<TutorialProductCard />);

    // Add first choice
    userEvent.click(getByText('Add Bristol Tutorial'));

    // Verify 1 cart item
    expect(mockCartItems).toHaveLength(1);
    expect(mockCartItems[0].choices).toHaveLength(1);

    // Add second choice
    userEvent.click(getByText('Add London Tutorial'));

    // Assert: Still 1 cart item, now with 2 choices
    expect(mockCartItems).toHaveLength(1);
    expect(mockCartItems[0].choices).toHaveLength(2);
    expect(mockCartItems[0].subject_code).toBe('CS2');
  });
});
```

### 5. Update CLAUDE.md

**Updates to CLAUDE.md** (incremental additions only):

```markdown
## Recent Changes

### 2025-10-03: Tutorial Cart Integration Fix
- Added `isDraft` state tracking to TutorialChoiceContext
- Fixed cart duplication bug for tutorial products
- Implemented localStorage migration with rollback support
- New helper methods: markChoicesAsAdded, getDraftChoices, getCartedChoices, hasCartedChoices
- Files affected:
  - frontend/react-Admin3/src/contexts/TutorialChoiceContext.js
  - frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js

## Tutorial Cart System

### isDraft State Management
Tutorial choices now track draft vs. cart status:
- `isDraft: true` = Selection being considered
- `isDraft: false` = Selection added to cart

### Cart Integration Rules
- One cart item per subject maximum
- Adding choices merges into existing cart item
- Removing cart item restores draft status
- Choice levels (1st, 2nd, 3rd) are independent
```

**Output**: data-model.md, contracts/, failing contract tests, quickstart.md, CLAUDE.md updated

---

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base template
2. Generate tasks from Phase 1 design outputs:
   - From data-model.md → Create data structure tasks
   - From localStorage-contract.json → Create migration tasks
   - From contract tests → Create test implementation tasks
   - From integration tests → Create cart fix tasks

**Task Breakdown**:
- **Story 1.1 Tasks** (isDraft State Management):
  1. Write failing test: addTutorialChoice initializes isDraft: true [P]
  2. Implement: Update addTutorialChoice to add isDraft flag
  3. Write failing test: markChoicesAsAdded sets isDraft: false [P]
  4. Implement: markChoicesAsAdded method
  5. Write failing test: getDraftChoices filters correctly [P]
  6. Implement: getDraftChoices method
  7. Write failing test: getCartedChoices filters correctly [P]
  8. Implement: getCartedChoices method
  9. Write failing test: hasCartedChoices detection [P]
  10. Implement: hasCartedChoices method
  11. Write failing test: localStorage migration [P]
  12. Implement: Migration logic in useEffect
  13. Write failing test: Rollback support [P]
  14. Implement: Rollback utility function
  15. Write failing test: Backward compatibility [P]
  16. Implement: Defensive reading in getters
  17. Run coverage report: Verify 80%+ coverage

- **Story 1.2 Tasks** (Cart Integration Fix):
  18. Write failing test: First choice creates cart item [P]
  19. Write failing test: Second choice updates cart item (not duplicate) [P]
  20. Write failing test: Third choice updates cart item [P]
  21. Write failing test: Cart removal restores draft state [P]
  22. Document investigation: Current cart bug root cause
  23. Implement: Lookup-then-merge cart integration in TutorialProductCard
  24. Implement: State transition on add to cart
  25. Implement: State transition on cart removal
  26. Write failing test: Multiple subjects in cart [P]
  27. Implement: Multi-subject cart handling
  28. Run coverage report: Verify 100% for cart logic
  29. Run regression tests: Verify no impact to other product types

**Ordering Strategy**:
- TDD order: Test tasks before implementation tasks
- Dependency order: Story 1.1 before Story 1.2 (cart fix depends on isDraft)
- [P] marks parallelizable test writing (can write all tests before any implementation)

**Estimated Output**: ~30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

---

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution - /tasks command creates tasks.md with executable task list
**Phase 4**: Implementation - Developer executes tasks.md following TDD workflow
**Phase 5**: Validation - Run full test suite, verify coverage, regression testing

---

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |

**No violations** - Feature uses existing patterns and adds minimal complexity

---

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command - NEXT STEP)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - none)

---

## Next Command

Run: `/tasks` to generate tasks.md with executable task breakdown

---

*Based on Constitution v2.1.1 - Plan generated by /plan command*
