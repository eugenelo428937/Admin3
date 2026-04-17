# Vercel React Best Practices Audit Report

**Date**: 2026-02-13
**Scope**: `frontend/react-Admin3/src/`
**Rules Reference**: Vercel Engineering React Best Practices v1.0.0 (57 rules, 8 categories)

---

## Executive Summary

Audited **100+ source files** across 8 Vercel rule categories. Found **38 actionable findings** with an estimated **150-250KB bundle savings** and measurable runtime improvements.

| Priority | Category | Findings | Est. Impact |
|----------|----------|----------|-------------|
| CRITICAL | Eliminating Waterfalls | 4 | Login + checkout latency |
| CRITICAL | Bundle Size | 9 | 150-250KB savings |
| MEDIUM-HIGH | Client-Side Data Fetching | 6 | Scroll perf, storage hygiene |
| MEDIUM | Re-render Optimization | 12 | Fewer wasted renders |
| MEDIUM | Rendering Performance | 3 | Faster paint cycles |
| LOW-MEDIUM | JavaScript Performance | 7 | O(n) reduced iterations |

---

## 1. Eliminating Waterfalls (CRITICAL)

**Vercel rules**: `async-parallel`, `async-defer-await`, `async-suspense-boundaries`

Waterfalls are the #1 performance killer. Each sequential await adds full network latency.

### W-1: Sequential validation calls in checkout

**File**: `src/services/acknowledgmentService.js` lines 205-209

```js
const validation = await this.validateComprehensiveCheckout(context);
const missing = await this.getMissingAcknowledgments(context);  // independent!
```

**Problem**: Both calls accept the same context and don't depend on each other's results. This doubles checkout validation latency.

**Fix**:
```js
const [validation, missing] = await Promise.all([
  this.validateComprehensiveCheckout(context),
  this.getMissingAcknowledgments(context)
]);
```

### W-2: Sequential CSRF + login

**File**: `src/services/authService.js` lines 20-27

```js
await httpService.get(`${API_AUTH_URL}/csrf/`);
const response = await httpService.post(`${API_AUTH_URL}/login/`, {
  username: credentials.email,
  password: credentials.password
});
```

**Problem**: CSRF token fetch and login request are independent. Sequential execution adds unnecessary latency to the login flow.

**Fix**:
```js
const [, response] = await Promise.all([
  httpService.get(`${API_AUTH_URL}/csrf/`),
  httpService.post(`${API_AUTH_URL}/login/`, {
    username: credentials.email,
    password: credentials.password
  })
]);
```

### W-3: Sequential cart add + refresh

**File**: `src/contexts/CartContext.js` lines 54-58

```js
const res = await cartService.addVoucherToCart(voucherId, quantity);
await refreshCart();  // sequential refresh
```

**Problem**: Consider returning updated cart data from the add API to avoid a second round-trip.

### W-4: Post-checkout cleanup

**File**: `src/components/Ordering/CheckoutPage.js` lines 37-39

```js
removeAllChoices();
await clearCart();
```

**Severity**: LOW - sync + async sequential. Minor latency.

---

## 2. Bundle Size Optimization (CRITICAL)

**Vercel rules**: `bundle-barrel-imports`, `bundle-dynamic-imports`, `bundle-defer-third-party`, `bundle-conditional`

### B-1: Barrel imports from @mui/material (100+ files)

The **single largest optimization opportunity**. Every component file imports from the `@mui/material` barrel, which prevents tree-shaking.

| File | Items from barrel |
|------|:-:|
| `src/components/Product/ProductCard/Tutorial/TutorialProductCard.js` lines 3-36 | **33** |
| `src/components/User/UserFormWizard.js` lines 2-28 | **26** |
| `src/components/Product/FilterPanel.js` lines 29-50 | **21** |
| `src/components/Ordering/CheckoutSteps/TermsConditionsStep.js` lines 2-12 | 10 |
| `src/components/Product/ProductList.js` lines 12-21 | 8 |
| `src/components/Navigation/TopNavBar.js` line 16 | 7 |
| `src/components/Navigation/MainNavBar.js` lines 5-12 | 7 |

**Fix**: Convert to direct imports:
```js
// Before (barrel import)
import { Box, Card, CardContent } from '@mui/material';

// After (direct imports)
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
```

### B-2: @mui/icons-material barrel imports (15+ files)

Same anti-pattern as B-1 but for icons.

**Files**: `TopNavBar.js` lines 5-11, `UserFormWizard.js` line 29, `TutorialProductCard.js` lines 37-45, `Home.js` lines 13-19.

**Fix**: `import HomeIcon from '@mui/icons-material/Home'`

### B-3: 10 admin routes statically imported

**File**: `src/App.js` lines 22-31

All admin components (ExamSessionList, ExamSessionForm, SubjectList, SubjectForm, SubjectDetail, SubjectImport, ProductList, ProductDetail, ProductForm, ProductImport) are statically imported. Most users never access admin routes.

**Fix**:
```js
const AdminExamSessionList = React.lazy(() =>
  import('./components/admin/exam-sessions/ExamSessionList')
);
// Wrap routes in <Suspense fallback={<CircularProgress />}>
```

**Estimated savings**: 30-50KB

### B-4: Modals always bundled

**File**: `src/components/Navigation/MainNavBar.js` lines 15-22

SearchModal, AuthModal, and CartPanel are statically imported but only rendered when user clicks.

**Fix**: Lazy-load all three with `React.lazy()`.

**Estimated savings**: 20-30KB

### B-5: 7 Three.js background effects always bundled

**File**: `src/pages/Home.js` lines 20-26

StripeWaveBackground, AuroraBorealisBackground, OceanDepthBackground, NeonMeshBackground, SunsetSilkBackground, IrisDawnBackground, CopperRoseBackground are all statically imported. Only one renders at a time. The underlying `stripeMeshGradient.js` imports all of THREE.js.

**Fix**: Dynamic import the selected background only.

**Estimated savings**: 30-50KB

### B-6: Duplicate UI framework (Chakra UI)

**File**: `src/App.js` line 8

ChakraProvider imported alongside Material-UI. Only used in 2 niche files (MarkingVoucherProductCard).

**Fix**: Consolidate to MUI only.

**Estimated savings**: ~40KB

### B-7: Moment.js (~67KB)

Used in 3 files: ExamSessionForm.js, ExamSessionList.js, TutorialDetailCard.js.

**Fix**: Replace with `dayjs` (~2KB) or `date-fns` (~13KB).

**Estimated savings**: 54-65KB

### B-8: StyleGuide routes in production

**File**: `src/App.js` lines 41-42

Development-only routes (`/styleguide`, `/theme-visualizer`) bundled unconditionally.

**Fix**: Conditionally import in development only, or lazy-load.

### B-9: Sentry eagerly imported

**File**: `src/services/errorTrackingService.js` line 2

`import * as Sentry from "@sentry/react"` loaded eagerly even if unused.

**Fix**: Dynamic import in production only:
```js
if (process.env.NODE_ENV === 'production') {
  import('@sentry/react').then(({ init }) => init({ /* config */ }));
}
```

---

## 3. Client-Side Data Fetching (MEDIUM-HIGH)

**Vercel rules**: `client-event-listeners`, `client-passive-event-listeners`, `client-localstorage-schema`

### C-1: Missing passive flag on resize listener

**File**: `src/components/Effects/stripeMeshGradient.js` line 512

```js
window.addEventListener("resize", handleResize);
```

**Fix**: `window.addEventListener("resize", handleResize, { passive: true })`

### C-2: Event listener re-registration on state change

**File**: `src/components/Navigation/MainNavBar.js` lines 57-73

Keyboard listener depends on `showSearchModal` state, causing it to be re-registered every time the modal toggles.

**Fix**: Use a ref for `showSearchModal` inside the handler:
```js
const showSearchModalRef = useRef(showSearchModal);
useEffect(() => { showSearchModalRef.current = showSearchModal; }, [showSearchModal]);

useEffect(() => {
  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "k") {
      event.preventDefault();
      if (!showSearchModalRef.current) setShowSearchModal(true);
    }
  };
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, []); // stable - no re-registration
```

### C-3: Same pattern in TopNavBar

**File**: `src/components/Navigation/TopNavBar.js` lines 59-75

Custom event listener re-registers on every `isAuthenticated` change.

### C-4: SearchModal escape handler

**File**: `src/components/Navigation/SearchModal.js` lines 53-66

`handleCloseSearchModal` in dependency list causes excessive re-registration.

### C-5: localStorage without schema versioning

**Files**: `src/services/httpService.js`, `src/hooks/useAuth.js`

Multiple scattered `localStorage.getItem/setItem/removeItem` calls with no versioning or migration strategy. Auth tokens stored without structured schema.

**Recommendation**: Create a `StorageManager` utility with schema versioning:
```js
const STORAGE_VERSION = 1;
const storageManager = {
  get(key) { /* check version, migrate if needed */ },
  set(key, value) { /* store with version */ },
  clear() { /* structured cleanup */ }
};
```

### C-6: Cookie cleanup on every app load

**File**: `src/App.js` lines 74-82

Synchronous `document.cookie` parsing in useEffect on every mount. Should be a one-time migration with a flag.

---

## 4. Re-render Optimization (MEDIUM)

**Vercel rules**: `rerender-lazy-state-init`, `rerender-derived-state-no-effect`, `rerender-memo-with-default-value`, `rerender-functional-setstate`, `rerender-dependencies`, `rerender-defer-reads`

### R-1: Lazy state initialization anti-pattern

**File**: `src/contexts/TutorialChoiceContext.js` lines 10-33

```js
const [tutorialChoices, setTutorialChoices] = useState(initialChoices || {});
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) setTutorialChoices(JSON.parse(saved));  // extra render!
}, []);
```

**Problem**: Causes an unnecessary extra render cycle on mount.

**Fix**:
```js
const [tutorialChoices, setTutorialChoices] = useState(() => {
  if (initialChoices) return initialChoices;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
});
```

### R-2: Custom deep equality in selectors

**File**: `src/components/Product/FilterPanel.js` lines 72-89

Inline `deepEqual` function for Redux selector comparison runs on every render.

**Fix**: Use `createSelector` from Redux Toolkit for memoized selectors.

### R-3: Object.entries() in render path

**File**: `src/components/Product/FilterPanel.js` lines 313-326

```js
{Object.entries(options).map(([value, filterData]) => {
  const isChecked = activeValues.includes(value);  // O(n) per entry
  // ...
})}
```

**Fix**: Memoize with `useMemo`; use `Set` for `activeValues` lookup (O(1)).

### R-4: Inline object props to child components

**File**: `src/components/Navigation/NavigationMenu.js` lines 72-79

```js
<MegaMenuPopover
  buttonProps={{ sx: { mx: { xl: 2 } } }}  // new object every render
>
```

**Fix**: Hoist to module-level constant:
```js
const MEGA_MENU_BUTTON_PROPS = { sx: { mx: { xl: 2 } } };
```

### R-5: useMemo wrapping a function (should be useCallback)

**File**: `src/components/Ordering/CartPanel.js` lines 88-94

```js
const getItemPriceDisplay = useMemo(() => {
  return (item) => { /* ... */ };
}, []);
```

**Fix**: Use `useCallback` directly.

### R-6: Same pattern in MaterialProductCard

**File**: `src/components/Product/ProductCard/MaterialProductCard.js` lines 143-150

`getPrice` uses `useMemo` to return a function. Same fix as R-5.

### R-7: useEffect with state dependency that it sets

**File**: `src/components/Navigation/MainNavBar.js` lines 57-73

`showSearchModal` in deps while `setShowSearchModal` is called inside handler. Creates unnecessary re-registration cycle. (See C-2 for fix.)

### R-8: Derived state in useEffect (SearchBox)

**File**: `src/components/SearchBox.js` lines 38-44

Has `eslint-disable-next-line react-hooks/exhaustive-deps` - indicates a conscious but incorrect pattern. Should derive during render or use proper dependencies.

### R-9: .sort() mutation

**File**: `src/hooks/useProductCardHelpers.js` lines 21-23

```js
return allStoreProductIds.sort().join(',');  // mutates array!
```

**Fix**: `[...allStoreProductIds].sort().join(',')` or use `toSorted()`.

### R-10, R-11, R-12: Stale closure risks in CartContext

**File**: `src/contexts/CartContext.js` lines 29-44

Multiple `setState` calls without functional form. Risk of stale closures in async callbacks.

**Fix**: Use `setState(prev => ...)` pattern.

---

## 5. Rendering Performance (MEDIUM)

**Vercel rules**: `rendering-hoist-jsx`, `rendering-content-visibility`, `rendering-conditional-render`

### P-1: Components defined inside render function

**File**: `src/components/Navigation/MobileNavigation.js` lines 72-169

`MobileNavHeader`, `MainPanel`, `SubjectsPanel`, `ProductGroupsPanel`, `ProductsPanel` are all defined as arrow functions inside the parent component. They get recreated on every render.

**Fix**: Extract to module-level components:
```js
// Before (inside MobileNavigation)
const MobileNavHeader = ({ title }) => <Box>...</Box>;

// After (module-level)
const MobileNavHeader = React.memo(({ title }) => <Box>...</Box>);
```

### P-2: Missing content-visibility for long lists

**Files**: ProductGrid, FilterPanel option lists

No `content-visibility: auto` CSS optimization for long scrollable content.

**Fix**: Add to CSS for list containers:
```css
.product-card {
  content-visibility: auto;
  contain-intrinsic-size: 0 300px;
}
```

### P-3: Duplicate @mui/material imports in same file

**File**: `src/pages/Home.js` lines 2, 7

Two separate import statements from same `@mui/material` barrel. Code quality issue - should consolidate.

---

## 6. JavaScript Performance (LOW-MEDIUM)

**Vercel rules**: `js-combine-iterations`, `js-set-map-lookups`, `js-cache-property-access`, `js-hoist-regexp`, `js-min-max-loop`, `js-tosorted-immutable`

### J-1: Multiple array iterations for classification

**File**: `src/utils/rulesEngineUtils.js` lines 42-66

6 filter passes + 4 `.some()` calls to classify messages into categories.

**Fix**: Single `reduce()` pass:
```js
const result = messages.reduce((acc, msg) => {
  const isAck = isAcknowledgmentMessage(msg);
  const displayType = msg.display_type || 'modal';
  if (isAck) {
    acc.acknowledgments.all.push(msg);
    displayType === 'inline'
      ? acc.acknowledgments.inline.push(msg)
      : acc.acknowledgments.modal.push(msg);
  } else {
    acc.displays.all.push(msg);
    displayType !== 'modal'
      ? acc.displays.inline.push(msg)
      : acc.displays.modal.push(msg);
  }
  return acc;
}, { /* initial shape */ });
```

### J-2: Multiple .some() for summary statistics

**File**: `src/utils/rulesEngineUtils.js` lines 915-930

3x `.some()` + `.map()` + `.filter()` on same `processedMessages` array.

**Fix**: Single `reduce()` pass to compute all summary stats.

### J-3: Chained .map().filter()

**File**: `src/utils/rulesEngineUtils.js` lines 564-565

```js
types: [...new Set(products.map(p => p.product_type).filter(Boolean))],
subjects: [...new Set(products.map(p => p.subject).filter(Boolean))],
```

**Fix**: Filter first to reduce map iterations:
```js
types: [...new Set(products.filter(p => p.product_type).map(p => p.product_type))],
```

### J-4: Uncached property access in loops

**File**: `src/utils/filterUrlManager.js` lines 92-118, 194-224, 277-300, 335-353

`config.urlParam`, `config.dataType`, `config.urlFormat` accessed 4+ times per iteration without destructuring.

**Fix**: Destructure at loop start:
```js
registeredFilters.forEach((config) => {
  const { type, dataType, urlParam, urlFormat, urlParamAliases } = config;
  // use destructured variables...
});
```

### J-5: Unnecessary .sort() in cache key

**File**: `src/store/api/catalogApi.js` lines 106-115

Object keys sorted O(n log n) for RTK Query cache tag generation on every API call.

**Fix**: Remove `.sort()` - JS object key iteration order is deterministic in modern engines.

### J-6: .sort() for stable comparison

**File**: `src/hooks/useProductCardHelpers.js` line 22

O(n log n) sort used just to create a string for comparison.

**Fix**: Remove sort if order doesn't matter, or use `toSorted()` if needed.

### J-7: .indexOf() in toggle operations

**File**: `src/store/slices/baseFilters.slice.js` lines 127-179

5 toggle functions use `.indexOf()` (O(n) lookup). Acceptable for small filter arrays but worth noting.

---

## Recommended Action Plan

### Phase 1: Quick Wins (High ROI, Low Effort)

| # | Action | File(s) | Savings |
|---|--------|---------|---------|
| 1 | Lazy-load admin routes | App.js | ~30-50KB |
| 2 | Lazy-load modals | MainNavBar.js | ~20-30KB |
| 3 | Parallelize checkout validation (W-1) | acknowledgmentService.js | Latency reduction |
| 4 | Fix lazy state init (R-1) | TutorialChoiceContext.js | 1 fewer render |
| 5 | Extract MobileNavigation sub-components (P-1) | MobileNavigation.js | Fewer allocations |

### Phase 2: Systematic Barrel Import Migration (Highest Bundle Impact)

| # | Action | Savings |
|---|--------|---------|
| 6 | Convert @mui/material barrel imports (top 20 files) | ~50-100KB |
| 7 | Convert @mui/icons-material barrel imports | ~10-20KB |

### Phase 3: Data Fetching & Library Optimization

| # | Action | Savings |
|---|--------|---------|
| 8 | Parallelize auth flow (W-2) | Latency reduction |
| 9 | Fix event listener dependencies (C-2, C-3, C-4) | Fewer GC cycles |
| 10 | Replace Moment.js with dayjs | ~65KB |
| 11 | Remove Chakra UI | ~40KB |

### Phase 4: Micro-Optimizations

| # | Action | Impact |
|---|--------|--------|
| 12 | Combine array iterations in rulesEngineUtils (J-1, J-2, J-3) | O(n) vs O(6n) |
| 13 | Add content-visibility CSS for long lists (P-2) | Paint performance |
| 14 | Destructure loop variables in filterUrlManager (J-4) | Minor runtime |
| 15 | Fix .sort() mutations (R-9, J-6) | Correctness |

---

## Totals

- **Estimated bundle reduction**: 150-250KB
- **Estimated checkout latency improvement**: 200-500ms
- **Re-render savings**: 10-15 unnecessary render cycles eliminated
