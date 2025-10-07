# Architecture Correction: Global Tutorial Summary Bars

**Date**: 2025-10-07
**Status**: 🔴 **CORRECTION REQUIRED**
**Epic**: 002 - Tutorial Selection UX Refactoring

---

## ⚠️ Previous Architecture Was INCORRECT

### What Was Wrong

The previous implementation created a **separate `/tutorials` route** with `TutorialProductList.js` that:
- ❌ Created a dedicated page just for tutorial products
- ❌ Managed summary bars within the list component
- ❌ Violated the principle that **tutorials are just products**
- ❌ Created unnecessary duplication and complexity

**Files involved in incorrect approach:**
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductList.js` (should not exist)
- Navigation changes pointing to `/tutorials` route (incorrect)

---

## ✅ Correct Architecture

### Core Principle
> **Tutorials are products.** They should be displayed alongside all other products in the main `ProductList.js` component, not on a separate page.

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App.js / Layout                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         TutorialChoiceProvider (Context)                │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │         Main Content Area (Routes)                │  │ │
│  │  │  - ProductList.js (ALL products including tuts)   │  │ │
│  │  │  - Cart.js                                        │  │ │
│  │  │  - Checkout.js                                    │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                          │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │   TutorialSummaryBarContainer (Global)            │  │ │
│  │  │   - Fixed position bottom-left                    │  │ │
│  │  │   - Controlled by TutorialChoiceContext           │  │ │
│  │  │   - Visible across ALL pages                      │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### 1. **ProductList.js** - Main Product Display
**Location:** `frontend/react-Admin3/src/components/Product/ProductList.js`

**Purpose:** Display ALL products (tutorials, materials, exams, etc.)

**Responsibilities:**
- ✅ Fetch and display products from API
- ✅ Render `ProductCard` components for all product types
- ✅ Handle filtering, search, pagination
- ❌ NO tutorial-specific rendering logic
- ❌ NO summary bar rendering

**Code Structure:**
```javascript
const ProductList = () => {
  const products = useProductsSearch();

  return (
    <Container>
      <FilterPanel />
      <ProductGrid products={products} /> {/* All products */}
    </Container>
  );
};
```

---

### 2. **TutorialProductCard.js** - Individual Tutorial Card
**Location:** `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`

**Purpose:** Display single tutorial product in the grid

**Responsibilities:**
- ✅ Display tutorial details (location, dates, pricing)
- ✅ Render selection dialog when clicked
- ✅ Add/remove choices via `useTutorialChoice()` hook
- ❌ NO summary bar rendering
- ❌ NO cart operations (except through context)

---

### 3. **TutorialSummaryBarContainer.js** - Global Summary Bar Manager
**Location:** `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js` (NEW FILE)

**Purpose:** Global container that renders ALL tutorial summary bars

**Responsibilities:**
- ✅ Monitor `TutorialChoiceContext` for changes
- ✅ Render summary bars for subjects with active choices
- ✅ Handle vertical stacking with flexbox
- ✅ Provide Edit/Add to Cart/Remove handlers
- ✅ Visible across ALL routes (not just products page)

**Implementation:**
```javascript
import React from 'react';
import { Box } from '@mui/material';
import { useTutorialChoice } from '../../../../contexts/TutorialChoiceContext';
import { useCart } from '../../../../contexts/CartContext';
import TutorialSelectionSummaryBar from './TutorialSelectionSummaryBar';
import {
  buildTutorialMetadata,
  buildTutorialProductData,
  buildTutorialPriceData
} from '../../../../utils/tutorialMetadataBuilder';

/**
 * Global container for tutorial summary bars
 * Controlled entirely by TutorialChoiceContext
 * Rendered at App/Layout level for global visibility
 */
const TutorialSummaryBarContainer = () => {
  const {
    tutorialChoices,
    removeTutorialChoice,
    getSubjectChoices,
    markChoicesAsAdded
  } = useTutorialChoice();

  const { addToCart } = useCart();

  // Get all subjects that have active choices
  const subjectsWithChoices = Object.keys(tutorialChoices).filter(
    subjectCode => Object.keys(tutorialChoices[subjectCode]).length > 0
  );

  // Handler: Add tutorial choices to cart
  const handleAddToCart = async (subjectCode) => {
    const subjectChoices = getSubjectChoices(subjectCode);

    // Find product data (this needs to be fetched/cached)
    // TODO: Implement product data retrieval strategy
    const productData = await getProductForSubject(subjectCode);

    const metadata = buildTutorialMetadata(
      subjectChoices,
      subjectCode,
      productData.subject_name
    );
    const productPayload = buildTutorialProductData(productData, metadata);
    const priceData = buildTutorialPriceData(subjectChoices['1st']);

    await addToCart(productPayload, priceData);
    markChoicesAsAdded(subjectCode);
  };

  // Handler: Remove draft choices
  const handleRemove = (subjectCode) => {
    const subjectChoices = getSubjectChoices(subjectCode);
    Object.entries(subjectChoices).forEach(([level, choice]) => {
      if (choice.isDraft) {
        removeTutorialChoice(subjectCode, level);
      }
    });
  };

  // Handler: Edit choices (open dialog)
  const handleEdit = (subjectCode) => {
    // Emit event or use global state to open dialog
    // This needs to be implemented based on dialog management strategy
    console.log('Edit requested for', subjectCode);
  };

  // Don't render if no choices exist
  if (subjectsWithChoices.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 8, lg: 24 },
        left: { xs: 8, lg: 24 },
        zIndex: 1300, // Above content, below modals
        display: 'flex',
        flexDirection: 'column',
        gap: 1, // 8px gap between bars
        maxWidth: { xs: 'calc(100% - 16px)', sm: '600px' },
      }}
    >
      {subjectsWithChoices.map((subjectCode) => (
        <TutorialSelectionSummaryBar
          key={subjectCode}
          subjectCode={subjectCode}
          onEdit={() => handleEdit(subjectCode)}
          onAddToCart={() => handleAddToCart(subjectCode)}
          onRemove={() => handleRemove(subjectCode)}
        />
      ))}
    </Box>
  );
};

export default TutorialSummaryBarContainer;
```

---

### 4. **TutorialSelectionSummaryBar.js** - Individual Summary Bar
**Location:** `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`

**Purpose:** Display summary and actions for ONE subject's tutorial choices

**Responsibilities:**
- ✅ Display subject name and choice details
- ✅ Expand/collapse based on draft state
- ✅ Provide Edit/Add to Cart/Remove buttons
- ✅ Use theme colors for styling
- ❌ NO positioning logic (controlled by parent container)

**Current Status:** ✅ Already implemented correctly as `Paper` component

---

### 5. **TutorialChoiceContext.js** - State Management
**Location:** `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`

**Purpose:** Centralized state management for tutorial selections

**Responsibilities:**
- ✅ Store tutorial choices in state and localStorage
- ✅ Provide methods for add/remove/update choices
- ✅ Track draft vs carted state (`isDraft` flag)
- ✅ Enforce single choice per event constraint
- ✅ Provide getters for summary bar data

**Current Status:** ✅ Already implemented correctly

---

## Integration Point: App.js or Layout

The `TutorialSummaryBarContainer` should be rendered at the **App level** so it's visible across all routes.

### Option A: In App.js (Root Level)
```javascript
// frontend/react-Admin3/src/App.js
import TutorialSummaryBarContainer from './components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer';

function App() {
  return (
    <TutorialChoiceProvider>
      <CartProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/products" element={<ProductList />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
          </Routes>

          {/* Global Tutorial Summary Bars */}
          <TutorialSummaryBarContainer />
        </BrowserRouter>
      </CartProvider>
    </TutorialChoiceProvider>
  );
}
```

### Option B: In Layout Component
```javascript
// frontend/react-Admin3/src/components/Layout/MainLayout.js
import TutorialSummaryBarContainer from '../Product/ProductCard/Tutorial/TutorialSummaryBarContainer';

const MainLayout = ({ children }) => {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />

      {/* Global Tutorial Summary Bars */}
      <TutorialSummaryBarContainer />
    </>
  );
};
```

---

## Data Flow

### 1. User Selects Tutorial
```
TutorialProductCard (user clicks event)
  ↓
useTutorialChoice().addTutorialChoice(subjectCode, level, eventData)
  ↓
TutorialChoiceContext updates state
  ↓
TutorialSummaryBarContainer detects context change
  ↓
Renders new TutorialSelectionSummaryBar for subject
```

### 2. User Adds to Cart
```
TutorialSelectionSummaryBar (user clicks "Add to Cart")
  ↓
TutorialSummaryBarContainer.handleAddToCart(subjectCode)
  ↓
useCart().addToCart(productData, priceData)
  ↓
useTutorialChoice().markChoicesAsAdded(subjectCode)
  ↓
Summary bar collapses (no more draft choices)
```

### 3. User Navigates to Different Page
```
User navigates to /cart
  ↓
ProductList unmounts
  ↓
TutorialSummaryBarContainer remains mounted (global)
  ↓
Summary bars still visible on cart page
  ↓
User can continue editing tutorial choices
```

---

## Key Benefits

### ✅ 1. Tutorials Are Products
- Tutorials displayed alongside materials, exams, etc.
- No artificial separation or dedicated route
- Consistent user experience

### ✅ 2. Global Visibility
- Summary bars visible across ALL routes
- User can navigate and see draft choices
- No context loss when switching pages

### ✅ 3. Clean Separation of Concerns
- `ProductList` doesn't know about summary bars
- `TutorialProductCard` doesn't know about summary bars
- `TutorialSummaryBarContainer` only cares about context
- Each component has single responsibility

### ✅ 4. Context-Driven Architecture
- Summary bars react automatically to context changes
- No prop drilling or complex state management
- Single source of truth (TutorialChoiceContext)

### ✅ 5. Vertical Stacking Works Naturally
- Container controls positioning
- Flexbox handles stacking
- No positioning conflicts between bars

---

## Migration Tasks

### Phase 1: Create Global Container
- [ ] Create `TutorialSummaryBarContainer.js`
- [ ] Implement handlers (Edit, Add to Cart, Remove)
- [ ] Add product data retrieval strategy

### Phase 2: Integrate at App Level
- [ ] Add container to `App.js` or `MainLayout.js`
- [ ] Ensure context provider wraps entire app
- [ ] Test visibility across routes

### Phase 3: Clean Up Incorrect Implementation
- [ ] Remove `TutorialProductList.js` (entire file)
- [ ] Remove `/tutorials` route from navigation
- [ ] Remove summary bar rendering from `TutorialProductCard.js` (already done)
- [ ] Update navigation links to point to `/products?main_category=Tutorials`

### Phase 4: Handle Edit Dialog
- [ ] Implement dialog opening mechanism (event emitter or global state)
- [ ] Connect Edit handler to dialog system
- [ ] Test dialog opening from summary bars

### Phase 5: Product Data Strategy
- [ ] Implement caching/lookup for product data in context
- [ ] OR: Store minimal product data in choice context
- [ ] OR: Fetch product data when "Add to Cart" clicked

---

## Testing Strategy

### Manual Testing
1. Navigate to `/products`
2. Filter by "Tutorials" category
3. Select 1st choice for CS2 → Summary bar appears (bottom-left)
4. Navigate to `/cart` → Summary bar still visible
5. Navigate back to `/products` → Summary bar still visible
6. Select 2nd choice for CS2 → Bar updates
7. Click "Add to Cart" → Bar collapses, cart updates
8. Select choices for CP1 → Second bar stacks below CS2

### Automated Testing
- Unit tests for `TutorialSummaryBarContainer` handlers
- Integration tests for context-driven rendering
- E2E tests for cross-page visibility

---

## Open Questions

### 1. Product Data Retrieval for "Add to Cart"
**Problem:** Summary bar needs product data to build cart payload

**Options:**
- A. Store product reference in context alongside choices ✅ (Recommended)
- B. Fetch product data when "Add to Cart" clicked (requires API call)
- C. Global product cache/lookup service

**Recommendation:** Store minimal product data in context:
```javascript
addTutorialChoice(subjectCode, level, {
  eventId,
  eventCode,
  location,
  productId,        // Add this
  productName,      // Add this
  subjectName,      // Add this
  // ... rest of event data
});
```

### 2. Dialog Management for Edit Handler
**Problem:** How does summary bar's Edit button open the card's dialog?

**Options:**
- A. Event emitter system (pub/sub pattern)
- B. Global dialog state in context
- C. Dialog managed by TutorialSummaryBarContainer
- D. URL parameter triggers dialog open

**Recommendation:** Option B - Add dialog state to `TutorialChoiceContext`:
```javascript
// In TutorialChoiceContext.js
const [editDialogOpen, setEditDialogOpen] = useState(null);

const openEditDialog = (subjectCode) => setEditDialogOpen(subjectCode);
const closeEditDialog = () => setEditDialogOpen(null);

// TutorialProductCard listens to this state
// TutorialSummaryBarContainer calls openEditDialog()
```

---

## Status

**Current:** ❌ Incorrect implementation with separate `/tutorials` route

**Target:** ✅ Global summary bars controlled by context

**Next Steps:**
1. Create specification (this document) ✅
2. Implement `TutorialSummaryBarContainer.js`
3. Integrate at App level
4. Remove incorrect TutorialProductList approach
5. Test cross-page visibility

---

**Document Status:** ✅ **APPROVED FOR IMPLEMENTATION**
**Last Updated:** 2025-10-07
