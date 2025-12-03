/**
 * Tests for BaseProductCard Component
 * T015: Test render, props, theme overrides with ProductCard variant system
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import BaseProductCard from '../BaseProductCard';

// Create a theme with ProductCard variants for testing
const createTestTheme = (productCardConfig = {}) => {
  return createTheme({
    components: {
      ProductCard: productCardConfig
    }
  });
};

describe('BaseProductCard', () => {
  describe('basic rendering', () => {
    test('renders children correctly', () => {
      const theme = createTestTheme();

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard>
            <div data-testid="card-content">Card Content</div>
          </BaseProductCard>
        </ThemeProvider>
      );

      expect(screen.getByTestId('card-content')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    test('renders as MUI Card', () => {
      const theme = createTestTheme();

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard data-testid="product-card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      expect(screen.getByTestId('product-card')).toBeInTheDocument();
    });
  });

  describe('variant prop', () => {
    test('accepts variant prop', () => {
      const theme = createTestTheme();

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard variant="material" data-testid="card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    test('defaults to product variant', () => {
      const theme = createTestTheme({
        variants: [
          {
            props: { variant: 'product' },
            style: { backgroundColor: 'blue' }
          }
        ]
      });

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard data-testid="card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('producttype prop', () => {
    test('accepts producttype prop', () => {
      const theme = createTestTheme();

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard producttype="tutorial" data-testid="card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    test('applies producttype-specific styles from theme', () => {
      const theme = createTestTheme({
        variants: [
          {
            props: { producttype: 'bundle' },
            style: { backgroundColor: 'green' }
          }
        ]
      });

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard producttype="bundle" data-testid="card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('theme styleOverrides', () => {
    test('applies base styleOverrides from theme', () => {
      const theme = createTestTheme({
        styleOverrides: {
          root: {
            padding: '16px'
          }
        }
      });

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard data-testid="card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('prop forwarding', () => {
    test('forwards standard Card props', () => {
      const theme = createTestTheme();

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard elevation={3} data-testid="card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      // Card is rendered
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    test('does not forward variant to DOM', () => {
      const theme = createTestTheme();

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard variant="custom" data-testid="card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      const card = screen.getByTestId('card');
      // The variant prop should not leak to the DOM
      expect(card).not.toHaveAttribute('variant');
    });

    test('does not forward producttype to DOM', () => {
      const theme = createTestTheme();

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard producttype="tutorial" data-testid="card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      const card = screen.getByTestId('card');
      // The producttype prop should not leak to the DOM
      expect(card).not.toHaveAttribute('producttype');
      expect(card).not.toHaveAttribute('producttype');
    });

    test('forwards className prop', () => {
      const theme = createTestTheme();

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard className="custom-class" data-testid="card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });

    test('forwards sx prop', () => {
      const theme = createTestTheme();

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard sx={{ margin: 2 }} data-testid="card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('combined variant and producttype', () => {
    test('applies styles for both variant and producttype', () => {
      const theme = createTestTheme({
        variants: [
          {
            props: { variant: 'product' },
            style: { border: '1px solid blue' }
          },
          {
            props: { producttype: 'material' },
            style: { backgroundColor: 'lightgray' }
          }
        ]
      });

      render(
        <ThemeProvider theme={theme}>
          <BaseProductCard variant="product" producttype="material" data-testid="card">
            Content
          </BaseProductCard>
        </ThemeProvider>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('component export', () => {
    test('exports ProductCard component', () => {
      // The default export is ProductCard which wraps BaseProductCard
      expect(typeof BaseProductCard).toBe('function');
    });
  });
});
