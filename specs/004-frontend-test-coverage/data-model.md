# Data Model: Frontend Test Coverage Modules

**Date**: 2025-11-26
**Branch**: `004-frontend-test-coverage`

## Overview

This document describes the test entities and their relationships for the modular frontend test coverage project.

## Test Module Entities

### 1. Services Module

**Entity**: `ServiceTestSuite`
- **Location**: `frontend/react-Admin3/src/services/__tests__/`
- **Pattern**: `{serviceName}.test.js`
- **Dependencies**: Mocked `httpService`, test utilities

**Service Files to Test**:

```
authService.js          # 10 functions - login, register, logout, etc.
bundleService.js        # 10 functions - bundle pricing, composition
cartService.js          # 7 functions - cart CRUD operations
productService.js       # 21 functions - product catalog
httpService.js          # 7 functions - HTTP client wrapper
searchService.js        # 6 functions - product search
tutorialService.js      # 9 functions - tutorial management
userService.js          # 4 functions - user profile
acknowledgmentService.js # 10 functions - T&C acknowledgments
errorTrackingService.js # 1 function - error logging
examSessionService.js   # 5 functions - exam sessions
loggerService.js        # 3 functions - logging utility
rulesEngineService.js   # 2 functions - rules API (HAS TESTS)
subjectService.js       # 7 functions - subject catalog
phoneValidationService.js # 8 functions - phone validation (HAS TESTS)
addressMetadataService.js # 12 functions - address metadata (HAS TESTS)
```

**Test Structure Per Service**:
```javascript
// ServiceName.test.js
describe('ServiceName', () => {
  describe('functionName', () => {
    test('success scenario', () => {});
    test('error scenario', () => {});
    test('edge case', () => {});
  });
});
```

### 2. Hooks Module

**Entity**: `HookTestSuite`
- **Location**: `frontend/react-Admin3/src/hooks/__tests__/`
- **Pattern**: `{hookName}.test.js`
- **Dependencies**: `@testing-library/react`, provider wrappers

**Hook Files to Test**:

```
useApi.js                        # 2 functions - generic API hook
useAuth.js                       # 11 functions - auth state (HAS TESTS)
useCheckoutRulesEngine.js        # 8 functions - checkout rules (HAS TESTS)
useCheckoutValidation.js         # 16 functions - checkout validation (HAS TESTS)
useProductCardHelpers.js         # 9 functions - product card utilities
useProductsSearch.js             # 17 functions - product search (HAS TESTS)
useResourceData.js               # 0 functions - empty file (SKIP)
useRulesEngineAcknowledgments.js # 13 functions - rules acknowledgments
```

**Test Structure Per Hook**:
```javascript
// useHookName.test.js
describe('useHookName', () => {
  describe('initial state', () => {
    test('returns expected initial values', () => {});
  });
  describe('actions', () => {
    test('action updates state correctly', () => {});
  });
  describe('error handling', () => {
    test('handles errors gracefully', () => {});
  });
});
```

### 3. Contexts Module

**Entity**: `ContextTestSuite`
- **Location**: `frontend/react-Admin3/src/contexts/__tests__/`
- **Pattern**: `{ContextName}.test.js`
- **Dependencies**: `jest.unmock()`, test consumer component

**Context Files to Test**:

```
CartContext.js           # 11 functions - cart state (NEEDS IMPROVEMENT)
ProductContext.js        # 6 functions - product state (NO TESTS)
TutorialChoiceContext.js # 44 functions - tutorial choices (NEEDS IMPROVEMENT)
```

**Test Structure Per Context**:
```javascript
// ContextName.test.js
jest.unmock('../ContextName');

describe('ContextName', () => {
  describe('Provider', () => {
    test('provides initial state', () => {});
    test('handles state updates', () => {});
  });
  describe('useContext hook', () => {
    test('throws error outside provider', () => {});
    test('returns context value', () => {});
  });
});
```

### 4. Utils Module

**Entity**: `UtilTestSuite`
- **Location**: `frontend/react-Admin3/src/utils/__tests__/`
- **Pattern**: `{utilName}.test.js`
- **Dependencies**: None (pure functions)

**Utility Files to Test**:

```
priceFormatter.js          # 1 function - price formatting (NO TESTS)
productCodeGenerator.js    # 9 functions - product codes (NO TESTS)
rulesEngineUtils.js        # 54 functions - rules engine (NO TESTS)
vatUtils.js                # 6 functions - VAT calculations (NEEDS IMPROVEMENT)
PerformanceTracker.js      # 18 functions - performance (NEEDS IMPROVEMENT)
filterUrlManager.js        # 17 functions - URL filters (NEEDS IMPROVEMENT)
tutorialMetadataBuilder.js # 6 functions - tutorial metadata (NO TESTS)
```

**Test Structure Per Utility**:
```javascript
// utilName.test.js
describe('utilName', () => {
  describe('functionName', () => {
    test('normal input', () => {});
    test('null input', () => {});
    test('undefined input', () => {});
    test('empty input', () => {});
    test('boundary values', () => {});
  });
});
```

## Test Dependencies

### Required Mocks

```javascript
// Common mocks needed across test files

// httpService mock (for service tests)
jest.mock('../httpService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// productService mock (for context/hook tests)
jest.mock('../../services/productService', () => ({
  __esModule: true,
  default: {
    getAvailableProducts: jest.fn(),
  },
}));
```

### Provider Wrappers

```javascript
// Test utilities for hooks/contexts
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../store';

export const AllProviders = ({ children }) => (
  <ThemeProvider theme={createTheme()}>
    <Provider store={store}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </Provider>
  </ThemeProvider>
);
```

## Coverage Tracking Entity

**Entity**: `CoverageReport`
- **Location**: `frontend/react-Admin3/coverage/`
- **Format**: lcov, html, text-summary

**Coverage Metrics Per Module**:

| Module | Target Lines | Target Functions | Target Branches |
|--------|-------------|------------------|-----------------|
| services/ | 80% | 80% | 70% |
| hooks/ | 80% | 80% | 70% |
| contexts/ | 80% | 80% | 70% |
| utils/ | 80% | 80% | 70% |

## Relationships

```
┌─────────────────┐
│   setupTests.js │  Global mocks
└────────┬────────┘
         │ jest.unmock()
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Context Tests  │────►│ Service Mocks   │
└────────┬────────┘     └─────────────────┘
         │ uses
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Hook Tests    │────►│ Context Mocks   │
└────────┬────────┘     └─────────────────┘
         │ uses
         ▼
┌─────────────────┐
│   Util Tests    │  Pure functions (no deps)
└─────────────────┘
```

## Test Naming Conventions

### Test File Names
- `{moduleName}.test.js` - Unit tests
- `{moduleName}.integration.test.js` - Integration tests (optional)

### Test Case Names
- `should {expected behavior} when {condition}`
- `returns {expected value} for {input description}`
- `throws error when {error condition}`

### Describe Block Names
- Top-level: Module/function name
- Second-level: Method/behavior group
- Third-level: Specific scenarios

## Validation Rules

### Services
- All exported functions must have tests
- HTTP calls must be mocked
- Error paths must be tested
- Return value types must be validated

### Hooks
- Initial state must be verified
- All actions must be tested
- State transitions must be validated
- Cleanup effects must be tested

### Contexts
- Provider must supply expected value shape
- Consumer hook must throw outside provider
- State updates must propagate correctly
- Side effects must be tested

### Utils
- All exported functions must have tests
- Edge cases (null, undefined, empty) must be tested
- Boundary values must be tested
- Return types must be validated
