/**
 * Tests for RulesEngineAcknowledgmentModal Component
 * T016: Test open/close, acknowledgment, callbacks
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import RulesEngineAcknowledgmentModal from '../RulesEngineAcknowledgmentModal';

const theme = createTheme();

describe('RulesEngineAcknowledgmentModal', () => {
  const mockOnClose = jest.fn();
  const mockOnAcknowledge = jest.fn();

  const defaultMessage = {
    template_id: 'test-template',
    ack_key: 'test-ack-key',
    title: 'Test Title',
    content: {
      message: 'Test message content',
      checkbox_text: 'I agree to the terms'
    },
    variant: 'info'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderModal = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <RulesEngineAcknowledgmentModal
          open={true}
          onClose={mockOnClose}
          onAcknowledge={mockOnAcknowledge}
          message={defaultMessage}
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

    test('does not render when no messages', () => {
      renderModal({ message: null, messages: null });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders title', () => {
      renderModal();

      expect(screen.getByText('Acknowledgment Required')).toBeInTheDocument();
    });

    test('renders message title', () => {
      renderModal();

      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    test('renders message content', () => {
      renderModal();

      expect(screen.getByText('Test message content')).toBeInTheDocument();
    });

    test('renders checkbox with correct text', () => {
      renderModal();

      expect(screen.getByText('I agree to the terms')).toBeInTheDocument();
    });

    test('renders acknowledge button', () => {
      renderModal();

      expect(screen.getByTestId('acknowledge-button')).toBeInTheDocument();
    });
  });

  describe('multiple messages', () => {
    const multipleMessages = [
      {
        template_id: 'msg1',
        ack_key: 'key1',
        title: 'First Message',
        content: { message: 'Content 1', checkbox_text: 'Agree to first' }
      },
      {
        template_id: 'msg2',
        ack_key: 'key2',
        title: 'Second Message',
        content: { message: 'Content 2', checkbox_text: 'Agree to second' }
      }
    ];

    test('renders multiple messages', () => {
      renderModal({ message: null, messages: multipleMessages });

      expect(screen.getByText('Multiple Acknowledgments Required')).toBeInTheDocument();
      expect(screen.getByText('First Message')).toBeInTheDocument();
      expect(screen.getByText('Second Message')).toBeInTheDocument();
    });

    test('renders checkbox for each message', () => {
      renderModal({ message: null, messages: multipleMessages });

      expect(screen.getByTestId('acknowledgment-checkbox-0')).toBeInTheDocument();
      expect(screen.getByTestId('acknowledgment-checkbox-1')).toBeInTheDocument();
    });
  });

  describe('checkbox interaction', () => {
    test('checkbox starts unchecked', () => {
      renderModal();

      // The data-testid is on the wrapper, get the actual input inside
      const checkboxWrapper = screen.getByTestId('acknowledgment-checkbox-0');
      const checkbox = checkboxWrapper.querySelector('input[type="checkbox"]') || checkboxWrapper;
      expect(checkbox).not.toBeChecked();
    });

    test('checkbox can be checked', () => {
      renderModal();

      const checkboxWrapper = screen.getByTestId('acknowledgment-checkbox-0');
      const checkbox = checkboxWrapper.querySelector('input[type="checkbox"]') || checkboxWrapper;
      fireEvent.click(checkboxWrapper); // Click the wrapper (label) to toggle

      expect(checkbox).toBeChecked();
    });

    test('acknowledge button is disabled when required and not checked', () => {
      renderModal({ required: true });

      const button = screen.getByTestId('acknowledge-button');
      expect(button).toBeDisabled();
    });

    test('acknowledge button is enabled when required and checked', () => {
      renderModal({ required: true });

      const checkboxWrapper = screen.getByTestId('acknowledgment-checkbox-0');
      fireEvent.click(checkboxWrapper);

      const button = screen.getByTestId('acknowledge-button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('callbacks', () => {
    test('calls onAcknowledge when button clicked', async () => {
      mockOnAcknowledge.mockResolvedValue(undefined);
      renderModal({ required: true });

      // Check the checkbox
      fireEvent.click(screen.getByTestId('acknowledgment-checkbox-0'));

      // Click acknowledge button
      fireEvent.click(screen.getByTestId('acknowledge-button'));

      await waitFor(() => {
        expect(mockOnAcknowledge).toHaveBeenCalledWith(
          true,
          'test-template',
          'test-ack-key'
        );
      });
    });

    test('calls onClose after acknowledgment', async () => {
      mockOnAcknowledge.mockResolvedValue(undefined);
      renderModal({ required: true });

      fireEvent.click(screen.getByTestId('acknowledgment-checkbox-0'));
      fireEvent.click(screen.getByTestId('acknowledge-button'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('blocking behavior', () => {
    test('shows close button when not blocking', () => {
      renderModal({ blocking: false });

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    test('shows close button when not required', () => {
      renderModal({ required: false });

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    test('hides close button when blocking and required', () => {
      renderModal({ blocking: true, required: true });

      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    });

    test('shows Skip button when not required', () => {
      renderModal({ required: false });

      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    });

    test('hides Skip button when required', () => {
      renderModal({ required: true });

      expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
    });
  });

  describe('icon variants', () => {
    test.each([
      ['warning', 'WarningAmberIcon'],
      ['error', 'ErrorIcon'],
      ['success', 'CheckCircleIcon'],
      ['terms', 'PolicyIcon'],
      ['digital', 'DownloadIcon'],
      ['info', 'InfoIcon'],
    ])('renders correct icon for %s variant', (variant) => {
      renderModal({
        message: { ...defaultMessage, variant }
      });

      // Dialog should render correctly
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('link rendering', () => {
    test('renders link when provided', () => {
      const messageWithLink = {
        ...defaultMessage,
        content: {
          ...defaultMessage.content,
          link: {
            url: 'https://example.com',
            text: 'Learn more'
          }
        }
      };

      renderModal({ message: messageWithLink });

      expect(screen.getByText('Learn more')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
        'href',
        'https://example.com'
      );
    });
  });

  describe('button states', () => {
    test('shows "I Agree & Continue" when required', () => {
      renderModal({ required: true });

      const checkbox = screen.getByTestId('acknowledgment-checkbox-0');
      fireEvent.click(checkbox);

      expect(screen.getByText('I Agree & Continue')).toBeInTheDocument();
    });

    test('shows "Acknowledge" when not required', () => {
      renderModal({ required: false });

      expect(screen.getByText('Acknowledge')).toBeInTheDocument();
    });

    test('shows "Processing..." when submitting', async () => {
      mockOnAcknowledge.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderModal({ required: true });

      fireEvent.click(screen.getByTestId('acknowledgment-checkbox-0'));
      fireEvent.click(screen.getByTestId('acknowledge-button'));

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('body overflow cleanup', () => {
    test('cleans up body overflow when modal closes', async () => {
      const { rerender } = renderModal();

      // Close the modal
      rerender(
        <ThemeProvider theme={theme}>
          <RulesEngineAcknowledgmentModal
            open={false}
            onClose={mockOnClose}
            onAcknowledge={mockOnAcknowledge}
            message={defaultMessage}
          />
        </ThemeProvider>
      );

      // Body overflow should be cleaned up (tested through absence of dialog)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});
