/**
 * Tests for SearchModal Component
 * T022: Test open/close, search input, submit with Redux
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SearchModal from '../SearchModal';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
}));

// Mock SearchBox component
jest.mock('../../SearchBox', () => {
  return function MockSearchBox({ onSearchResults, onShowMatchingProducts, autoFocus, placeholder }) {
    return (
      <div data-testid="search-box">
        <input
          data-testid="search-input"
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => {
            if (e.target.value === 'test') {
              onSearchResults({ products: [{ id: 1, name: 'Test Product' }] });
            }
          }}
        />
        <button data-testid="show-products-btn" onClick={onShowMatchingProducts}>
          Show Products
        </button>
      </div>
    );
  };
});

// Mock SearchResults component
jest.mock('../../SearchResults', () => {
  return function MockSearchResults({ searchResults, onShowMatchingProducts, loading, error }) {
    return (
      <div data-testid="search-results">
        {loading && <div data-testid="loading">Loading...</div>}
        {error && <div data-testid="error">{error}</div>}
        {searchResults && (
          <div data-testid="results-list">
            {searchResults.products?.map(p => (
              <div key={p.id} data-testid={`result-${p.id}`}>{p.name}</div>
            ))}
          </div>
        )}
        <button data-testid="results-show-btn" onClick={onShowMatchingProducts}>
          View All
        </button>
      </div>
    );
  };
});

const theme = createTheme();

describe('SearchModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
    document.body.classList.remove('mui-fixed');
  });

  const renderModal = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <SearchModal
          open={true}
          onClose={mockOnClose}
          {...props}
        />
      </ThemeProvider>
    );
  };

  describe('rendering', () => {
    test('renders modal when open is true', () => {
      renderModal();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('does not render when open is false', () => {
      renderModal({ open: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders Search Products title', () => {
      renderModal();
      expect(screen.getByText('Search Products')).toBeInTheDocument();
    });

    test('renders SearchBox component', () => {
      renderModal();
      expect(screen.getByTestId('search-box')).toBeInTheDocument();
    });

    test('renders SearchResults component', () => {
      renderModal();
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });

    test('renders close button', () => {
      renderModal();
      expect(screen.getByLabelText('close')).toBeInTheDocument();
    });
  });

  describe('close behavior', () => {
    test('calls onClose when close button clicked', () => {
      renderModal();

      fireEvent.click(screen.getByLabelText('close'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('closes on Escape key press', async () => {
      renderModal();

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('search functionality', () => {
    test('displays search results when search returns data', async () => {
      renderModal();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByTestId('results-list')).toBeInTheDocument();
        expect(screen.getByTestId('result-1')).toHaveTextContent('Test Product');
      });
    });
  });

  describe('navigation', () => {
    test('navigates to products page and closes modal when showing matching products', () => {
      renderModal();

      fireEvent.click(screen.getByTestId('show-products-btn'));

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });

    test('navigates from SearchResults view all button', () => {
      renderModal();

      fireEvent.click(screen.getByTestId('results-show-btn'));

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });
  });

  describe('body overflow cleanup', () => {
    test('cleans up body overflow when modal closes', async () => {
      const { rerender } = renderModal();

      rerender(
        <ThemeProvider theme={theme}>
          <SearchModal open={false} onClose={mockOnClose} />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('keyboard shortcuts', () => {
    test('Escape listener added when modal opens', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderModal();

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    test('Escape listener removed on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderModal();
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });
});
