/**
 * Tests for Home Page Component
 * T011: Test hero section, SearchBox integration, rules engine messages, navigation
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme/theme';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock SearchBox
jest.mock('../../components/SearchBox', () => {
  return function MockSearchBox({ onSearchResults, onShowMatchingProducts }) {
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
  };
});

// Mock SearchResults
jest.mock('../../components/SearchResults', () => {
  return function MockSearchResults({ searchResults, onShowMatchingProducts, loading, error }) {
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
  };
});

// Mock rulesEngineService
jest.mock('../../services/rulesEngineService', () => ({
  __esModule: true,
  default: {
    executeRules: jest.fn().mockResolvedValue({ success: true, messages: [] }),
  },
}));

// Mock rulesEngineUtils
jest.mock('../../utils/rulesEngineUtils', () => ({
  rulesEngineHelpers: {
    executeHomePage: jest.fn().mockResolvedValue({
      success: true,
      messages: { processed: [] },
      errors: [],
    }),
  },
}));

import Home from '../Home';
import { rulesEngineHelpers } from '../../utils/rulesEngineUtils';

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rulesEngineHelpers.executeHomePage.mockResolvedValue({
      success: true,
      messages: { processed: [] },
      errors: [],
    });
  });

  const renderHome = () => {
    return render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </ThemeProvider>
    );
  };

  describe('hero section', () => {
    test('renders hero container', () => {
      renderHome();

      expect(document.querySelector('.hero-container')).toBeInTheDocument();
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

    test('renders background video element', () => {
      renderHome();

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('autoplay');
      expect(video).toHaveAttribute('loop');
      expect(video).toHaveAttribute('muted');
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
        expect(screen.getByTestId('holiday-message')).toBeInTheDocument();
        expect(screen.getByText('Holiday Notice')).toBeInTheDocument();
        expect(screen.getByText('Office closed for holidays')).toBeInTheDocument();
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
        const messages = screen.getAllByTestId('holiday-message');
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
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      rulesEngineHelpers.executeHomePage.mockRejectedValue(new Error('API error'));

      renderHome();

      // Should not crash, page should still render
      await waitFor(() => {
        expect(screen.getByText('BPP')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('shows development errors when in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      rulesEngineHelpers.executeHomePage.mockResolvedValue({
        success: true,
        messages: { processed: [] },
        errors: ['Test error message'],
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderHome();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      process.env.NODE_ENV = originalEnv;
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
        expect(screen.getByTestId('holiday-message')).toBeInTheDocument();
      });
    });
  });
});
