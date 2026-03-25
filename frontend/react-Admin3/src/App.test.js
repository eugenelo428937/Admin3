import { vi } from 'vitest';
/**
 * Tests for App Component
 * T009: Test routing setup, provider hierarchy, navigation
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.js';

// Mock ConfigContext - App wraps content in ConfigProvider
vi.mock('./contexts/ConfigContext', () => ({
  __esModule: true,
  useConfig: () => ({ isInternal: false, configLoaded: true }),
  ConfigProvider: ({ children }) => children,
}));

// Mock all the heavy components to speed up tests
vi.mock('./pages/Home.tsx', () => ({ __esModule: true, default: () => <div data-testid="home-page">Home Page</div> }));
vi.mock('./pages/InternalHome.tsx', () => ({ __esModule: true, default: () => <div data-testid="internal-home">Home Page</div> }));
vi.mock('./pages/Dashboard.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-dashboard">Dashboard</div> }));
vi.mock('./pages/ProfilePage.tsx', () => ({ __esModule: true, default: () => <div data-testid="profile-page">Profile Page</div> }));
vi.mock('./pages/Registration.tsx', () => ({ __esModule: true, default: () => <div data-testid="registration-page">Registration Page</div> }));
vi.mock('./components/Navigation/MainNavBar.tsx', () => ({ __esModule: true, default: () => <nav data-testid="main-nav">Navigation</nav> }));
vi.mock('./components/Product/ProductList.tsx', () => ({ __esModule: true, default: () => <div data-testid="product-list">Products</div> }));
vi.mock('./components/Ordering/CheckoutPage.tsx', () => ({ __esModule: true, default: () => <div data-testid="checkout-page">Checkout</div> }));
vi.mock('./components/User/OrderHistory.tsx', () => ({ __esModule: true, default: () => <div data-testid="order-history">Orders</div> }));
vi.mock('./components/User/ForgotPasswordForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="forgot-password">Forgot Password</div> }));
vi.mock('./components/User/ResetPasswordForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="reset-password">Reset Password</div> }));
vi.mock('./components/User/AccountActivation.tsx', () => ({ __esModule: true, default: () => <div data-testid="account-activation">Activation</div> }));
vi.mock('./components/User/ResendActivation.tsx', () => ({ __esModule: true, default: () => <div data-testid="resend-activation">Resend</div> }));
vi.mock('./components/User/EmailVerification.tsx', () => ({ __esModule: true, default: () => <div data-testid="email-verification">Email Verify</div> }));
vi.mock('./pages/StyleGuide.tsx', () => ({ __esModule: true, default: () => <div data-testid="styleguide">Style Guide</div> }));
vi.mock('./components/NoMatch.tsx', () => ({ __esModule: true, default: () => <div data-testid="no-match">404 Not Found</div> }));
vi.mock('./components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.tsx', () => ({ __esModule: true, default: () => null }));
vi.mock('./components/styleguide/MaterialThemeVisualizer.js', () => ({ __esModule: true, default: () => <div data-testid="theme-visualizer">Theme Visualizer</div> }));
vi.mock('./components/Footer', () => ({ __esModule: true, default: () => <footer data-testid="footer">Footer</footer> }));
vi.mock('./pages/Cart.tsx', () => ({ __esModule: true, default: () => <div data-testid="cart-page">Cart</div> }));

// Note: AdminLayout is wrapped in React.lazy. Vitest's vi.mock cannot intercept
// dynamic import() used by React.lazy. Admin route tests need longer timeouts
// and the real AdminLayout to resolve. Mock its dependencies instead.
vi.mock('./hooks/useAuth', () => ({
  __esModule: true,
  useAuth: () => ({ isSuperuser: true, isLoading: false, isAuthenticated: true }),
  AuthProvider: ({ children }) => children,
}));
vi.mock('./hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: () => ({ isSuperuser: true, isLoading: false, isAuthenticated: true }),
  AuthProvider: ({ children }) => children,
}));
vi.mock('./components/admin/styles/admin.css', () => ({}));
vi.mock('./components/admin/layout/AdminShell', () => ({
  __esModule: true,
  AdminShell: () => null,
}));
vi.mock('./components/admin/layout/DarkModeProvider', () => ({
  __esModule: true,
  DarkModeProvider: ({ children }) => children,
  useDarkMode: () => ({ mode: 'light', toggleMode: () => {} }),
}));

// Mock admin components
vi.mock('./components/admin/exam-sessions/ExamSessionList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-exam-sessions">Exam Sessions</div> }));
vi.mock('./components/admin/exam-sessions/ExamSessionForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-exam-session-form">Exam Session Form</div> }));
vi.mock('./components/admin/subjects/SubjectList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-subjects">Subjects</div> }));
vi.mock('./components/admin/subjects/SubjectForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-subject-form">Subject Form</div> }));
vi.mock('./components/admin/subjects/SubjectDetail.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-subject-detail">Subject Detail</div> }));
vi.mock('./components/admin/subjects/SubjectImport.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-subject-import">Subject Import</div> }));
vi.mock('./components/admin/products/ProductList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-products">Admin Products</div> }));
vi.mock('./components/admin/products/ProductDetail.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-product-detail">Product Detail</div> }));
vi.mock('./components/admin/products/ProductForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-product-form">Product Form</div> }));
vi.mock('./components/admin/products/ProductImport.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-product-import">Product Import</div> }));

// Mock admin catalog components (US3)
vi.mock('./components/admin/exam-session-subjects/ExamSessionSubjectList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-ess-list">ESS List</div> }));
vi.mock('./components/admin/exam-session-subjects/ExamSessionSubjectForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-ess-form">ESS Form</div> }));
vi.mock('./components/admin/product-variations/ProductVariationList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-pv-list">PV List</div> }));
vi.mock('./components/admin/product-variations/ProductVariationForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-pv-form">PV Form</div> }));
vi.mock('./components/admin/product-bundles/ProductBundleList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-pb-list">PB List</div> }));
vi.mock('./components/admin/product-bundles/ProductBundleForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-pb-form">PB Form</div> }));

// Mock admin store components (US4)
vi.mock('./components/admin/store-products/StoreProductList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-sp-list">SP List</div> }));
vi.mock('./components/admin/store-products/StoreProductForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-sp-form">SP Form</div> }));
vi.mock('./components/admin/recommendations/RecommendationList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-rec-list">Rec List</div> }));
vi.mock('./components/admin/recommendations/RecommendationForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-rec-form">Rec Form</div> }));
vi.mock('./components/admin/prices/PriceList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-price-list">Price List</div> }));
vi.mock('./components/admin/prices/PriceForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-price-form">Price Form</div> }));
vi.mock('./components/admin/store-bundles/StoreBundleList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-sb-list">SB List</div> }));
vi.mock('./components/admin/store-bundles/StoreBundleForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-sb-form">SB Form</div> }));

// Mock admin session setup wizard
vi.mock('./components/admin/new-session-setup/NewSessionSetup.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-session-setup">Session Setup</div> }));

// Mock admin users & staff (US5)
vi.mock('./components/admin/user-profiles/UserProfileList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-user-list">User List</div> }));
vi.mock('./components/admin/user-profiles/UserProfileForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-user-form">User Form</div> }));
vi.mock('./components/admin/staff/StaffList.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-staff-list">Staff List</div> }));
vi.mock('./components/admin/staff/StaffForm.tsx', () => ({ __esModule: true, default: () => <div data-testid="admin-staff-form">Staff Form</div> }));

// Mock admin email components (US6)
vi.mock('./components/admin/email/settings/EmailSettingsList', () => ({ __esModule: true, default: () => <div data-testid="admin-email-settings">Email Settings</div> }));
vi.mock('./components/admin/email/templates/EmailTemplateList', () => ({ __esModule: true, default: () => <div data-testid="admin-email-templates">Email Templates</div> }));
vi.mock('./components/admin/email/templates/EmailTemplateForm', () => ({ __esModule: true, default: () => <div data-testid="admin-email-template-form">Email Template Form</div> }));
vi.mock('./components/admin/email/queue/EmailQueueList', () => ({ __esModule: true, default: () => <div data-testid="admin-email-queue">Email Queue</div> }));
vi.mock('./components/admin/email/queue/EmailQueueDetail', () => ({ __esModule: true, default: () => <div data-testid="admin-email-queue-detail">Email Queue Detail</div> }));
vi.mock('./components/admin/email/queue/EmailQueueDuplicateForm', () => ({ __esModule: true, default: () => <div data-testid="admin-email-queue-dup">Email Queue Dup</div> }));
vi.mock('./components/admin/email/attachments/EmailAttachmentList', () => ({ __esModule: true, default: () => <div data-testid="admin-email-attachments">Email Attachments</div> }));
vi.mock('./components/admin/email/attachments/EmailAttachmentForm', () => ({ __esModule: true, default: () => <div data-testid="admin-email-attachment-form">Email Attachment Form</div> }));
vi.mock('./components/admin/email/content-rules/EmailContentRuleList', () => ({ __esModule: true, default: () => <div data-testid="admin-email-rules">Email Rules</div> }));
vi.mock('./components/admin/email/content-rules/EmailContentRuleForm', () => ({ __esModule: true, default: () => <div data-testid="admin-email-rule-form">Email Rule Form</div> }));
vi.mock('./components/admin/email/placeholders/EmailPlaceholderList', () => ({ __esModule: true, default: () => <div data-testid="admin-email-placeholders">Email Placeholders</div> }));
vi.mock('./components/admin/email/placeholders/EmailPlaceholderForm', () => ({ __esModule: true, default: () => <div data-testid="admin-email-placeholder-form">Email Placeholder Form</div> }));
vi.mock('./components/admin/email/closing-salutations/ClosingSalutationList', () => ({ __esModule: true, default: () => <div data-testid="admin-email-salutations">Email Salutations</div> }));
vi.mock('./components/admin/email/closing-salutations/ClosingSalutationForm', () => ({ __esModule: true, default: () => <div data-testid="admin-email-salutation-form">Email Salutation Form</div> }));

// Mock ErrorBoundary
vi.mock('./components/ErrorBoundary.tsx', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
}));

// Mock reCAPTCHA provider
vi.mock('react-google-recaptcha-v3', () => ({
  GoogleReCaptchaProvider: ({ children }) => children,
  useGoogleReCaptcha: () => ({ executeRecaptcha: vi.fn() }),
}));

// Mock Chakra UI
vi.mock('@chakra-ui/react', () => ({
  ChakraProvider: ({ children }) => children,
  createSystem: () => ({}),
  defaultConfig: {},
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear localStorage
    localStorage.clear();
  });

  describe('routing', () => {
    test('renders internal home at root path', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        const homes = screen.getAllByTestId('internal-home');
        expect(homes.length).toBeGreaterThanOrEqual(1);
      }, { timeout: 2000 });
    });

    test('renders internal home at /home', async () => {
      render(
        <MemoryRouter initialEntries={['/home']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        const homes = screen.getAllByTestId('internal-home');
        expect(homes.length).toBeGreaterThanOrEqual(1);
      }, { timeout: 2000 });
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
    // Admin routes are wrapped by AdminLayout (shadcn/ui shell).
    // React.lazy child components inside a layout route don't resolve
    // in the test environment. We verify the layout renders instead.
    test('renders admin layout shell at admin/exam-sessions', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/admin/exam-sessions']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(container.querySelector('.admin-root')).toBeInTheDocument();
      });
    });

    test('renders admin layout shell at admin/subjects', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/admin/subjects']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(container.querySelector('.admin-root')).toBeInTheDocument();
      });
    });

    test('renders admin layout shell at admin/products', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/admin/products']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(container.querySelector('.admin-root')).toBeInTheDocument();
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
      delete import.meta.env.VITE_RECAPTCHA_SITE_KEY;

      render(
        <MemoryRouter initialEntries={['/home']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('internal-home').length).toBeGreaterThanOrEqual(1);
      }, { timeout: 2000 });
    });

    test('renders with reCAPTCHA key', async () => {
      import.meta.env.VITE_RECAPTCHA_SITE_KEY = 'test-site-key';

      render(
        <MemoryRouter initialEntries={['/home']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('internal-home').length).toBeGreaterThanOrEqual(1);
      }, { timeout: 2000 });
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
        expect(screen.getAllByTestId('internal-home').length).toBeGreaterThanOrEqual(1);
      }, { timeout: 2000 });
    });
  });
});
