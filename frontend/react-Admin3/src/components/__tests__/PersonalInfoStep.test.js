import { vi } from 'vitest';
// frontend/react-Admin3/src/components/__tests__/PersonalInfoStep.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PersonalInfoStep from '../User/steps/PersonalInfoStep';

// Mock ValidatedPhoneInput to avoid complex phone validation in tests
vi.mock('../User/ValidatedPhoneInput', () => {
  return function MockValidatedPhoneInput({ name, value, onChange, label }) {
    return (
      <input
        data-testid={`phone-${name}`}
        name={name}
        value={value || ''}
        onChange={onChange}
        aria-label={label}
      />
    );
  };
});

const theme = createTheme();

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('PersonalInfoStep', () => {
  const defaultProps = {
    initialData: {
      title: '',
      first_name: '',
      last_name: '',
      email: '',
      home_phone: '',
      mobile_phone: '',
    },
    onDataChange: vi.fn(),
    errors: {},
    mode: 'registration',
  };

  test('renders personal info fields', () => {
    renderWithTheme(<PersonalInfoStep {...defaultProps} />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  test('calls onDataChange when field changes', () => {
    renderWithTheme(<PersonalInfoStep {...defaultProps} />);
    const firstNameInput = screen.getByLabelText(/first name/i);
    fireEvent.change(firstNameInput, { target: { name: 'first_name', value: 'John' } });
    expect(defaultProps.onDataChange).toHaveBeenCalled();
  });

  test('initializes from initialData', () => {
    renderWithTheme(
      <PersonalInfoStep
        {...defaultProps}
        initialData={{ ...defaultProps.initialData, first_name: 'Jane' }}
      />
    );
    expect(screen.getByLabelText(/first name/i)).toHaveValue('Jane');
  });

  test('displays external errors', () => {
    renderWithTheme(
      <PersonalInfoStep
        {...defaultProps}
        errors={{ first_name: 'First name is required' }}
      />
    );
    expect(screen.getByText('First name is required')).toBeInTheDocument();
  });
});
