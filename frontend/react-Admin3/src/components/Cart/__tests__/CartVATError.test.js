/**
 * Test suite for CartVATError component (Phase 4, Task T039)
 *
 * Tests VAT error display and retry functionality:
 * - Error message display
 * - "Recalculate VAT" button
 * - API call on retry button click
 * - Error cleared on successful retry
 * - Retry failure handling
 * - Loading state during retry
 *
 * TDD RED Phase: These tests should fail until component is implemented
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartVATError from '../CartVATError';

describe('CartVATError Component', () => {
  const mockErrorData = {
    error: true,
    errorMessage: 'VAT calculation failed. Rules engine unavailable.'
  };

  const mockHandlers = {
    onRetry: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays error message', () => {
    render(<CartVATError {...mockErrorData} {...mockHandlers} />);

    expect(screen.getByText(/VAT calculation failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Rules engine unavailable/i)).toBeInTheDocument();
  });

  it('renders as Material-UI Alert component with error severity', () => {
    const { container } = render(<CartVATError {...mockErrorData} {...mockHandlers} />);

    // Should use Material-UI Alert
    const alert = container.querySelector('[class*="MuiAlert"]');
    expect(alert).toBeInTheDocument();

    // Should have error severity
    const errorAlert = container.querySelector('[class*="MuiAlert-standardError"]');
    expect(errorAlert).toBeInTheDocument();
  });

  it('renders "Recalculate VAT" button', () => {
    render(<CartVATError {...mockErrorData} {...mockHandlers} />);

    const retryButton = screen.getByRole('button', { name: /recalculate vat/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    render(<CartVATError {...mockErrorData} {...mockHandlers} />);

    const retryButton = screen.getByRole('button', { name: /recalculate vat/i });
    fireEvent.click(retryButton);

    expect(mockHandlers.onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during retry', async () => {
    // Mock async onRetry handler
    const asyncRetry = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<CartVATError {...mockErrorData} onRetry={asyncRetry} />);

    const retryButton = screen.getByRole('button', { name: /recalculate vat/i });
    fireEvent.click(retryButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByRole('progressbar') || screen.getByText(/loading|calculating/i)).toBeInTheDocument();
    });

    // Wait for async operation to complete
    await waitFor(() => {
      expect(asyncRetry).toHaveBeenCalled();
    });
  });

  it('disables retry button while loading', async () => {
    const asyncRetry = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<CartVATError {...mockErrorData} onRetry={asyncRetry} />);

    const retryButton = screen.getByRole('button', { name: /recalculate vat/i });
    fireEvent.click(retryButton);

    // Button should be disabled during retry
    await waitFor(() => {
      expect(retryButton).toBeDisabled();
    });
  });

  it('handles successful retry (error cleared)', async () => {
    const onRetry = jest.fn(() => Promise.resolve({ success: true }));

    const { rerender } = render(
      <CartVATError {...mockErrorData} onRetry={onRetry} />
    );

    const retryButton = screen.getByRole('button', { name: /recalculate vat/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalled();
    });

    // After successful retry, component should not render
    rerender(<CartVATError error={false} errorMessage={null} onRetry={onRetry} />);

    expect(screen.queryByText(/VAT calculation failed/i)).not.toBeInTheDocument();
  });

  it('handles retry failure', async () => {
    const onRetry = jest.fn(() => Promise.reject(new Error('Retry failed')));

    render(<CartVATError {...mockErrorData} onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /recalculate vat/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalled();
    });

    // Error message should still be displayed
    expect(screen.getByText(/VAT calculation failed/i)).toBeInTheDocument();

    // May show additional failure message
    expect(screen.getByText(/retry failed|failed to recalculate/i)).toBeInTheDocument();
  });

  it('does not render when error prop is false', () => {
    const noError = {
      error: false,
      errorMessage: null
    };

    const { container } = render(<CartVATError {...noError} {...mockHandlers} />);

    // Component should not render anything
    expect(container.firstChild).toBeNull();
  });

  it('renders with default error message if errorMessage prop is missing', () => {
    const minimalError = {
      error: true
    };

    render(<CartVATError {...minimalError} {...mockHandlers} />);

    // Should display generic error message
    expect(screen.getByText(/VAT calculation error|error calculating VAT/i)).toBeInTheDocument();
  });

  it('includes error icon in alert', () => {
    render(<CartVATError {...mockErrorData} {...mockHandlers} />);

    // Material-UI Alert should have an error icon
    const alert = screen.getByRole('alert');
    const icon = alert.querySelector('[data-testid="ErrorOutlineIcon"]');

    expect(icon).toBeInTheDocument();
  });

  it('applies custom className if provided', () => {
    const { container } = render(
      <CartVATError
        {...mockErrorData}
        {...mockHandlers}
        className="custom-error-alert"
      />
    );

    expect(container.firstChild).toHaveClass('custom-error-alert');
  });

  it('shows different error messages for different error types', () => {
    const networkError = {
      error: true,
      errorMessage: 'Network connection failed'
    };

    render(<CartVATError {...networkError} {...mockHandlers} />);

    expect(screen.getByText(/Network connection failed/i)).toBeInTheDocument();
  });

  it('allows dismissing error if onDismiss handler provided', () => {
    const onDismiss = jest.fn();

    render(
      <CartVATError
        {...mockErrorData}
        {...mockHandlers}
        onDismiss={onDismiss}
      />
    );

    // Should have close/dismiss button
    const dismissButton = screen.getByRole('button', { name: /close|dismiss/i });
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders retry button with appropriate icon', () => {
    render(<CartVATError {...mockErrorData} {...mockHandlers} />);

    const retryButton = screen.getByRole('button', { name: /recalculate vat/i });

    // Button should have refresh/retry icon
    const icon = retryButton.querySelector('[data-testid*="Refresh"]');
    expect(icon).toBeInTheDocument();
  });

  it('maintains accessibility (aria-live region)', () => {
    const { container } = render(<CartVATError {...mockErrorData} {...mockHandlers} />);

    // Alert should be announced to screen readers
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
  });
});
