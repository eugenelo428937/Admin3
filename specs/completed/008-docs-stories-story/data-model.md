# Data Model: Performance Monitoring & Integration Testing Infrastructure

**Feature**: Stories 1.15 + 1.16
**Date**: 2025-10-25
**Status**: Complete

---

## Story 1.15: Performance Monitoring Entities

### PerformanceMetric

Represents a single performance measurement for a filter operation.

**Fields**:
- `name` (string, required): Operation identifier (e.g., "redux.setSubjects", "urlSync", "api.products")
- `duration` (number, required): Measured duration in milliseconds
- `timestamp` (number, required): When measurement was taken (performance.now())
- `budget` (number, optional): Performance budget threshold for this operation type
- `exceeded` (boolean, required): Whether measurement exceeded the budget
- `metadata` (object, optional): Additional context (action payload size, filter count, etc.)

**Example**:
```javascript
{
  name: 'redux.setSubjects',
  duration: 2.4,
  timestamp: 1234567890.123,
  budget: 16,
  exceeded: false,
  metadata: {
    actionType: 'filters/setSubjects',
    payloadSize: 2,
    filterCount: 2
  }
}
```

**Validation Rules**:
- `duration` must be >= 0
- `timestamp` must be positive number
- `budget` must be > 0 if provided
- `exceeded` = (duration > budget)

---

### PerformanceBudget

Configuration object defining performance thresholds for different operation types.

**Fields**:
- `REDUX_ACTION` (number, 16): Max duration for Redux action dispatch + reducer (60 FPS = 16ms)
- `URL_SYNC` (number, 5): Max duration for URL synchronization operations
- `API_CALL` (number, 1000): Max duration for API calls (perceived instant feedback)
- `VALIDATION` (number, 10): Max duration for filter validation
- `REGISTRY_LOOKUP` (number, 1): Max duration for FilterRegistry lookups

**Example**:
```javascript
export const PERFORMANCE_BUDGETS = {
  REDUX_ACTION: 16,
  URL_SYNC: 5,
  API_CALL: 1000,
  VALIDATION: 10,
  REGISTRY_LOOKUP: 1
};
```

**Validation Rules**:
- All budgets must be positive numbers
- Budgets are in milliseconds
- Can be overridden per environment via environment variables

---

### PerformanceMonitoringConfig

Configuration for performance monitoring behavior.

**Fields**:
- `enabled` (boolean): Whether monitoring is enabled (default: NODE_ENV === 'development')
- `level` (string enum): Monitoring verbosity - 'off' | 'minimal' | 'standard' | 'verbose'
- `consoleLogging` (boolean): Log metrics to console
- `devToolsIntegration` (boolean): Send metrics to Redux DevTools
- `budgets` (PerformanceBudget): Performance budget configuration
- `sampleRate` (number, 0-1): Fraction of operations to measure (default: 1.0 in dev)

**Example**:
```javascript
{
  enabled: process.env.NODE_ENV === 'development',
  level: 'standard',
  consoleLogging: true,
  devToolsIntegration: true,
  budgets: PERFORMANCE_BUDGETS,
  sampleRate: 1.0
}
```

**Validation Rules**:
- `level` must be one of: 'off', 'minimal', 'standard', 'verbose'
- `sampleRate` must be between 0.0 and 1.0
- If `enabled = false`, all monitoring operations are no-ops

---

### PerformanceReport

Aggregated performance metrics for analysis.

**Fields**:
- `operation` (string, required): Operation name
- `count` (number, required): Number of measurements
- `min` (number, required): Minimum duration
- `max` (number, required): Maximum duration
- `avg` (number, required): Average duration
- `p50` (number, required): 50th percentile (median)
- `p95` (number, required): 95th percentile
- `p99` (number, required): 99th percentile
- `exceededCount` (number, required): How many measurements exceeded budget
- `budget` (number, optional): Performance budget for this operation

**Example**:
```javascript
{
  operation: 'redux.setSubjects',
  count: 50,
  min: 1.2,
  max: 8.5,
  avg: 3.4,
  p50: 3.1,
  p95: 6.8,
  p99: 8.2,
  exceededCount: 0,
  budget: 16
}
```

**Calculations**:
- `avg` = sum(durations) / count
- `p50`, `p95`, `p99` = calculated from sorted durations array
- `exceededCount` = count(duration > budget)

---

## Story 1.16: Integration Testing Entities

### MockReduxStore

Configuration for creating mock Redux stores in tests.

**Fields**:
- `preloadedState` (object, required): Initial Redux state
- `middleware` (array, optional): Custom middleware to include (default: includes urlSync, RTK Query)
- `reducer` (function, required): Root reducer (typically from store/index.js)

**Example**:
```javascript
{
  preloadedState: {
    filters: {
      subjects: ['CM2'],
      categories: [],
      product_types: [],
      products: [],
      modes_of_delivery: [],
      searchQuery: '',
      currentPage: 1,
      pageSize: 20
    }
  },
  middleware: [urlSyncMiddleware],
  reducer: rootReducer
}
```

**Usage**:
```javascript
const store = createMockStore({
  preloadedState: { filters: { subjects: ['CM2'] } }
});
```

---

### MSWHandler

Mock Service Worker request handler configuration.

**Fields**:
- `method` (string enum, required): HTTP method - 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
- `path` (string, required): URL path pattern (e.g., '/api/products/')
- `response` (function, required): Function returning mock response data
- `statusCode` (number, optional): HTTP status code (default: 200)
- `delay` (number, optional): Simulated network delay in ms

**Example**:
```javascript
{
  method: 'GET',
  path: '/api/products/',
  response: ({ request }) => {
    const url = new URL(request.url);
    const subjects = url.searchParams.getAll('subject_code');

    return HttpResponse.json({
      results: mockProducts.filter(p =>
        subjects.length === 0 || subjects.includes(p.subject_code)
      )
    });
  },
  statusCode: 200,
  delay: 0
}
```

**Validation Rules**:
- `method` must be valid HTTP method
- `path` must start with '/'
- `statusCode` must be between 100-599
- `delay` must be >= 0

---

### TestRenderOptions

Configuration for rendering React components in tests.

**Fields**:
- `preloadedState` (object, optional): Initial Redux state
- `store` (MockReduxStore, optional): Pre-configured Redux store
- `route` (string, optional): Initial browser route (default: '/')
- `history` (object, optional): Custom history object
- `wrapper` (React.Component, optional): Additional wrapper components

**Example**:
```javascript
{
  preloadedState: {
    filters: { subjects: ['CM2'] }
  },
  route: '/products?subject_code=CM2',
  wrapper: ({ children }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  )
}
```

**Usage**:
```javascript
const { store, ...renderResult } = renderWithProviders(
  <FilterPanel />,
  {
    preloadedState: { filters: { subjects: ['CM2'] } },
    route: '/products'
  }
);
```

---

### MockProductData

Standardized mock product data structure for tests.

**Fields**:
- `id` (number, required): Product ID
- `subject_code` (string, required): Subject code (e.g., 'CM2')
- `name` (string, required): Product name
- `category` (string, required): Category code ('BUNDLE', 'MATERIAL', etc.)
- `product_type` (string, optional): Product type code
- `mode_of_delivery` (string, optional): Delivery mode ('EBOOK', 'PRINTED', etc.)
- `price` (number, required): Product price
- `available` (boolean, required): Whether product is available for purchase

**Example**:
```javascript
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
```

**Validation Rules**:
- `id` must be positive integer
- `subject_code` must match existing subject codes
- `price` must be >= 0
- `category` must be valid category code

---

### TestScenario

Represents an integration test scenario with Given-When-Then structure.

**Fields**:
- `name` (string, required): Test scenario name
- `given` (object, required): Initial state setup
  - `filters` (object): Initial filter state
  - `url` (string): Initial URL
  - `apiResponses` (array): Mock API responses
- `when` (object, required): User actions
  - `action` (string): Action type ('click', 'type', 'navigate')
  - `target` (string): Element selector or navigation path
  - `value` (any): Action value (text input, filter selection, etc.)
- `then` (object, required): Expected outcomes
  - `reduxState` (object): Expected Redux state
  - `url` (string): Expected URL
  - `apiCalls` (array): Expected API calls made
  - `ui` (object): Expected UI state (visible elements, text content)

**Example**:
```javascript
{
  name: 'Apply subject filter updates Redux and URL',
  given: {
    filters: { subjects: [], categories: [] },
    url: '/products',
    apiResponses: [{ endpoint: '/api/subjects/', data: mockSubjects }]
  },
  when: {
    action: 'click',
    target: 'input[value="CM2"]',
    value: null
  },
  then: {
    reduxState: { filters: { subjects: ['CM2'] } },
    url: '/products?subject_code=CM2',
    apiCalls: [{ endpoint: '/api/products/', params: { subject_code: ['CM2'] } }],
    ui: { activeFilters: ['CM2 Financial Engineering and Loss Reserving'] }
  }
}
```

---

## Entity Relationships

### Performance Monitoring Relationships

```
PerformanceMonitoringConfig
    ├─contains─> PerformanceBudget
    └─configures─> PerformanceTracker

PerformanceTracker
    ├─creates─> PerformanceMetric (many)
    └─generates─> PerformanceReport (aggregated)

PerformanceMetric
    └─compared_against─> PerformanceBudget
```

### Integration Testing Relationships

```
TestScenario
    ├─uses─> MockReduxStore
    ├─uses─> MSWHandler (many)
    ├─uses─> MockProductData (many)
    └─verified_by─> TestRenderOptions

MockReduxStore
    └─initialized_with─> MockProductData

MSWHandler
    └─returns─> MockProductData

TestRenderOptions
    ├─uses─> MockReduxStore
    └─renders─> React Components
```

---

## State Transitions

### PerformanceMetric Lifecycle

```
1. Operation Start
   ├─> performance.mark('{name}-start')
   └─> Store start timestamp

2. Operation Execution
   └─> Business logic runs

3. Operation End
   ├─> performance.mark('{name}-end')
   └─> performance.measure('{name}', start, end)

4. Metric Creation
   ├─> Extract duration from measure
   ├─> Compare against budget
   ├─> Set exceeded flag
   └─> Store PerformanceMetric

5. Metric Aggregation
   └─> Generate PerformanceReport
```

### Integration Test Lifecycle

```
1. Test Setup (beforeEach)
   ├─> Start MSW server
   ├─> Create MockReduxStore
   └─> Register MSWHandlers

2. Test Execution
   ├─> Render component with TestRenderOptions
   ├─> Simulate user actions (when)
   └─> Wait for async updates

3. Assertions (then)
   ├─> Verify Redux state
   ├─> Verify URL changes
   ├─> Verify API calls via MSW
   └─> Verify UI state

4. Test Teardown (afterEach)
   ├─> Reset MSW handlers
   └─> Unmount components
```

---

## Validation Summary

**Performance Monitoring**:
- All durations must be non-negative numbers
- Budgets must be positive numbers
- Monitoring level must be valid enum value
- Sample rate must be between 0.0 and 1.0

**Integration Testing**:
- Mock data must match real API contract structure
- Test scenarios must have valid Given-When-Then structure
- MSW handlers must have valid HTTP methods and paths
- Redux preloaded state must match actual state shape

---

## Notes

- **No database storage**: All performance metrics stored in-memory during development session
- **No persistent state**: Integration tests create fresh state for each test
- **Type safety**: Consider adding TypeScript types for all entities
- **Extensibility**: Performance budgets and mock data designed for easy extension

---

**Status**: ✅ Data model complete, ready for contract generation
