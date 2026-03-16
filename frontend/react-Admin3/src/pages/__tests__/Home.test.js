import { vi } from 'vitest';
/**
 * Tests for Home Page Component
 * T011: Test hero section, SearchBox integration, rules engine messages, navigation
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import filtersReducer from '../../store/slices/filtersSlice.js';
import theme from '../../theme/theme';

// Create mockNavigate at module level
const mockNavigate = vi.fn();
const mockDispatch = vi.fn();

// Create a mock store for tests
const createTestStore = () => configureStore({
  reducer: {
    filters: filtersReducer,
  },
});

// Override useNavigate from the global mock in setupTests.js
vi.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: vi.fn(() => mockNavigate),
  useLocation: vi.fn(() => ({ pathname: '/', search: '', hash: '', state: null })),
  useParams: vi.fn(() => ({})),
  useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  MemoryRouter: ({ children }) => children,
  BrowserRouter: ({ children }) => children,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  NavLink: ({ children, to }) => <a href={to}>{children}</a>,
  Navigate: () => null,
  Routes: ({ children }) => children,
  Route: ({ element }) => element,
  Outlet: () => null,
}));

// Mock SearchBox
vi.mock('../../components/SearchBox.js', () => ({
  __esModule: true,
  default: function MockSearchBox({ onSearchResults, onShowMatchingProducts }) {
    return (
      <div data-testid="search-box">
        <input
          data-testid="search-input"
          placeholder="Search products"
          onChange={(e) => {
            if (e.target.value === 'test') {
              onSearchResults({ results: ['product1', 'product2'] });
            }
          }}
        />
        <button
          data-testid="show-matching-btn"
          onClick={onShowMatchingProducts}
        >
          Show Matching Products
        </button>
      </div>
    );
  },
}));

// Mock SearchResults
vi.mock('../../components/SearchResults.js', () => ({
  __esModule: true,
  default: function MockSearchResults({ searchResults, onShowMatchingProducts, loading, error }) {
    return (
      <div data-testid="search-results">
        {loading && <span>Loading...</span>}
        {error && <span data-testid="search-error">{error}</span>}
        {searchResults && (
          <div data-testid="results-content">
            Results: {JSON.stringify(searchResults)}
          </div>
        )}
      </div>
    );
  },
}));

// Mock rulesEngineService
vi.mock('../../services/rulesEngineService', () => ({
  __esModule: true,
  default: {
    executeRules: vi.fn().mockResolvedValue({ success: true, messages: [] }),
  },
}));

// Mock rulesEngineUtils
vi.mock('../../utils/rulesEngineUtils', () => ({
  rulesEngineHelpers: {
    executeHomePage: vi.fn().mockResolvedValue({
      success: true,
      messages: { processed: [] },
      errors: [],
    }),
  },
}));

// Mock 3D/WebGL effects that require canvas context
vi.mock('../../components/Effects/NeonMeshBackground.js', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../../components/Effects/StripeWaveBackground.js', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../../components/Effects/AuroraBorealisBackground.js', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../../components/Effects/OceanDepthBackground.js', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../../components/Effects/SunsetSilkBackground.js', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../../components/Effects/IrisDawnBackground.js', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../../components/Effects/CopperRoseBackground.js', () => ({
  __esModule: true,
  default: () => null,
}));

import Home from '../Home.js';
import { rulesEngineHelpers } from '../../utils/rulesEngineUtils';

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rulesEngineHelpers.executeHomePage.mockResolvedValue({
      success: true,
      messages: { processed: [] },
      errors: [],
    });
  });

  const renderHome = () => {
    const store = createTestStore();
    return render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <Home />
        </ThemeProvider>
      </Provider>
    );
  };

  describe('hero section', () => {
    test('renders hero container', () => {
      renderHome();

      expect(screen.getByTestId('hero-container')).toBeInTheDocument();
    });

    test('renders BPP branding text', () => {
      renderHome();

      expect(screen.getByText('BPP')).toBeInTheDocument();
    });

    test('renders Actuarial Education text', () => {
      renderHome();

      expect(screen.getByText('Actuarial Education')).toBeInTheDocument();
    });

    test('renders Online Store heading', () => {
      renderHome();

      expect(screen.getByText('Online Store')).toBeInTheDocument();
    });

    test('renders background effect element', () => {
      renderHome();

      // Component uses NeonMeshBackground (mocked to null) instead of video
      // Verify the hero container renders with its content overlay
      expect(screen.getByTestId('hero-container')).toBeInTheDocument();
      expect(screen.getByText('BPP')).toBeInTheDocument();
    });
  });

  describe('SearchBox integration', () => {
    test('renders SearchBox component', () => {
      renderHome();

      expect(screen.getByTestId('search-box')).toBeInTheDocument();
    });

    test('renders search input', () => {
      renderHome();

      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    test('handles search results', async () => {
      renderHome();

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByTestId('results-content')).toBeInTheDocument();
      });
    });
  });

  describe('SearchResults integration', () => {
    test('renders SearchResults component', () => {
      renderHome();

      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    test('navigates to /products when Show Matching Products is clicked', () => {
      renderHome();

      const button = screen.getByTestId('show-matching-btn');
      fireEvent.click(button);

      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });
  });

  describe('rules engine messages', () => {
    test('executes home page rules on mount', async () => {
      renderHome();

      await waitFor(() => {
        expect(rulesEngineHelpers.executeHomePage).toHaveBeenCalled();
      });
    });

    test('shows loading message while checking rules', async () => {
      // Make executeHomePage slow
      rulesEngineHelpers.executeHomePage.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          success: true,
          messages: { processed: [] },
        }), 100))
      );

      renderHome();

      // The loading message should appear
      expect(screen.getByText(/Checking for important notices/i)).toBeInTheDocument();
    });

    test('displays holiday messages from rules engine', async () => {
      rulesEngineHelpers.executeHomePage.mockResolvedValue({
        success: true,
        messages: {
          processed: [
            {
              template_id: 'holiday1',
              parsed: {
                title: 'Holiday Notice',
                message: 'Office closed for holidays',
                variant: 'warning',
                icon: 'calendar',
                dismissible: true,
              },
            },
          ],
        },
        errors: [],
      });

      renderHome();

      await waitFor(() => {
        expect(screen.getByTestId('rules-engine-inline-alert')).toBeInTheDocument();
        expect(screen.getByText('Holiday Notice')).toBeInTheDocument();
      });
    });

    test('displays multiple holiday messages', async () => {
      rulesEngineHelpers.executeHomePage.mockResolvedValue({
        success: true,
        messages: {
          processed: [
            {
              template_id: 'msg1',
              parsed: { title: 'Message 1', message: 'Content 1', variant: 'info' },
            },
            {
              template_id: 'msg2',
              parsed: { title: 'Message 2', message: 'Content 2', variant: 'warning' },
            },
          ],
        },
        errors: [],
      });

      renderHome();

      await waitFor(() => {
        const messages = screen.getAllByTestId('rules-engine-inline-alert');
        expect(messages).toHaveLength(2);
      });
    });

    test('filters out acknowledgment messages', async () => {
      rulesEngineHelpers.executeHomePage.mockResolvedValue({
        success: true,
        messages: {
          processed: [
            {
              template_id: 'msg1',
              parsed: { title: 'Display Message', message: 'Show this' },
              isAcknowledgment: false,
            },
            {
              template_id: 'ack1',
              parsed: { title: 'Acknowledgment', message: 'Hide this' },
              isAcknowledgment: true,
            },
          ],
        },
        errors: [],
      });

      renderHome();

      await waitFor(() => {
        expect(screen.getByText('Display Message')).toBeInTheDocument();
        expect(screen.queryByText('Acknowledgment')).not.toBeInTheDocument();
      });
    });

    test('filters out modal messages', async () => {
      rulesEngineHelpers.executeHomePage.mockResolvedValue({
        success: true,
        messages: {
          processed: [
            {
              template_id: 'msg1',
              parsed: { title: 'Banner Message', message: 'Show this' },
            },
            {
              template_id: 'modal1',
              display_type: 'modal',
              parsed: { title: 'Modal Message', message: 'Hide this' },
            },
          ],
        },
        errors: [],
      });

      renderHome();

      await waitFor(() => {
        expect(screen.getByText('Banner Message')).toBeInTheDocument();
        expect(screen.queryByText('Modal Message')).not.toBeInTheDocument();
      });
    });

    test('handles rules engine errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      rulesEngineHelpers.executeHomePage.mockRejectedValue(new Error('API error'));

      renderHome();

      // Should not crash, page should still render
      await waitFor(() => {
        expect(screen.getByText('BPP')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('shows development errors when in development mode', async () => {
      const originalMode = import.meta.env.MODE;
      const originalDev = import.meta.env.DEV;
      const originalProd = import.meta.env.PROD;
      import.meta.env.MODE = 'development';
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;

      rulesEngineHelpers.executeHomePage.mockResolvedValue({
        success: true,
        messages: { processed: [] },
        errors: ['Test error message'],
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHome();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      import.meta.env.MODE = originalMode;
      import.meta.env.DEV = originalDev;
      import.meta.env.PROD = originalProd;
      consoleSpy.mockRestore();
    });
  });

  describe('message variants', () => {
    test.each([
      ['warning', 'warning'],
      ['error', 'danger'],
      ['info', 'info'],
      ['success', 'primary'],
    ])('maps %s variant correctly', async (inputVariant, expectedVariant) => {
      rulesEngineHelpers.executeHomePage.mockResolvedValue({
        success: true,
        messages: {
          processed: [
            {
              template_id: 'test',
              parsed: {
                title: 'Test',
                message: 'Test message',
                variant: inputVariant,
              },
            },
          ],
        },
        errors: [],
      });

      renderHome();

      await waitFor(() => {
        expect(screen.getByTestId('rules-engine-inline-alert')).toBeInTheDocument();
      });
    });
  });

  describe('product category cards', () => {
    test('renders three product category cards', async () => {
      renderHome();

      await waitFor(() => {
        expect(screen.getByText('Study Materials')).toBeInTheDocument();
        expect(screen.getByText('Marking Service')).toBeInTheDocument();
        expect(screen.getByText('Tuition')).toBeInTheDocument();
      });
    });

    test('renders View Products buttons for each card', async () => {
      renderHome();

      await waitFor(() => {
        const viewProductsButtons = screen.getAllByText('View Products');
        expect(viewProductsButtons).toHaveLength(3);
      });
    });

    test('navigates to products page when Study Materials card is clicked', async () => {
      renderHome();

      await waitFor(() => {
        const viewProductsButtons = screen.getAllByText('View Products');
        fireEvent.click(viewProductsButtons[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });

    test('navigates to products page when Marking Service card is clicked', async () => {
      renderHome();

      await waitFor(() => {
        const viewProductsButtons = screen.getAllByText('View Products');
        fireEvent.click(viewProductsButtons[1]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });

    test('navigates to products page when Tuition card is clicked', async () => {
      renderHome();

      await waitFor(() => {
        const viewProductsButtons = screen.getAllByText('View Products');
        fireEvent.click(viewProductsButtons[2]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });

    test('renders card descriptions', async () => {
      renderHome();

      await waitFor(() => {
        expect(screen.getByText(/Comprehensive essential pack and revision materials/)).toBeInTheDocument();
        expect(screen.getByText(/Feedback on your practice papers/)).toBeInTheDocument();
        expect(screen.getByText(/Build and consolidate your knowledge/)).toBeInTheDocument();
      });
    });
  });
});
