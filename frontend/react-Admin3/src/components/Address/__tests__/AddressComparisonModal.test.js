import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AddressComparisonModal from '../AddressComparisonModal';

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockUserAddress = {
  address: '10 Downing Street',
  city: 'London',
  postal_code: 'SW1A 2AA',
  country: 'United Kingdom'
};

const mockSuggestedAddress = {
  address: '10 Downing Street',
  city: 'Westminster',
  postal_code: 'SW1A 2AA',
  county: 'Greater London',
  country: 'United Kingdom'
};

describe('AddressComparisonModal', () => {
  it('renders both addresses when open', () => {
    const onAccept = jest.fn();
    const onKeepOriginal = jest.fn();
    const onClose = jest.fn();

    renderWithTheme(
      <AddressComparisonModal
        open={true}
        userAddress={mockUserAddress}
        suggestedAddress={mockSuggestedAddress}
        onAcceptSuggested={onAccept}
        onKeepOriginal={onKeepOriginal}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Your Address')).toBeInTheDocument();
    expect(screen.getByText('Suggested Address')).toBeInTheDocument();
    // Address appears in both panels
    const addressElements = screen.getAllByText('10 Downing Street');
    expect(addressElements).toHaveLength(2);
  });

  it('calls onAcceptSuggested when user clicks accept button', () => {
    const onAccept = jest.fn();
    const onKeepOriginal = jest.fn();
    const onClose = jest.fn();

    renderWithTheme(
      <AddressComparisonModal
        open={true}
        userAddress={mockUserAddress}
        suggestedAddress={mockSuggestedAddress}
        onAcceptSuggested={onAccept}
        onKeepOriginal={onKeepOriginal}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /accept suggested/i }));
    expect(onAccept).toHaveBeenCalledWith(mockSuggestedAddress);
  });

  it('calls onKeepOriginal when user clicks keep my address button', () => {
    const onAccept = jest.fn();
    const onKeepOriginal = jest.fn();
    const onClose = jest.fn();

    renderWithTheme(
      <AddressComparisonModal
        open={true}
        userAddress={mockUserAddress}
        suggestedAddress={mockSuggestedAddress}
        onAcceptSuggested={onAccept}
        onKeepOriginal={onKeepOriginal}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /keep my address/i }));
    expect(onKeepOriginal).toHaveBeenCalledWith(mockUserAddress);
  });

  it('does not render when open is false', () => {
    renderWithTheme(
      <AddressComparisonModal
        open={false}
        userAddress={mockUserAddress}
        suggestedAddress={mockSuggestedAddress}
        onAcceptSuggested={jest.fn()}
        onKeepOriginal={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByText(/your address/i)).not.toBeInTheDocument();
  });

  it('highlights differences between addresses', () => {
    renderWithTheme(
      <AddressComparisonModal
        open={true}
        userAddress={mockUserAddress}
        suggestedAddress={mockSuggestedAddress}
        onAcceptSuggested={jest.fn()}
        onKeepOriginal={jest.fn()}
        onClose={jest.fn()}
      />
    );

    // The city differs: London vs Westminster
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Westminster')).toBeInTheDocument();
  });
});
