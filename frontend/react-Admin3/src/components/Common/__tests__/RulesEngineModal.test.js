import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RulesEngineModal from '../RulesEngineModal';

describe('RulesEngineModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when open is false', () => {
    render(
      <RulesEngineModal
        open={false}
        onClose={mockOnClose}
        messages={[{ content: { title: 'Test', message: 'Test message' } }]}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should not render when messages array is empty', () => {
    render(
      <RulesEngineModal
        open={true}
        onClose={mockOnClose}
        messages={[]}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render single message with title from content', () => {
    const singleMessage = {
      content: {
        title: 'Import Tax Notice',
        message: 'Students based outside the UK may incur import tax on delivery of materials.',
        details: ['Any VAT charges are recipient responsibility', 'Contact customs for more info']
      },
      variant: 'warning'
    };

    render(
      <RulesEngineModal
        open={true}
        onClose={mockOnClose}
        messages={singleMessage}
      />
    );

    // Modal should be rendered
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Title should be from message content (single message)
    expect(screen.getByText('Import Tax Notice')).toBeInTheDocument();

    // Message content should be displayed
    expect(screen.getByText(/Students based outside the UK may incur import tax/)).toBeInTheDocument();

    // Details should be displayed as list
    expect(screen.getByText('Any VAT charges are recipient responsibility')).toBeInTheDocument();
    expect(screen.getByText('Contact customs for more info')).toBeInTheDocument();

    // Close button should be present
    expect(screen.getByText('I Understand')).toBeInTheDocument();
  });

  it('should render multiple messages with pagination and "Important Notice" title', () => {
    const multipleMessages = [
      {
        content: {
          title: 'Import Tax Notice',
          message: 'Students based outside the UK may incur import tax.'
        },
        variant: 'warning'
      },
      {
        content: {
          title: 'Shipping Notice',
          message: 'Please allow 5-7 business days for delivery.'
        },
        variant: 'info'
      },
      {
        content: {
          title: 'Terms Update',
          message: 'Our terms and conditions have been updated.'
        },
        variant: 'info'
      }
    ];

    render(
      <RulesEngineModal
        open={true}
        onClose={mockOnClose}
        messages={multipleMessages}
      />
    );

    // Modal should be rendered
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Main title should be "Important Notice" for multiple messages
    expect(screen.getByText('Important Notice')).toBeInTheDocument();

    // First message content should be displayed with its own title as subtitle
    expect(screen.getByText('Import Tax Notice')).toBeInTheDocument();
    expect(screen.getByText('Students based outside the UK may incur import tax.')).toBeInTheDocument();

    // Pagination should be present
    expect(screen.getByRole('navigation')).toBeInTheDocument();

    // Check for pagination buttons (Material-UI uses different labels)
    const pagination = screen.getByRole('navigation');
    expect(pagination).toBeInTheDocument();

    // Verify there are multiple page buttons
    const pageButtons = screen.getAllByRole('button');
    expect(pageButtons.length).toBeGreaterThan(3); // At least "First", "Previous", "Next", "Last", and page numbers
  });

  it('should navigate between pages in multi-message modal', () => {
    const multipleMessages = [
      {
        content: {
          title: 'Message 1',
          message: 'This is the first message.'
        }
      },
      {
        content: {
          title: 'Message 2',
          message: 'This is the second message.'
        }
      }
    ];

    render(
      <RulesEngineModal
        open={true}
        onClose={mockOnClose}
        messages={multipleMessages}
      />
    );

    // Should start on page 1
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('This is the first message.')).toBeInTheDocument();

    // Find and click page 2 button (look for button with text "2")
    const page2Button = screen.getByText('2');
    fireEvent.click(page2Button);

    // Should now show page 2 content
    expect(screen.getByText('Message 2')).toBeInTheDocument();
    expect(screen.getByText('This is the second message.')).toBeInTheDocument();

    // First message should no longer be visible
    expect(screen.queryByText('This is the first message.')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const message = {
      content: {
        title: 'Test Message',
        message: 'Test message content'
      }
    };

    render(
      <RulesEngineModal
        open={true}
        onClose={mockOnClose}
        messages={message}
        closeButtonText="Close Modal"
      />
    );

    fireEvent.click(screen.getByText('Close Modal'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should display appropriate icons based on message variant', () => {
    const warningMessage = {
      content: {
        title: 'Warning Message',
        message: 'This is a warning'
      },
      variant: 'warning'
    };

    const { rerender } = render(
      <RulesEngineModal
        open={true}
        onClose={mockOnClose}
        messages={warningMessage}
      />
    );

    // Warning icon should be present (WarningAmberIcon)
    expect(screen.getByTestId('WarningAmberIcon') || screen.getByRole('img')).toBeInTheDocument();

    // Test error variant
    const errorMessage = {
      content: {
        title: 'Error Message',
        message: 'This is an error'
      },
      variant: 'error'
    };

    rerender(
      <RulesEngineModal
        open={true}
        onClose={mockOnClose}
        messages={errorMessage}
      />
    );

    // Should show error-related content
    expect(screen.getByText('Error Message')).toBeInTheDocument();
  });

  it('should handle messages with missing content gracefully', () => {
    const messageWithMissingContent = {
      variant: 'info'
    };

    render(
      <RulesEngineModal
        open={true}
        onClose={mockOnClose}
        messages={messageWithMissingContent}
      />
    );

    // Should still render with default title
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Important Notice')).toBeInTheDocument();
  });

  it('should use custom close button text', () => {
    const message = {
      content: {
        title: 'Custom Test',
        message: 'Testing custom button text'
      }
    };

    render(
      <RulesEngineModal
        open={true}
        onClose={mockOnClose}
        messages={message}
        closeButtonText="Got it!"
      />
    );

    expect(screen.getByText('Got it!')).toBeInTheDocument();
    expect(screen.queryByText('I Understand')).not.toBeInTheDocument();
  });
});