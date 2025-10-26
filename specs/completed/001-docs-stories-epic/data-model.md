# Data Model: Tutorial Selection UX Refactoring

**Feature**: Epic 2 - Tutorial Selection UX Refactoring
**Date**: 2025-10-05

## Overview

This feature refactors UI components only - no database changes. This document describes the React component data structures (props, state) rather than database entities.

---

## UI Component Entities

### 1. TutorialDetailCard Component

**Purpose**: Display a single tutorial event with selection buttons

**Props Interface**:
```typescript
interface TutorialDetailCardProps {
  // Event data from backend
  event: {
    eventId: number;
    eventTitle: string;
    eventCode: string;
    location: string;
    venue: string;
    startDate: string; // ISO8601
    endDate: string;   // ISO8601
  };

  // Product variation with pricing
  variation: {
    variationId: number;
    variationName: string;
    prices: Array<{
      price_type: string; // "standard", "member", etc.
      amount: number;
    }>;
  };

  // Current selection state
  selectedChoiceLevel: "1st" | "2nd" | "3rd" | null;

  // Subject context
  subjectCode: string; // e.g., "CS2", "CP1"

  // Event handlers
  onSelectChoice: (choiceLevel: "1st" | "2nd" | "3rd", eventData: object) => void;
}
```

**Internal State**: None (controlled component)

**Relationships**:
- **Parent**: TutorialSelectionDialog
- **Reads from**: TutorialChoiceContext (via parent)
- **Writes to**: TutorialChoiceContext (via onSelectChoice callback)

---

### 2. TutorialSelectionDialog Component

**Purpose**: Modal dialog for browsing and selecting tutorial events

**Props Interface**:
```typescript
interface TutorialSelectionDialogProps {
  // Dialog state
  open: boolean;
  onClose: () => void;

  // Product context
  product: {
    productId: number;
    subjectCode: string;
    subjectName: string;
    location: string;
  };

  // Tutorial events to display
  events: Array<{
    eventId: number;
    eventTitle: string;
    eventCode: string;
    location: string;
    venue: string;
    startDate: string;
    endDate: string;
    variation: {
      variationId: number;
      variationName: string;
      prices: Array<{price_type: string; amount: number}>;
    };
  }>;
}
```

**Internal State**:
```typescript
{
  // Current draft choices from context
  draftChoices: {
    "1st"?: TutorialChoice;
    "2nd"?: TutorialChoice;
    "3rd"?: TutorialChoice;
  };
}
```

**Relationships**:
- **Parent**: TutorialProductCard
- **Children**: Multiple TutorialDetailCard instances
- **Integrates with**: TutorialChoiceContext (read draft choices, write new selections)

---

### 3. TutorialSelectionSummaryBar Component

**Purpose**: Persistent summary bar showing selected choices with actions

**Props Interface**:
```typescript
interface TutorialSelectionSummaryBarProps {
  // Subject to display summary for
  subjectCode: string;

  // Action handlers
  onEdit: () => void;       // Opens TutorialSelectionDialog
  onAddToCart: () => void;   // Adds choices to cart
  onRemove: () => void;      // Clears draft choices
}
```

**Internal State**:
```typescript
{
  // UI state
  expanded: boolean; // Derived from isDraft flags

  // Choices from context
  choices: {
    "1st"?: TutorialChoice;
    "2nd"?: TutorialChoice;
    "3rd"?: TutorialChoice;
  };
}
```

**Relationships**:
- **Parent**: TutorialProductCard
- **Reads from**: TutorialChoiceContext (getSubjectChoices, getDraftChoices, getCartedChoices)
- **Triggers**: TutorialProductCard methods (edit, addToCart, remove)

---

## Data Entity (from Epic 1)

### TutorialChoice (persisted in localStorage)

**Purpose**: Represents a student's tutorial selection

**Structure**:
```typescript
interface TutorialChoice {
  // Identification
  eventId: number;
  variationId: number;
  choiceLevel: "1st" | "2nd" | "3rd";

  // Event details
  eventTitle: string;
  eventCode: string;
  location: string;
  venue: string;
  startDate: string; // ISO8601
  endDate: string;   // ISO8601

  // Product variation
  variationName: string;
  variation: {
    prices: Array<{price_type: string; amount: number}>;
  };

  // State tracking (Epic 1)
  isDraft: boolean; // true = not in cart, false = in cart
  timestamp: string; // ISO8601
}
```

**Storage**: localStorage via TutorialChoiceContext

**State Transitions**:
- **Initial**: `isDraft: true` (selection made in dialog)
- **Added to cart**: `isDraft: false` (via markChoicesAsAdded)
- **Removed from cart**: `isDraft: true` (via restoreChoicesToDraft)

---

## Component Data Flow

```
TutorialProductCard
├── SpeedDial (click "Select Tutorial")
│   └── Opens TutorialSelectionDialog
│
├── TutorialSelectionDialog (open=true)
│   ├── Reads: TutorialChoiceContext.getSubjectChoices()
│   ├── Renders: TutorialDetailCard × N
│   │   ├── selectedChoiceLevel (from context)
│   │   └── onSelectChoice → TutorialChoiceContext.addTutorialChoice()
│   └── On selection → TutorialSelectionSummaryBar visibility
│
└── TutorialSelectionSummaryBar
    ├── Reads: TutorialChoiceContext.getDraftChoices() / getCartedChoices()
    ├── expanded = hasCartedChoices() ? false : true
    ├── onEdit → Opens TutorialSelectionDialog
    ├── onAddToCart → markChoicesAsAdded() + CartContext.addToCart()
    └── onRemove → removeSubjectChoices()
```

---

## Validation Rules

**Choice Selection**:
- Only one event can be selected per choice level (1st, 2nd, 3rd)
- Selecting same choice level twice replaces previous selection
- Maximum 3 choices per subject
- No duplicate event selections across levels (enforced by context)

**Summary Bar Display**:
- Expanded when: `getDraftChoices(subjectCode).length > 0`
- Collapsed when: `getCartedChoices(subjectCode).length > 0 && getDraftChoices(subjectCode).length === 0`
- Hidden when: No choices exist for subject

**Button State**:
- "Add to Cart" enabled when: `getDraftChoices(subjectCode).length > 0`
- "Remove" enabled when: `getSubjectChoices(subjectCode).length > 0`
- "Edit" always enabled when summary bar visible

---

## State Persistence

**localStorage Keys** (managed by TutorialChoiceContext):
- `tutorialChoices`: Main storage for all tutorial selections
- Format: `{[subjectCode]: {"1st": TutorialChoice, "2nd": TutorialChoice, ...}}`

**Cart State** (managed by CartContext):
- Cart items with `product_type: "tutorial"` contain metadata from tutorial choices
- Metadata includes subject code for linking back to TutorialChoiceContext

---

## No Database Changes

This feature is **frontend-only**. No database schema modifications required.

**Backend Dependencies** (unchanged):
- Tutorial events API (existing)
- Product variations API (existing)
- Cart API (existing)

---

**Data Model Status**: Complete
**Next**: Create component contracts
