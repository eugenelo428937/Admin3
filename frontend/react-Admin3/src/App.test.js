/**
 * Tests for App Component
 * T009: Test routing setup, provider hierarchy, navigation
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Mock all the heavy components to speed up tests
jest.mock('./pages/Home', () => () => <div data-testid="home-page">Home Page</div>);
jest.mock('./pages/ProfilePage', () => () => <div data-testid="profile-page">Profile Page</div>);
jest.mock('./pages/Registration', () => () => <div data-testid="registration-page">Registration Page</div>);
jest.mock('./components/Navigation/MainNavBar', () => () => <nav data-testid="main-nav">Navigation</nav>);
jest.mock('./components/Product/ProductList', () => () => <div data-testid="product-list">Products</div>);
jest.mock('./components/Ordering/CheckoutPage', () => () => <div data-testid="checkout-page">Checkout</div>);
jest.mock('./components/User/OrderHistory', () => () => <div data-testid="order-history">Orders</div>);
jest.mock('./components/User/ForgotPasswordForm', () => () => <div data-testid="forgot-password">Forgot Password</div>);
jest.mock('./components/User/ResetPasswordForm', () => () => <div data-testid="reset-password">Reset Password</div>);
jest.mock('./components/User/AccountActivation', () => () => <div data-testid="account-activation">Activation</div>);
jest.mock('./components/User/ResendActivation', () => () => <div data-testid="resend-activation">Resend</div>);
jest.mock('./components/User/EmailVerification', () => () => <div data-testid="email-verification">Email Verify</div>);
jest.mock('./components/StyleGuide', () => () => <div data-testid="style-guide">Style Guide</div>);
jest.mock('./components/NoMatch', () => () => <div data-testid="no-match">404 Not Found</div>);
jest.mock('./components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer', () => () => null);

// Mock admin components
jest.mock('./components/admin/exam-sessions/ExamSessionList', () => () => <div data-testid="admin-exam-sessions">Exam Sessions</div>);
jest.mock('./components/admin/exam-sessions/ExamSessionForm', () => () => <div data-testid="admin-exam-session-form">Exam Session Form</div>);
jest.mock('./components/admin/subjects/SubjectList', () => () => <div data-testid="admin-subjects">Subjects</div>);
jest.mock('./components/admin/subjects/SubjectForm', () => () => <div data-testid="admin-subject-form">Subject Form</div>);
jest.mock('./components/admin/subjects/SubjectDetail', () => () => <div data-testid="admin-subject-detail">Subject Detail</div>);
jest.mock('./components/admin/subjects/SubjectImport', () => () => <div data-testid="admin-subject-import">Subject Import</div>);
jest.mock('./components/admin/products/ProductList', () => () => <div data-testid="admin-products">Admin Products</div>);
jest.mock('./components/admin/products/ProductDetail', () => () => <div data-testid="admin-product-detail">Product Detail</div>);
jest.mock('./components/admin/products/ProductForm', () => () => <div data-testid="admin-product-form">Product Form</div>);
jest.mock('./components/admin/products/ProductImport', () => () => <div data-testid="admin-product-import">Product Import</div>);

// Mock ErrorBoundary
jest.mock('./components/ErrorBoundary', () => ({ children }) => <>{children}</>);

// Mock reCAPTCHA provider
jest.mock('react-google-recaptcha-v3', () => ({
  GoogleReCaptchaProvider: ({ children }) => children,
  useGoogleReCaptcha: () => ({ executeRecaptcha: jest.fn() }),
}));

// Mock Chakra UI
jest.mock('@chakra-ui/react', () => ({
  ChakraProvider: ({ children }) => children,
  createSystem: () => ({}),
  defaultConfig: {},
}));

describe('App Component', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('routing', () => {
    test('redirects root path to /home', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    test('renders home page at /home', async () => {
      render(
        <MemoryRouter initialEntries={['/home']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    test('renders products page at /products', async () => {
      render(
        <MemoryRouter initialEntries={['/products']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('product-list')).toBeInTheDocument();
      });
    });

    test('renders profile page at /profile', async () => {
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });
    });

    test('renders checkout page at /checkout', async () => {
      render(
        <MemoryRouter initialEntries={['/checkout']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('checkout-page')).toBeInTheDocument();
      });
    });

    test('renders registration page at /register', async () => {
      render(
        <MemoryRouter initialEntries={['/register']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('registration-page')).toBeInTheDocument();
      });
    });

    test('renders 404 page for unknown routes', async () => {
      render(
        <MemoryRouter initialEntries={['/unknown-route']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('no-match')).toBeInTheDocument();
      });
    });
  });

  describe('authentication routes', () => {
    test('renders forgot password at /auth/forgot-password', async () => {
      render(
        <MemoryRouter initialEntries={['/auth/forgot-password']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('forgot-password')).toBeInTheDocument();
      });
    });

    test('renders reset password at /auth/reset-password', async () => {
      render(
        <MemoryRouter initialEntries={['/auth/reset-password']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('reset-password')).toBeInTheDocument();
      });
    });

    test('renders account activation at /auth/activate', async () => {
      render(
        <MemoryRouter initialEntries={['/auth/activate']}>
          <App />
        </MemoryRouter>
      );

      // Use findAllByTestId since AccountActivation is used for both /auth/activate and /auth/verify-email
      const elements = await screen.findAllByTestId('account-activation');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    test('renders resend activation at /auth/resend-activation', async () => {
      render(
        <MemoryRouter initialEntries={['/auth/resend-activation']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('resend-activation')).toBeInTheDocument();
      });
    });
  });

  describe('admin routes', () => {
    test('renders admin exam sessions at admin/exam-sessions', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/exam-sessions']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('admin-exam-sessions')).toBeInTheDocument();
      });
    });

    test('renders admin subjects at admin/subjects', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/subjects']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('admin-subjects')).toBeInTheDocument();
      });
    });

    test('renders admin products at admin/products', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/products']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('admin-products')).toBeInTheDocument();
      });
    });
  });

  describe('provider hierarchy', () => {
    test('renders main navigation', async () => {
      render(
        <MemoryRouter initialEntries={['/home']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('main-nav')).toBeInTheDocument();
      });
    });

    test('renders app container with correct class', async () => {
      render(
        <MemoryRouter initialEntries={['/home']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(document.querySelector('.App')).toBeInTheDocument();
      });
    });
  });

  describe('reCAPTCHA handling', () => {
    test('renders without reCAPTCHA key', async () => {
      delete process.env.REACT_APP_RECAPTCHA_SITE_KEY;

      render(
        <MemoryRouter initialEntries={['/home']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    test('renders with reCAPTCHA key', async () => {
      process.env.REACT_APP_RECAPTCHA_SITE_KEY = 'test-site-key';

      render(
        <MemoryRouter initialEntries={['/home']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });
  });

  describe('localStorage authentication', () => {
    test('checks localStorage for authentication status', async () => {
      localStorage.setItem('isAuthenticated', 'true');

      render(
        <MemoryRouter initialEntries={['/home']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });
  });
});
