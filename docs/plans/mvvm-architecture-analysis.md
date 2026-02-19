# MVVM Architecture Analysis

> **Status**: Proposal | **Date**: 2026-02-16 | **Author**: Architecture Review

## Executive Summary

Analysis of the Admin3 React frontend to evaluate the costs and benefits of reorganizing the codebase into a Model-View-ViewModel (MVVM) architecture. The codebase already has emergent ViewModel patterns in some custom hooks but applies them inconsistently.

**Verdict: Adopt selectively for pages and complex features, not globally.**

---

## Current Architecture Assessment

### Existing Layer Mapping

| MVVM Layer | Current Implementation | Files | Assessment |
|------------|----------------------|-------|------------|
| **View** | React components | 78 components, 5 pages | Components mix rendering with business logic |
| **ViewModel** | Custom hooks (informal) | 9 hooks | Inconsistent - some clean, some mixed-concern |
| **Model** | Services + Redux + RTK Query | 38 services, 24 Redux files | Well-structured but tightly coupled to Views |

### Current Data Flow

```
┌─────────────────────────────────────────────────────┐
│ View (Components/Pages)                             │
│  - Direct useSelector() calls (10+ per component)   │
│  - Direct dispatch() calls                          │
│  - Direct service calls in useEffect                │
│  - Business logic mixed with JSX                    │
└──────────┬──────────────────────────────┬───────────┘
           │                              │
    ┌──────▼──────┐              ┌────────▼────────┐
    │ Custom Hooks │              │ Context API     │
    │ (informal    │              │ Cart, Auth,     │
    │  ViewModels) │              │ Tutorial        │
    └──────┬──────┘              └────────┬────────┘
           │                              │
    ┌──────▼──────────────────────────────▼────────┐
    │ Model Layer                                   │
    │  - Redux Toolkit (filters, search state)      │
    │  - RTK Query (API caching)                    │
    │  - Services (38 API wrappers)                 │
    └──────────────────────────────────────────────┘
```

### Existing ViewModel-Like Hooks

#### Good Example: `useCheckoutValidation` (462 lines)

Clean single-concern ViewModel - validation state + methods, no data fetching or Redux:

```javascript
const useCheckoutValidation = () => {
  const [validationState, setValidationState] = useState({
    isValidating: false,
    canProceed: false,
    blocked: false,
    summary: {...},
    allRequiredAcknowledgments: [],
    missingAcknowledgments: [],
  });

  // Pure validation actions
  const validateEmail = useCallback((email) => {...}, []);
  const validatePhone = useCallback((phone, countryCode) => {...}, []);
  const validateAddress = useCallback((addressData, type) => {...}, []);
  const validateCheckout = useCallback(async (...) => {...}, []);

  return { ...validationState, validateCheckout, validateStep1, ... };
};
```

#### Mixed-Concern Example: `useProductsSearch` (360 lines)

Combines 5 different concerns - too broad for a clean ViewModel:

```javascript
export const useProductsSearch = () => {
  // Concern 1: Redux state (10+ useSelector calls)
  const filters = useSelector(selectFilters);
  const searchQuery = useSelector(selectSearchQuery);
  // ...8 more selectors

  // Concern 2: RTK Query
  const [triggerSearch, searchResult] = useLazyUnifiedSearchQuery();

  // Concern 3: Debouncing
  const debounceTimerRef = useRef(null);

  // Concern 4: Performance tracking
  PerformanceTracker.startMeasure('search');

  // Concern 5: Error formatting
  const formatError = (error) => {...};

  // Returns 12 different values
  return { products, filterCounts, pagination, isLoading, error,
           search, refresh, reset, debouncedSearch, hasSearched, ... };
};
```

#### Components With Embedded Business Logic

**Home.js** - Rules engine execution directly in component (lines 53-117):
```javascript
const Home = () => {
  // Business logic that should be in a ViewModel
  useEffect(() => {
    const executeRules = async () => {
      const results = await rulesEngineService.execute('home_page_mount', context);
      setRuleResults(results);
    };
    executeRules();
  }, []);
  // ...more logic mixed with JSX
};
```

**Cart.js** - Direct service calls in component (lines 38-56):
```javascript
const Cart = () => {
  useEffect(() => {
    const loadCart = async () => {
      const data = await cartService.fetchCart();
      setCartData(data);
    };
    loadCart();
  }, []);
};
```

---

## Pros

### P1. Separates Business Logic from UI (Impact: HIGH)

`Home.js` directly handles rules engine execution, search callbacks, and navigation logic. A ViewModel would extract this into a testable `useHomeViewModel()`.

**Before (current):**
```javascript
// Home.js - 400+ lines mixing logic and JSX
const Home = () => {
  const [ruleResults, setRuleResults] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    // Business logic embedded in component
    rulesEngineService.execute('home_page_mount', context)
      .then(setRuleResults);
  }, []);

  const handleProductCategoryClick = (productType) => {
    dispatch(navSelectProductGroup(productType));
    navigate("/products");
  };

  return <div>{/* 200+ lines of JSX */}</div>;
};
```

**After (MVVM):**
```javascript
// useHomeViewModel.ts
export const useHomeViewModel = () => {
  const [ruleResults, setRuleResults] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    rulesEngineService.execute('home_page_mount', context)
      .then(setRuleResults);
  }, []);

  const handleProductCategoryClick = (productType) => {
    dispatch(navSelectProductGroup(productType));
    navigate("/products");
  };

  return { ruleResults, searchResults, handleProductCategoryClick, ... };
};

// Home.tsx - Pure rendering
const Home = () => {
  const vm = useHomeViewModel();
  return <div>{/* JSX using vm.* properties */}</div>;
};
```

### P2. Makes Large Hooks Manageable (Impact: HIGH)

`useProductsSearch.js` mixes 5 concerns. MVVM would split it:
- **ViewModel**: `useProductSearchViewModel()` - orchestration, state exposure
- **Model**: RTK Query endpoint (data fetching)
- **Utilities**: `debounce()`, `PerformanceTracker` (standalone)

### P3. Improves Testability (Impact: HIGH)

Page components like `Cart.js` have business logic in `useEffect` that requires full component rendering to test. A ViewModel can be tested as a plain hook without JSX:

```javascript
// Testing ViewModel directly - no DOM needed
const { result } = renderHook(() => useCartViewModel());

act(() => { result.current.removeItem(123); });

expect(result.current.cartItems).toHaveLength(0);
expect(result.current.totalPrice).toBe(0);
```

### P4. Standardizes Component Structure (Impact: MEDIUM)

Currently, some components are thin (`BaseProductCard`) while others are fat (`Home.js`, `CheckoutPage`). MVVM enforces a consistent pattern: every page gets a ViewModel hook.

### P5. Standardizes Error Handling (Impact: MEDIUM)

Error handling is currently inconsistent across layers:
- Services return error objects: `{ status: 'error', message: '...' }`
- Hooks dispatch Redux errors: `dispatch(setError(message))`
- Components use local error state: `const [error, setError] = useState(null)`

A ViewModel layer would standardize how errors flow: Model -> ViewModel -> View.

### P6. Natural Fit with Existing Hooks (Impact: HIGH)

React custom hooks **are** ViewModels. `useCheckoutValidation` already follows this pattern perfectly. Formalizing MVVM means extending an existing pattern, not introducing alien concepts.

### P7. Decouples Redux from Components (Impact: MEDIUM)

Currently, 10+ `useSelector` calls appear directly in `useProductsSearch.js`. A ViewModel would expose transformed data, hiding Redux implementation details from the View.

---

## Cons

### C1. Boilerplate Increase (Impact: MEDIUM)

Each page/feature would need: `ComponentView.tsx` + `useComponentViewModel.ts` + potentially `componentModel.ts`. For complex pages, this could nearly double file count.

**Estimated file count impact:**
- 5 pages -> 10 files (page + ViewModel)
- ~15 complex features -> 30 files
- 60+ simple components -> unchanged
- **Net increase: ~20 files**

### C2. Over-Engineering Simple Components (Impact: MEDIUM)

Components like `BaseProductCard.js` are purely presentational. Forcing a ViewModel on simple components adds unnecessary abstraction. Clear criteria needed for when MVVM applies.

**Rule of thumb:** Apply MVVM only when a component has:
- Business logic (not just rendering props)
- Side effects (API calls, Redux dispatch)
- Complex state management (3+ useState hooks with interdependencies)

### C3. Migration Disrupts Working Code (Impact: HIGH)

The filter system has 96/96 tests passing with 100% coverage. Refactoring `filtersSlice.js` into a formal Model layer risks breaking the URL sync middleware, selectors, and all consuming components.

**Mitigation:** Don't refactor working Redux code. MVVM applies at the component/hook level, not the Redux level.

### C4. Team Learning Curve (Impact: LOW-MEDIUM)

MVVM is more common in Angular, SwiftUI, and WPF. React developers may resist the pattern or implement it inconsistently. The community convention is hooks-based, not formal MVVM.

**Mitigation:** Frame it as "ViewModel hooks" rather than "MVVM pattern" - it's the same concept with React-native terminology.

### C5. Context + Redux + ViewModel Overlap (Impact: MEDIUM)

The codebase already has 3 state layers (Redux, Context, local state). Adding a formal ViewModel layer risks creating a 4th abstraction that doesn't clearly replace any existing one.

**Clarification:**
```
Redux     = Global shared state (filters, search)     -> stays
Context   = Domain-specific shared state (cart, auth)  -> stays
ViewModel = Component-specific orchestration           -> NEW (replaces inline logic)
Local     = Ephemeral UI state (modals, toggles)       -> stays (inside ViewModel)
```

### C6. Routing Integration Complexity (Impact: LOW)

`ProductList.js` parses URL params and dispatches to Redux (lines 93-116). In MVVM, the ViewModel would need access to routing, which can create tight coupling.

**Mitigation:** Pass route params to ViewModel as arguments rather than importing hooks directly.

### C7. Diminishing Returns for Hooks-First Code (Impact: MEDIUM)

React hooks already provide the core MVVM benefit (separating logic from rendering). Formalizing this into a strict pattern adds naming conventions and file structure overhead without fundamentally changing what hooks already achieve.

---

## Proposed MVVM Architecture

### Target Data Flow

```
┌────────────────────────────┐
│ View (Components/Pages)    │
│  - Pure rendering          │
│  - Calls ViewModel hook    │
│  - No direct Redux/Service │
└─────────┬──────────────────┘
          │ const vm = useXxxViewModel()
┌─────────▼──────────────────┐
│ ViewModel (Custom Hooks)   │
│  - Orchestrates state      │
│  - Calls Model layer       │
│  - Exposes transformed     │
│    data for the View       │
│  - Handles side effects    │
└─────────┬──────────────────┘
          │
┌─────────▼──────────────────┐
│ Model Layer                │
│  - Redux (global state)    │
│  - RTK Query (API cache)   │
│  - Services (API calls)    │
│  - Context (domain state)  │
└────────────────────────────┘
```

### File Organization

```
src/
├── components/
│   ├── Product/
│   │   ├── ProductList.tsx           # View - pure rendering
│   │   ├── useProductListViewModel.ts # ViewModel - orchestration
│   │   ├── ProductCard.tsx           # View (simple - no ViewModel needed)
│   │   └── FilterPanel.tsx           # View (delegates to ViewModel)
│   │
│   ├── Cart/
│   │   ├── CartPage.tsx              # View
│   │   ├── useCartViewModel.ts       # ViewModel
│   │   └── CartItemRow.tsx           # View (simple - no ViewModel needed)
│   │
│   └── Common/
│       └── BaseProductCard.tsx       # View only (no ViewModel)
│
├── pages/
│   ├── Home.tsx                      # View
│   ├── useHomeViewModel.ts           # ViewModel
│   ├── Cart.tsx                      # View
│   └── useCartPageViewModel.ts       # ViewModel
│
├── store/                            # Model (unchanged)
├── services/                         # Model (unchanged)
├── contexts/                         # Model (unchanged)
└── hooks/                            # Shared ViewModel utilities
```

### ViewModel Convention

```typescript
// Naming: use{ComponentName}ViewModel
// Returns: typed object with state + actions
// Rules: No JSX, no DOM references, pure logic

interface HomeViewModel {
  // State
  ruleResults: RuleResult[] | null;
  searchResults: SearchResult[];
  productCards: ProductCard[];
  isLoading: boolean;
  error: string | null;

  // Actions
  handleSearch: (query: string) => void;
  handleProductCategoryClick: (productType: string) => void;
  handleShowMatchingProducts: () => void;
  dismissMessage: (messageId: string) => void;
}

export const useHomeViewModel = (): HomeViewModel => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Internal state
  const [ruleResults, setRuleResults] = useState<RuleResult[] | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Side effects
  useEffect(() => {
    rulesEngineService.execute('home_page_mount', context)
      .then(setRuleResults);
  }, []);

  // Actions
  const handleProductCategoryClick = useCallback((productType: string) => {
    dispatch(navSelectProductGroup(productType));
    navigate('/products');
  }, [dispatch, navigate]);

  return {
    ruleResults,
    searchResults,
    productCards,
    isLoading,
    error,
    handleSearch,
    handleProductCategoryClick,
    handleShowMatchingProducts,
    dismissMessage,
  };
};
```

### When to Apply MVVM

| Component Type | MVVM? | Rationale |
|---------------|-------|-----------|
| Pages (Home, Cart, Checkout) | Yes | Complex logic, multiple side effects |
| Feature containers (ProductList, FilterPanel) | Yes | Redux orchestration, data transformation |
| Tutorial selection flow | Yes | Multi-step state machine |
| Presentational components (BaseProductCard) | No | Pure rendering, props only |
| Layout components (Footer, ErrorBoundary) | No | No business logic |
| Form components (DynamicAddressForm) | Maybe | Only if validation is complex |
| Admin CRUD pages | Maybe | Usually simple enough without |

---

## Migration Plan

### Phase 1: Establish Convention (Week 1)

1. Document ViewModel hook convention (naming, typing, rules)
2. Create template/snippet for ViewModel hooks
3. Convert `useCheckoutValidation` into the reference ViewModel (minimal changes - it already follows the pattern)
4. Write guidelines for "when to use a ViewModel"

### Phase 2: Page ViewModels (Weeks 2-3)

Extract ViewModels for the 5 page components:
1. `useHomeViewModel` - Extract from `Home.js`
2. `useCartPageViewModel` - Extract from `Cart.js`
3. `useCheckoutViewModel` - Extract from `CheckoutPage.js`
4. `useProfileViewModel` - Extract from `ProfilePage.js`
5. `useRegistrationViewModel` - Extract from `Registration.js`

### Phase 3: Complex Feature ViewModels (Weeks 4-6)

1. Refactor `useProductsSearch` into `useProductListViewModel` (split 5 concerns)
2. Extract `useFilterPanelViewModel` from `FilterPanel.js`
3. Extract `useTutorialSelectionViewModel` from tutorial components
4. Extract `useOrderHistoryViewModel` from `OrderHistory.js`

### Phase 4: Validate and Refine (Week 7)

1. Run full test suite - verify no regressions
2. Review ViewModel boundaries - are they too large? too small?
3. Document lessons learned
4. Update team coding guidelines

### Key Principles

- **Don't touch Redux** - it stays as the Model layer
- **Don't force ViewModel on simple components** - only where business logic exists
- **ViewModel = custom hook** - no new abstractions, just naming convention
- **Test ViewModels independently** - `renderHook()` without JSX rendering
- **Convert during feature work** - don't do a dedicated refactoring sprint

---

## Comparison with Alternatives

| Approach | Pros | Cons | Fit for Admin3 |
|----------|------|------|----------------|
| **MVVM (ViewModel hooks)** | Clean separation, testable, familiar | Boilerplate for simple components | Best for pages/features |
| **Container/Presenter** | Classic React pattern | Adds wrapper components | Redundant with hooks |
| **Feature-Based Modules** | Encapsulates features | Requires restructuring | Complementary to MVVM |
| **MVC** | Traditional, well-known | Controllers don't map to React | Poor fit |
| **Status Quo (hooks + components)** | No migration cost | Inconsistent patterns | OK but doesn't scale |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Pages with ViewModels | 100% (5/5) |
| Complex features with ViewModels | 80%+ |
| Average component LOC | < 150 (View), < 300 (ViewModel) |
| ViewModel test coverage | > 90% |
| Business logic in View files | 0 direct service/Redux calls |
| Developer satisfaction | Survey before/after |

---

## Combined Strategy: TypeScript + MVVM

The recommended approach is to combine both initiatives:

1. **Phase 1**: Add TypeScript incrementally (new files in TS, shared types first)
2. **Phase 2**: Extract ViewModels for pages during TS conversion (natural refactoring point)
3. **Phase 3**: Typed ViewModels with typed Models = full MVVM+TS architecture

This gets TypeScript benefits immediately while MVVM emerges naturally during the conversion process, avoiding a disruptive "big bang" refactor.

---

## References

- [MVVM in React with Hooks](https://blog.logrocket.com/mvvm-pattern-react/)
- [Custom Hooks as ViewModels](https://dev.to/enguerranws/custom-react-hooks-as-viewmodels-1j5p)
- [Redux Toolkit Best Practices](https://redux-toolkit.js.org/usage/usage-guide)
- [React Testing Library - Testing Hooks](https://testing-library.com/docs/react-testing-library/api#renderhook)
