/**
 * Tests for ProductContext
 *
 * @module contexts/__tests__/ProductContext.test
 */

// MUST be before imports to override setupTests.js global mock
jest.unmock('../ProductContext');

// Mock productService
jest.mock('../../services/productService', () => ({
  __esModule: true,
  default: {
    getAvailableProducts: jest.fn(),
  },
}));

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ProductProvider, useProduct, useProducts } from '../ProductContext';
import productService from '../../services/productService';

describe('ProductContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ProductProvider', () => {
    test('should render children', async () => {
      productService.getAvailableProducts.mockResolvedValue({ products: [] });

      await act(async () => {
        render(
          <ProductProvider>
            <div data-testid="child">Child Component</div>
          </ProductProvider>
        );
      });

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Component')).toBeInTheDocument();
    });

    test('should fetch products on mount', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1' },
        { id: 2, name: 'Product 2' },
      ];
      productService.getAvailableProducts.mockResolvedValue({ products: mockProducts });

      let contextValue;
      const TestConsumer = () => {
        contextValue = useProduct();
        return <div data-testid="products">{contextValue.products.length}</div>;
      };

      await act(async () => {
        render(
          <ProductProvider>
            <TestConsumer />
          </ProductProvider>
        );
      });

      expect(productService.getAvailableProducts).toHaveBeenCalledTimes(1);
      expect(contextValue.products).toEqual(mockProducts);
      expect(contextValue.loading).toBe(false);
    });

    test('should handle loading state correctly', async () => {
      let resolvePromise;
      productService.getAvailableProducts.mockImplementation(
        () => new Promise((resolve) => { resolvePromise = () => resolve({ products: [] }); })
      );

      let contextValue;
      const TestConsumer = () => {
        contextValue = useProduct();
        return <div data-testid="loading">{contextValue.loading.toString()}</div>;
      };

      render(
        <ProductProvider>
          <TestConsumer />
        </ProductProvider>
      );

      // Initially loading should be true
      expect(contextValue.loading).toBe(true);

      // Resolve the promise and wait for state update
      await act(async () => {
        resolvePromise();
      });

      expect(contextValue.loading).toBe(false);
    });

    test('should handle error state when fetch fails', async () => {
      const mockError = new Error('Failed to fetch products');
      productService.getAvailableProducts.mockRejectedValue(mockError);

      let contextValue;
      const TestConsumer = () => {
        contextValue = useProduct();
        return (
          <div>
            <div data-testid="loading">{contextValue.loading.toString()}</div>
            <div data-testid="error">{contextValue.error?.message || 'no error'}</div>
          </div>
        );
      };

      await act(async () => {
        render(
          <ProductProvider>
            <TestConsumer />
          </ProductProvider>
        );
      });

      expect(contextValue.loading).toBe(false);
      expect(contextValue.error).toBe(mockError);
    });

    test('should handle empty products response', async () => {
      productService.getAvailableProducts.mockResolvedValue({ products: [] });

      let contextValue;
      const TestConsumer = () => {
        contextValue = useProduct();
        return <div data-testid="count">{contextValue.products.length}</div>;
      };

      await act(async () => {
        render(
          <ProductProvider>
            <TestConsumer />
          </ProductProvider>
        );
      });

      expect(contextValue.products).toEqual([]);
    });

    test('should handle response without products key', async () => {
      productService.getAvailableProducts.mockResolvedValue({});

      let contextValue;
      const TestConsumer = () => {
        contextValue = useProduct();
        return <div data-testid="count">{contextValue.products.length}</div>;
      };

      await act(async () => {
        render(
          <ProductProvider>
            <TestConsumer />
          </ProductProvider>
        );
      });

      // Should default to empty array
      expect(contextValue.products).toEqual([]);
    });

    test('should provide setProducts function', async () => {
      productService.getAvailableProducts.mockResolvedValue({ products: [] });

      let contextValue;
      const TestConsumer = () => {
        contextValue = useProduct();
        return <div data-testid="products">{contextValue.products.length}</div>;
      };

      await act(async () => {
        render(
          <ProductProvider>
            <TestConsumer />
          </ProductProvider>
        );
      });

      expect(typeof contextValue.setProducts).toBe('function');
    });

    test('should provide setLoading function', async () => {
      productService.getAvailableProducts.mockResolvedValue({ products: [] });

      let contextValue;
      const TestConsumer = () => {
        contextValue = useProduct();
        return null;
      };

      await act(async () => {
        render(
          <ProductProvider>
            <TestConsumer />
          </ProductProvider>
        );
      });

      expect(typeof contextValue.setLoading).toBe('function');
    });

    test('should provide setError function', async () => {
      productService.getAvailableProducts.mockResolvedValue({ products: [] });

      let contextValue;
      const TestConsumer = () => {
        contextValue = useProduct();
        return null;
      };

      await act(async () => {
        render(
          <ProductProvider>
            <TestConsumer />
          </ProductProvider>
        );
      });

      expect(typeof contextValue.setError).toBe('function');
    });
  });

  describe('useProduct hook', () => {
    test('should throw error when used outside ProductProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        useProduct();
        return null;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'useProduct must be used within a ProductProvider'
      );

      consoleSpy.mockRestore();
    });

    test('should return context when used inside ProductProvider', async () => {
      productService.getAvailableProducts.mockResolvedValue({ products: [] });

      let contextValue;
      const TestConsumer = () => {
        contextValue = useProduct();
        return null;
      };

      await act(async () => {
        render(
          <ProductProvider>
            <TestConsumer />
          </ProductProvider>
        );
      });

      expect(contextValue).toHaveProperty('products');
      expect(contextValue).toHaveProperty('setProducts');
      expect(contextValue).toHaveProperty('loading');
      expect(contextValue).toHaveProperty('setLoading');
      expect(contextValue).toHaveProperty('error');
      expect(contextValue).toHaveProperty('setError');
    });
  });

  describe('useProducts hook', () => {
    test('should throw error when used outside ProductProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        useProducts();
        return null;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'useProducts must be used within a ProductProvider'
      );

      consoleSpy.mockRestore();
    });

    test('should return context when used inside ProductProvider', async () => {
      productService.getAvailableProducts.mockResolvedValue({ products: [] });

      let contextValue;
      const TestConsumer = () => {
        contextValue = useProducts();
        return null;
      };

      await act(async () => {
        render(
          <ProductProvider>
            <TestConsumer />
          </ProductProvider>
        );
      });

      expect(contextValue).toHaveProperty('products');
      expect(contextValue).toHaveProperty('setProducts');
      expect(contextValue).toHaveProperty('loading');
      expect(contextValue).toHaveProperty('setLoading');
      expect(contextValue).toHaveProperty('error');
      expect(contextValue).toHaveProperty('setError');
    });

    test('should return same context as useProduct', async () => {
      productService.getAvailableProducts.mockResolvedValue({ products: [] });

      let useProductContext;
      let useProductsContext;
      const TestConsumer = () => {
        useProductContext = useProduct();
        useProductsContext = useProducts();
        return null;
      };

      await act(async () => {
        render(
          <ProductProvider>
            <TestConsumer />
          </ProductProvider>
        );
      });

      // Both hooks should return the same context
      expect(useProductContext).toBe(useProductsContext);
    });
  });
});
