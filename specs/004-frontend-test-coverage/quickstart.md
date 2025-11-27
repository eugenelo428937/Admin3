# Quickstart: Frontend Test Coverage

**Date**: 2025-11-26
**Branch**: `004-frontend-test-coverage`

## Quick Commands

### Run All Tests
```bash
cd frontend/react-Admin3
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage --watchAll=false
```

### Run Module-Specific Tests

```bash
# Services only
npm test -- --testPathPattern='src/services/__tests__'

# Hooks only
npm test -- --testPathPattern='src/hooks/__tests__'

# Contexts only
npm test -- --testPathPattern='src/contexts/__tests__'

# Utils only
npm test -- --testPathPattern='src/utils/__tests__'
```

### Run Single Test File
```bash
npm test -- --testPathPattern='authService.test.js' --watchAll=false
```

### Run with Coverage for Specific Module
```bash
# Services coverage
npm test -- --coverage --watchAll=false \
  --collectCoverageFrom='src/services/*.js' \
  --testPathPattern='src/services/__tests__'

# Hooks coverage
npm test -- --coverage --watchAll=false \
  --collectCoverageFrom='src/hooks/*.js' \
  --testPathPattern='src/hooks/__tests__'

# Contexts coverage
npm test -- --coverage --watchAll=false \
  --collectCoverageFrom='src/contexts/*.js' \
  --testPathPattern='src/contexts/__tests__'

# Utils coverage
npm test -- --coverage --watchAll=false \
  --collectCoverageFrom='src/utils/*.js' \
  --testPathPattern='src/utils/__tests__'
```

## Test File Templates

### Service Test Template
```javascript
/**
 * Tests for {ServiceName}
 */

// Mock dependencies BEFORE imports
jest.mock('../httpService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import serviceName from '../serviceName';
import httpService from '../httpService';

describe('ServiceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('functionName', () => {
    test('should return expected result on success', async () => {
      httpService.get.mockResolvedValue({ data: { key: 'value' } });

      const result = await serviceName.functionName();

      expect(result).toEqual({ key: 'value' });
      expect(httpService.get).toHaveBeenCalledWith(expect.stringContaining('/endpoint'));
    });

    test('should handle errors gracefully', async () => {
      httpService.get.mockRejectedValue(new Error('Network error'));

      await expect(serviceName.functionName()).rejects.toThrow('Network error');
    });
  });
});
```

### Hook Test Template
```javascript
/**
 * Tests for {useHookName}
 */

// Mock dependencies BEFORE imports
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../services/serviceName', () => ({
  __esModule: true,
  default: {
    functionName: jest.fn(),
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { useHookName } from '../useHookName';

const wrapper = ({ children }) => (
  <ProviderIfNeeded>{children}</ProviderIfNeeded>
);

describe('useHookName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    test('should return expected initial values', () => {
      const { result } = renderHook(() => useHookName(), { wrapper });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
    });
  });

  describe('actions', () => {
    test('should update state on action', async () => {
      const { result } = renderHook(() => useHookName(), { wrapper });

      await act(async () => {
        await result.current.doAction();
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });
    });
  });
});
```

### Context Test Template
```javascript
/**
 * Tests for {ContextName}
 */

// MUST be before imports to override setupTests.js global mock
jest.unmock('../ContextName');

// Mock dependencies
jest.mock('../../services/serviceName', () => ({
  __esModule: true,
  default: {
    functionName: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ContextProvider, useContextHook } from '../ContextName';
import serviceName from '../../services/serviceName';

// Test consumer component
let contextRef = null;
const TestConsumer = () => {
  const context = useContextHook();
  contextRef = context;
  return (
    <div>
      <span data-testid="loading">{context.loading.toString()}</span>
      <span data-testid="data">{JSON.stringify(context.data)}</span>
    </div>
  );
};

describe('ContextName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contextRef = null;
  });

  describe('Provider', () => {
    test('should fetch data on mount', async () => {
      render(
        <ContextProvider>
          <TestConsumer />
        </ContextProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(serviceName.functionName).toHaveBeenCalledTimes(1);
    });

    test('should handle fetch error', async () => {
      serviceName.functionName.mockRejectedValueOnce(new Error('Error'));

      render(
        <ContextProvider>
          <TestConsumer />
        </ContextProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
    });
  });

  describe('useContextHook', () => {
    test('should expose expected methods', async () => {
      render(
        <ContextProvider>
          <TestConsumer />
        </ContextProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(typeof contextRef.actionMethod).toBe('function');
    });
  });
});
```

### Utility Test Template
```javascript
/**
 * Tests for {utilName}
 */

import { utilFunction, anotherFunction } from '../utilName';

describe('utilName', () => {
  describe('utilFunction', () => {
    test('should return expected value for normal input', () => {
      expect(utilFunction('input')).toBe('expected');
    });

    test('should handle null input', () => {
      expect(utilFunction(null)).toBe('default');
    });

    test('should handle undefined input', () => {
      expect(utilFunction(undefined)).toBe('default');
    });

    test('should handle empty string', () => {
      expect(utilFunction('')).toBe('default');
    });

    test('should handle edge case values', () => {
      expect(utilFunction(0)).toBe('zero');
      expect(utilFunction(-1)).toBe('negative');
      expect(utilFunction(Number.MAX_VALUE)).toBe('max');
    });
  });

  describe('anotherFunction', () => {
    test('should work correctly', () => {
      expect(anotherFunction()).toBeDefined();
    });
  });
});
```

## Common Patterns

### Mocking localStorage
```javascript
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('should use localStorage', () => {
  localStorage.setItem('key', 'value');
  // ... test
  expect(localStorage.getItem('key')).toBe('value');
});
```

### Testing Async Operations
```javascript
test('should handle async operation', async () => {
  const { result } = renderHook(() => useHook());

  await act(async () => {
    await result.current.asyncAction();
  });

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.data).toBeDefined();
});
```

### Testing Error States
```javascript
test('should handle error', async () => {
  serviceMock.mockRejectedValueOnce(new Error('Test error'));

  const { result } = renderHook(() => useHook());

  await waitFor(() => {
    expect(result.current.error).toBe('Test error');
  });
});
```

## Validation Checklist

Before committing test files:

- [ ] All tests pass (`npm test -- --watchAll=false`)
- [ ] Coverage meets 80% target for module
- [ ] No console warnings/errors during tests
- [ ] Tests are isolated (no shared state)
- [ ] Mocks are cleared in beforeEach
- [ ] Async tests use proper await/waitFor
- [ ] Error scenarios are tested
- [ ] Edge cases are covered

## Coverage Report

View HTML coverage report:
```bash
npm test -- --coverage --watchAll=false
open coverage/lcov-report/index.html
```

View summary in terminal:
```bash
npm test -- --coverage --watchAll=false --coverageReporters=text-summary
```
