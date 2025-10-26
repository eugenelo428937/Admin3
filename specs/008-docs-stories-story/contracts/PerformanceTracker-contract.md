# PerformanceTracker Module Contract

**Module**: `frontend/react-Admin3/src/utils/PerformanceTracker.js`
**Story**: 1.15 - Performance Monitoring
**Type**: Utility Class
**Purpose**: Wrapper around Browser Performance API for measuring filter operation performance

---

## Public API

### Static Methods

#### `startMeasure(name, metadata = {})`

Begins a performance measurement for a named operation.

**Parameters**:
- `name` (string, required): Unique identifier for the measurement (e.g., 'redux.setSubjects')
- `metadata` (object, optional): Additional context to attach to the measurement

**Returns**: `void`

**Side Effects**:
- Creates performance mark: `${name}-start`
- Stores metadata in internal map keyed by `name`

**Example**:
```javascript
PerformanceTracker.startMeasure('filterUpdate', { filterType: 'subjects', count: 2 });
```

**Throws**:
- `Error` if `name` is empty or not a string
- No error if Performance API unavailable (graceful degradation)

---

#### `endMeasure(name, metadata = {})`

Ends a performance measurement and records the result.

**Parameters**:
- `name` (string, required): Same identifier used in `startMeasure()`
- `metadata` (object, optional): Additional metadata to merge with start metadata

**Returns**: `PerformanceMetric | null`
- Returns `PerformanceMetric` object if measurement successful
- Returns `null` if Performance API unavailable or no matching start mark

**Side Effects**:
- Creates performance mark: `${name}-end`
- Creates performance measure: `${name}` from start to end
- Stores `PerformanceMetric` in internal metrics array
- Clears performance marks to avoid memory leaks
- Logs warning if duration exceeds budget

**Example**:
```javascript
const metric = PerformanceTracker.endMeasure('filterUpdate', { success: true });
// metric = { name: 'filterUpdate', duration: 3.2, timestamp: 12345, exceeded: false, ... }
```

**Throws**:
- `Error` if `name` is empty or not a string
- `Warning` logged to console if measurement exceeds performance budget

---

#### `recordMetric(name, value, metadata = {})`

Records a single performance metric without using start/end marks.

**Parameters**:
- `name` (string, required): Metric identifier
- `value` (number, required): Measured value in milliseconds
- `metadata` (object, optional): Additional context

**Returns**: `PerformanceMetric`

**Side Effects**:
- Stores `PerformanceMetric` in internal metrics array
- Logs warning if value exceeds budget

**Example**:
```javascript
const duration = Date.now() - startTime;
PerformanceTracker.recordMetric('customOperation', duration, { operationType: 'validation' });
```

**Throws**:
- `Error` if `value` is not a number or is negative

---

#### `getMetrics(filterName = null)`

Retrieves recorded performance metrics.

**Parameters**:
- `filterName` (string, optional): Filter metrics by operation name prefix
  - If provided: returns only metrics where `name` starts with `filterName`
  - If omitted: returns all metrics

**Returns**: `PerformanceMetric[]`

**Example**:
```javascript
const allMetrics = PerformanceTracker.getMetrics();
const reduxMetrics = PerformanceTracker.getMetrics('redux');
// Returns all metrics with names starting with 'redux.'
```

**Side Effects**: None (read-only)

---

#### `getReport(operationName = null)`

Generates aggregated performance report with statistics.

**Parameters**:
- `operationName` (string, optional): Generate report for specific operation
  - If provided: aggregates metrics for that operation only
  - If omitted: generates reports for all operations (grouped by name)

**Returns**: `PerformanceReport | PerformanceReport[]`
- Single `PerformanceReport` if `operationName` provided
- Array of `PerformanceReport` objects (one per operation) if omitted

**Example**:
```javascript
const report = PerformanceTracker.getReport('redux.setSubjects');
// { operation: 'redux.setSubjects', count: 10, min: 1.2, max: 8.5, avg: 3.4, ... }

const allReports = PerformanceTracker.getReport();
// [{ operation: 'redux.setSubjects', ... }, { operation: 'urlSync', ... }]
```

**Side Effects**: None (read-only)

---

#### `clearMetrics(operationName = null)`

Clears stored performance metrics.

**Parameters**:
- `operationName` (string, optional): Clear metrics for specific operation
  - If provided: clears only metrics matching `operationName`
  - If omitted: clears all metrics

**Returns**: `number` - Count of metrics cleared

**Side Effects**:
- Removes metrics from internal storage
- Clears corresponding performance marks/measures from Performance API

**Example**:
```javascript
PerformanceTracker.clearMetrics('redux.setSubjects'); // Clear specific operation
PerformanceTracker.clearMetrics(); // Clear all metrics
```

---

#### `checkBudget(name, duration, budget)`

Validates a duration against a performance budget.

**Parameters**:
- `name` (string, required): Operation name (for warning message)
- `duration` (number, required): Measured duration in milliseconds
- `budget` (number, required): Performance budget threshold in milliseconds

**Returns**: `boolean`
- `true` if duration <= budget (within budget)
- `false` if duration > budget (exceeded budget)

**Side Effects**:
- Logs console warning if budget exceeded (development mode only)
- Warning includes operation name, measured duration, budget, and delta

**Example**:
```javascript
const withinBudget = PerformanceTracker.checkBudget('urlSync', 3.2, 5);
// true - logs nothing

const exceeded = PerformanceTracker.checkBudget('urlSync', 8.5, 5);
// false - logs: "⚠️ Performance budget exceeded: urlSync took 8.5ms (budget: 5ms, +3.5ms)"
```

---

#### `isSupported()`

Checks if Browser Performance API is available.

**Parameters**: None

**Returns**: `boolean`
- `true` if `performance.mark` and `performance.measure` exist
- `false` if Performance API unavailable (old browsers)

**Example**:
```javascript
if (!PerformanceTracker.isSupported()) {
  console.warn('Performance monitoring unavailable in this browser');
}
```

**Side Effects**: None

---

## Configuration

### Environment-Based Behavior

**Development Mode** (`process.env.NODE_ENV === 'development'`):
- All methods fully functional
- Console warnings for budget violations
- Metrics stored in memory

**Production Mode** (`process.env.NODE_ENV === 'production'`):
- All methods are no-ops (tree-shaken or return immediately)
- Zero runtime overhead
- No metrics stored

---

## Internal Data Structures

### Metrics Storage

```javascript
// Internal static property (not exported)
static _metrics = [];

// Each entry is a PerformanceMetric object:
{
  name: string,
  duration: number,
  timestamp: number,
  budget: number | null,
  exceeded: boolean,
  metadata: object
}
```

### Metadata Storage

```javascript
// Internal static property (not exported)
static _metadataMap = new Map();

// Stores metadata temporarily between startMeasure and endMeasure
// Key: operation name (string)
// Value: metadata object
```

---

## Error Handling

### Graceful Degradation

```javascript
// If Performance API unavailable
if (!performance.mark) {
  console.warn('Performance API not supported - monitoring disabled');
  return null; // Methods return early without throwing
}
```

### Invalid Input Handling

```javascript
// Empty or invalid name
if (!name || typeof name !== 'string') {
  throw new Error('PerformanceTracker: name must be a non-empty string');
}

// Negative duration
if (value < 0) {
  throw new Error('PerformanceTracker: duration cannot be negative');
}
```

---

## Usage Examples

### Basic Timing

```javascript
PerformanceTracker.startMeasure('filterUpdate');
dispatch(setSubjects(['CM2']));
PerformanceTracker.endMeasure('filterUpdate');
```

### With Metadata

```javascript
PerformanceTracker.startMeasure('filterUpdate', {
  filterType: 'subjects',
  filterCount: 2
});

dispatch(setSubjects(['CM2', 'SA1']));

const metric = PerformanceTracker.endMeasure('filterUpdate', {
  success: true
});

console.log(metric);
// { name: 'filterUpdate', duration: 3.2, metadata: { filterType: 'subjects', filterCount: 2, success: true }, ... }
```

### Generating Reports

```javascript
// Perform multiple operations
for (let i = 0; i < 10; i++) {
  PerformanceTracker.startMeasure('redux.setSubjects');
  dispatch(setSubjects(['CM2']));
  PerformanceTracker.endMeasure('redux.setSubjects');
}

// Get aggregated report
const report = PerformanceTracker.getReport('redux.setSubjects');
console.log(report);
// {
//   operation: 'redux.setSubjects',
//   count: 10,
//   min: 1.2,
//   max: 8.5,
//   avg: 3.4,
//   p50: 3.1,
//   p95: 6.8,
//   p99: 8.2,
//   exceededCount: 0,
//   budget: 16
// }
```

---

## Testing Contract

### Unit Tests Required

1. `startMeasure()` creates performance mark
2. `endMeasure()` calculates correct duration
3. `recordMetric()` stores metric with correct fields
4. `getMetrics()` filters by operation name prefix
5. `getReport()` calculates correct statistics (min, max, avg, p95, p99)
6. `checkBudget()` logs warning when exceeded
7. `clearMetrics()` removes stored metrics
8. `isSupported()` detects Performance API availability
9. Graceful degradation when Performance API unavailable
10. Error handling for invalid inputs

### Performance Requirements

- `startMeasure()`: < 0.1ms overhead
- `endMeasure()`: < 0.5ms overhead
- `getMetrics()`: < 1ms for 1000 metrics
- `getReport()`: < 5ms for 1000 metrics

---

**Contract Version**: 1.0
**Status**: ✅ Ready for TDD implementation
