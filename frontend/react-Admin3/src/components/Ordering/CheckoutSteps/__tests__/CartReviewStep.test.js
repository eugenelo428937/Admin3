import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../theme/theme';
import CartReviewStep from '../CartReviewStep';

// Mock components that aren't available in test environment
jest.mock('../../../../utils/productCodeGenerator', () => ({
  generateProductCode: jest.fn(() => 'TEST-001'),
}));

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CartReviewStep Enhanced Layout', () => {
  const mockCartItems = [
    {
      id: 1,
      product_name: 'Test Product 1',
      subject_code: 'TEST1',
      variation_name: 'Standard',
      actual_price: '50.00',
      quantity: 1
    },
    {
      id: 2,
      product_name: 'Test Product 2',
      subject_code: 'TEST2',
      variation_name: 'Premium',
      actual_price: '75.00',
      quantity: 2
    }
  ];

  const mockVatCalculations = {
    totals: {
      subtotal: 200.00,
      total_vat: 40.00,
      total_gross: 240.00
    }
  };

  // TDD RED Phase Tests - These should FAIL initially
  describe('Enhanced Layout Structure (TDD RED Phase)', () => {
    it('should display layout with 1/3 cart summary and 2/3 address sections', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should find the main layout container with 1/3 + 2/3 split
      const layoutContainer = screen.getByTestId('cart-review-layout');
      expect(layoutContainer).toBeInTheDocument();

      // Should find cart summary section (1/3 width)
      const cartSummarySection = screen.getByTestId('cart-summary-section');
      expect(cartSummarySection).toBeInTheDocument();

      // Should find address sections container (2/3 width)
      const addressSectionsContainer = screen.getByTestId('address-sections-container');
      expect(addressSectionsContainer).toBeInTheDocument();
    });

    it('should display delivery and invoice address panels in right 2/3 section', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should find delivery address panel
      const deliveryAddressPanel = screen.getByTestId('delivery-address-panel');
      expect(deliveryAddressPanel).toBeInTheDocument();
      expect(deliveryAddressPanel).toHaveTextContent('Delivery Address');

      // Should find invoice address panel
      const invoiceAddressPanel = screen.getByTestId('invoice-address-panel');
      expect(invoiceAddressPanel).toBeInTheDocument();
      expect(invoiceAddressPanel).toHaveTextContent('Invoice Address');
    });

    it('should use Material-UI components instead of Bootstrap', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should use MUI Grid for layout
      const muiGrid = screen.getByTestId('cart-review-layout');
      expect(muiGrid).toHaveClass('MuiGrid-root');

      // Should use MUI Card for summary
      const cartSummaryCard = screen.getByTestId('cart-summary-card');
      expect(cartSummaryCard).toHaveClass('MuiCard-root');

      // Should use MUI Paper/Card for address panels
      const deliveryCard = screen.getByTestId('delivery-address-card');
      expect(deliveryCard).toHaveClass('MuiCard-root');

      const invoiceCard = screen.getByTestId('invoice-address-card');
      expect(invoiceCard).toHaveClass('MuiCard-root');
    });

    it('should maintain existing cart functionality and data display', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should still display all cart items
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();

      // Should display pricing information
      expect(screen.getByText('£50.00')).toBeInTheDocument();
      expect(screen.getByText('£150.00')).toBeInTheDocument(); // 75 * 2

      // Should display VAT calculations
      expect(screen.getByText('£200.00')).toBeInTheDocument(); // subtotal
      expect(screen.getByText('£40.00')).toBeInTheDocument();  // VAT
      expect(screen.getByText('£240.00')).toBeInTheDocument(); // total
    });
  });

  // Responsive Design Tests
  describe('Responsive Layout (TDD RED Phase)', () => {
    it('should use responsive grid sizes for different screen sizes', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Check that the cart summary section has proper responsive classes
      const cartSummarySection = screen.getByTestId('cart-summary-section');
      expect(cartSummarySection).toBeInTheDocument();

      // Check that the address sections container has proper responsive classes
      const addressSectionsContainer = screen.getByTestId('address-sections-container');
      expect(addressSectionsContainer).toBeInTheDocument();
    });

    it('should maintain side-by-side layout by default', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      const layoutContainer = screen.getByTestId('cart-review-layout');
      expect(layoutContainer).toHaveAttribute('data-responsive', 'side-by-side');
    });
  });

  // Integration Verification Tests
  describe('Integration Verification', () => {
    it('should preserve existing rules engine message display', () => {
      const mockRulesMessages = [
        {
          template_id: 'test-warning',
          message_type: 'warning',
          content: {
            title: 'Test Warning',
            message: 'This is a test warning message',
            icon: 'exclamation-triangle'
          }
        }
      ];

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={mockRulesMessages}
        />
      );

      expect(screen.getByText('Test Warning')).toBeInTheDocument();
      expect(screen.getByText('This is a test warning message')).toBeInTheDocument();
    });

    it('should display loading state for rules engine', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={true}
          rulesMessages={[]}
        />
      );

      expect(screen.getByText('Checking for important notices...')).toBeInTheDocument();
    });

    it('should handle missing VAT calculations gracefully', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={null}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should still render cart items
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      // Should not crash without VAT calculations
    });
  });

  // Story 2.2: Dynamic Address Selection - TDD RED Phase Tests
  describe('Address Selection Dropdowns (Story 2.2 - TDD RED Phase)', () => {
    const mockUserProfile = {
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      },
      profile: {
        send_invoices_to: 'HOME',
        send_study_material_to: 'WORK'
      },
      home_address: {
        building: '123 Main St',
        town: 'London',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom'
      },
      work_address: {
        company: 'Test Company',
        building: '456 Office St',
        town: 'London',
        postcode: 'EC1A 1BB',
        country: 'United Kingdom'
      }
    };

    it('should display delivery address dropdown with Home and Work options', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
          userProfile={mockUserProfile}
        />
      );

      // Should find delivery address dropdown
      const deliveryDropdown = screen.getByTestId('delivery-address-dropdown');
      expect(deliveryDropdown).toBeInTheDocument();

      // Should have dropdown with correct default value (WORK based on send_study_material_to)
      const deliveryInput = screen.getByTestId('delivery-address-dropdown-input');
      expect(deliveryInput).toHaveValue('WORK');
    });

    it('should display invoice address dropdown with Home and Work options', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
          userProfile={mockUserProfile}
        />
      );

      // Should find invoice address dropdown
      const invoiceDropdown = screen.getByTestId('invoice-address-dropdown');
      expect(invoiceDropdown).toBeInTheDocument();

      // Should have dropdown with correct default value (HOME based on send_invoices_to)
      const invoiceInput = screen.getByTestId('invoice-address-dropdown-input');
      expect(invoiceInput).toHaveValue('HOME');
    });

    it('should respect send_study_material_to setting for delivery address default', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
          userProfile={mockUserProfile}
        />
      );

      // Delivery dropdown should default to WORK (from send_study_material_to)
      const deliveryInput = screen.getByTestId('delivery-address-dropdown-input');
      expect(deliveryInput).toHaveValue('WORK');
    });

    it('should respect send_invoices_to setting for invoice address default', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
          userProfile={mockUserProfile}
        />
      );

      // Invoice dropdown should default to HOME (from send_invoices_to)
      const invoiceInput = screen.getByTestId('invoice-address-dropdown-input');
      expect(invoiceInput).toHaveValue('HOME');
    });

    it('should auto-populate address fields when dropdown selection changes', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
          userProfile={mockUserProfile}
        />
      );

      // Initially should show work address (456 Office St)
      expect(screen.getByText(/456 Office St/)).toBeInTheDocument();

      // Click on the delivery dropdown to open it
      const deliveryDropdown = screen.getByTestId('delivery-address-dropdown');
      await user.click(deliveryDropdown);

      // Select Home option
      const homeOption = screen.getByText('Home');
      await user.click(homeOption);

      // Should display home address details in the formatted display
      await waitFor(() => {
        expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
        expect(screen.getByText(/SW1A 1AA/)).toBeInTheDocument();
      });
    });

    it('should display address using DynamicAddressForm component for consistent formatting', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
          userProfile={mockUserProfile}
        />
      );

      // Should find DynamicAddressForm components within address panels
      const deliveryAddressDisplay = screen.getByTestId('delivery-address-display');
      expect(deliveryAddressDisplay).toBeInTheDocument();

      const invoiceAddressDisplay = screen.getByTestId('invoice-address-display');
      expect(invoiceAddressDisplay).toBeInTheDocument();
    });

    it('should have address fields initially read-only (non-editable)', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
          userProfile={mockUserProfile}
        />
      );

      // Address display should be read-only
      const deliveryAddressDisplay = screen.getByTestId('delivery-address-display');
      expect(deliveryAddressDisplay).not.toHaveClass('editable');

      const invoiceAddressDisplay = screen.getByTestId('invoice-address-display');
      expect(invoiceAddressDisplay).not.toHaveClass('editable');
    });

    it('should handle missing profile data gracefully', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
          userProfile={null}
        />
      );

      // Should still render address panels with placeholder content
      expect(screen.getByTestId('delivery-address-panel')).toBeInTheDocument();
      expect(screen.getByTestId('invoice-address-panel')).toBeInTheDocument();
    });

    it('should handle missing address data gracefully', () => {
      const profileWithoutAddresses = {
        ...mockUserProfile,
        home_address: {},
        work_address: {}
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
          userProfile={profileWithoutAddresses}
        />
      );

      // Should render dropdowns even without address data
      expect(screen.getByTestId('delivery-address-dropdown')).toBeInTheDocument();
      expect(screen.getByTestId('invoice-address-dropdown')).toBeInTheDocument();
    });
  });
});