/**
 * FilterPanel Component Tests
 * 
 * Comprehensive tests for the FilterPanel component including:
 * - Rendering with different states
 * - Redux integration
 * - User interactions
 * - Mobile/desktop variations
 * - Error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import filtersReducer from '../../store/slices/filtersSlice';
import FilterPanel from './FilterPanel';

// Mock Material-UI's useMediaQuery
jest.mock('@mui/material/useMediaQuery');

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockLocation = { search: '' };

jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
}));

// Mock Redux actions
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    useDispatch: () => mockDispatch,
}));

// Test store setup
const createTestStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            filters: filtersReducer,
        },
        preloadedState: {
            filters: {
                subjects: [],
                categories: [],
                product_types: [],
                products: [],
                modes_of_delivery: [],
                searchQuery: '',
                // Navbar filters (Story 1.2)
                tutorial_format: null,
                distance_learning: false,
                tutorial: false,
                currentPage: 1,
                pageSize: 20,
                isLoading: false,
                error: null,
                isFilterPanelOpen: false,
                appliedFilters: {},
                filterCounts: {},
                lastUpdated: null,
                ...initialState,
            },
        },
    });
};

// Test component wrapper with providers
const renderWithProviders = (component, { initialState = {}, theme = createTheme() } = {}) => {
    const store = createTestStore(initialState);
    return {
        ...render(
            <Provider store={store}>
                <ThemeProvider theme={theme}>
                    {component}
                </ThemeProvider>
            </Provider>
        ),
        store,
    };
};

// Mock filter counts data
const mockFilterCounts = {
    subjects: {
        'CM2': 15,
        'SA1': 8,
        'CB1': 22,
    },
    categories: {
        'Materials': 45,
        'Bundle': 12,
        'Tutorial': 8,
    },
    product_types: {
        'Core Study Material': 35,
        'Additional Mock Pack': 10,
    },
    products: {
        'Product A': 5,
        'Product B': 3,
    },
    modes_of_delivery: {
        'Ebook': 25,
        'Printed': 20,
    },
};

describe('FilterPanel Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock useMediaQuery to return desktop by default
        require('@mui/material/useMediaQuery').default = jest.fn(() => false);
    });

    describe('Rendering and Initial State', () => {
        test('renders desktop filter panel with default state', () => {
            renderWithProviders(<FilterPanel />);
            
            expect(screen.getByText('Filters')).toBeInTheDocument();
            expect(screen.getByText('Subjects')).toBeInTheDocument();
            expect(screen.getByText('Categories')).toBeInTheDocument();
            expect(screen.getByText('Product Types')).toBeInTheDocument();
            expect(screen.getByText('Products')).toBeInTheDocument();
            expect(screen.getByText('Delivery Mode')).toBeInTheDocument();
        });

        test('renders mobile filter panel button when isMobile is true', () => {
            // Mock mobile view
            require('@mui/material/useMediaQuery').default = jest.fn(() => true);
            
            renderWithProviders(<FilterPanel />);
            
            expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
        });

        test('renders with filter counts when available', () => {
            const initialState = {
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Check if counts are displayed
            expect(screen.getByText('(15)')).toBeInTheDocument(); // CM2 count
            expect(screen.getByText('(45)')).toBeInTheDocument(); // Materials count
        });

        test('shows loading skeleton when isLoading is true', () => {
            const initialState = {
                isLoading: true,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Check for skeleton loading elements
            expect(screen.getAllByTestId('skeleton')).toHaveLength(5); // One for each filter section
        });

        test('shows error message when error exists', () => {
            const initialState = {
                error: 'Failed to load filters',
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            expect(screen.getByText('Failed to load filters')).toBeInTheDocument();
            expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');
        });
    });

    describe('Filter Interactions', () => {
        test('dispatches toggleSubjectFilter when subject checkbox is clicked', async () => {
            const user = userEvent.setup();
            const initialState = {
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Expand subjects section if not already expanded
            const subjectsSection = screen.getByText('Subjects');
            if (!screen.queryByRole('checkbox', { name: /CM2/i })) {
                await user.click(subjectsSection);
            }
            
            const cm2Checkbox = screen.getByRole('checkbox', { name: /CM2/i });
            await user.click(cm2Checkbox);
            
            expect(mockDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: expect.stringContaining('toggleSubjectFilter'),
                    payload: 'CM2',
                })
            );
        });

        test('dispatches toggleCategoryFilter when category checkbox is clicked', async () => {
            const user = userEvent.setup();
            const initialState = {
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Expand categories section
            const categoriesSection = screen.getByText('Categories');
            await user.click(categoriesSection);
            
            const materialsCheckbox = screen.getByRole('checkbox', { name: /Materials/i });
            await user.click(materialsCheckbox);
            
            expect(mockDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: expect.stringContaining('toggleCategoryFilter'),
                    payload: 'Materials',
                })
            );
        });

        test('shows active filter badges when filters are selected', () => {
            const initialState = {
                subjects: ['CM2', 'SA1'],
                categories: ['Materials'],
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Check for badge indicating 2 active subjects
            expect(screen.getByText('2')).toBeInTheDocument();
            // Check for badge indicating 1 active category
            expect(screen.getByText('1')).toBeInTheDocument();
        });

        test('shows "Clear All" button when filters are active', () => {
            const initialState = {
                subjects: ['CM2'],
                categories: ['Materials'],
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
        });

        test('dispatches clearAllFilters when "Clear All" button is clicked', async () => {
            const user = userEvent.setup();
            const initialState = {
                subjects: ['CM2'],
                categories: ['Materials'],
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            const clearAllButton = screen.getByRole('button', { name: /clear all/i });
            await user.click(clearAllButton);
            
            expect(mockDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: expect.stringContaining('clearAllFilters'),
                })
            );
        });

        test('dispatches clearFilterType when individual filter type clear button is clicked', async () => {
            const user = userEvent.setup();
            const initialState = {
                subjects: ['CM2', 'SA1'],
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Find and click the clear button for subjects (should be in the accordion header)
            const clearButtons = screen.getAllByRole('button');
            const subjectsClearButton = clearButtons.find(button => 
                button.querySelector('svg[data-testid="ClearIcon"]')
            );
            
            if (subjectsClearButton) {
                await user.click(subjectsClearButton);
                
                expect(mockDispatch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: expect.stringContaining('clearFilterType'),
                        payload: 'subjects',
                    })
                );
            }
        });
    });

    describe('Mobile Drawer Functionality', () => {
        beforeEach(() => {
            // Mock mobile view
            require('@mui/material/useMediaQuery').default = jest.fn(() => true);
        });

        test('opens drawer when filter button is clicked on mobile', async () => {
            const user = userEvent.setup();
            
            renderWithProviders(<FilterPanel />);
            
            const filterButton = screen.getByRole('button', { name: /filters/i });
            await user.click(filterButton);
            
            // Check if drawer is open (filters content should be visible)
            expect(screen.getByRole('presentation')).toBeInTheDocument();
        });

        test('shows filter count badge on mobile filter button when filters are active', () => {
            const initialState = {
                subjects: ['CM2'],
                categories: ['Materials'],
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Check for badge on the filter button
            expect(screen.getByText('2')).toBeInTheDocument(); // 2 total active filters
        });

        test('closes drawer when close button is clicked', async () => {
            const user = userEvent.setup();
            
            renderWithProviders(<FilterPanel />);
            
            // Open drawer first
            const filterButton = screen.getByRole('button', { name: /filters/i });
            await user.click(filterButton);
            
            // Close drawer
            const closeButton = screen.getByRole('button', { name: /close/i });
            await user.click(closeButton);
            
            // Check if drawer is closed
            await waitFor(() => {
                expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
            });
        });
    });

    describe('Accordion Functionality', () => {
        test('expands and collapses accordion sections', async () => {
            const user = userEvent.setup();
            const initialState = {
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Categories should be collapsed by default
            expect(screen.queryByRole('checkbox', { name: /Materials/i })).not.toBeInTheDocument();
            
            // Expand categories section
            const categoriesSection = screen.getByText('Categories');
            await user.click(categoriesSection);
            
            // Categories checkboxes should now be visible
            expect(screen.getByRole('checkbox', { name: /Materials/i })).toBeInTheDocument();
        });

        test('subjects section is expanded by default', () => {
            const initialState = {
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Subjects should be visible by default
            expect(screen.getByRole('checkbox', { name: /CM2/i })).toBeInTheDocument();
        });
    });

    describe('Search Mode', () => {
        test('behaves correctly in search mode', () => {
            const initialState = {
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel isSearchMode={true} />, { initialState });
            
            // Should still render all filter sections in search mode
            expect(screen.getByText('Subjects')).toBeInTheDocument();
            expect(screen.getByText('Categories')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        test('has proper ARIA labels and roles', () => {
            const initialState = {
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Check for proper checkbox roles
            expect(screen.getAllByRole('checkbox')).toHaveLength(3); // Only subjects are expanded by default
            
            // Check for proper button roles
            expect(screen.getAllByRole('button')).toBeTruthy();
            
            // Check for proper headings
            expect(screen.getByRole('heading', { level: 6 })).toHaveTextContent('Filters');
        });

        test('supports keyboard navigation', async () => {
            const user = userEvent.setup();
            const initialState = {
                filterCounts: mockFilterCounts,
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Tab to first checkbox and activate with space/enter
            await user.tab();
            await user.keyboard('{Enter}');
            
            // Verify interaction worked
            expect(mockDispatch).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        test('handles empty filter counts gracefully', () => {
            const initialState = {
                filterCounts: {},
            };
            
            renderWithProviders(<FilterPanel />, { initialState });
            
            // Should still render but without counts
            expect(screen.getByText('Subjects')).toBeInTheDocument();
            expect(screen.queryByText('(15)')).not.toBeInTheDocument();
        });

        test('handles undefined filter counts gracefully', () => {
            renderWithProviders(<FilterPanel />);
            
            // Should render without errors
            expect(screen.getByText('Filters')).toBeInTheDocument();
        });

        test('handles very long filter names', () => {
            const longFilterCounts = {
                subjects: {
                    'Very Long Subject Name That Should Be Truncated Properly': 5,
                },
            };

            const initialState = {
                filterCounts: longFilterCounts,
            };

            renderWithProviders(<FilterPanel />, { initialState });

            // Should render without breaking layout
            expect(screen.getByText('Subjects')).toBeInTheDocument();
        });
    });

});