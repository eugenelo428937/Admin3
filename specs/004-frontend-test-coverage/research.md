# Research: Frontend Test Coverage - Modular Reorganization

**Date**: 2025-11-26
**Branch**: `004-frontend-test-coverage`

## Executive Summary

This research documents the existing test infrastructure, patterns, and gaps for reorganizing frontend tests into a modular structure with 80% minimum coverage per module.

## 1. Test Infrastructure

### Decision: Use existing Jest + React Testing Library setup
**Rationale**: Well-established infrastructure already configured with appropriate transformations and coverage tools.

**Configuration**:
- **Test Runner**: Jest (via react-scripts test)
- **Testing Library**: @testing-library/react v16.3.0
- **DOM Environment**: jsdom
- **Coverage**: Istanbul (via Jest)
- **Mocking**: MSW v2.11.6 available for API mocking

**Key Configuration (jest.config.js)**:
```javascript
{
  testEnvironment: 'jsdom',
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', ...exclusions],
  coverageThresholds: {
    global: { statements: 95, branches: 95, functions: 95, lines: 95 }
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html']
}
```

**Alternatives considered**:
- Vitest: Would require migration, not justified for this scope
- Cypress Component Testing: Better for E2E, overkill for unit tests

## 2. Global Test Setup Analysis

### setupTests.js Patterns

**Critical Pattern**: Global mocks in `setupTests.js` must be overridden using `jest.unmock()`:

```javascript
// In test file - BEFORE imports
jest.unmock('../CartContext');  // Override global mock
jest.mock('../../services/cartService', () => ({...}));  // Test-specific mock

// Then imports
import { CartProvider, useCart } from '../CartContext';
```

**Existing Global Mocks**:
1. `react-router-dom` - Full mock with navigation hooks
2. `./services/httpService` - HTTP client mock
3. `./services/cartService` - Cart operations mock
4. `./services/authService` - Authentication mock
5. `./contexts/TutorialChoiceContext` - Tutorial context mock
6. `./contexts/CartContext` - Cart context mock

**Implication**: Test files must explicitly `jest.unmock()` any module they want to test with real implementation.

## 3. Test Patterns by Module Type

### 3.1 Service Tests Pattern

**Decision**: Direct function import with mocked dependencies
**Rationale**: Services are pure functions/objects, can be tested without React context

**Pattern** (from `phoneValidationService.test.js`):
```javascript
import serviceModule from '../serviceName';

describe('ServiceName', () => {
  describe('functionName', () => {
    test('validates input correctly', () => {
      const result = serviceModule.functionName(input);
      expect(result.isValid).toBe(true);
    });
  });
});
```

**Mock Dependencies**: Mock `httpService` for API calls:
```javascript
jest.mock('../httpService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));
```

### 3.2 Hook Tests Pattern

**Decision**: Use `@testing-library/react` `renderHook` with wrapper
**Rationale**: Standard pattern for testing React hooks with providers

**Pattern** (from `useAuth.test.js`):
```javascript
import { renderHook, act, waitFor } from '@testing-library/react';

const wrapper = ({ children }) => (
  <Provider>{children}</Provider>
);

const { result } = renderHook(() => useHook(), { wrapper });

await act(async () => {
  await result.current.someAction();
});

expect(result.current.state).toBe(expected);
```

**Key Considerations**:
- Mock external hooks like `useNavigate` before imports
- Use `waitFor` for async state updates
- Use `act()` for state-changing operations

### 3.3 Context Tests Pattern

**Decision**: Use `jest.unmock()` + test consumer component
**Rationale**: Need real provider behavior, not global mock

**Pattern** (from `CartContext.test.js`):
```javascript
// BEFORE imports
jest.unmock('../ContextName');
jest.mock('../../services/serviceName', () => ({...}));

// Test consumer component
const TestConsumer = () => {
  const context = useContext();
  contextRef = context;
  return <div data-testid="state">{context.value}</div>;
};

// Test
render(
  <ContextProvider>
    <TestConsumer />
  </ContextProvider>
);

await waitFor(() => {
  expect(screen.getByTestId('state')).toHaveTextContent('expected');
});
```

### 3.4 Utils Tests Pattern

**Decision**: Pure function testing with comprehensive edge cases
**Rationale**: Utils are pure functions, easiest to test

**Pattern**:
```javascript
import { utilFunction } from '../utilName';

describe('utilFunction', () => {
  test('handles normal input', () => {
    expect(utilFunction(input)).toBe(expected);
  });

  test('handles edge case - null', () => {
    expect(utilFunction(null)).toBe(defaultValue);
  });

  test('handles edge case - undefined', () => {
    expect(utilFunction(undefined)).toBe(defaultValue);
  });
});
```

## 4. Module Inventory and Test Gap Analysis

### 4.1 Services (16 files total)

| Service | Lines | Functions | Has Tests | Priority |
|---------|-------|-----------|-----------|----------|
| authService.js | 121 | 10 | No | HIGH |
| bundleService.js | 75 | 10 | No | HIGH |
| productService.js | 109 | 21 | No | HIGH |
| httpService.js | 59 | 7 | No | HIGH |
| cartService.js | 11 | 7 | No* | MEDIUM |
| searchService.js | 51 | 6 | No | MEDIUM |
| tutorialService.js | 54 | 9 | No | MEDIUM |
| userService.js | 38 | 4 | No | MEDIUM |
| acknowledgmentService.js | 46 | 10 | No | LOW |
| errorTrackingService.js | 3 | 1 | No | LOW |
| examSessionService.js | 16 | 5 | No | LOW |
| loggerService.js | 7 | 3 | No | LOW |
| rulesEngineService.js | 19 | 2 | Yes | DONE |
| subjectService.js | 19 | 7 | No | LOW |
| phoneValidationService.js | 54 | 8 | Yes | DONE |
| addressMetadataService.js | 50 | 12 | Yes | DONE |

### 4.2 Hooks (8 files total)

| Hook | Lines | Functions | Has Tests | Priority |
|------|-------|-----------|-----------|----------|
| useApi.js | 15 | 2 | No | MEDIUM |
| useAuth.js | 110 | 11 | Yes | DONE |
| useCheckoutRulesEngine.js | 23 | 8 | Yes | DONE |
| useCheckoutValidation.js | 123 | 16 | Yes | DONE |
| useProductCardHelpers.js | 18 | 9 | No | MEDIUM |
| useProductsSearch.js | 106 | 17 | Yes | DONE |
| useResourceData.js | 0 | 0 | N/A | SKIP |
| useRulesEngineAcknowledgments.js | 56 | 13 | No | MEDIUM |

### 4.3 Contexts (3 files total)

| Context | Lines | Functions | Has Tests | Priority |
|---------|-------|-----------|-----------|----------|
| CartContext.js | 57 | 11 | Yes | IMPROVE |
| ProductContext.js | 23 | 6 | No | HIGH |
| TutorialChoiceContext.js | 133 | 44 | Yes | IMPROVE |

### 4.4 Utils (7 files total)

| Utility | Lines | Functions | Has Tests | Priority |
|---------|-------|-----------|-----------|----------|
| priceFormatter.js | 2 | 1 | No | HIGH |
| productCodeGenerator.js | 68 | 9 | No | HIGH |
| rulesEngineUtils.js | 234 | 54 | No | HIGH |
| vatUtils.js | 23 | 6 | Yes* | IMPROVE |
| PerformanceTracker.js | 83 | 18 | Yes* | IMPROVE |
| filterUrlManager.js | 138 | 17 | Yes | IMPROVE |
| tutorialMetadataBuilder.js | 10 | 6 | No | LOW |

## 5. Common Testing Challenges

### 5.1 ESM Module Issues
**Problem**: Some dependencies use ESM exports that Jest struggles with.
**Solution**: `transformIgnorePatterns` in jest.config.js:
```javascript
transformIgnorePatterns: [
  '/node_modules/(?!(@standard-schema|@reduxjs/toolkit|axios|react-router|msw)/)'
]
```

### 5.2 Async State Updates
**Problem**: React 18+ concurrent mode causes state update timing issues.
**Solution**: Use `waitFor` with assertions:
```javascript
await waitFor(() => {
  expect(result.current.loading).toBe(false);
});
```

### 5.3 Context Provider Dependencies
**Problem**: Components require multiple nested providers.
**Solution**: Create test utility with all providers:
```javascript
// test-utils/testHelpers.js
const AllTheProviders = ({ children }) => (
  <ThemeProvider theme={testTheme}>
    <Provider store={store}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </Provider>
  </ThemeProvider>
);
```

## 6. Coverage Measurement Strategy

### Decision: Per-module coverage tracking via Jest patterns
**Rationale**: Jest supports running specific test patterns with coverage

**Commands**:
```bash
# Services coverage
npm test -- --coverage --watchAll=false --collectCoverageFrom='src/services/*.js'

# Hooks coverage
npm test -- --coverage --watchAll=false --collectCoverageFrom='src/hooks/*.js'

# Contexts coverage
npm test -- --coverage --watchAll=false --collectCoverageFrom='src/contexts/*.js'

# Utils coverage
npm test -- --coverage --watchAll=false --collectCoverageFrom='src/utils/*.js'
```

## 7. Test File Organization

### Decision: `__tests__` folder pattern within each module
**Rationale**: Consistent with existing codebase structure, co-located with source

**Structure**:
```
src/
├── services/
│   ├── __tests__/
│   │   ├── authService.test.js
│   │   ├── bundleService.test.js
│   │   └── ...
│   ├── authService.js
│   ├── bundleService.js
│   └── ...
├── hooks/
│   ├── __tests__/
│   │   └── ...
│   └── ...
├── contexts/
│   ├── __tests__/
│   │   └── ...
│   └── ...
└── utils/
    ├── __tests__/
    │   └── ...
    └── ...
```

## 8. Priority Order for Implementation

Based on coverage gaps, complexity, and business criticality:

### Tier 1: Critical Foundation (Week 1)
1. **authService.js** - 10 functions, authentication critical
2. **productService.js** - 21 functions, core business logic
3. **httpService.js** - 7 functions, foundation for all API calls
4. **ProductContext.js** - Only untested context

### Tier 2: Business Logic (Week 2)
5. **bundleService.js** - Product bundling
6. **rulesEngineUtils.js** - 54 functions, complex business rules
7. **productCodeGenerator.js** - Product code generation
8. **priceFormatter.js** - Simple, quick win

### Tier 3: Supporting Functions (Week 3)
9. **cartService.js** - Improve existing
10. **searchService.js** - Search functionality
11. **tutorialService.js** - Tutorial management
12. **useApi.js** - Generic API hook

### Tier 4: Edge Cases (Week 4)
13. **userService.js** - User management
14. **vatUtils.js** - Improve existing
15. **PerformanceTracker.js** - Improve existing
16. **filterUrlManager.js** - Improve existing

### Tier 5: Low Priority (As Needed)
- acknowledgmentService.js
- errorTrackingService.js
- examSessionService.js
- loggerService.js
- subjectService.js
- tutorialMetadataBuilder.js

## 9. Conclusions

### Key Decisions Summary

1. **Test Framework**: Keep Jest + RTL (established, working)
2. **Mock Strategy**: Use `jest.unmock()` pattern for context/service tests
3. **File Organization**: `__tests__/` folders, one test file per source file
4. **Coverage Target**: 80% per module (realistic for Phase 1)
5. **Priority**: Services → Contexts → Utils → Hooks (by gap severity)

### Risks Identified

1. **Global mock complexity**: Tests must carefully manage mock state
2. **Async timing**: React 18 concurrent mode requires `waitFor` patterns
3. **Large functions**: `rulesEngineUtils.js` (54 functions) needs decomposition strategy

### Next Steps

1. Generate data-model.md documenting test entities
2. Create quickstart.md with testing commands and patterns
3. Generate tasks.md with ordered test implementation tasks
