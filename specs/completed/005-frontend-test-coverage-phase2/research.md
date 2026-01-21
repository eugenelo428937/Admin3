# Research: Frontend Test Coverage Phase 2

**Feature**: 005-frontend-test-coverage-phase2
**Date**: 2025-11-26
**Status**: Complete

## Executive Summary

This research documents testing patterns, best practices, and decisions for extending frontend test coverage to Phase 2 modules (components, pages, store, theme). All patterns build on Phase 1 foundations established in spec 004.

---

## 1. Component Testing Patterns

### Decision: React Testing Library with User-Centric Approach
**Rationale**: Aligns with Phase 1 patterns; focuses on user behavior rather than implementation details.

**Alternatives Considered**:
- Enzyme: Deprecated, encourages testing implementation details
- Cypress Component Testing: Overkill for unit tests, better for E2E

### Standard Component Test Structure
```javascript
/**
 * Tests for ComponentName
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComponentName from '../ComponentName';

// Mock dependencies
jest.mock('../../services/someService');
jest.mock('../../contexts/SomeContext', () => ({
  useSomeContext: jest.fn()
}));

describe('ComponentName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    test('renders with default props', () => {
      render(<ComponentName />);
      expect(screen.getByRole('...')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    test('handles click events', async () => {
      const user = userEvent.setup();
      render(<ComponentName onClick={mockFn} />);

      await user.click(screen.getByRole('button'));
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe('error states', () => {
    test('displays error message on failure', () => {
      // ...
    });
  });
});
```

---

## 2. Context Mocking Strategy

### Decision: Wrapper Component Pattern
**Rationale**: Consistent with Phase 1; allows flexible context value injection.

### Implementation Pattern
```javascript
// test-utils.js or at top of test file
const renderWithProviders = (ui, {
  cartValue = { items: [], addItem: jest.fn() },
  authValue = { user: null, isAuthenticated: false },
  ...options
} = {}) => {
  const Wrapper = ({ children }) => (
    <CartContext.Provider value={cartValue}>
      <AuthContext.Provider value={authValue}>
        {children}
      </AuthContext.Provider>
    </CartContext.Provider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};
```

---

## 3. Redux Store Testing

### Decision: Mock Store for Component Tests, Real Store for Integration
**Rationale**: Isolation for unit tests, realistic behavior for integration tests.

### Pattern for Component Tests
```javascript
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

const mockStore = configureStore([]);

test('component with Redux', () => {
  const store = mockStore({
    filters: { subjects: [], categories: [] }
  });

  render(
    <Provider store={store}>
      <ComponentName />
    </Provider>
  );
});
```

### Pattern for Selector Tests
```javascript
import { selectFilters, selectActiveFilterCount } from '../filterSelectors';

describe('filterSelectors', () => {
  const state = {
    filters: {
      subjects: ['CM2', 'SA1'],
      categories: ['Bundle']
    }
  };

  test('selectFilters returns filter state', () => {
    expect(selectFilters(state)).toEqual(state.filters);
  });

  test('selectActiveFilterCount computes correctly', () => {
    expect(selectActiveFilterCount(state)).toBe(3);
  });
});
```

---

## 4. Router Mocking

### Decision: MemoryRouter with Configurable Routes
**Rationale**: Allows testing route-dependent behavior without browser.

### Pattern
```javascript
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const renderWithRouter = (ui, { route = '/', routes = [] } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={ui} />
        {routes.map(r => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
    </MemoryRouter>
  );
};
```

---

## 5. Material-UI Component Testing

### Decision: Query by Role and Test ID
**Rationale**: MUI components have proper ARIA roles; avoids brittle class selectors.

### Best Practices
```javascript
// Good: Query by role
screen.getByRole('button', { name: /submit/i });
screen.getByRole('textbox', { name: /email/i });
screen.getByRole('dialog');

// Good: Query by test ID for complex components
screen.getByTestId('product-card-123');

// Avoid: Query by class
screen.getByClassName('MuiButton-root'); // ❌
```

### Testing MUI Dialogs
```javascript
test('modal opens on trigger', async () => {
  const user = userEvent.setup();
  render(<ComponentWithModal />);

  await user.click(screen.getByRole('button', { name: /open/i }));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /title/i })).toBeInTheDocument();
});
```

---

## 6. Async Testing Patterns

### Decision: waitFor and findBy* for Async Operations
**Rationale**: Handles React state updates and API calls consistently.

### Patterns
```javascript
// For elements that appear after async operation
const element = await screen.findByText(/loaded/i);

// For waiting on state changes
await waitFor(() => {
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});

// For waiting on element to disappear
await waitFor(() => {
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
```

---

## 7. Page Testing Strategy

### Decision: Integration-Style Tests for Pages
**Rationale**: Pages orchestrate multiple components; test the composition.

### Pattern
```javascript
describe('HomePage', () => {
  beforeEach(() => {
    // Mock API responses
    jest.spyOn(productService, 'getProducts').mockResolvedValue(mockProducts);
  });

  test('renders page with all sections', async () => {
    render(<HomePage />);

    expect(await screen.findByRole('heading', { name: /welcome/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  test('handles navigation', async () => {
    const user = userEvent.setup();
    renderWithRouter(<HomePage />);

    await user.click(screen.getByRole('link', { name: /products/i }));

    expect(window.location.pathname).toBe('/products');
  });
});
```

---

## 8. Theme Testing Strategy

### Decision: Snapshot + Value Assertions
**Rationale**: Themes are configuration objects; verify structure and key values.

### Pattern
```javascript
import theme from '../theme';

describe('theme', () => {
  test('exports valid theme object', () => {
    expect(theme).toBeDefined();
    expect(theme.palette).toBeDefined();
    expect(theme.typography).toBeDefined();
  });

  test('primary color is correct', () => {
    expect(theme.palette.primary.main).toBe('#1976d2');
  });

  test('theme structure matches snapshot', () => {
    expect(theme).toMatchSnapshot();
  });
});
```

---

## 9. Coverage Strategy

### Decision: Progressive Coverage by Priority
**Rationale**: Focus on high-impact code paths first.

### Coverage Thresholds
| Module | Target | Minimum |
|--------|--------|---------|
| High-priority components | 90% | 80% |
| Medium-priority components | 85% | 75% |
| Low-priority components | 80% | 70% |
| Pages | 85% | 80% |
| Store | 95% | 90% |
| Theme | 80% | 70% |

### Excluded from Coverage
- `styleguide/*` - Documentation components
- `sandbox/*` - Development tools
- `Test/*Demo.js` - Demo components

---

## 10. Test File Organization

### Decision: Co-located `__tests__` Folders
**Rationale**: Consistent with Phase 1 and industry standards.

### Structure
```
components/
├── Navigation/
│   ├── MainNavBar.js
│   ├── AuthModal.js
│   └── __tests__/
│       ├── MainNavBar.test.js
│       └── AuthModal.test.js
```

---

## Summary of Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Testing Library | React Testing Library | User-centric, Phase 1 alignment |
| Context Mocking | Wrapper pattern | Flexible, reusable |
| Redux Testing | Mock store for units | Isolation |
| Router Testing | MemoryRouter | No browser needed |
| MUI Queries | Role and test ID | ARIA-compliant, stable |
| Async Testing | findBy* and waitFor | React 18 compatible |
| Page Testing | Integration style | Tests composition |
| Theme Testing | Snapshot + assertions | Structure verification |
| Coverage | Progressive by priority | High-impact first |
| Organization | Co-located __tests__ | Phase 1 consistency |
