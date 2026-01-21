# Quickstart: Frontend Test Coverage Phase 2

**Feature**: 005-frontend-test-coverage-phase2
**Date**: 2025-11-26
**Status**: Complete

## Overview

This guide provides step-by-step instructions for implementing and validating Phase 2 frontend test coverage.

---

## Prerequisites

1. **Phase 1 Complete**: Services, hooks, contexts, utils at 95% coverage
2. **Development Environment**: Node.js 18+, npm 9+
3. **Dependencies Installed**: `npm install` in `frontend/react-Admin3`

---

## Quick Validation Commands

```bash
# Navigate to frontend directory
cd frontend/react-Admin3

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage --watchAll=false

# Run specific module tests
npm test -- --testPathPattern="components/Navigation"
npm test -- --testPathPattern="pages"
npm test -- --testPathPattern="theme"

# Run single test file
npm test -- AuthModal.test.js
```

---

## Coverage Validation Checklist

### Phase 2A: Components

- [ ] Common components: 4 new test files
  ```bash
  npm test -- --coverage --collectCoverageFrom="src/components/Common/**/*.js"
  ```

- [ ] Navigation components: 10 new test files
  ```bash
  npm test -- --coverage --collectCoverageFrom="src/components/Navigation/**/*.js"
  ```

- [ ] Product components: 6 new test files
  ```bash
  npm test -- --coverage --collectCoverageFrom="src/components/Product/**/*.js"
  ```

- [ ] Ordering components: 3 new test files
  ```bash
  npm test -- --coverage --collectCoverageFrom="src/components/Ordering/**/*.js"
  ```

- [ ] User components: 7 new test files
  ```bash
  npm test -- --coverage --collectCoverageFrom="src/components/User/**/*.js"
  ```

- [ ] Admin components: 10 new test files
  ```bash
  npm test -- --coverage --collectCoverageFrom="src/components/admin/**/*.js"
  ```

- [ ] Address components: 1 new test file
  ```bash
  npm test -- --coverage --collectCoverageFrom="src/components/Address/**/*.js"
  ```

### Phase 2B: Pages

- [ ] All 4 page test files created
  ```bash
  npm test -- --coverage --collectCoverageFrom="src/pages/**/*.js"
  ```

### Phase 2C: Store/Redux

- [ ] store/index.js tests enhanced
- [ ] filterSelectors.js tests added
  ```bash
  npm test -- --coverage --collectCoverageFrom="src/store/**/*.js"
  ```

### Phase 2D: Theme

- [ ] All 4 theme test files created
  ```bash
  npm test -- --coverage --collectCoverageFrom="src/theme/**/*.js"
  ```

### Phase 2E: Root Level

- [ ] App.js tests enhanced
- [ ] config.js tests added
  ```bash
  npm test -- --coverage --collectCoverageFrom="src/App.js" --collectCoverageFrom="src/config.js"
  ```

---

## Expected Coverage Targets

| Module | Target | Validation Command |
|--------|--------|-------------------|
| Components | 80% | `npm test -- --coverage --collectCoverageFrom="src/components/**/*.js"` |
| Pages | 80% | `npm test -- --coverage --collectCoverageFrom="src/pages/**/*.js"` |
| Store | 90% | `npm test -- --coverage --collectCoverageFrom="src/store/**/*.js"` |
| Theme | 70% | `npm test -- --coverage --collectCoverageFrom="src/theme/**/*.js"` |
| Overall | 60% | `npm test -- --coverage` |

---

## Test File Naming Convention

All test files must follow this pattern:
```
{ComponentName}.test.js
```

Located in `__tests__` folder within the component's directory:
```
components/
├── Navigation/
│   ├── MainNavBar.js
│   └── __tests__/
│       └── MainNavBar.test.js
```

---

## Common Test Patterns

### 1. Basic Component Test
```javascript
import { render, screen } from '@testing-library/react';
import ComponentName from '../ComponentName';

describe('ComponentName', () => {
  test('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByRole('...')).toBeInTheDocument();
  });
});
```

### 2. Component with Context
```javascript
import { render, screen } from '@testing-library/react';
import { CartContext } from '../../contexts/CartContext';
import ComponentName from '../ComponentName';

const mockCartValue = {
  items: [],
  addItem: jest.fn()
};

test('renders with context', () => {
  render(
    <CartContext.Provider value={mockCartValue}>
      <ComponentName />
    </CartContext.Provider>
  );
  expect(screen.getByRole('...')).toBeInTheDocument();
});
```

### 3. Component with Redux
```javascript
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ComponentName from '../ComponentName';

const mockStore = configureStore([]);

test('renders with Redux', () => {
  const store = mockStore({ filters: { subjects: [] } });

  render(
    <Provider store={store}>
      <ComponentName />
    </Provider>
  );
  expect(screen.getByRole('...')).toBeInTheDocument();
});
```

### 4. Component with Router
```javascript
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ComponentName from '../ComponentName';

test('renders with router', () => {
  render(
    <MemoryRouter>
      <ComponentName />
    </MemoryRouter>
  );
  expect(screen.getByRole('...')).toBeInTheDocument();
});
```

---

## Troubleshooting

### Test Fails with "act()" Warning
Wrap async operations in `waitFor`:
```javascript
await waitFor(() => {
  expect(screen.getByText('...')).toBeInTheDocument();
});
```

### Cannot Find Element
Use `findBy*` for async elements:
```javascript
const element = await screen.findByText('...');
```

### Mock Not Working
Ensure mock is defined before import:
```javascript
jest.mock('../service'); // Must be before import
import { useService } from '../service';
```

### Material-UI Component Not Rendering
Use correct ARIA roles:
```javascript
screen.getByRole('button');    // MUI Button
screen.getByRole('textbox');   // MUI TextField
screen.getByRole('dialog');    // MUI Dialog
```

---

## Final Validation

Run full coverage report:
```bash
npm test -- --coverage --watchAll=false --coverageReporters=text-summary
```

Expected output:
```
=============================== Coverage summary ===============================
Statements   : 60%+ ( target achieved )
Branches     : 50%+
Functions    : 60%+
Lines        : 60%+
================================================================================
```

---

## Success Criteria

- [ ] All high-priority component tests pass
- [ ] All page tests pass
- [ ] Store tests achieve 90%+ coverage
- [ ] Theme tests achieve 70%+ coverage
- [ ] Overall frontend coverage >= 60%
- [ ] No failing tests
- [ ] Coverage report generated successfully
