import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import filtersReducer from '../store/slices/filtersSlice';

/**
 * Custom render function that wraps components with all necessary providers
 * (Router, Redux, Theme) for testing.
 * 
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} options.preloadedState - Initial Redux state
 * @param {Object} options.store - Custom Redux store (optional)
 * @param {Object} options.theme - Custom MUI theme (optional)
 * @param {Object} ...renderOptions - Additional options passed to RTL render
 * @returns {Object} RTL render result + store
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
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            {children}
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Export userEvent as a named export
export { default as userEvent } from '@testing-library/user-event';
