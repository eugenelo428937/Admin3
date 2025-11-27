// Remove global mocks from setupTests.js so we can test with real contexts
jest.unmock('../../../../../contexts/TutorialChoiceContext');
jest.unmock('../../../../../contexts/CartContext');

// Mock httpService before importing anything else
jest.mock('../../../../../services/httpService', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TutorialChoiceProvider } from '../../../../../contexts/TutorialChoiceContext';
import { CartProvider } from '../../../../../contexts/CartContext';
import TutorialProductCard from '../TutorialProductCard';
import tutorialService from '../../../../../services/tutorialService';
import cartService from '../../../../../services/cartService';

// Mock tutorial service
jest.mock('../../../../../services/tutorialService', () => ({
  getTutorialVariations: jest.fn(() => Promise.resolve([]))
}));

// Mock cart service
jest.mock('../../../../../services/cartService', () => ({
  fetchCart: jest.fn(() => Promise.resolve({ data: { items: [] } })),
  addToCart: jest.fn((productData, priceData) =>
    Promise.resolve({
      data: {
        items: [{
          id: 999,
          product: productData.product_id,
          ...productData,
          ...priceData
        }]
      }
    })
  ),
  updateItem: jest.fn((id, productData, priceData) =>
    Promise.resolve({
      data: {
        items: [{
          id,
          product: productData.product_id,
          ...productData,
          ...priceData
        }]
      }
    })
  ),
  removeItem: jest.fn(() => Promise.resolve({ data: { success: true } }))
}));

// Helper to get SpeedDialAction button by label (tooltipOpen creates duplicate labels)
const getActionButton = (labelRegex) => {
  const elements = screen.getAllByLabelText(labelRegex);
  return elements.find(el => el.getAttribute('role') === 'menuitem');
};

describe('TutorialComponents Integration Tests (T034)', () => {
  const mockProduct = {
    productId: 1,
    subjectCode: 'CS2',
    subjectName: 'CS2 - Actuarial Modelling',
    location: 'Bristol',
    product: {
      price: 299.00,
      subject_code: 'CS2',
      vat_status_display: 'Price includes VAT'
    },
  };

  const mockVariations = [
    {
      id: 1,
      name: 'Standard Tutorial',
      description_short: 'In-person tutorial',
      prices: [{ price_type: 'standard', amount: 299.00 }],
      events: [
        {
          id: 101,
          title: 'CS2 Introduction Tutorial',
          code: 'TUT-CS2-BRI-001',
          venue: 'Room 101, Main Building',
          start_date: '2025-11-01T09:00:00Z',
          end_date: '2025-11-01T17:00:00Z',
          is_soldout: false,
          remain_space: 20,
        },
        {
          id: 102,
          title: 'CS2 Advanced Tutorial',
          code: 'TUT-CS2-BRI-002',
          venue: 'Room 202, Main Building',
          start_date: '2025-11-08T09:00:00Z',
          end_date: '2025-11-08T17:00:00Z',
          is_soldout: false,
          remain_space: 15,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    tutorialService.getTutorialVariations.mockResolvedValue(mockVariations);
    cartService.fetchCart.mockResolvedValue({ data: { items: [] } });
  });

  const renderWithProviders = (ui) => {
    return render(
      <CartProvider>
        <TutorialChoiceProvider>
          {ui}
        </TutorialChoiceProvider>
      </CartProvider>
    );
  };

  describe('Dialog → Context → SummaryBar Workflow', () => {
    test('T034-1: Selecting choice in dialog updates context and triggers summary bar', async () => {
      renderWithProviders(
        <TutorialProductCard
          subjectCode={mockProduct.subjectCode}
          subjectName={mockProduct.subjectName}
          location={mockProduct.location}
          productId={mockProduct.productId}
          product={mockProduct.product}
          variations={mockVariations}
        />
      );

      // Step 1: Open dialog via SpeedDial
      const speedDial = screen.getByLabelText('Tutorial Actions');
      fireEvent.click(speedDial);

      await waitFor(() => {
        const selectAction = getActionButton(/select tutorial/i);
        expect(selectAction).toBeInTheDocument();
      });

      const selectAction = getActionButton(/select tutorial/i);
      fireEvent.click(selectAction);

      // Wait for dialog to open
      await waitFor(() => {
        expect(screen.getByText('CS2 - Actuarial Modelling Tutorials - Bristol')).toBeInTheDocument();
      });

      // Step 2: Select "1st" choice button in dialog
      const firstChoiceButtons = screen.getAllByRole('button', { name: /^1st$/i });
      const firstEventChoiceButton = firstChoiceButtons[0];
      fireEvent.click(firstEventChoiceButton);

      // Step 3: Verify summary bar appears with correct content
      await waitFor(() => {
        expect(screen.getByText(/1\. 1st Choice - Bristol \(TUT-CS2-BRI-001\)/i)).toBeInTheDocument();
      });

      // Step 4: Verify action buttons are present
      expect(screen.getByLabelText('Edit tutorial choices')).toBeInTheDocument();
      expect(screen.getByLabelText('Add tutorial choices to cart')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove tutorial choices')).toBeInTheDocument();
    });

    test('T034-2: Context update triggers summary bar visibility and updates display', async () => {
      renderWithProviders(
        <TutorialProductCard
          subjectCode={mockProduct.subjectCode}
          subjectName={mockProduct.subjectName}
          location={mockProduct.location}
          productId={mockProduct.productId}
          product={mockProduct.product}
          variations={mockVariations}
        />
      );

      // Initially, no summary bar should be visible (check for summary bar specific text)
      expect(screen.queryByText(/1\. 1st Choice/i)).not.toBeInTheDocument();

      // Open dialog and select 1st choice
      const speedDial = screen.getByLabelText('Tutorial Actions');
      fireEvent.click(speedDial);

      await waitFor(() => {
        const selectAction = getActionButton(/select tutorial/i);
        fireEvent.click(selectAction);
      });

      await waitFor(() => {
        expect(screen.getByText('CS2 - Actuarial Modelling Tutorials - Bristol')).toBeInTheDocument();
      });

      const firstChoiceButtons = screen.getAllByRole('button', { name: /^1st$/i });
      fireEvent.click(firstChoiceButtons[0]);

      // Verify summary bar appears
      await waitFor(() => {
        expect(screen.getByText(/CS2 - Actuarial Modelling Tutorials/i)).toBeInTheDocument();
      });

      // Now select 2nd choice
      const secondChoiceButtons = screen.getAllByRole('button', { name: /^2nd$/i });
      fireEvent.click(secondChoiceButtons[1]); // Different event

      // Verify summary bar updates to show both choices
      await waitFor(() => {
        expect(screen.getByText(/1\. 1st Choice/i)).toBeInTheDocument();
        expect(screen.getByText(/2\. 2nd Choice/i)).toBeInTheDocument();
      });
    });

    test('T034-3: Summary bar Edit button opens dialog with pre-selected choices', async () => {
      renderWithProviders(
        <TutorialProductCard
          subjectCode={mockProduct.subjectCode}
          subjectName={mockProduct.subjectName}
          location={mockProduct.location}
          productId={mockProduct.productId}
          product={mockProduct.product}
          variations={mockVariations}
        />
      );

      // Step 1: Make initial selections
      const speedDial = screen.getByLabelText('Tutorial Actions');
      fireEvent.click(speedDial);

      await waitFor(() => {
        const selectAction = getActionButton(/select tutorial/i);
        fireEvent.click(selectAction);
      });

      await waitFor(() => {
        expect(screen.getByText('CS2 - Actuarial Modelling Tutorials - Bristol')).toBeInTheDocument();
      });

      const firstChoiceButtons = screen.getAllByRole('button', { name: /^1st$/i });
      fireEvent.click(firstChoiceButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/CS2.*Tutorials/i)).toBeInTheDocument();
      });

      // Close dialog
      const closeButton = screen.getByLabelText('close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('CS2 - Actuarial Modelling Tutorials - Bristol')).not.toBeInTheDocument();
      });

      // Step 2: Click Edit button in summary bar
      const editButton = screen.getByLabelText('Edit tutorial choices');
      fireEvent.click(editButton);

      // Step 3: Verify dialog opens with choice pre-selected
      await waitFor(() => {
        expect(screen.getByText('CS2 - Actuarial Modelling Tutorials - Bristol')).toBeInTheDocument();
      });

      // Verify the 1st choice button shows as selected (contained variant)
      const firstChoiceButtonsAfterEdit = screen.getAllByRole('button', { name: /^1st$/i });
      const selectedButton = firstChoiceButtonsAfterEdit[0];

      // Check aria-pressed attribute to verify selection state
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('T034-4: Add to Cart transitions choices from draft to carted state', async () => {
      renderWithProviders(
        <TutorialProductCard
          subjectCode={mockProduct.subjectCode}
          subjectName={mockProduct.subjectName}
          location={mockProduct.location}
          productId={mockProduct.productId}
          product={mockProduct.product}
          variations={mockVariations}
        />
      );

      // Step 1: Select choices (creates draft state)
      const speedDial = screen.getByLabelText('Tutorial Actions');
      fireEvent.click(speedDial);

      await waitFor(() => {
        const selectAction = getActionButton(/select tutorial/i);
        fireEvent.click(selectAction);
      });

      await waitFor(() => {
        expect(screen.getByText('CS2 - Actuarial Modelling Tutorials - Bristol')).toBeInTheDocument();
      });

      const firstChoiceButtons = screen.getAllByRole('button', { name: /^1st$/i });
      fireEvent.click(firstChoiceButtons[0]);

      const secondChoiceButtons = screen.getAllByRole('button', { name: /^2nd$/i });
      fireEvent.click(secondChoiceButtons[1]);

      // Verify summary bar shows both choices in expanded state (draft)
      await waitFor(() => {
        expect(screen.getByText(/1\. 1st Choice/i)).toBeInTheDocument();
        expect(screen.getByText(/2\. 2nd Choice/i)).toBeInTheDocument();
        expect(screen.getByLabelText('Add tutorial choices to cart')).toBeInTheDocument();
      });

      // Step 2: Click "Add to Cart" in summary bar
      const addToCartButton = screen.getByLabelText('Add tutorial choices to cart');
      fireEvent.click(addToCartButton);

      // Step 3: Verify cart service was called
      await waitFor(() => {
        expect(cartService.addToCart).toHaveBeenCalled();
      });

      // Step 4: Verify summary bar collapses (choices now carted, not draft)
      // When choices are carted (isDraft: false), the expanded view should hide
      // and only the collapsed view should show
      await waitFor(() => {
        // The detailed choice list should not be visible anymore
        // because hasCartedChoices returns true and getDraftChoices returns empty
        expect(screen.queryByText(/1\. 1st Choice/i)).not.toBeInTheDocument();
      });
    });

    test('T034-5: Multiple selections and cart operations maintain state correctly', async () => {
      renderWithProviders(
        <TutorialProductCard
          subjectCode={mockProduct.subjectCode}
          subjectName={mockProduct.subjectName}
          location={mockProduct.location}
          productId={mockProduct.productId}
          product={mockProduct.product}
          variations={mockVariations}
        />
      );

      // Step 1: Select 1st and 2nd choices
      const speedDial = screen.getByLabelText('Tutorial Actions');
      fireEvent.click(speedDial);

      await waitFor(() => {
        const selectAction = getActionButton(/select tutorial/i);
        fireEvent.click(selectAction);
      });

      await waitFor(() => {
        expect(screen.getByText('CS2 - Actuarial Modelling Tutorials - Bristol')).toBeInTheDocument();
      });

      const firstChoiceButtons = screen.getAllByRole('button', { name: /^1st$/i });
      fireEvent.click(firstChoiceButtons[0]);

      const secondChoiceButtons = screen.getAllByRole('button', { name: /^2nd$/i });
      fireEvent.click(secondChoiceButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/1\. 1st Choice/i)).toBeInTheDocument();
        expect(screen.getByText(/2\. 2nd Choice/i)).toBeInTheDocument();
      });

      // Step 2: Add to cart
      const addToCartButton = screen.getByLabelText('Add tutorial choices to cart');
      fireEvent.click(addToCartButton);

      await waitFor(() => {
        expect(cartService.addToCart).toHaveBeenCalled();
      });

      // Step 3: Verify choices can still be edited
      const editButton = screen.getByLabelText('Edit tutorial choices');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('CS2 - Actuarial Modelling Tutorials - Bristol')).toBeInTheDocument();
      });

      // Verify previous selections are shown
      const firstChoiceButtonsAfterEdit = screen.getAllByRole('button', { name: /^1st$/i });
      expect(firstChoiceButtonsAfterEdit[0]).toHaveAttribute('aria-pressed', 'true');
    });

    test('T034-6: Remove button clears draft choices and hides summary bar', async () => {
      renderWithProviders(
        <TutorialProductCard
          subjectCode={mockProduct.subjectCode}
          subjectName={mockProduct.subjectName}
          location={mockProduct.location}
          productId={mockProduct.productId}
          product={mockProduct.product}
          variations={mockVariations}
        />
      );

      // Step 1: Make selections
      const speedDial = screen.getByLabelText('Tutorial Actions');
      fireEvent.click(speedDial);

      await waitFor(() => {
        const selectAction = getActionButton(/select tutorial/i);
        fireEvent.click(selectAction);
      });

      await waitFor(() => {
        expect(screen.getByText('CS2 - Actuarial Modelling Tutorials - Bristol')).toBeInTheDocument();
      });

      const firstChoiceButtons = screen.getAllByRole('button', { name: /^1st$/i });
      fireEvent.click(firstChoiceButtons[0]);

      // Verify summary bar appears
      await waitFor(() => {
        expect(screen.getByText(/CS2 - Actuarial Modelling Tutorials/i)).toBeInTheDocument();
      });

      // Step 2: Click Remove button
      const removeButton = screen.getByLabelText('Remove tutorial choices');
      fireEvent.click(removeButton);

      // Step 3: Verify summary bar disappears
      await waitFor(() => {
        expect(screen.queryByText(/CS2.*Tutorials/i)).not.toBeInTheDocument();
      });
    });

    test('T034-7: Full workflow - Select, Edit, Re-select, Add to Cart', async () => {
      renderWithProviders(
        <TutorialProductCard
          subjectCode={mockProduct.subjectCode}
          subjectName={mockProduct.subjectName}
          location={mockProduct.location}
          productId={mockProduct.productId}
          product={mockProduct.product}
          variations={mockVariations}
        />
      );

      // Step 1: Initial selection
      const speedDial = screen.getByLabelText('Tutorial Actions');
      fireEvent.click(speedDial);

      await waitFor(() => {
        const selectAction = getActionButton(/select tutorial/i);
        fireEvent.click(selectAction);
      });

      await waitFor(() => {
        expect(screen.getByText('CS2 - Actuarial Modelling Tutorials - Bristol')).toBeInTheDocument();
      });

      const firstChoiceButtons = screen.getAllByRole('button', { name: /^1st$/i });
      fireEvent.click(firstChoiceButtons[0]); // Event 101

      await waitFor(() => {
        expect(screen.getByText(/TUT-CS2-BRI-001/i)).toBeInTheDocument();
      });

      // Step 2: Edit and change selection
      const closeButton = screen.getByLabelText('close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('CS2 - Actuarial Modelling Tutorials - Bristol')).not.toBeInTheDocument();
      });

      const editButton = screen.getByLabelText('Edit tutorial choices');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('CS2 - Actuarial Modelling Tutorials - Bristol')).toBeInTheDocument();
      });

      // Change to different event
      const firstChoiceButtonsEdit = screen.getAllByRole('button', { name: /^1st$/i });
      fireEvent.click(firstChoiceButtonsEdit[1]); // Event 102

      await waitFor(() => {
        expect(screen.getByText(/TUT-CS2-BRI-002/i)).toBeInTheDocument();
      });

      // Step 3: Add to cart
      const closeButtonAfterEdit = screen.getByLabelText('close');
      fireEvent.click(closeButtonAfterEdit);

      await waitFor(() => {
        expect(screen.queryByText('CS2 - Actuarial Modelling Tutorials - Bristol')).not.toBeInTheDocument();
      });

      const addToCartButton = screen.getByLabelText('Add tutorial choices to cart');
      fireEvent.click(addToCartButton);

      // Step 4: Verify cart was called with correct event
      await waitFor(() => {
        expect(cartService.addToCart).toHaveBeenCalledWith(
          expect.objectContaining({
            product_id: mockProduct.productId,
            product_type: 'tutorial',
            subject_code: 'CS2',
          }),
          expect.objectContaining({
            metadata: expect.objectContaining({
              type: 'tutorial',
              subjectCode: 'CS2',
              choices: expect.objectContaining({
                '1st': expect.objectContaining({
                  eventCode: 'TUT-CS2-BRI-002', // Changed event
                  isDraft: false, // Marked as added
                }),
              }),
            }),
          })
        );
      });
    });
  });
});
