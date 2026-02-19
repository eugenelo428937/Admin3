import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminUserProfileForm from '../admin/user-profiles/UserProfileForm';

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ isSuperuser: true }),
}));

jest.mock('../../services/userProfileService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn().mockResolvedValue({
      id: 1,
      title: 'Mr',
      user: { id: 5, email: 'test@test.com', first_name: 'John', last_name: 'Doe' },
      send_invoices_to: 'HOME',
      send_study_material_to: 'HOME',
    }),
    getAddresses: jest.fn().mockResolvedValue([]),
    getContacts: jest.fn().mockResolvedValue([]),
    getEmails: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ id: 1 }),
  },
}));

// Mock all step components
jest.mock('../User/steps', () => ({
  PersonalInfoStep: ({ mode }) => <div data-testid="personal-step" data-mode={mode}>PersonalInfoStep</div>,
  HomeAddressStep: ({ mode }) => <div data-testid="home-step" data-mode={mode}>HomeAddressStep</div>,
  WorkAddressStep: ({ mode }) => <div data-testid="work-step" data-mode={mode}>WorkAddressStep</div>,
  PreferencesStep: ({ mode }) => <div data-testid="preferences-step" data-mode={mode}>PreferencesStep</div>,
}));

const theme = createTheme();
const renderWithProviders = (ui, { route = '/admin/user-profiles/1/edit' } = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/admin/user-profiles/:id/edit" element={ui} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

describe('AdminUserProfileForm', () => {
  test('renders MUI Stepper with 4 steps', async () => {
    renderWithProviders(<AdminUserProfileForm />);
    await waitFor(() => {
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });
  });

  test('renders step components with mode=admin', async () => {
    renderWithProviders(<AdminUserProfileForm />);
    await waitFor(() => {
      const step = screen.getByTestId('personal-step');
      expect(step).toHaveAttribute('data-mode', 'admin');
    });
  });

  test('does not include SecurityStep', async () => {
    renderWithProviders(<AdminUserProfileForm />);
    await waitFor(() => {
      expect(screen.queryByText('Security')).not.toBeInTheDocument();
    });
  });
});
