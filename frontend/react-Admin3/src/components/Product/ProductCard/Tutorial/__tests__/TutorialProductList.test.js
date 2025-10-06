// Mock httpService before importing anything else
jest.mock('../../../../../services/httpService', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock tutorialService
jest.mock('../../../../../services/tutorialService', () => ({
  __esModule: true,
  default: {
    getComprehensiveTutorialData: jest.fn(),
  },
}));

// Mock CartContext
const mockCartState = {
  items: [],
  addToCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeFromCart: jest.fn(),
  refreshCart: jest.fn(),
};

jest.mock('../../../../../contexts/CartContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    useCart: () => ({
      get cartItems() { return mockCartState.items; },
      cartData: null,
      addToCart: mockCartState.addToCart,
      updateCartItem: mockCartState.updateCartItem,
      removeFromCart: mockCartState.removeFromCart,
      clearCart: jest.fn(),
      refreshCart: mockCartState.refreshCart,
      get cartCount() { return mockCartState.items.reduce((sum, item) => sum + (item.quantity || 1), 0); },
      loading: false,
    }),
    CartProvider: ({ children }) => React.createElement('div', null, children),
  };
});

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TutorialProductList from '../TutorialProductList';
import { TutorialChoiceProvider, useTutorialChoice } from '../../../../../contexts/TutorialChoiceContext';
import tutorialService from '../../../../../services/tutorialService';

// Mock tutorial data
const mockTutorialData = [
  {
    subject_code: 'CS2',
    subject_name: 'Core Statistics 2',
    location: 'Bristol',
    product_id: '101',
    price: '299.00',
    variations: [
      {
        id: 1,
        name: 'Live Tutorial',
        description: 'Live Tutorial',
        description_short: 'Live',
        location: 'Bristol',
        events: [
          {
            id: 201,
            event_code: 'TUT-CS2-BRI-001',
            venue: 'Bristol Centre',
            start_date: '2025-03-15',
          }
        ]
      }
    ]
  },
  {
    subject_code: 'SP1',
    subject_name: 'Actuarial Statistics',
    location: 'London',
    product_id: '102',
    price: '349.00',
    variations: [
      {
        id: 2,
        name: 'Live Tutorial',
        description: 'Live Tutorial',
        description_short: 'Live',
        location: 'London',
        events: [
          {
            id: 202,
            event_code: 'TUT-SP1-LON-001',
            venue: 'London Centre',
            start_date: '2025-03-20',
          }
        ]
      }
    ]
  }
];

// Helper function to render component with context
const renderWithContext = (props = {}) => {
  const defaultProps = {
    tutorialData: mockTutorialData,
    loading: false,
    ...props
  };

  return render(
    <TutorialChoiceProvider>
      <TutorialProductList {...defaultProps} />
    </TutorialChoiceProvider>
  );
};

// Helper to add a tutorial choice via context
const addChoiceViaContext = (wrapper) => {
  const { result } = renderHook(() => useTutorialChoice(), { wrapper });

  act(() => {
    result.current.addTutorialChoice('CS2', '1st', {
      eventId: 'evt-cs2-bri-001',
      eventCode: 'TUT-CS2-BRI-001',
      location: 'Bristol',
      subjectName: 'Core Statistics 2',
      productId: '101',
    });
  });

  return result;
};

describe('TutorialProductList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCartState.items = [];
    mockCartState.addToCart.mockResolvedValue({ success: true });
  });

  describe('Edit Handler - Dialog Opening', () => {
    it('should open tutorial selection dialog when Edit button clicked on summary bar', async () => {
      // Create a wrapper component that adds choice and renders list
      const TestWrapper = () => {
        const { addTutorialChoice } = useTutorialChoice();

        React.useEffect(() => {
          addTutorialChoice('CS2', '1st', {
            eventId: 'evt-cs2-bri-001',
            eventCode: 'TUT-CS2-BRI-001',
            location: 'Bristol',
            subjectName: 'Core Statistics 2',
            productId: '101',
          });
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []); // Empty array - only add choice once on mount

        return <TutorialProductList tutorialData={mockTutorialData} loading={false} />;
      };

      render(
        <TutorialChoiceProvider>
          <TestWrapper />
        </TutorialChoiceProvider>
      );

      // Wait for summary bar to appear
      const summaryBar = await screen.findByRole('alert', {}, { timeout: 3000 });
      expect(summaryBar).toBeInTheDocument();
      expect(within(summaryBar).getByText(/Core Statistics 2/i)).toBeInTheDocument();

      // Find and click Edit button on summary bar
      const editButton = within(summaryBar).getByRole('button', { name: /edit tutorial choices/i });
      expect(editButton).toBeInTheDocument();

      await userEvent.click(editButton);

      // EXPECTATION: Dialog should open for CS2 subject
      // Look for dialog elements that appear when TutorialProductCard dialog opens
      await waitFor(() => {
        const dialog = screen.queryByRole('dialog');
        expect(dialog).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify dialog contains CS2 content
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/Core Statistics 2/i)).toBeInTheDocument();
    });

    it('should open the correct dialog when multiple subjects have choices', async () => {
      // Create a wrapper component that adds choices for two subjects
      const TestWrapper = () => {
        const { addTutorialChoice } = useTutorialChoice();
        const [initialized, setInitialized] = React.useState(false);

        React.useEffect(() => {
          if (!initialized) {
            // Add choices sequentially with microtask delay
            Promise.resolve().then(() => {
              addTutorialChoice('CS2', '1st', {
                eventId: 'evt-cs2-bri-001',
                eventCode: 'TUT-CS2-BRI-001',
                location: 'Bristol',
                subjectName: 'Core Statistics 2',
                productId: '101',
              });
            }).then(() => {
              addTutorialChoice('SP1', '1st', {
                eventId: 'evt-sp1-lon-001',
                eventCode: 'TUT-SP1-LON-001',
                location: 'London',
                subjectName: 'Actuarial Statistics',
                productId: '102',
              });
            });
            setInitialized(true);
          }
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [initialized]); // Depend on initialized flag

        return <TutorialProductList tutorialData={mockTutorialData} loading={false} />;
      };

      render(
        <TutorialChoiceProvider>
          <TestWrapper />
        </TutorialChoiceProvider>
      );

      // Wait for both summary bars to appear
      await waitFor(() => {
        const summaryBars = screen.getAllByRole('alert');
        expect(summaryBars).toHaveLength(2);
      }, { timeout: 3000 });

      // Find the SP1 summary bar and click its Edit button
      const summaryBars = screen.getAllByRole('alert');
      const sp1Bar = summaryBars.find(bar =>
        within(bar).queryByText(/Actuarial Statistics/i)
      );
      expect(sp1Bar).toBeDefined();

      const editButton = within(sp1Bar).getByRole('button', { name: /edit tutorial choices/i });
      await userEvent.click(editButton);

      // EXPECTATION: Dialog should open for SP1 subject (not CS2)
      await waitFor(() => {
        const dialog = screen.queryByRole('dialog');
        expect(dialog).toBeInTheDocument();
      }, { timeout: 3000 });

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/Actuarial Statistics/i)).toBeInTheDocument();
      expect(within(dialog).queryByText(/Core Statistics 2/i)).not.toBeInTheDocument();
    });
  });
});
