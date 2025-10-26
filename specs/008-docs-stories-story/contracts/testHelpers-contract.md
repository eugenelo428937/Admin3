# Test Helpers Module Contract

**Module**: `frontend/react-Admin3/src/test-utils/testHelpers.js`
**Story**: 1.16 - Integration Testing
**Type**: Test Utility Functions
**Purpose**: Reusable helpers for rendering React components with Redux store and Router in integration tests

---

## Public API

### `renderWithProviders(ui, options)`

Renders a React component wrapped with Redux Provider and React Router for integration testing.

**Parameters**:
- `ui` (React.Element, required): Component to render (e.g., `<FilterPanel />`)
- `options` (object, optional): Configuration options
  - `preloadedState` (object): Initial Redux state (default: `{}`)
  - `store` (Store): Pre-configured Redux store (default: creates new store with `preloadedState`)
  - `route` (string): Initial browser URL (default: `'/'`)
  - `history` (History): Custom history object (default: creates MemoryHistory with `route`)
  - `...renderOptions`: Additional React Testing Library render options

**Returns**: `RenderResult & { store: Store }`
- All React Testing Library render utilities (`getByText`, `findByRole`, etc.)
- `store`: Redux store instance for assertions

**Example**:
```javascript
const { store, getByRole, findByText } = renderWithProviders(
  <FilterPanel />,
  {
    preloadedState: {
      filters: { subjects: ['CM2'], categories: [] }
    },
    route: '/products?subject_code=CM2'
  }
);

// Assert component renders with correct state
expect(getByRole('checkbox', { name: /CM2/ })).toBeChecked();

// Assert Redux state
expect(store.getState().filters.subjects).toEqual(['CM2']);
```

**Side Effects**:
- Creates Provider wrapper with Redux store
- Creates Router wrapper with history
- Renders component into DOM
- Initializes Redux middleware (including urlSyncMiddleware)

---

### `createMockStore(options)`

Creates a mock Redux store for testing with pre-configured state and middleware.

**Parameters**:
- `options` (object, optional): Store configuration
  - `preloadedState` (object): Initial Redux state (default: empty filters state)
  - `middleware` (array): Custom middleware to include (default: `[urlSyncMiddleware]`)
  - `reducer` (function): Root reducer (default: actual production reducer)

**Returns**: `Store` - Configured Redux store instance

**Example**:
```javascript
const store = createMockStore({
  preloadedState: {
    filters: {
      subjects: ['CM2', 'SA1'],
      categories: ['Bundle'],
      product_types: [],
      products: [],
      modes_of_delivery: [],
      searchQuery: '',
      currentPage: 1,
      pageSize: 20
    }
  }
});

// Use in tests
store.dispatch(setSubjects(['FM1']));
expect(store.getState().filters.subjects).toEqual(['FM1']);
```

**Side Effects**:
- Configures store with middleware
- Initializes Redux DevTools (development only)
- Registers all reducers

---

### `waitForStateUpdate(store, predicate, options)`

Waits for Redux state to match a condition.

**Parameters**:
- `store` (Store, required): Redux store to monitor
- `predicate` (function, required): Function that receives `state` and returns `boolean`
  - Returns `true` when desired state is reached
  - Called on every state update
- `options` (object, optional): Configuration
  - `timeout` (number): Max wait time in ms (default: 1000ms)
  - `interval` (number): Check interval in ms (default: 50ms)

**Returns**: `Promise<void>`
- Resolves when predicate returns `true`
- Rejects if timeout exceeded

**Example**:
```javascript
// Dispatch async action
store.dispatch(setSubjects(['CM2']));

// Wait for URL sync middleware to complete
await waitForStateUpdate(
  store,
  (state) => window.location.search.includes('subject_code=CM2'),
  { timeout: 1000 }
);

// Assert state updated
expect(store.getState().filters.subjects).toEqual(['CM2']);
```

**Throws**:
- `Error` with message "Timeout waiting for state update" if timeout exceeded

---

### `simulateUrlChange(url, options)`

Simulates browser URL change for testing URL parsing logic.

**Parameters**:
- `url` (string, required): New URL to navigate to (e.g., `/products?subject_code=CM2`)
- `options` (object, optional): Navigation options
  - `method` (string): Navigation method - 'push' | 'replace' (default: 'push')
  - `state` (object): History state object (default: `null`)

**Returns**: `void`

**Side Effects**:
- Updates `window.location` (in test environment)
- Triggers `popstate` event if using 'push'
- Updates browser history

**Example**:
```javascript
// Simulate user entering URL directly
simulateUrlChange('/products?subject_code=CM2&category=Bundle');

// Component should parse URL and dispatch Redux actions
await waitFor(() => {
  expect(store.getState().filters.subjects).toEqual(['CM2']);
  expect(store.getState().filters.categories).toEqual(['Bundle']);
});
```

---

### `mockProductsApi(options)`

Configures MSW handlers for mocking product API endpoints.

**Parameters**:
- `options` (object, optional): API mock configuration
  - `products` (array): Mock product data to return (default: `mockProducts` from `mockData.js`)
  - `subjects` (array): Mock subject data (default: `mockSubjects`)
  - `categories` (array): Mock category data (default: `mockCategories`)
  - `delay` (number): Simulated network delay in ms (default: 0)
  - `errorRate` (number, 0-1): Fraction of requests that fail (default: 0)

**Returns**: `void`

**Side Effects**:
- Registers MSW handlers for `/api/products/`, `/api/subjects/`, `/api/categories/`
- Handlers intercept fetch/XHR requests
- Returns filtered mock data based on query parameters

**Example**:
```javascript
import { mockProducts } from './mockData';

// Setup before tests
beforeEach(() => {
  mockProductsApi({
    products: mockProducts,
    delay: 100 // Simulate 100ms network delay
  });
});

// Test API integration
const { findByText } = renderWithProviders(<ProductList />);
store.dispatch(setSubjects(['CM2']));

// API call intercepted by MSW, returns filtered mockProducts
await findByText('CM2 Core Study Material');
```

---

### `createMockHistory(initialEntries, initialIndex)`

Creates a mock history object for Router testing.

**Parameters**:
- `initialEntries` (array, optional): Initial history stack (default: `['/']`)
- `initialIndex` (number, optional): Current history index (default: 0)

**Returns**: `History` - MemoryHistory instance

**Example**:
```javascript
const history = createMockHistory(
  ['/products', '/products?subject_code=CM2'],
  1 // Start at second entry
);

const { getByRole } = renderWithProviders(
  <FilterPanel />,
  { history }
);

// Can programmatically navigate in tests
history.goBack();
await waitFor(() => expect(history.location.pathname).toBe('/products'));
```

---

### `flushPromises()`

Flushes all pending Promises in the microtask queue.

**Parameters**: None

**Returns**: `Promise<void>` - Resolves after all pending Promises

**Example**:
```javascript
// Dispatch async Redux action
store.dispatch(fetchProducts());

// Wait for all pending Promises to resolve
await flushPromises();

// Assert async state updates completed
expect(store.getState().filters.isLoading).toBe(false);
```

---

## Configuration

### Default Mock Data

```javascript
// Exported from mockData.js
export const mockSubjects = [
  { code: 'CM2', name: 'CM2 Financial Engineering and Loss Reserving' },
  { code: 'SA1', name: 'SA1 Health and Care Principles' }
];

export const mockProducts = [
  {
    id: 1,
    subject_code: 'CM2',
    name: 'CM2 Core Study Material',
    category: 'BUNDLE',
    product_type: 'CORE_MATERIAL',
    mode_of_delivery: 'EBOOK',
    price: 45.00,
    available: true
  }
];
```

### MSW Handlers

```javascript
// Registered by mockProductsApi()
http.get('/api/products/', ({ request }) => {
  const url = new URL(request.url);
  const subjects = url.searchParams.getAll('subject_code');
  const categories = url.searchParams.getAll('category');

  let filtered = mockProducts;
  if (subjects.length > 0) {
    filtered = filtered.filter(p => subjects.includes(p.subject_code));
  }
  if (categories.length > 0) {
    filtered = filtered.filter(p => categories.includes(p.category));
  }

  return HttpResponse.json({ results: filtered });
});
```

---

## Usage Examples

### Complete Integration Test

```javascript
import { renderWithProviders, waitForStateUpdate, mockProductsApi } from './test-utils/testHelpers';
import { mockProducts } from './test-utils/mockData';
import FilterPanel from './FilterPanel';

describe('FilterPanel Integration', () => {
  beforeEach(() => {
    mockProductsApi({ products: mockProducts });
  });

  it('applies subject filter and updates URL', async () => {
    const { store, getByRole } = renderWithProviders(<FilterPanel />);

    // User selects CM2 filter
    const cm2Checkbox = getByRole('checkbox', { name: /CM2/ });
    await userEvent.click(cm2Checkbox);

    // Wait for Redux and URL sync
    await waitForStateUpdate(
      store,
      (state) => state.filters.subjects.includes('CM2')
    );

    // Assert Redux state
    expect(store.getState().filters.subjects).toEqual(['CM2']);

    // Assert URL updated
    expect(window.location.search).toContain('subject_code=CM2');

    // Assert API called with correct params
    await waitFor(() => {
      expect(screen.getByText('CM2 Core Study Material')).toBeInTheDocument();
    });
  });
});
```

---

## Testing Contract

### Unit Tests Required

1. `renderWithProviders()` wraps component with Provider and Router
2. `renderWithProviders()` creates store with preloadedState
3. `renderWithProviders()` sets initial route correctly
4. `createMockStore()` creates store with correct middleware
5. `waitForStateUpdate()` resolves when predicate returns true
6. `waitForStateUpdate()` rejects on timeout
7. `simulateUrlChange()` updates window.location
8. `mockProductsApi()` registers MSW handlers
9. `mockProductsApi()` filters products by query params
10. `flushPromises()` resolves after microtask queue empty

### Performance Requirements

- `renderWithProviders()`: < 50ms (component render time)
- `waitForStateUpdate()`: < 100ms (typical state update)
- `mockProductsApi()`: < 1ms (handler registration)

---

## Error Handling

### Missing Required Parameters

```javascript
if (!ui) {
  throw new Error('testHelpers.renderWithProviders: ui component is required');
}

if (!store || !predicate) {
  throw new Error('testHelpers.waitForStateUpdate: store and predicate are required');
}
```

### Timeout Handling

```javascript
// waitForStateUpdate timeout
const timeoutError = new Error(
  `Timeout waiting for state update after ${timeout}ms`
);
timeoutError.lastState = store.getState();
throw timeoutError;
```

---

**Contract Version**: 1.0
**Status**: ✅ Ready for TDD implementation
