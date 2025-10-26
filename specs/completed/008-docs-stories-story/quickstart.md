# Quickstart: Performance Monitoring & Integration Testing

**Feature**: Stories 1.15 + 1.16
**Prerequisites**: Stories 1.1-1.14 complete (filtering system refactored)
**Estimated Time**: 30 minutes

---

## Story 1.15: Performance Monitoring

### Step 1: Verify Performance Monitoring Setup (5 min)

```bash
cd frontend/react-Admin3

# Check PerformanceTracker exists
ls -la src/utils/PerformanceTracker.js

# Check performance monitoring middleware exists
ls -la src/store/middleware/performanceMonitoring.js

# Check performance budgets config exists
ls -la src/config/performanceBudgets.js
```

**Expected**: All 3 files exist

---

### Step 2: Start Development Server (2 min)

```bash
npm start
```

**Expected**: Server starts on http://localhost:3000

---

### Step 3: Open Browser Console & Navigate to Products Page (3 min)

1. Open browser to http://localhost:3000/products
2. Open DevTools Console (F12)
3. Look for performance monitoring initialization message

**Expected Console Output**:
```
[Performance] Monitoring enabled (level: standard)
[Performance] Budgets loaded: Redux=16ms, URLSync=5ms, API=1000ms, Validation=10ms, Registry=1ms
```

---

### Step 4: Apply Filters and Observe Performance Metrics (5 min)

In the browser:
1. Open FilterPanel (click "Filters" button)
2. Select subject filter (e.g., "CM2")
3. Select category filter (e.g., "Bundle")
4. Clear all filters

**Expected Console Output** (for each filter change):
```
[Performance] redux.setSubjects completed in 2.4ms (budget: 16ms) ✓
[Performance] urlSync completed in 1.2ms (budget: 5ms) ✓
[Performance] api.products completed in 245ms (budget: 1000ms) ✓
[Performance] validation completed in 3.1ms (budget: 10ms) ✓
```

---

### Step 5: Trigger Performance Budget Violation (3 min)

Simulate slow operation (for testing):
```javascript
// In browser console
Redux.dispatch({
  type: 'filters/setMultipleFilters',
  payload: {
    subjects: new Array(100).fill('CM2'), // Large payload
    categories: new Array(100).fill('Bundle')
  }
});
```

**Expected Console Output**:
```
⚠️ Performance budget exceeded: redux.setMultipleFilters took 18.5ms (budget: 16ms, +2.5ms)
```

---

### Step 6: View Performance Report (2 min)

In browser console:
```javascript
// Get performance report
const report = PerformanceTracker.getReport();
console.table(report);
```

**Expected Output** (table format):
```
┌─────────┬─────────────────────┬───────┬──────┬──────┬─────┬──────┬──────┬──────┬────────────────┬────────┐
│ (index) │ operation          │ count │ min  │ max  │ avg │ p50  │ p95  │ p99  │ exceededCount │ budget │
├─────────┼─────────────────────┼───────┼──────┼──────┼─────┼──────┼──────┼──────┼────────────────┼────────┤
│    0    │ 'redux.setSubjects' │  10   │ 1.2  │ 8.5  │ 3.4 │ 3.1  │ 6.8  │ 8.2  │       0        │   16   │
│    1    │ 'urlSync'           │  10   │ 0.8  │ 2.1  │ 1.3 │ 1.2  │ 1.9  │ 2.0  │       0        │    5   │
│    2    │ 'api.products'      │   3   │ 210  │ 289  │ 245 │ 241  │ 280  │ 289  │       0        │  1000  │
└─────────┴─────────────────────┴───────┴──────┴──────┴─────┴──────┴──────┴──────┴────────────────┴────────┘
```

---

### Step 7: Verify Zero Production Overhead (5 min)

```bash
# Build for production
npm run build

# Check bundle size
ls -lh build/static/js/main.*.js

# Search for PerformanceTracker in production bundle (should be tree-shaken)
grep -r "PerformanceTracker" build/static/js/

# Open browser to production build
npx serve -s build
# Navigate to http://localhost:3000/products
# Check console - NO performance logging
```

**Expected**:
- `grep` returns no matches (PerformanceTracker code removed)
- Console shows NO performance log messages
- Production bundle < 500KB (no monitoring overhead)

---

### Step 8: Verify Redux DevTools Integration (3 min)

1. Install Redux DevTools browser extension (if not installed)
2. Open Redux DevTools in browser (F12 → Redux tab)
3. Apply a filter in the app
4. In Redux DevTools, select the filter action
5. Look for "performance" field in action metadata

**Expected**: Action shows performance timing:
```json
{
  "type": "filters/setSubjects",
  "payload": ["CM2"],
  "meta": {
    "performance": {
      "duration": 2.4,
      "budget": 16,
      "exceeded": false
    }
  }
}
```

---

## Story 1.16: Integration Testing

### Step 1: Verify Test Infrastructure Setup (3 min)

```bash
cd frontend/react-Admin3

# Check test utilities exist
ls -la src/test-utils/testHelpers.js
ls -la src/test-utils/mockData.js
ls -la src/test-utils/mockHandlers.js

# Check MSW setup
ls -la src/setupTests.js
```

**Expected**: All 4 files exist

---

### Step 2: Run All Integration Tests (5 min)

```bash
# Run tests with coverage
npm test -- --coverage --watchAll=false --testPathPattern=integration

# Or run specific test suite
npm test -- FilterPanel.integration.test.js --watchAll=false
```

**Expected Output**:
```
Test Suites: 10 passed, 10 total
Tests:       85 passed, 85 total
Snapshots:   0 total
Time:        12.456 s
```

**Coverage Report**:
```
File                          | % Stmts | % Branch | % Funcs | % Lines |
------------------------------|---------|----------|---------|---------|
All files                     |   92.5  |   88.3   |   94.1  |   93.2  |
 store/middleware             |   95.2  |   90.1   |   97.3  |   96.1  |
  urlSyncMiddleware.js        |   95.2  |   90.1   |   97.3  |   96.1  |
 utils                        |   90.8  |   85.4   |   92.6  |   91.7  |
  FilterRegistry.js           |   91.5  |   86.2   |   93.1  |   92.3  |
  FilterValidator.js          |   90.1  |   84.6   |   92.1  |   91.1  |
 components/Ordering          |   93.4  |   89.7   |   95.8  |   94.2  |
  FilterPanel.js              |   94.2  |   90.5   |   96.3  |   95.1  |
  ActiveFilters.js            |   92.6  |   88.9   |   95.3  |   93.3  |
```

---

### Step 3: Run Specific Integration Test Scenarios (4 min)

**Scenario 1: Redux ↔ URL Synchronization**
```bash
npm test -- --testNamePattern="Redux action updates URL"
```

**Expected**: Test passes, verifying:
- `dispatch(setSubjects(['CM2']))` → URL contains `?subject_code=CM2`

---

**Scenario 2: Filter Persistence**
```bash
npm test -- --testNamePattern="filters restored from URL on mount"
```

**Expected**: Test passes, verifying:
- Component mounts with URL `/products?subject_code=CM2`
- Redux state initialized with `subjects: ['CM2']`

---

**Scenario 3: API Integration**
```bash
npm test -- --testNamePattern="API called with correct filter params"
```

**Expected**: Test passes, verifying:
- MSW intercepts `/api/products/` request
- Request includes correct query parameters
- Mock response returned

---

### Step 4: Verify MSW API Mocking (3 min)

Run single test with detailed output:
```bash
npm test -- FilterPanel.integration.test.js --verbose --watchAll=false
```

**Expected Console Output**:
```
[MSW] Mocking enabled (node)
[MSW] GET /api/products/ (200)
[MSW] GET /api/subjects/ (200)
```

Check MSW handler registered:
```bash
# In test file
console.log(server.listHandlers());
```

**Expected**: Shows registered handlers for `/api/products/`, `/api/subjects/`, etc.

---

### Step 5: Test Backward Compatibility (2 min)

```bash
npm test -- BackwardCompatibility.test.js --watchAll=false
```

**Expected**: All backward compatibility tests pass:
- ✓ Old URL format `?subject=CM2` → parsed as `subject_code`
- ✓ Legacy filter names converted to new names
- ✓ All Story 1.14 refactoring exports still work

---

### Step 6: Verify Test Execution Time (1 min)

```bash
npm test -- --coverage --watchAll=false --testPathPattern=integration | grep "Time:"
```

**Expected**:
```
Time: 18.245 s
```

**Requirement Met**: < 30 seconds ✓

---

### Step 7: Run Flaky Test Detection (2 min)

Run same test suite 3 times:
```bash
for i in {1..3}; do npm test -- --watchAll=false --testPathPattern=integration --silent; done
```

**Expected**: All 3 runs pass with identical results (no flaky tests)

---

## Success Criteria Checklist

### Story 1.15 - Performance Monitoring
- [x] PerformanceTracker utility class exists and works
- [x] Performance metrics logged to console in development
- [x] Performance budgets enforced with warnings
- [x] Redux DevTools integration working
- [x] Zero production overhead (tree-shaken)
- [x] URL sync timing < 5ms
- [x] Redux action timing < 16ms
- [x] API call timing < 1000ms

### Story 1.16 - Integration Testing
- [x] Test utilities (renderWithProviders, createMockStore) working
- [x] MSW API mocking configured
- [x] Redux middleware integration tests passing
- [x] Component integration tests passing (FilterPanel, ActiveFilters, ProductList)
- [x] FilterRegistry integration tests passing
- [x] FilterValidator integration tests passing
- [x] Backward compatibility tests passing
- [x] Test coverage > 90%
- [x] Test execution time < 30 seconds
- [x] No flaky tests

---

## Troubleshooting

### Issue: Performance monitoring not logging
**Solution**: Check `process.env.NODE_ENV === 'development'`
```bash
echo $NODE_ENV  # Should be 'development'
```

### Issue: Integration tests timing out
**Solution**: Increase Jest timeout
```javascript
// In test file
jest.setTimeout(10000); // 10 seconds
```

### Issue: MSW not intercepting requests
**Solution**: Verify MSW server started in setupTests.js
```javascript
// setupTests.js
import { server } from './test-utils/mockHandlers';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Issue: Coverage below 90%
**Solution**: Check uncovered lines
```bash
npm test -- --coverage --coverageReporters=text --watchAll=false
```

---

**Quickstart Complete** ✅

Both Stories 1.15 and 1.16 verified working correctly in ~30 minutes.
