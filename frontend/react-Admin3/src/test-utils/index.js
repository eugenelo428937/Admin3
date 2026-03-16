import { vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import appTheme from '../theme';
import { configureStore } from '@reduxjs/toolkit';
import filtersReducer from '../store/slices/filtersSlice.js';

// Import context providers for optional use
import { CartContext } from '../contexts/CartContext.tsx';
import { ProductContext } from '../contexts/ProductContext.js';
import { TutorialChoiceContext } from '../contexts/TutorialChoiceContext.js';

/**
 * Default mock values for CartContext
 */
export const defaultCartContextValue = {
  cartItems: [],
  cartData: { items: [], vat_calculations: { region_info: { region: 'UK' } } },
  addToCart: vi.fn(() => Promise.resolve()),
  updateCartItem: vi.fn(() => Promise.resolve()),
  removeFromCart: vi.fn(() => Promise.resolve()),
  clearCart: vi.fn(() => Promise.resolve()),
  refreshCart: vi.fn(() => Promise.resolve()),
  cartCount: 0,
  loading: false,
};

/**
 * Default mock values for ProductContext
 */
export const defaultProductContextValue = {
  products: [],
  loading: false,
  error: null,
  fetchProducts: vi.fn(() => Promise.resolve()),
  getProductById: vi.fn(),
  selectedProduct: null,
  setSelectedProduct: vi.fn(),
};

/**
 * Default mock values for TutorialChoiceContext
 */
export const defaultTutorialChoiceContextValue = {
  tutorialChoices: {},
  showChoicePanel: false,
  activeSubject: null,
  editDialogOpen: null,
  getTutorialChoice: vi.fn(),
  addTutorialChoice: vi.fn(),
  removeTutorialChoice: vi.fn(),
  removeSubjectChoices: vi.fn(),
  removeAllChoices: vi.fn(),
  clearTutorialChoices: vi.fn(),
  updateChoiceLevel: vi.fn(),
  getSubjectChoices: vi.fn(() => ({})),
  getOrderedChoices: vi.fn(() => []),
  getAllChoices: vi.fn(() => ({})),
  isChoiceLevelAvailable: vi.fn(() => true),
  getNextAvailableChoiceLevel: vi.fn(() => '1st'),
  getTotalSubjectsWithChoices: vi.fn(() => 0),
  getTotalChoices: vi.fn(() => 0),
  isEventSelected: vi.fn(() => false),
  getEventChoiceLevel: vi.fn(() => null),
  showChoicePanelForSubject: vi.fn(),
  hideChoicePanel: vi.fn(),
  openEditDialog: vi.fn(),
  closeEditDialog: vi.fn(),
  getSubjectPrice: vi.fn(() => 0),
  getTotalPrice: vi.fn(() => 0),
  getDraftChoices: vi.fn(() => []),
  hasDraftChoices: vi.fn(() => false),
  markChoicesAsAdded: vi.fn(),
  restoreChoicesToDraft: vi.fn(),
  hasCartedChoices: vi.fn(() => false),
  getCartedChoices: vi.fn(() => []),
  validateChoices: vi.fn(() => ({ valid: true, errors: [] })),
  getChoiceValidationStatus: vi.fn(() => 'valid'),
};

/**
 * Custom render function that wraps components with all necessary providers
 * (Router, Redux, Theme, and optionally Contexts) for testing.
 *
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} options.preloadedState - Initial Redux state
 * @param {Object} options.store - Custom Redux store (optional)
 * @param {Object} options.theme - Custom MUI theme (optional)
 * @param {string} options.route - Initial route for MemoryRouter (optional)
 * @param {boolean} options.useMemoryRouter - Use MemoryRouter instead of BrowserRouter
 * @param {Object} options.cartContextValue - Override CartContext values (optional)
 * @param {Object} options.productContextValue - Override ProductContext values (optional)
 * @param {Object} options.tutorialChoiceContextValue - Override TutorialChoiceContext values (optional)
 * @param {boolean} options.withCartContext - Include CartContext wrapper (default: false)
 * @param {boolean} options.withProductContext - Include ProductContext wrapper (default: false)
 * @param {boolean} options.withTutorialChoiceContext - Include TutorialChoiceContext wrapper (default: false)
 * @param {Object} ...renderOptions - Additional options passed to RTL render
 * @returns {Object} RTL render result + store + context values
 */
export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    // Automatically create a store instance if no store was passed in
    store = configureStore({
      reducer: {
        filters: filtersReducer,
      },
      preloadedState,
    }),
    theme = appTheme,
    route = '/',
    useMemoryRouter = false,
    // Context configuration
    withCartContext = false,
    withProductContext = false,
    withTutorialChoiceContext = false,
    cartContextValue = {},
    productContextValue = {},
    tutorialChoiceContextValue = {},
    ...renderOptions
  } = {}
) {
  // Merge default context values with overrides
  const mergedCartValue = { ...defaultCartContextValue, ...cartContextValue };
  const mergedProductValue = { ...defaultProductContextValue, ...productContextValue };
  const mergedTutorialChoiceValue = { ...defaultTutorialChoiceContextValue, ...tutorialChoiceContextValue };

  function Wrapper({ children }) {
    // Router wrapper selection
    const RouterWrapper = useMemoryRouter
      ? ({ children: c }) => <MemoryRouter initialEntries={[route]}>{c}</MemoryRouter>
      : ({ children: c }) => <BrowserRouter>{c}</BrowserRouter>;

    // Build context wrappers dynamically
    let wrappedContent = children;

    if (withTutorialChoiceContext) {
      wrappedContent = (
        <TutorialChoiceContext.Provider value={mergedTutorialChoiceValue}>
          {wrappedContent}
        </TutorialChoiceContext.Provider>
      );
    }

    if (withProductContext) {
      wrappedContent = (
        <ProductContext.Provider value={mergedProductValue}>
          {wrappedContent}
        </ProductContext.Provider>
      );
    }

    if (withCartContext) {
      wrappedContent = (
        <CartContext.Provider value={mergedCartValue}>
          {wrappedContent}
        </CartContext.Provider>
      );
    }

    return (
      <Provider store={store}>
        <RouterWrapper>
          <ThemeProvider theme={theme}>
            {wrappedContent}
          </ThemeProvider>
        </RouterWrapper>
      </Provider>
    );
  }

  return {
    store,
    cartContextValue: mergedCartValue,
    productContextValue: mergedProductValue,
    tutorialChoiceContextValue: mergedTutorialChoiceValue,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Render with all contexts enabled - convenience function for complex components
 */
export function renderWithAllProviders(ui, options = {}) {
  return renderWithProviders(ui, {
    ...options,
    withCartContext: true,
    withProductContext: true,
    withTutorialChoiceContext: true,
  });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Export userEvent as a named export
export { default as userEvent } from '@testing-library/user-event';
