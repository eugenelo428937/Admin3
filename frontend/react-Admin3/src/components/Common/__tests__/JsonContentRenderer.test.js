/**
 * Tests for JsonContentRenderer Component
 * T017: Test render, content parsing, markdown support
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import JsonContentRenderer from '../JsonContentRenderer';

const theme = createTheme();

describe('JsonContentRenderer', () => {
  const renderComponent = (content, className) => {
    return render(
      <ThemeProvider theme={theme}>
        <JsonContentRenderer content={content} className={className} />
      </ThemeProvider>
    );
  };

  describe('null/empty handling', () => {
    test('returns null when content is null', () => {
      const { container } = renderComponent(null);
      expect(container.firstChild).toBeNull();
    });

    test('returns null when content is undefined', () => {
      const { container } = renderComponent(undefined);
      expect(container.firstChild).toBeNull();
    });

    test('renders empty when content has no items', () => {
      const { container } = renderComponent({});
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('paragraph element', () => {
    test('renders paragraph with text', () => {
      const content = {
        content: [
          { element: 'p', text: 'This is a paragraph.' }
        ]
      };

      renderComponent(content);
      expect(screen.getByText('This is a paragraph.')).toBeInTheDocument();
    });

    test('applies className to paragraph', () => {
      const content = {
        content: [
          { element: 'p', text: 'Test', class: 'custom-paragraph' }
        ]
      };

      renderComponent(content);
      expect(document.querySelector('.custom-paragraph')).toBeInTheDocument();
    });
  });

  describe('list element', () => {
    test('renders unordered list with array items', () => {
      const content = {
        content: [
          { element: 'ul', text: ['Item 1', 'Item 2', 'Item 3'] }
        ]
      };

      renderComponent(content);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    test('renders unordered list with single string item', () => {
      const content = {
        content: [
          { element: 'ul', text: 'Single item' }
        ]
      };

      renderComponent(content);
      expect(screen.getByText('Single item')).toBeInTheDocument();
    });
  });

  describe('heading elements', () => {
    test.each([
      ['h1', 'Heading 1'],
      ['h2', 'Heading 2'],
      ['h3', 'Heading 3'],
      ['h4', 'Heading 4'],
      ['h5', 'Heading 5'],
      ['h6', 'Heading 6'],
    ])('renders %s element', (element, text) => {
      const content = {
        content: [
          { element, text }
        ]
      };

      renderComponent(content);
      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });

  describe('box element', () => {
    test('renders box with text', () => {
      const content = {
        content: [
          { element: 'box', text: 'Box content' }
        ]
      };

      renderComponent(content);
      expect(screen.getByText('Box content')).toBeInTheDocument();
    });

    test('renders box with alert-warning class', () => {
      const content = {
        content: [
          { element: 'box', text: 'Warning box', class: 'alert-warning' }
        ]
      };

      renderComponent(content);
      const box = document.querySelector('.alert-warning');
      expect(box).toBeInTheDocument();
    });

    test('renders box with nested content', () => {
      const content = {
        content: [
          {
            element: 'box',
            content: [
              { element: 'p', text: 'Nested paragraph' }
            ]
          }
        ]
      };

      renderComponent(content);
      expect(screen.getByText('Nested paragraph')).toBeInTheDocument();
    });
  });

  describe('container element', () => {
    test('renders container with title', () => {
      const content = {
        content: [
          {
            element: 'container',
            title: 'h4',
            text: 'Container Title'
          }
        ]
      };

      renderComponent(content);
      expect(screen.getByText('Container Title')).toBeInTheDocument();
    });

    test('renders container with nested content', () => {
      const content = {
        content: [
          {
            element: 'container',
            content: [
              { element: 'p', text: 'Nested in container' }
            ]
          }
        ]
      };

      renderComponent(content);
      expect(screen.getByText('Nested in container')).toBeInTheDocument();
    });
  });

  describe('message_container', () => {
    test('renders message_container from root', () => {
      const content = {
        message_container: {
          element: 'container',
          title: 'h4',
          text: 'Main Container'
        }
      };

      renderComponent(content);
      expect(screen.getByText('Main Container')).toBeInTheDocument();
    });
  });

  describe('bold text parsing', () => {
    test('renders bold text with ** syntax', () => {
      const content = {
        content: [
          { element: 'p', text: 'This is **bold** text.' }
        ]
      };

      renderComponent(content);
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('bold').tagName).toBe('STRONG');
    });

    test('renders multiple bold sections', () => {
      const content = {
        content: [
          { element: 'p', text: '**First** and **Second** bold' }
        ]
      };

      renderComponent(content);
      const strongElements = document.querySelectorAll('strong');
      expect(strongElements).toHaveLength(2);
    });
  });

  describe('link parsing', () => {
    test('renders link with [url](text) syntax', () => {
      const content = {
        content: [
          { element: 'p', text: 'Visit [https://example.com](Example Site) for more.' }
        ]
      };

      renderComponent(content);
      const link = screen.getByText('Example Site');
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    test('link has correct attributes', () => {
      const content = {
        content: [
          { element: 'p', text: 'Click [https://test.com](here)' }
        ]
      };

      renderComponent(content);
      const link = screen.getByRole('link', { name: 'here' });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('text alignment', () => {
    test('applies text_align to elements', () => {
      const content = {
        content: [
          { element: 'p', text: 'Centered text', text_align: 'center' }
        ]
      };

      renderComponent(content);
      expect(screen.getByText('Centered text')).toBeInTheDocument();
    });
  });

  describe('fallback rendering', () => {
    test('renders unknown elements as Typography', () => {
      const content = {
        content: [
          { element: 'unknown', text: 'Fallback content' }
        ]
      };

      renderComponent(content);
      expect(screen.getByText('Fallback content')).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    test('applies className to root element', () => {
      const content = {
        content: [
          { element: 'p', text: 'Test' }
        ]
      };

      renderComponent(content, 'custom-class');
      expect(document.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('sequence handling', () => {
    test('uses seq for key when provided', () => {
      const content = {
        content: [
          { element: 'p', text: 'First', seq: 1 },
          { element: 'p', text: 'Second', seq: 2 }
        ]
      };

      renderComponent(content);
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });
});
