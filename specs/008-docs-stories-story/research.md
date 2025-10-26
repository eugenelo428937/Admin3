# Research: Performance Monitoring & Integration Testing Infrastructure

**Feature**: Stories 1.15 (Performance Monitoring) + 1.16 (Integration Testing)
**Date**: 2025-10-25
**Status**: Complete

---

## Research Questions & Decisions

### Q1: Production Performance Monitoring

**Question**: Should basic performance monitoring be enabled in production for real-world metrics?

**Decision**: **NO - Development-only with zero production overhead**

**Rationale**:
- Performance monitoring adds instrumentation overhead (even if minimal)
- Production bundle size must be minimized
- Real User Monitoring (RUM) should be handled by dedicated tools (Google Analytics, Sentry)
- Development-only approach ensures clean separation of concerns
- Tree-shaking via `process.env.NODE_ENV === 'development'` guards removes all monitoring code

**Implementation**:
```javascript
// All performance tracking wrapped in dev guards
if (process.env.NODE_ENV === 'development') {
  PerformanceTracker.startMeasure('filterUpdate');
}
```

**Alternatives Considered**:
- **Basic production monitoring**: Rejected - adds runtime overhead
- **Sampling-based monitoring**: Rejected - still adds code to production bundle
- **Feature-flagged monitoring**: Rejected - requires runtime checks

---

### Q2: Performance Budget Validation

**Question**: Are performance thresholds validated with user testing data or theoretical targets?

**Decision**: **Theoretical targets based on 60 FPS budget, validated iteratively**

**Rationale**:
- 60 FPS = 16ms frame budget (industry standard for smooth UI)
- URL sync must be < 5ms (one-third of frame budget for non-blocking)
- API calls < 1000ms (perceived instant feedback threshold)
- Validation/registry < 10ms/1ms (minimal blocking operations)
- Budgets will be refined based on real development observations

**Implementation**:
```javascript
// config/performanceBudgets.js
export const PERFORMANCE_BUDGETS = {
  REDUX_ACTION: 16,      // 60 FPS threshold
  URL_SYNC: 5,           // One-third frame budget
  API_CALL: 1000,        // Perceived instant feedback
  VALIDATION: 10,        // Minimal blocking
  REGISTRY_LOOKUP: 1     // Sub-millisecond lookup
};
```

**Alternatives Considered**:
- **User testing first**: Rejected - budgets needed before user testing
- **No budgets**: Rejected - defeats purpose of monitoring
- **Aggressive budgets** (< 5ms for everything): Rejected - unrealistic for API calls

---

### Q3: Integration Test Coverage Target

**Question**: Is 90% integration test coverage mandatory or aspirational?

**Decision**: **Aspirational target with pragmatic approach**

**Rationale**:
- 90% is aggressive for integration tests (typically 60-70%)
- Focus on critical user flows and integration points
- Quality over quantity - meaningful tests, not coverage gaming
- Measure coverage but don't block on exact 90%
- CI/CD should warn (not fail) if coverage drops below 80%

**Implementation**:
```json
// package.json jest config
{
  "coverageThresholds": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

**Alternatives Considered**:
- **Mandatory 90%**: Rejected - too aggressive for integration tests
- **No coverage target**: Rejected - need quality gate
- **Unit test coverage only**: Rejected - integration tests verify component collaboration

---

### Q4: API Mocking Strategy

**Question**: Should integration tests use real API in CI or always use mocks?

**Decision**: **Always use mocks (MSW) for deterministic, fast tests**

**Rationale**:
- Integration tests must be deterministic (same result every run)
- Real API requires network, database, authentication → slow and flaky
- MSW provides realistic mocking at the network level (intercepts fetch/XHR)
- CI/CD execution time must be < 30 seconds → requires fast tests
- Separate E2E test suite can test against real API (not in scope for Story 1.16)

**Implementation**:
```javascript
// src/test-utils/mockHandlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/products/', ({ request }) => {
    const url = new URL(request.url);
    const subjects = url.searchParams.getAll('subject_code');

    // Return filtered mock data based on query params
    return HttpResponse.json({
      results: mockProducts.filter(p =>
        subjects.length === 0 || subjects.includes(p.subject_code)
      )
    });
  })
];
```

**Alternatives Considered**:
- **Real API in CI**: Rejected - slow, flaky, requires infrastructure
- **Contract testing**: Considered - good addition but separate story
- **No mocking** (fetch real data): Rejected - determinism required

---

## Technology Stack Analysis

### Browser Performance API

**Why Chosen**: Native browser API for performance measurement, zero dependencies

**Best Practices**:
- Use `performance.mark()` for timestamps
- Use `performance.measure()` for duration calculation
- Clear marks after measurement to avoid memory leaks
- Fallback gracefully if API unavailable (old browsers)

**Example**:
```javascript
performance.mark('filterUpdate-start');
// ... operation ...
performance.mark('filterUpdate-end');
performance.measure('filterUpdate', 'filterUpdate-start', 'filterUpdate-end');
const measure = performance.getEntriesByName('filterUpdate')[0];
console.log(`Filter update took ${measure.duration}ms`);
```

**References**:
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API
- Chrome DevTools Performance profiler integration

---

### Redux Toolkit Listener Middleware

**Why Chosen**: Official RTK middleware for side effects, perfect for non-intrusive monitoring

**Best Practices**:
- Use `createListenerMiddleware()` for performance monitoring
- Listen to all filter actions using matcher pattern
- Keep listener logic side-effect free (only logging/metrics)
- Run listeners after reducer to capture state changes

**Example**:
```javascript
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

const performanceMiddleware = createListenerMiddleware();

performanceMiddleware.startListening({
  matcher: isAnyOf(setSubjects, setCategories, setProductTypes),
  effect: (action, listenerApi) => {
    const startTime = performance.now();
    // Wait for reducer to complete
    listenerApi.unsubscribe();
    const duration = performance.now() - startTime;
    PerformanceTracker.recordMetric(action.type, duration);
  }
});
```

**References**:
- RTK Docs: https://redux-toolkit.js.org/api/createListenerMiddleware

---

### MSW (Mock Service Worker)

**Why Chosen**: Industry-standard API mocking at the network level, works with any HTTP library

**Best Practices**:
- Define handlers in centralized file (`src/test-utils/mockHandlers.js`)
- Use `http.get/post/put/delete` for REST endpoints
- Return realistic data structures matching API contracts
- Setup in `setupTests.js` for all tests

**Example**:
```javascript
// setupTests.js
import { setupServer } from 'msw/node';
import { handlers } from './test-utils/mockHandlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**References**:
- MSW Docs: https://mswjs.io/
- Testing Library integration: https://testing-library.com/docs/react-testing-library/example-intro

---

### React Testing Library

**Why Chosen**: De facto standard for React component testing, user-centric approach

**Best Practices**:
- Test from user's perspective (click buttons, see results)
- Use `renderWithProviders()` helper for Redux + Router
- Wait for async updates with `waitFor()`, `findBy*` queries
- Avoid testing implementation details (state, props)
- Focus on integration (component collaboration)

**Example**:
```javascript
// src/test-utils/testHelpers.js
export function renderWithProviders(
  ui,
  { preloadedState = {}, store = configureStore({ reducer, preloadedState }), ...renderOptions } = {}
) {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <BrowserRouter>{children}</BrowserRouter>
      </Provider>
    );
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
```

**References**:
- RTL Docs: https://testing-library.com/docs/react-testing-library/intro
- RTK Testing Guide: https://redux-toolkit.js.org/usage/usage-guide#testing

---

## Integration Patterns

### Redux Middleware Chain Performance

**Pattern**: Listener middleware runs AFTER core middleware (thunk, urlSync)

**Timing Measurement Approach**:
1. Start mark BEFORE dispatch
2. End mark AFTER state update completes
3. Includes: action serialization + middleware chain + reducer + subscriptions

**Code**:
```javascript
const start = performance.now();
dispatch(setSubjects(['CM2']));
// Listener middleware captures end time
const duration = performance.now() - start;
```

---

### URL Sync Timing Isolation

**Pattern**: Measure only the urlSyncMiddleware execution, not entire dispatch

**Approach**:
- Add marks inside urlSyncMiddleware
- Measure from filter detection to history.replaceState() completion
- Exclude other middleware overhead

**Code**:
```javascript
// Inside urlSyncMiddleware.js
if (isFilterAction(action)) {
  performance.mark('urlSync-start');
  const params = filtersToUrlParams(getState().filters);
  window.history.replaceState(null, '', `?${params}`);
  performance.mark('urlSync-end');
  performance.measure('urlSync', 'urlSync-start', 'urlSync-end');
}
```

---

### API Call Timing with RTK Query

**Pattern**: Measure from query initiation to result resolution

**Approach**:
- RTK Query provides lifecycle hooks: `onQueryStarted`, `onCacheEntryAdded`
- Measure delta between query start and fulfillment
- Track cache hits separately (should be < 1ms)

**Code**:
```javascript
// Inside catalogApi endpoint
async onQueryStarted(arg, { queryFulfilled }) {
  const start = performance.now();
  try {
    await queryFulfilled;
    const duration = performance.now() - start;
    PerformanceTracker.recordMetric('api.products', duration);
  } catch (err) {
    // Log error timing separately
  }
}
```

---

## Testing Infrastructure Decisions

### Test Organization Strategy

**Decision**: Co-locate integration tests with components in `__tests__/` directories

**Structure**:
```
components/Ordering/
├── FilterPanel.js
├── ActiveFilters.js
└── __tests__/
    ├── FilterPanel.integration.test.js
    ├── ActiveFilters.integration.test.js
    └── FilterPersistence.test.js  # Cross-component test
```

**Rationale**:
- Easy to find tests for specific components
- Encourages test maintenance alongside component changes
- Separate integration tests from unit tests via `.integration.test.js` suffix
- Allows Jest filtering: `npm test -- --testPathPattern=integration`

---

### Mock Data Management

**Decision**: Single source of truth for mock data in `test-utils/mockData.js`

**Structure**:
```javascript
// test-utils/mockData.js
export const mockSubjects = [
  { code: 'CM2', name: 'CM2 Financial Engineering and Loss Reserving' },
  { code: 'SA1', name: 'SA1 Health and Care Principles' }
];

export const mockProducts = [
  { id: 1, subject_code: 'CM2', name: 'CM2 Core Study Material', category: 'BUNDLE' },
  { id: 2, subject_code: 'SA1', name: 'SA1 Study Notes', category: 'MATERIAL' }
];
```

**Rationale**:
- Consistency across all tests
- Easy to update mock data structure
- Reflects real API contract
- Reusable in MSW handlers and test setup

---

## Resolved Unknowns

**All NEEDS CLARIFICATION items resolved**:
1. ✅ Production monitoring: Development-only (zero overhead)
2. ✅ Performance thresholds: Theoretical 60 FPS budgets, iteratively validated
3. ✅ Test coverage: 90% aspirational, 80% enforced in CI
4. ✅ API mocking: Always use MSW mocks for deterministic tests

**Ready for Phase 1: Design & Contracts**

---

## References

- [Performance API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- [Redux Toolkit - Listener Middleware](https://redux-toolkit.js.org/api/createListenerMiddleware)
- [MSW - Mock Service Worker](https://mswjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Jest Configuration](https://jestjs.io/docs/configuration)
- [Web Performance Best Practices](https://web.dev/rail/)
