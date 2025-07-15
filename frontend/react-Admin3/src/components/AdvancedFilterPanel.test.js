import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdvancedFilterPanel from './AdvancedFilterPanel';

// Mock the product service
jest.mock('../services/productService', () => ({
    getFilterConfiguration: jest.fn(() => Promise.resolve({
        subject: {
            type: 'multi_select',
            label: 'Subject',
            display_order: 1,
            default_open: true,
            options: [
                { id: 1, code: 'ACCA', name: 'ACCA Test', label: 'ACCA - ACCA Test' }
            ]
        },
        main_category: {
            type: 'multi_select',
            label: 'Product Type',
            display_order: 2,
            default_open: true,
            options: [
                { id: 1, name: 'Materials', label: 'Materials' }
            ]
        }
    }))
}));

const theme = createTheme();

const renderWithTheme = (component) => {
    return render(
        <ThemeProvider theme={theme}>
            {component}
        </ThemeProvider>
    );
};

describe('AdvancedFilterPanel', () => {
    const mockOnFiltersChange = jest.fn();
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders without crashing', async () => {
        renderWithTheme(
            <AdvancedFilterPanel 
                onFiltersChange={mockOnFiltersChange}
                isSearchMode={false}
            />
        );
        
        await waitFor(() => {
            expect(screen.getByText('Filters')).toBeInTheDocument();
        });
    });

    test('calls onFiltersChange only when filters actually change', async () => {
        const { rerender } = renderWithTheme(
            <AdvancedFilterPanel 
                onFiltersChange={mockOnFiltersChange}
                isSearchMode={false}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Filters')).toBeInTheDocument();
        });

        // Initial call should happen
        expect(mockOnFiltersChange).toHaveBeenCalledTimes(1);

        // Re-render with same props should not trigger additional calls
        rerender(
            <ThemeProvider theme={theme}>
                <AdvancedFilterPanel 
                    onFiltersChange={mockOnFiltersChange}
                    isSearchMode={false}
                />
            </ThemeProvider>
        );

        // Should still be 1 call after re-render
        expect(mockOnFiltersChange).toHaveBeenCalledTimes(1);
    });

    test('loads filter configuration only once', async () => {
        const productService = require('../services/productService');
        
        renderWithTheme(
            <AdvancedFilterPanel 
                onFiltersChange={mockOnFiltersChange}
                isSearchMode={false}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Filters')).toBeInTheDocument();
        });

        // Should only call getFilterConfiguration once
        expect(productService.getFilterConfiguration).toHaveBeenCalledTimes(1);
    });
});