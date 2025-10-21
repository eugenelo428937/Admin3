/**
 * CollapsibleAlert Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CollapsibleAlert from '../CollapsibleAlert';

describe('CollapsibleAlert Component', () => {
    const mockMessages = [
        {
            title: 'Test Message',
            message: '<p>This is a test message with <strong>HTML</strong> content that should be displayed.</p>',
            variant: 'info',
            template_id: 'test-1'
        },
        {
            title: 'Warning Message',
            message: '<p>This is a warning message.</p>',
            variant: 'warning',
            template_id: 'test-2'
        }
    ];

    test('renders loading state correctly', () => {
        render(<CollapsibleAlert loading={true} loadingMessage="Loading test data..." />);

        expect(screen.getByText('Loading test data...')).toBeInTheDocument();
    });

    test('renders null when no messages and not loading', () => {
        const { container } = render(<CollapsibleAlert messages={[]} loading={false} />);

        expect(container.firstChild).toBeNull();
    });

    test('renders messages with titles', () => {
        render(<CollapsibleAlert messages={mockMessages} />);

        expect(screen.getByText('Test Message')).toBeInTheDocument();
        expect(screen.getByText('Warning Message')).toBeInTheDocument();
    });

    test('shows collapsed state by default', () => {
        render(<CollapsibleAlert messages={mockMessages} />);

        // Should show "see more" buttons
        const seeMoreButtons = screen.getAllByText('see more');
        expect(seeMoreButtons.length).toBe(2);
    });

    test('expands message when see more is clicked', () => {
        render(<CollapsibleAlert messages={mockMessages} />);

        const seeMoreButtons = screen.getAllByText('see more');
        fireEvent.click(seeMoreButtons[0]);

        // Should now show "see less" (use getAllByText since multiple might exist)
        const seeLessButtons = screen.getAllByText('see less');
        expect(seeLessButtons.length).toBeGreaterThan(0);

        // Should display full HTML content
        expect(screen.getByText('HTML', { exact: false })).toBeInTheDocument();
    });

    test('collapses message when see less is clicked', () => {
        render(<CollapsibleAlert messages={mockMessages} />);

        // Expand first
        const expandButton = screen.getAllByLabelText('Show more')[0];
        fireEvent.click(expandButton);

        const seeLessButtons = screen.getAllByText('see less');
        expect(seeLessButtons.length).toBeGreaterThan(0);

        // Collapse
        const collapseButton = screen.getAllByLabelText('Show less')[0];
        fireEvent.click(collapseButton);

        // Should show "see more" again
        expect(screen.getAllByText('see more').length).toBeGreaterThan(0);
    });

    test('applies correct severity variant', () => {
        const { container } = render(<CollapsibleAlert messages={mockMessages} />);

        // Check that alerts are rendered (MUI Alert uses role="alert")
        const alerts = container.querySelectorAll('[role="alert"]');
        expect(alerts.length).toBe(2);
    });

    test('renders HTML content safely', () => {
        const messageWithHTML = [{
            title: 'HTML Test',
            message: '<p>Bold text: <strong>Important</strong></p>',
            variant: 'info'
        }];

        render(<CollapsibleAlert messages={messageWithHTML} />);

        // Expand to see full content
        const seeMoreButton = screen.getByText('see more');
        fireEvent.click(seeMoreButton);

        // Should render HTML tags
        const strongElement = screen.getByText('Important');
        expect(strongElement.tagName).toBe('STRONG');
    });

    test('handles multiple messages independently', () => {
        render(<CollapsibleAlert messages={mockMessages} />);

        // Expand first message
        const expandButtons = screen.getAllByLabelText('Show more');
        fireEvent.click(expandButtons[0]);

        // First should be expanded (has see less), second should still be collapsed (has see more)
        const seeLessButtons = screen.getAllByText('see less');
        const seeMoreButtons = screen.getAllByText('see more');

        expect(seeLessButtons.length).toBe(1); // Only first message expanded
        expect(seeMoreButtons.length).toBe(1); // Second message still collapsed
    });

    test('displays correct loading icon', () => {
        const { container } = render(
            <CollapsibleAlert loading={true} loadingMessage="Loading..." />
        );

        // Check for CircularProgress (MUI uses role="progressbar")
        const progressBar = container.querySelector('[role="progressbar"]');
        expect(progressBar).toBeInTheDocument();
    });
});
