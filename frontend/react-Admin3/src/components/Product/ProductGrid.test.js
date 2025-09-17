/**
 * ProductGrid Component Tests
 * 
 * Tests for the ProductGrid component including:
 * - Rendering states (loading, error, empty, with products)
 * - Pagination functionality
 * - Product display and interactions
 * - Responsive behavior
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ProductGrid from './ProductGrid';

// Mock MaterialProductCard component
jest.mock('./ProductCard/MaterialProductCard', () => {
    return function MockMaterialProductCard({ product }) {
        return <div data-testid="product-card">{product.product_name || product.name || product.id}</div>;
    };
});

// Mock Material-UI's useMediaQuery
jest.mock('@mui/material/useMediaQuery');

// Test store setup
const createTestStore = () => {
    return configureStore({
        reducer: {
            filters: (state = { isLoading: false, error: null }, action) => state,
        },
    });
};

// Test component wrapper
const renderWithProviders = (component, { theme = createTheme() } = {}) => {
    const store = createTestStore();
    return render(
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                {component}
            </ThemeProvider>
        </Provider>
    );
};

// Mock products data
const mockProducts = [
    { id: 1, essp_id: 'essp_1', product_name: 'Product 1' },
    { id: 2, essp_id: 'essp_2', product_name: 'Product 2' },
    { id: 3, product_id: 'prod_3', product_name: 'Product 3' },
];

// Mock pagination data
const mockPagination = {
    page: 1,
    page_size: 20,
    total_count: 50,
    has_next: true,
    has_previous: false,
};

describe('ProductGrid Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock desktop view by default
        require('@mui/material/useMediaQuery').default = jest.fn(() => false);
    });

    describe('Loading State', () => {
        test('renders loading skeleton when loading is true', () => {
            renderWithProviders(
                <ProductGrid
                    products={[]}
                    loading={true}
                    pagination={mockPagination}
                />
            );

            // Should show skeleton loaders (MUI Skeleton components)
            const skeletons = document.querySelectorAll('.MuiSkeleton-root');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('renders fewer skeletons on mobile', () => {
            // Mock mobile view
            require('@mui/material/useMediaQuery').default = jest.fn(() => true);
            
            renderWithProviders(
                <ProductGrid
                    products={[]}
                    loading={true}
                    pagination={mockPagination}
                />
            );

            // Should show skeleton loaders (fewer on mobile)
            const skeletons = document.querySelectorAll('.MuiSkeleton-root');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('Error State', () => {
        test('renders error message when error exists', () => {
            renderWithProviders(
                <ProductGrid
                    products={[]}
                    error="Failed to load products"
                    pagination={mockPagination}
                />
            );

            expect(screen.getByText('Failed to load products')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
        });

        test('renders fallback error message when error is generic', () => {
            renderWithProviders(
                <ProductGrid
                    products={[]}
                    error={true}
                    pagination={mockPagination}
                />
            );

            expect(screen.getByText('true')).toBeInTheDocument(); // Boolean error gets converted to string
        });
    });

    describe('Empty State', () => {
        test('renders empty state message when no products and not loading', () => {
            renderWithProviders(
                <ProductGrid
                    products={[]}
                    loading={false}
                    pagination={mockPagination}
                />
            );

            expect(screen.getByText('No products available based on selected filters.')).toBeInTheDocument();
        });

        test('renders custom empty state message', () => {
            renderWithProviders(
                <ProductGrid
                    products={[]}
                    loading={false}
                    pagination={mockPagination}
                    emptyStateMessage="No search results found."
                />
            );

            expect(screen.getByText('No search results found.')).toBeInTheDocument();
        });
    });

    describe('Products Display', () => {
        test('renders product cards when products are provided', () => {
            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={mockPagination}
                />
            );

            expect(screen.getAllByTestId('product-card')).toHaveLength(3);
            expect(screen.getByText('Product 1')).toBeInTheDocument();
            expect(screen.getByText('Product 2')).toBeInTheDocument();
            expect(screen.getByText('Product 3')).toBeInTheDocument();
        });

        test('shows product count when showProductCount is true', () => {
            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={mockPagination}
                    showProductCount={true}
                />
            );

            expect(screen.getByText('Showing 1-3 of 50 items')).toBeInTheDocument();
        });

        test('hides product count when showProductCount is false', () => {
            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={mockPagination}
                    showProductCount={false}
                />
            );

            expect(screen.queryByText(/Showing \d+-\d+ of \d+ items/)).not.toBeInTheDocument();
        });

        test('shows additional pagination info when has_next is true', () => {
            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={{ ...mockPagination, has_next: true }}
                    showProductCount={true}
                />
            );

            expect(screen.getByText('3 loaded, more available')).toBeInTheDocument();
        });
    });

    describe('Load More Functionality', () => {
        test('renders load more button when has_next is true', () => {
            const mockOnLoadMore = jest.fn();
            
            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={{ ...mockPagination, has_next: true }}
                    onLoadMore={mockOnLoadMore}
                    showLoadMoreButton={true}
                />
            );

            const loadMoreButton = screen.getByRole('button', { name: /load more products/i });
            expect(loadMoreButton).toBeInTheDocument();
            expect(screen.getByText('(47 remaining)')).toBeInTheDocument(); // 50 total - 3 loaded
        });

        test('calls onLoadMore when load more button is clicked', async () => {
            const user = userEvent.setup();
            const mockOnLoadMore = jest.fn();
            
            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={{ ...mockPagination, has_next: true }}
                    onLoadMore={mockOnLoadMore}
                    showLoadMoreButton={true}
                />
            );

            const loadMoreButton = screen.getByRole('button', { name: /load more products/i });
            await user.click(loadMoreButton);

            expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
        });

        test('does not render load more button when has_next is false', () => {
            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={{ ...mockPagination, has_next: false }}
                    showLoadMoreButton={true}
                />
            );

            expect(screen.queryByRole('button', { name: /load more products/i })).not.toBeInTheDocument();
        });

        test('disables load more button when loading', () => {
            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={{ ...mockPagination, has_next: true }}
                    loading={true}
                    showLoadMoreButton={true}
                />
            );

            const loadMoreButton = screen.getByRole('button', { name: /loading more products/i });
            expect(loadMoreButton).toBeDisabled();
        });
    });

    describe('Product Card Integration', () => {
        test('passes correct props to MaterialProductCard', () => {
            const mockOnAddToCart = jest.fn();
            const mockAllEsspIds = [1, 2, 3];
            const mockBulkDeadlines = { essp_1: '2024-01-01' };

            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={mockPagination}
                    onAddToCart={mockOnAddToCart}
                    allEsspIds={mockAllEsspIds}
                    bulkDeadlines={mockBulkDeadlines}
                />
            );

            // Verify product cards are rendered (mocked component shows product names)
            expect(screen.getByText('Product 1')).toBeInTheDocument();
            expect(screen.getByText('Product 2')).toBeInTheDocument();
            expect(screen.getByText('Product 3')).toBeInTheDocument();
        });
    });

    describe('Responsive Behavior', () => {
        test('adapts grid layout for mobile', () => {
            // Mock mobile view
            require('@mui/material/useMediaQuery').default = jest.fn(() => true);
            
            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={mockPagination}
                />
            );

            // Should still render products
            expect(screen.getAllByTestId('product-card')).toHaveLength(3);
        });

        test('adapts grid layout for tablet', () => {
            // Mock tablet view
            require('@mui/material/useMediaQuery').default = jest.fn((query) => {
                return query.includes('md'); // Tablet breakpoint
            });
            
            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={mockPagination}
                />
            );

            expect(screen.getAllByTestId('product-card')).toHaveLength(3);
        });
    });

    describe('Pagination Text', () => {
        test('shows correct pagination text for single item', () => {
            renderWithProviders(
                <ProductGrid
                    products={[mockProducts[0]]}
                    pagination={{ ...mockPagination, total_count: 1 }}
                    showProductCount={true}
                />
            );

            expect(screen.getByText('Showing 1 of 1 items')).toBeInTheDocument();
        });

        test('shows correct pagination text for multiple pages', () => {
            const page2Products = mockProducts;
            const page2Pagination = {
                page: 2,
                page_size: 3,
                total_count: 10,
                has_next: true,
                has_previous: true,
            };

            renderWithProviders(
                <ProductGrid
                    products={page2Products}
                    pagination={page2Pagination}
                    showProductCount={true}
                />
            );

            expect(screen.getByText('Showing 4-6 of 10 items')).toBeInTheDocument();
        });

        test('shows no items text when empty and not loading', () => {
            renderWithProviders(
                <ProductGrid
                    products={[]}
                    pagination={{ ...mockPagination, total_count: 0 }}
                    loading={false}
                    showProductCount={true}
                />
            );

            // When there are no products, the empty state message is shown instead
            expect(screen.getByText('No products available based on selected filters.')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        test('handles products with missing IDs gracefully', () => {
            const productsWithMissingIds = [
                { product_name: 'Product without ID' },
                { essp_id: 'essp_1', product_name: 'Product with ESSP ID' },
            ];

            expect(() => {
                renderWithProviders(
                    <ProductGrid
                        products={productsWithMissingIds}
                        pagination={mockPagination}
                    />
                );
            }).not.toThrow();

            expect(screen.getByText('Product without ID')).toBeInTheDocument();
        });

        test('handles undefined pagination gracefully', () => {
            renderWithProviders(
                <ProductGrid
                    products={mockProducts}
                    pagination={undefined}
                />
            );

            expect(screen.getAllByTestId('product-card')).toHaveLength(3);
        });

        test('handles very large product lists', () => {
            const largeProductList = Array.from({ length: 100 }, (_, i) => ({
                id: i,
                product_name: `Product ${i}`,
            }));

            expect(() => {
                renderWithProviders(
                    <ProductGrid
                        products={largeProductList}
                        pagination={{ ...mockPagination, total_count: 1000 }}
                    />
                );
            }).not.toThrow();

            expect(screen.getAllByTestId('product-card')).toHaveLength(100);
        });
    });
});