import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import filtersReducer from '../store/slices/filtersSlice';

// Import context providers for optional use
import { CartContext } from '../contexts/CartContext';
import { ProductContext } from '../contexts/ProductContext';
import { TutorialChoiceContext } from '../contexts/TutorialChoiceContext';

/**
 * Default mock values for CartContext
 */
export const defaultCartContextValue = {
  cartItems: [],
  cartData: { items: [], vat_calculations: { region_info: { region: 'UK' } } },
  addToCart: jest.fn(() => Promise.resolve()),
  updateCartItem: jest.fn(() => Promise.resolve()),
  removeFromCart: jest.fn(() => Promise.resolve()),
  clearCart: jest.fn(() => Promise.resolve()),
  refreshCart: jest.fn(() => Promise.resolve()),
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
  fetchProducts: jest.fn(() => Promise.resolve()),
  getProductById: jest.fn(),
  selectedProduct: null,
  setSelectedProduct: jest.fn(),
};

/**
 * Default mock values for TutorialChoiceContext
 */
export const defaultTutorialChoiceContextValue = {
  tutorialChoices: {},
  showChoicePanel: false,
  activeSubject: null,
  editDialogOpen: null,
  getTutorialChoice: jest.fn(),
  addTutorialChoice: jest.fn(),
  removeTutorialChoice: jest.fn(),
  removeSubjectChoices: jest.fn(),
  removeAllChoices: jest.fn(),
  clearTutorialChoices: jest.fn(),
  updateChoiceLevel: jest.fn(),
  getSubjectChoices: jest.fn(() => ({})),
  getOrderedChoices: jest.fn(() => []),
  getAllChoices: jest.fn(() => ({})),
  isChoiceLevelAvailable: jest.fn(() => true),
  getNextAvailableChoiceLevel: jest.fn(() => '1st'),
  getTotalSubjectsWithChoices: jest.fn(() => 0),
  getTotalChoices: jest.fn(() => 0),
  isEventSelected: jest.fn(() => false),
  getEventChoiceLevel: jest.fn(() => null),
  showChoicePanelForSubject: jest.fn(),
  hideChoicePanel: jest.fn(),
  openEditDialog: jest.fn(),
  closeEditDialog: jest.fn(),
  getSubjectPrice: jest.fn(() => 0),
  getTotalPrice: jest.fn(() => 0),
  getDraftChoices: jest.fn(() => []),
  hasDraftChoices: jest.fn(() => false),
  markChoicesAsAdded: jest.fn(),
  restoreChoicesToDraft: jest.fn(),
  hasCartedChoices: jest.fn(() => false),
  getCartedChoices: jest.fn(() => []),
  validateChoices: jest.fn(() => ({ valid: true, errors: [] })),
  getChoiceValidationStatus: jest.fn(() => 'valid'),
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
    theme = createTheme(),
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
