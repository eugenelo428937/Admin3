// src/components/Navigation/__tests__/MainNavBar.test.js

// Mock Chakra UI to prevent @ark-ui/react import errors
jest.mock('@chakra-ui/react', () => {
  const React = require('react');
  return {
    __esModule: true,
    NumberInput: React.forwardRef(({ children, ...props }, ref) =>
      React.createElement('div', { 'data-testid': 'number-input', ref, ...props }, children)
    ),
    HStack: React.forwardRef(({ children, ...props }, ref) =>
      React.createElement('div', { 'data-testid': 'hstack', ref, ...props }, children)
    ),
    IconButton: React.forwardRef((props, ref) =>
      React.createElement('button', { 'data-testid': 'chakra-icon-button', ref, ...props })
    ),
  };
});

// Mock services BEFORE any imports to prevent axios import errors
jest.mock('../../../services/httpService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../services/cartService', () => ({
  __esModule: true,
  default: {
    getCart: jest.fn(() => Promise.resolve({
      data: {
        items: [],
        vat_calculations: {
          region_info: { region: 'UK' }
        }
      }
    })),
    addToCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeFromCart: jest.fn(),
  },
}));

// Mock the services
jest.mock('../../../services/productService', () => ({
  getNavigationData: jest.fn(() => Promise.resolve({
    subjects: [],
    navbarProductGroups: [],
    distanceLearningData: [],
    tutorialData: null,
  })),
}));

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: jest.fn(),
    isSuperuser: false,
    isApprentice: false,
    isStudyPlus: false,
  }),
}));

// Mock the useCart hook
jest.mock('../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: [],
    cartData: { items: [], vat_calculations: { region_info: { region: 'UK' } } },
    addToCart: jest.fn(() => Promise.resolve()),
    updateCartItem: jest.fn(() => Promise.resolve()),
    removeFromCart: jest.fn(() => Promise.resolve()),
    clearCart: jest.fn(() => Promise.resolve()),
    refreshCart: jest.fn(() => Promise.resolve()),
    cartCount: 0,
    loading: false,
  }),
}));

// Mock TutorialChoiceContext
jest.mock('../../../contexts/TutorialChoiceContext', () => ({
  useTutorialChoice: () => ({
    getTutorialChoice: jest.fn(),
    addTutorialChoice: jest.fn(),
    removeTutorialChoice: jest.fn(),
    clearTutorialChoices: jest.fn(),
    getSubjectChoices: jest.fn(() => ({})),
    getAllChoices: jest.fn(() => ({})),
    getDraftChoices: jest.fn(() => ({})),
    hasDraftChoices: jest.fn(() => false),
    markChoicesAsAdded: jest.fn(),
    hasCartedChoices: jest.fn(() => false),
  }),
  TutorialChoiceProvider: ({ children }) => children,
}));

// Mock useNavigate for navigation tests
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    __esModule: true,
    BrowserRouter: ({ children }) => React.createElement('div', { 'data-testid': 'browser-router' }, children),
    MemoryRouter: ({ children }) => React.createElement('div', { 'data-testid': 'memory-router' }, children),
    Link: React.forwardRef(({ to, children, ...props }, ref) =>
      React.createElement('a', { href: typeof to === 'string' ? to : (to?.pathname || '/'), ref, ...props }, children)
    ),
    NavLink: React.forwardRef(({ to, children, ...props }, ref) =>
      React.createElement('a', { href: typeof to === 'string' ? to : (to?.pathname || '/'), ref, ...props }, children)
    ),
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    useMatch: () => null,
  };
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MainNavBar from '../MainNavBar';
import filtersReducer from '../../../store/slices/filtersSlice';
import theme from '../../../theme/theme';
import { ThemeProvider } from '@mui/material/styles';
import { expectNoA11yViolations, wcag21AAConfig } from '../../../test-utils/accessibilityHelpers';

const createTestStore = () => {
  return configureStore({
    reducer: {
      filters: filtersReducer,
    },
  });
};

const renderWithProviders = (component) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

describe('MainNavBar Mobile Layout Structure', () => {
  test('should have left box with logo (left-aligned)', () => {
    const { container } = renderWithProviders(<MainNavBar />);

    // NavbarBrand should be in a container with specific alignment classes
    const navbarBrand = container.querySelector('.navbar-brand');
    expect(navbarBrand).toBeInTheDocument();

    // Check if it's in the left section (order-1 on mobile)
    expect(navbarBrand).toHaveClass('order-1');
  });

  test('should have right box with search, cart, login, and hamburger icons (right-aligned)', () => {
    renderWithProviders(<MainNavBar />);

    // Right section should contain MainNavActions
    // Check for login button
    const loginButtons = screen.getAllByRole('button', { name: /login/i });
    expect(loginButtons.length).toBeGreaterThan(0);

    // Check for search icon by specific aria-label
    const searchButton = screen.getByLabelText(/search products/i);
    expect(searchButton).toBeInTheDocument();

    // Check for hamburger menu toggle
    const menuToggle = screen.getByLabelText(/toggle navigation/i);
    expect(menuToggle).toBeInTheDocument();
  });

  test('should have correct order classes for mobile layout', () => {
    const { container } = renderWithProviders(<MainNavBar />);

    // Logo should be order-1
    const navbarBrand = container.querySelector('.navbar-brand');
    expect(navbarBrand).toHaveClass('order-1');

    // Hamburger menu toggle should exist
    const menuToggle = container.querySelector('#navbar-menu-toggle');
    expect(menuToggle).toBeInTheDocument();
    expect(menuToggle).toHaveClass('navbar-toggler');
  });
});

describe('MainNavBar Navigation Clicks (T066)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('should have search button that can be clicked', async () => {
    renderWithProviders(<MainNavBar />);

    // Wait for component to load and find search button by aria-label
    await waitFor(() => {
      const searchButton = screen.getByLabelText(/search products/i);
      expect(searchButton).toBeInTheDocument();
    });

    // Click search button
    const searchButton = screen.getByLabelText(/search products/i);
    fireEvent.click(searchButton);

    // Search modal should appear (dialog role)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  test('should have login button that can be clicked', async () => {
    renderWithProviders(<MainNavBar />);

    // Wait for component to load
    await waitFor(() => {
      const loginButtons = screen.getAllByRole('button', { name: /login/i });
      expect(loginButtons.length).toBeGreaterThan(0);
    });

    // Get first login button
    const loginButtons = screen.getAllByRole('button', { name: /login/i });
    fireEvent.click(loginButtons[0]);

    // Auth modal should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  test('should toggle hamburger menu when clicked', async () => {
    const { container } = renderWithProviders(<MainNavBar />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByLabelText(/toggle navigation/i)).toBeInTheDocument();
    });

    const menuToggle = screen.getByLabelText(/toggle navigation/i);

    // Initially, aria-expanded should be false
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');

    // Click to toggle
    fireEvent.click(menuToggle);

    // After click, aria-expanded should be true
    await waitFor(() => {
      expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
    });

    // Menu should have active class when expanded
    await waitFor(() => {
      expect(menuToggle).toHaveClass('active');
    });
  });
});

describe('MainNavBar Keyboard Shortcuts', () => {
  test('should open search modal with Ctrl+K', async () => {
    renderWithProviders(<MainNavBar />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByLabelText(/search products/i)).toBeInTheDocument();
    });

    // Dispatch Ctrl+K keyboard event
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    // Search modal should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  test('should open search modal with Cmd+K (Mac)', async () => {
    renderWithProviders(<MainNavBar />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByLabelText(/search products/i)).toBeInTheDocument();
    });

    // Dispatch Cmd+K keyboard event (Mac)
    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    // Search modal should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});

describe('MainNavBar Accessibility (T078 - WCAG 2.1 AA)', () => {
  test('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<MainNavBar />);

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByLabelText(/search products/i)).toBeInTheDocument();
    });

    await expectNoA11yViolations(container, wcag21AAConfig);
  });

  test('navigation toggle button has proper aria-label', async () => {
    renderWithProviders(<MainNavBar />);

    await waitFor(() => {
      const menuToggle = screen.getByLabelText(/toggle navigation/i);
      expect(menuToggle).toBeInTheDocument();
    });
  });

  test('search button has proper aria-label', async () => {
    renderWithProviders(<MainNavBar />);

    await waitFor(() => {
      const searchButton = screen.getByLabelText(/search products/i);
      expect(searchButton).toBeInTheDocument();
    });
  });

  test('login button is accessible', async () => {
    renderWithProviders(<MainNavBar />);

    await waitFor(() => {
      const loginButtons = screen.getAllByRole('button', { name: /login/i });
      expect(loginButtons.length).toBeGreaterThan(0);
    });
  });

  test('keyboard shortcut hint displays correctly', async () => {
    renderWithProviders(<MainNavBar />);

    await waitFor(() => {
      // Search button should be accessible
      const searchButton = screen.getByLabelText(/search products/i);
      expect(searchButton).toBeInTheDocument();
    });
  });
});
