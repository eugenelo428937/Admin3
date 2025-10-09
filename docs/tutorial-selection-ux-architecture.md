# Tutorial Selection UX Architecture

**Epic**: Epic 2 - Tutorial Selection UX Refactoring
**Date**: 2025-10-07
**Status**: Complete

## Overview

This document describes the architecture and implementation of the Tutorial Selection UX system, which provides a comprehensive interface for students to select, manage, and add tutorial choices to their cart.

## System Components

### 1. TutorialProductCard
**Location**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`

**Purpose**: Main product card component for tutorial offerings

**Key Features**:
- Displays tutorial product information (subject, location, venue, format)
- Shows floating badges for subject code, session, and cart count
- SpeedDial action menu for:
  - Add to Cart (when choices selected)
  - Select Tutorial
  - View Selections (when choices exist)
- Price information with discount options (Retaker, Additional Copy)
- Price info modal dialog showing all variation prices

**State Management**:
- Uses `TutorialChoiceContext` for managing tutorial selections
- Uses `CartContext` for cart operations
- Local state for UI interactions (hover, dialog open, SpeedDial)

**Props**:
```javascript
{
  subjectCode: string,      // e.g., "CS2"
  subjectName: string,      // e.g., "Risk Modelling and Survival Analysis"
  location: string,         // e.g., "Bristol"
  productId: number,        // Product ID from backend
  product: object,          // Full product object
  variations: array,        // Preloaded variations (optional)
  onAddToCart: function,    // Callback for cart addition (optional)
  dialogOpen: boolean,      // Controlled dialog state (optional)
  onDialogClose: function   // Dialog close callback (optional)
}
```

### 2. TutorialSelectionDialog
**Location**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionDialog.js`

**Purpose**: Modal dialog for selecting tutorial event choices

**Key Features**:
- Responsive grid layout (3 columns desktop, 2 tablet, 1 mobile)
- Displays all tutorial events with TutorialDetailCard components
- Integrates with TutorialChoiceContext for persistent selection state
- Dialog closes on backdrop click, close button, or Escape key

**Props**:
```javascript
{
  open: boolean,           // Dialog open state
  onClose: function,       // Close callback
  product: object,         // Product metadata (subjectCode, subjectName, location, productId, productName)
  events: array            // Array of tutorial events
}
```

**Event Structure**:
```javascript
{
  eventId: number,
  eventTitle: string,
  eventCode: string,
  location: string,
  venue: string,
  startDate: string,
  endDate: string,
  variation: {
    variationId: number,
    variationName: string,
    prices: array
  }
}
```

### 3. TutorialDetailCard
**Location**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialDetailCard.js`

**Purpose**: Individual event card within the selection dialog

**Key Features**:
- Displays event details (title, code, venue, dates)
- Three choice buttons: "1st", "2nd", "3rd"
- Visual feedback for selected choices (outlined → contained)
- Choice replacement logic (selecting new 1st choice replaces previous)
- Minimum height ensures grid alignment

**Props**:
```javascript
{
  eventId: number,
  eventTitle: string,
  eventCode: string,
  location: string,
  venue: string,
  startDate: string,
  endDate: string,
  variation: object,
  subjectCode: string,
  productId: number,
  productName: string
}
```

### 4. TutorialSelectionSummaryBar
**Location**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`

**Purpose**: Summary bar component showing selected tutorial choices

**Key Features**:
- Displays subject title and location
- Shows ordered list of choices (1st, 2nd, 3rd)
- Three action buttons:
  - Edit: Opens TutorialSelectionDialog
  - Add to Cart: Adds/updates tutorial in cart
  - Remove: Clears all draft choices
- Fixed positioning at bottom center of viewport
- Mobile-responsive design

**Props**:
```javascript
{
  subjectCode: string,
  onEdit: function,
  onAddToCart: function,
  onRemove: function
}
```

### 5. TutorialSummaryBarContainer
**Location**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`

**Purpose**: Global container that manages all summary bars across the app

**Key Features**:
- Rendered at App/Layout level for cross-route visibility
- Monitors TutorialChoiceContext for draft choices
- Renders one TutorialSelectionSummaryBar per subject with draft choices
- Handles Add to Cart, Edit, and Remove actions
- Checks for existing cart items and updates instead of creating duplicates
- Matches cart items by subject code (not productId)

**Architecture**:
```
App.js
└── TutorialSummaryBarContainer (fixed bottom center)
    ├── TutorialSelectionSummaryBar (Subject 1)
    ├── TutorialSelectionSummaryBar (Subject 2)
    └── ... (one per subject with draft choices)
```

**Cart Integration**:
```javascript
// Check for existing cart item by subject code
const existingCartItem = cartItems.find(item => {
  const itemSubjectCode = item.subject_code || item.metadata?.subjectCode;
  return itemSubjectCode === subjectCode && item.product_type === "tutorial";
});

// Update if exists, add if new
if (existingCartItem) {
  await updateCartItem(existingCartItem.id, productData, priceData);
} else {
  await addToCart(productData, priceData);
}
```

## State Management

### TutorialChoiceContext
**Location**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`

**Purpose**: Global state management for tutorial selections

**State Structure**:
```javascript
tutorialChoices: {
  [subjectCode]: {
    "1st": {
      choiceLevel: "1st",
      eventId: number,
      eventTitle: string,
      eventCode: string,
      variationId: number,
      variationName: string,
      venue: string,
      startDate: string,
      endDate: string,
      location: string,
      isDraft: boolean,
      productId: number,
      productName: string,
      subjectName: string,
      variation: object
    },
    "2nd": { /* same structure */ },
    "3rd": { /* same structure */ }
  }
}
```

**Key Methods**:
- `addTutorialChoice(subjectCode, choiceLevel, choiceData)`: Add or replace a choice
- `removeTutorialChoice(subjectCode, choiceLevel)`: Remove a specific choice
- `getSubjectChoices(subjectCode)`: Get all choices for a subject
- `getDraftChoices(subjectCode)`: Get only draft choices
- `markChoicesAsAdded(subjectCode)`: Mark choices as added to cart (`isDraft: false`)
- `markChoicesAsDraft(subjectCode)`: Revert choices to draft state
- `openEditDialog(subjectCode)`: Set dialog open for subject
- `closeEditDialog()`: Clear dialog open state

**Persistence**: State is persisted to `localStorage` under key `tutorialChoices`

### CartContext
**Location**: `frontend/react-Admin3/src/contexts/CartContext.js`

**Purpose**: Global state management for shopping cart

**Key Methods Used**:
- `addToCart(productData, priceData)`: Add new item to cart
- `updateCartItem(itemId, productData, priceData)`: Update existing cart item
- `cartItems`: Array of current cart items

## Data Flow

### Tutorial Selection Flow

```
User clicks "Select Tutorial" on TutorialProductCard
  ↓
TutorialSelectionDialog opens with events
  ↓
User clicks "1st Choice" on TutorialDetailCard
  ↓
TutorialChoiceContext.addTutorialChoice() called
  ↓
Choice saved to context and localStorage (isDraft: true)
  ↓
TutorialSummaryBarContainer detects draft choice
  ↓
TutorialSelectionSummaryBar renders at bottom
  ↓
User clicks "Add to Cart" on summary bar
  ↓
TutorialSummaryBarContainer.handleAddToCart():
  1. Build product data (subject code, name, location)
  2. Build price data (actual price)
  3. Build metadata (tutorial choices with event details)
  4. Check if subject already in cart
  5. Update existing item OR add new item
  6. Mark choices as added (isDraft: false)
```

### Cart Payload Structure

**Product Data**:
```javascript
{
  id: productId,
  essp_id: productId,
  product_id: productId,
  subject_code: "CS2",
  subject_name: "Risk Modelling and Survival Analysis",
  product_name: "CS2 Tutorial - Bristol",
  product_type: "tutorial",
  quantity: 1
}
```

**Price Data**:
```javascript
{
  priceType: "standard",
  actualPrice: 299.00,
  metadata: {
    type: "tutorial",
    title: "CS2 Tutorial",
    subjectCode: "CS2",
    totalChoiceCount: 2,
    locations: [
      {
        location: "Bristol",
        choiceCount: 2,
        choices: [
          {
            choice: "1st",
            variationId: 123,
            eventId: 456,
            variationName: "In-person",
            eventTitle: "CS2 Introduction Tutorial",
            eventCode: "TUT-CS2-BRI-001",
            venue: "Room 101, Main Building",
            startDate: "2025-01-15",
            endDate: "2025-01-16",
            price: "£299.00"
          },
          { /* 2nd choice */ }
        ]
      }
    ]
  }
}
```

## Utility Functions

### tutorialMetadataBuilder.js
**Location**: `frontend/react-Admin3/src/utils/tutorialMetadataBuilder.js`

**Purpose**: Single source of truth for building cart payload structures

**Exported Functions**:

1. **buildTutorialMetadata(choices, subjectCode, location, actualPrice)**
   - Builds metadata object with tutorial choices
   - Returns structured metadata for cart operations

2. **buildTutorialProductData(productId, subjectCode, subjectName, location)**
   - Builds product data object
   - Returns consistent product structure for cart

3. **buildTutorialPriceData(actualPrice, metadata, priceType)**
   - Builds price data object
   - Returns price structure with metadata

**Usage**:
```javascript
import {
  buildTutorialMetadata,
  buildTutorialProductData,
  buildTutorialPriceData
} from '../../../../utils/tutorialMetadataBuilder';

const metadata = buildTutorialMetadata(choices, subjectCode, location, actualPrice);
const productData = buildTutorialProductData(productId, subjectCode, subjectName, location);
const priceData = buildTutorialPriceData(actualPrice, metadata);

await addToCart(productData, priceData);
```

## Responsive Design

### Breakpoints
- **Desktop (lg)**: ≥1280px - 3 columns
- **Tablet (md)**: 960-1280px - 2 columns
- **Mobile (sm)**: <960px - 1 column

### Mobile Optimizations
- Touch targets ≥44px for accessibility
- Full-width dialogs on mobile
- Vertically stacked action buttons
- Summary bar full-width at bottom

## Testing Strategy

### Component Tests
- TutorialDetailCard.test.js: Event card rendering and choice selection
- TutorialSelectionDialog.test.js: Dialog behavior and grid layout
- TutorialProductCard.test.js: Card rendering, SpeedDial, cart integration

### Integration Tests
- TutorialComponents.integration.test.js: Full flow testing
  - Selection → Summary Bar → Add to Cart
  - Edit functionality
  - Multi-subject scenarios
- TutorialSummaryBarContainer.integration.test.js: Container behavior

### Test Coverage
- Component rendering: ✅
- User interactions: ✅
- Context integration: ✅
- Cart operations: ✅
- Responsive layout: ✅

## Architecture Decisions

### 1. Why Global Summary Bar Container?
- **Cross-route visibility**: Users can see draft selections on any page
- **Consistent UX**: Summary bar always appears in same location
- **Centralized logic**: Single source for cart integration
- **Multiple subjects**: Can display summary bars for multiple subjects simultaneously

### 2. Why Subject Code Matching for Cart?
- **Multiple tutorials share same productId**: ProductId represents location (e.g., "Bristol")
- **Subject is unique identifier**: Each subject (CS2, SP1) has distinct tutorial choices
- **Prevents duplicates**: Ensures one cart item per subject
- **Allows updates**: Adding new choices updates existing cart item

### 3. Why isDraft State?
- **Distinguish cart items**: Know which choices are in cart vs pending
- **Visual feedback**: Summary bar can indicate "added" state
- **State recovery**: Can revert to draft if cart item removed
- **Clear workflow**: Selection → Draft → Added → Cart

### 4. Why Separate TutorialDetailCard?
- **Reusability**: Can be used in different contexts
- **Testability**: Isolated component for unit testing
- **Maintainability**: Choice logic encapsulated
- **Consistent height**: Grid alignment ensured

## Performance Considerations

### Memoization
- `useMemo` for flattened events calculation
- `useCallback` for event handlers to prevent re-renders
- `React.memo` for TutorialProductCard component

### LocalStorage
- Persist selections across page refreshes
- Avoid unnecessary API calls
- Synchronous access for fast rendering

### Lazy Rendering
- Summary bars only render when draft choices exist
- Dialog only renders when open
- Events only loaded when product card mounted

## Known Limitations

### Current Implementation
1. **Single location per subject**: Cannot select tutorials from multiple locations for same subject
2. **No date conflict detection**: System doesn't warn if tutorial dates overlap
3. **No price recalculation**: Adding more choices doesn't affect total price
4. **No partial removal**: Remove button clears all draft choices

### Future Enhancements
1. **Multi-location support**: Allow Bristol + London selections for same subject
2. **Date validation**: Warn users about scheduling conflicts
3. **Dynamic pricing**: Update price based on number of choices
4. **Granular removal**: Remove individual choices from summary bar
5. **Comparison mode**: Compare different tutorial options side-by-side

## Migration Notes

### Removed Components
- **TutorialProductList.js**: Separate tutorial list page removed
- **TutorialProductList.test.js**: Associated test file removed

### Route Changes
- **Old**: `/tutorials` route displayed TutorialProductList
- **New**: Tutorials display in main ProductList with filter `?main_category=Tutorials`

### Navigation Updates
- **MobileNavigation.js**: "View All Tutorials" now navigates to `/products?main_category=Tutorials`

## References

- **Epic Specification**: `specs/001-docs-stories-epic/`
- **Quickstart Guide**: `specs/001-docs-stories-epic/quickstart.md`
- **Cleanup Checklist**: `specs/001-docs-stories-epic/CLEANUP_CHECKLIST.md`
- **CLAUDE.md**: Project-level guidance
