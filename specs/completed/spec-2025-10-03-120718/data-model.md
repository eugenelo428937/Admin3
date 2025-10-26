# Data Model: Tutorial Cart Integration Fix

**Feature**: Tutorial Cart Integration Fix (Epic 1)
**Date**: 2025-10-03

---

## Entity: TutorialChoice

**Description**: Represents a single tutorial selection made by a student for a specific subject at a specific preference level (1st, 2nd, or 3rd choice).

### Structure

```javascript
{
  // Tutorial Event Identification
  eventId: string,           // Unique identifier for tutorial event
  eventCode: string,         // Human-readable code (e.g., "TUT-CS2-BRI-001")
  location: string,          // Tutorial location (e.g., "Bristol", "London", "Manchester")

  // Product Variation Details
  variation: {
    id: number,              // Product variation ID
    name: string,            // Variation name (e.g., "In-Person", "Online")
    prices: Array<{
      price_type: string,    // "standard", "retaker", "discount"
      amount: number         // Price in currency units
    }>
  },

  // Choice Metadata
  choiceLevel: string,       // "1st", "2nd", or "3rd"
  timestamp: string,         // ISO 8601 datetime when choice was made

  // State Tracking (NEW in Epic 1)
  isDraft: boolean           // true = draft selection, false = added to cart
}
```

### Field Specifications

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| eventId | string | Yes | Non-empty string | - |
| eventCode | string | Yes | Pattern: `TUT-{SUBJECT}-{LOC}-{NUM}` | - |
| location | string | Yes | Non-empty string | - |
| variation | object | Yes | Must have id, name, prices | - |
| variation.id | number | Yes | Positive integer | - |
| variation.name | string | Yes | Non-empty string | - |
| variation.prices | array | Yes | Non-empty array of price objects | - |
| choiceLevel | string | Yes | Enum: "1st", "2nd", "3rd" | - |
| timestamp | string | Yes | ISO 8601 format | `new Date().toISOString()` |
| **isDraft** | **boolean** | **Yes** | **boolean** | **true** |

### Validation Rules

1. **Choice Level Uniqueness**: Within a subject, each choice level ("1st", "2nd", "3rd") can only have one tutorial event
2. **Choice Level Independence**: Choice levels can be selected in any order (no sequential requirement)
3. **Maximum Choices**: Maximum 3 tutorial choices per subject
4. **Price Type**: At least one price must be of type "standard"
5. **Timestamp Format**: Must be valid ISO 8601 datetime string
6. **isDraft Default**: New choices must initialize with isDraft: true

### State Transitions

```
┌─────────────────────┐
│   NEW CHOICE        │
│  isDraft: true      │
└──────────┬──────────┘
           │
           │ user clicks "Add to Cart"
           ▼
┌─────────────────────┐
│  ADDED TO CART      │
│  isDraft: false     │
└──────────┬──────────┘
           │
           │ user removes cart item
           ▼
┌─────────────────────┐
│  DRAFT RESTORED     │
│  isDraft: true      │
└──────────┬──────────┘
           │
           │ user deletes choice
           ▼
     [DELETED]
```

### Example Instance

```javascript
{
  eventId: "evt-cs2-bri-001",
  eventCode: "TUT-CS2-BRI-001",
  location: "Bristol",
  variation: {
    id: 42,
    name: "In-Person Tutorial",
    prices: [
      { price_type: "standard", amount: 125.00 },
      { price_type: "retaker", amount: 100.00 }
    ]
  },
  choiceLevel: "1st",
  timestamp: "2025-10-03T14:30:00.000Z",
  isDraft: false  // This choice has been added to cart
}
```

---

## Entity: TutorialChoices State

**Description**: The complete state object managed by TutorialChoiceContext, organized by subject code.

### Structure

```javascript
{
  [subjectCode: string]: {
    "1st"?: TutorialChoice,
    "2nd"?: TutorialChoice,
    "3rd"?: TutorialChoice
  }
}
```

### Constraints

1. **Subject Key**: Subject code must be uppercase alphanumeric (e.g., "CS2", "CP1", "CB1")
2. **Choice Levels**: Only "1st", "2nd", "3rd" keys allowed
3. **Optional Levels**: Not all levels required (can have only "1st", or "2nd" and "3rd", etc.)
4. **No Duplicates**: Each level can only contain one TutorialChoice

### Example State

```javascript
{
  "CS2": {
    "1st": {
      eventId: "evt-cs2-bri-001",
      eventCode: "TUT-CS2-BRI-001",
      location: "Bristol",
      variation: { id: 42, name: "In-Person Tutorial", prices: [...] },
      choiceLevel: "1st",
      timestamp: "2025-10-03T14:30:00.000Z",
      isDraft: false
    },
    "2nd": {
      eventId: "evt-cs2-lon-002",
      eventCode: "TUT-CS2-LON-002",
      location: "London",
      variation: { id: 42, name: "In-Person Tutorial", prices: [...] },
      choiceLevel: "2nd",
      timestamp: "2025-10-03T14:35:00.000Z",
      isDraft: true  // Not yet added to cart
    }
  },
  "CP1": {
    "1st": {
      eventId: "evt-cp1-man-001",
      eventCode: "TUT-CP1-MAN-001",
      location: "Manchester",
      variation: { id: 43, name: "Online Tutorial", prices: [...] },
      choiceLevel: "1st",
      timestamp: "2025-10-03T15:00:00.000Z",
      isDraft: false
    }
  }
}
```

---

## Entity: CartItem (Tutorial Type)

**Description**: A shopping cart item containing tutorial choices for a single subject.

### Structure

```javascript
{
  id: string,                  // Unique cart item ID
  type: "Tutorial",            // Product type identifier
  subject_code: string,        // Subject code (e.g., "CS2")
  subject_name: string,        // Subject display name (e.g., "Computer Science 2")
  choices: Array<TutorialChoice>,  // All tutorial choices for this subject
  totalChoiceCount: number,    // Count of choices (for display)
  price: number,               // Total price (only 1st choice is charged)
  metadata: {
    // Additional cart item metadata
  }
}
```

### Business Rules

1. **One Item Per Subject**: Maximum one CartItem per subject code
2. **Choice Consolidation**: All tutorial choices for a subject are in a single cart item
3. **Pricing Rule**: Only the 1st choice tutorial is charged (2nd and 3rd choices are free backups)
4. **Minimum Choices**: CartItem must have at least 1 choice (empty items not allowed)
5. **Maximum Choices**: CartItem can have up to 3 choices (enforced by TutorialChoice limit)

### Example Instance

```javascript
{
  id: "cart-item-cs2-tutorials",
  type: "Tutorial",
  subject_code: "CS2",
  subject_name: "Computer Science 2",
  choices: [
    {
      eventId: "evt-cs2-bri-001",
      eventCode: "TUT-CS2-BRI-001",
      location: "Bristol",
      variation: { id: 42, name: "In-Person Tutorial", prices: [{ price_type: "standard", amount: 125.00 }] },
      choiceLevel: "1st",
      timestamp: "2025-10-03T14:30:00.000Z",
      isDraft: false
    },
    {
      eventId: "evt-cs2-lon-002",
      eventCode: "TUT-CS2-LON-002",
      location: "London",
      variation: { id: 42, name: "In-Person Tutorial", prices: [{ price_type: "standard", amount: 125.00 }] },
      choiceLevel: "2nd",
      timestamp: "2025-10-03T14:35:00.000Z",
      isDraft: false  // Changed from true when added to cart
    }
  ],
  totalChoiceCount: 2,
  price: 125.00,  // Price of 1st choice only
  metadata: {
    addedAt: "2025-10-03T14:30:00.000Z",
    lastUpdated: "2025-10-03T14:35:00.000Z"
  }
}
```

---

## Relationships

```
Subject (1) ──────< TutorialChoice (0..3)
                          │
                          │ isDraft: false
                          ▼
                   CartItem (0..1)
```

### Relationship Rules

1. **Subject → TutorialChoice**:
   - One subject can have 0 to 3 tutorial choices
   - Each choice level (1st, 2nd, 3rd) can have at most 1 tutorial choice

2. **TutorialChoice → CartItem**:
   - Tutorial choices with isDraft: false belong to a cart item
   - Tutorial choices with isDraft: true are not in cart
   - All choices for a subject with isDraft: false must be in the same cart item

3. **Subject → CartItem**:
   - One subject can have 0 or 1 cart item
   - Cart item exists only when at least one choice has isDraft: false

---

## Data Operations

### Create Operations

```javascript
// Add new tutorial choice (always starts as draft)
addTutorialChoice(subjectCode, choiceLevel, eventData)
  → Creates TutorialChoice with isDraft: true
  → Adds to state[subjectCode][choiceLevel]
  → Persists to localStorage

// Add choices to cart (create or update cart item)
addTutorialToCart(subjectCode)
  → Finds existing CartItem for subject (if exists)
  → If exists: Merges draft choices into existing CartItem
  → If not exists: Creates new CartItem with draft choices
  → Sets isDraft: false for all draft choices
  → Persists to localStorage
```

### Read Operations

```javascript
// Get all choices for a subject
getSubjectChoices(subjectCode)
  → Returns object with "1st", "2nd", "3rd" keys (if exist)
  → Normalizes legacy data (adds isDraft: false if missing)

// Get only draft choices
getDraftChoices(subjectCode)
  → Filters choices where isDraft === true
  → Returns array of TutorialChoice objects

// Get only cart choices
getCartedChoices(subjectCode)
  → Filters choices where isDraft === false
  → Returns array of TutorialChoice objects

// Check if subject has cart choices
hasCartedChoices(subjectCode)
  → Returns true if any choice has isDraft === false
  → Returns false otherwise
```

### Update Operations

```javascript
// Mark choices as added to cart
markChoicesAsAdded(subjectCode)
  → Sets isDraft: false for all choices of subject
  → Persists to localStorage

// Mark choices as draft (removed from cart)
markChoicesAsDraft(subjectCode)
  → Sets isDraft: true for all choices of subject
  → Persists to localStorage

// Remove choice
removeTutorialChoice(subjectCode, choiceLevel)
  → Deletes state[subjectCode][choiceLevel]
  → If subject has no remaining choices, deletes state[subjectCode]
  → Persists to localStorage
```

### Delete Operations

```javascript
// Remove all choices for a subject
removeSubjectChoices(subjectCode)
  → Deletes state[subjectCode]
  → Persists to localStorage

// Remove cart item (triggers draft restoration)
removeFromCart(cartItemId)
  → Finds CartItem by id
  → If CartItem.type === "Tutorial":
    - Calls markChoicesAsDraft(CartItem.subject_code)
    - Deletes CartItem from cart
```

---

## Data Migration

### Old Format (Pre-isDraft)

```javascript
{
  "CS2": {
    "1st": {
      eventId: "evt-cs2-bri-001",
      eventCode: "TUT-CS2-BRI-001",
      location: "Bristol",
      variation: { /* ... */ },
      choiceLevel: "1st",
      timestamp: "2025-10-03T14:30:00.000Z"
      // NO isDraft field
    }
  }
}
```

### New Format (With isDraft)

```javascript
{
  "CS2": {
    "1st": {
      eventId: "evt-cs2-bri-001",
      eventCode: "TUT-CS2-BRI-001",
      location: "Bristol",
      variation: { /* ... */ },
      choiceLevel: "1st",
      timestamp: "2025-10-03T14:30:00.000Z",
      isDraft: false  // ADDED: Default to false for existing data
    }
  }
}
```

### Migration Rules

1. **Detection**: If any choice is missing `isDraft` field, migration needed
2. **Default Value**: Add `isDraft: false` to all existing choices (assume they were "in cart")
3. **Backup**: Save original data to `localStorage["tutorialChoices_backup"]`
4. **Atomicity**: Migration happens on first load after deployment
5. **Rollback**: Utility function can restore from backup if needed

---

## Invariants

**System must always maintain these invariants:**

1. ✅ **Choice Level Uniqueness**: `state[subject][level]` contains at most 1 TutorialChoice
2. ✅ **Maximum Choices**: `Object.keys(state[subject]).length ≤ 3`
3. ✅ **Cart Consolidation**: All choices with `isDraft: false` for same subject are in same CartItem
4. ✅ **Cart-State Sync**: If `CartItem.subject_code === S` exists, then `hasCartedChoices(S) === true`
5. ✅ **Draft-Cart Mutual Exclusion**: A choice cannot be both draft (isDraft: true) and in cart simultaneously
6. ✅ **localStorage Sync**: State changes are immediately persisted to localStorage
7. ✅ **Timestamp Ordering**: Newer choices have later timestamps (monotonic)

---

## Performance Considerations

- **localStorage Reads**: Minimize by caching state in Context (read once on mount)
- **localStorage Writes**: Batch writes where possible (use single useEffect with dependencies)
- **State Updates**: Use functional updates to avoid stale closure issues
- **Re-renders**: Use React.memo and useCallback to minimize unnecessary re-renders
- **Migration**: One-time cost on first load, negligible impact (<10ms for typical data)

---

**Data Model Status**: ✅ COMPLETE
