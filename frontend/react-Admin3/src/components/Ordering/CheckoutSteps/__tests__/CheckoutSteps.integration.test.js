import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CheckoutSteps from '../CheckoutSteps';

// Mock the cart context
const mockCartContext = {
  cartItems: [
    {
      id: 1,
      product_name: 'Test Product',
      subject_code: 'TEST',
      variation_name: 'Standard',
      actual_price: '50.00',
      quantity: 1
    }
  ],
  cartData: {
    id: 1,
    user: null,
    session_key: 'test-session',
    has_marking: false,
    has_material: false,
    has_tutorial: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
};

jest.mock('../../../contexts/CartContext', () => ({
  useCart: () => mockCartContext
}));

// Mock the services
jest.mock('../../../services/httpService');
jest.mock('../../../services/rulesEngineService');

describe('CheckoutSteps cart summary integration', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show cart summary panel on steps 2 and beyond', async () => {
    render(<CheckoutSteps onComplete={mockOnComplete} />);

    // Step 1 should NOT show cart summary panel (shows full cart review)
    expect(screen.getByText('Step 1: Review Your Cart')).toBeInTheDocument();
    expect(screen.queryByText(/Cart Summary.*Expand/)).not.toBeInTheDocument();

    // Move to step 2
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Step 2: Terms & Conditions')).toBeInTheDocument();
    });

    // Step 2 should show cart summary panel
    expect(screen.getByText('Cart Summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
  });

  it('should toggle cart summary panel expansion', async () => {
    render(<CheckoutSteps onComplete={mockOnComplete} />);

    // Move to step 2
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Step 2: Terms & Conditions')).toBeInTheDocument();
    });

    // Initially collapsed, should show expand button
    const expandButton = screen.getByRole('button', { name: /expand/i });
    expect(expandButton).toBeInTheDocument();

    // Click expand
    fireEvent.click(expandButton);

    // Should now show collapse button
    await waitFor(() => {
      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      expect(collapseButton).toBeInTheDocument();
    });

    // Should show product details when expanded
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('should maintain cart summary panel state across steps', async () => {
    render(<CheckoutSteps onComplete={mockOnComplete} />);

    // Move to step 2
    let nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Step 2: Terms & Conditions')).toBeInTheDocument();
    });

    // Expand cart summary
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
    });

    // Accept terms and move to step 3
    const termsCheckbox = screen.getByLabelText(/terms.*conditions/i);
    fireEvent.click(termsCheckbox);

    nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Step 3:')).toBeInTheDocument();
    });

    // Cart summary should still be expanded
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
  });
});