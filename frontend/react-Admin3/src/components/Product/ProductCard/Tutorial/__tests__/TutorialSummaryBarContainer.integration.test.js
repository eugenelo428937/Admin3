// Mock httpService before importing anything else
jest.mock('../../../../../services/httpService', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock CartContext
const mockCartState = {
  addToCart: jest.fn(),
};

jest.mock('../../../../../contexts/CartContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    useCart: () => ({
      addToCart: mockCartState.addToCart,
      cartItems: [],
      loading: false,
    }),
    CartProvider: ({ children }) => React.createElement('div', null, children),
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TutorialChoiceProvider } from '../../../../../contexts/TutorialChoiceContext';
import { CartProvider } from '../../../../../contexts/CartContext';
import TutorialSummaryBarContainer from '../TutorialSummaryBarContainer';

/**
 * Integration Test Suite: TutorialSummaryBarContainer
 * T016-T017: Cross-page visibility and vertical stacking
 */
describe('TutorialSummaryBarContainer - Integration', () => {
  const mockChoices = {
    'CS2': {
      '1st': {
        eventId: 'evt-cs2-bri-001',
        eventCode: 'TUT-CS2-BRI-001',
        location: 'Bristol',
        choiceLevel: '1st',
        isDraft: true,
        productId: 456,
        productName: 'CS2 - Actuarial Modelling',
        subjectName: 'CS2',
        variation: { id: 123, prices: [{ price_type: 'standard', amount: 95.00 }] }
      }
    }
  };

  /**
   * T016: Integration test - cross-page visibility
   * Verify container persists with fixed positioning (route-independent)
   *
   * Architecture: Component uses fixed positioning and context state,
   * making it visible across all routes without route-specific logic
   */
  it('should use fixed positioning for cross-page visibility', () => {
    const TestWrapper = ({ children }) => (
      <CartProvider>
        <TutorialChoiceProvider initialChoices={mockChoices}>
          {children}
        </TutorialChoiceProvider>
      </CartProvider>
    );

    const { container } = render(
      <TutorialSummaryBarContainer />,
      { wrapper: TestWrapper }
    );

    // Verify container renders with summary bar
    const summaryBars = screen.getAllByRole('alert');
    expect(summaryBars).toHaveLength(1);

    // Verify container has fixed positioning
    const containerElement = container.querySelector('[class*="MuiBox-root"]');
    expect(containerElement).toBeInTheDocument();

    // Verify fixed positioning style
    const style = window.getComputedStyle(containerElement);
    expect(style.position).toBe('fixed');
    expect(style.bottom).toBe('16px');
  });

  /**
   * T017: Integration test - vertical stacking
   * Verify multiple summary bars stack vertically with gap
   */
  it('should stack vertically with gap when multiple subjects have choices', () => {
    const multipleChoices = {
      'CS2': {
        '1st': {
          eventId: 'evt-cs2-bri-001',
          eventCode: 'TUT-CS2-BRI-001',
          location: 'Bristol',
          choiceLevel: '1st',
          isDraft: true,
          productId: 456,
          productName: 'CS2 - Actuarial Modelling',
          subjectName: 'CS2',
          variation: { id: 123, prices: [{ price_type: 'standard', amount: 95.00 }] }
        }
      },
      'CP1': {
        '1st': {
          eventId: 'evt-cp1-man-001',
          eventCode: 'TUT-CP1-MAN-001',
          location: 'Manchester',
          choiceLevel: '1st',
          isDraft: true,
          productId: 457,
          productName: 'CP1 - Actuarial Practice',
          subjectName: 'CP1',
          variation: { id: 124, prices: [{ price_type: 'standard', amount: 95.00 }] }
        }
      }
    };

    const TestWrapper = ({ children }) => (
      <CartProvider>
        <TutorialChoiceProvider initialChoices={multipleChoices}>
          {children}
        </TutorialChoiceProvider>
      </CartProvider>
    );

    const { container } = render(
      <TutorialSummaryBarContainer />,
      { wrapper: TestWrapper }
    );

    // Verify 2 summary bars render
    const summaryBars = screen.getAllByRole('alert');
    expect(summaryBars).toHaveLength(2);

    // Verify container has flexDirection: 'column' for vertical stacking
    const containerElement = container.querySelector('[class*="MuiBox-root"]');
    expect(containerElement).toBeInTheDocument();

    // Check computed style includes flex layout properties
    // Material-UI applies styles via sx prop which gets converted to CSS classes
    const style = window.getComputedStyle(containerElement);
    expect(style.display).toBe('flex');
    expect(style.flexDirection).toBe('column');
  });
});
