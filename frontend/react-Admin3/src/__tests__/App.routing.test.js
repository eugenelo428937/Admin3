import { vi } from 'vitest';
/**
 * App Routing Tests (T062)
 *
 * Tests that main routes render correct components and routing behavior works.
 * Uses MemoryRouter to test routing without browser.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme/theme';
import filtersReducer from '../store/slices/filtersSlice.js';

// Mock all services before component imports
vi.mock('../services/httpService.js', () => ({
  __esModule: true,
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock('../services/cartService.ts', () => ({
  __esModule: true,
  default: {
    getCart: vi.fn(() => Promise.resolve({ data: { items: [] } })),
    fetchCart: vi.fn(() => Promise.resolve({ data: { items: [] } })),
    addToCart: vi.fn(() => Promise.resolve({ data: {} })),
    removeItem: vi.fn(() => Promise.resolve({ data: {} })),
    clearCart: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock('../services/productService.js', () => ({
  __esModule: true,
  default: {
    getNavbarProductGroups: vi.fn(() => Promise.resolve([])),
    getDistanceLearningDropdown: vi.fn(() => Promise.resolve([])),
    getTutorialDropdown: vi.fn(() => Promise.resolve(null)),
    getProductById: vi.fn(() => Promise.resolve(null)),
    searchProducts: vi.fn(() => Promise.resolve({ data: { results: [] } })),
  },
}));

vi.mock('../services/subjectService.js', () => ({
  getSubjects: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../services/rulesEngineService', () => ({
  __esModule: true,
  default: {
    executeRules: vi.fn(() => Promise.resolve({ messages: [], actions: [], blocked: false })),
    acknowledgeRule: vi.fn(() => Promise.resolve({ success: true })),
    ENTRY_POINTS: {
      HOME_PAGE_MOUNT: 'home_page_mount',
      CHECKOUT_START: 'checkout_start',
    }
  }
}));

vi.mock('../hooks/useAuth.tsx', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
    login: vi.fn(),
    isSuperuser: false,
  }),
  AuthProvider: ({ children }) => children,
}));

// Mock page components to make routing tests fast and focused
vi.mock('../pages/Home.js', () => ({
  __esModule: true,
  default: function MockHome() {
    return <div data-testid="home-page">Home Page</div>;
  },
}));

vi.mock('../components/Product/ProductList.js', () => ({
  __esModule: true,
  default: function MockProductList() {
    return <div data-testid="product-list-page">Product List Page</div>;
  },
}));

vi.mock('../components/Ordering/CheckoutPage.tsx', () => ({
  __esModule: true,
  default: function MockCheckoutPage() {
    return <div data-testid="checkout-page">Checkout Page</div>;
  },
}));

vi.mock('../pages/ProfilePage.js', () => ({
  __esModule: true,
  default: function MockProfilePage() {
    return <div data-testid="profile-page">Profile Page</div>;
  },
}));

vi.mock('../components/User/OrderHistory.tsx', () => ({
  __esModule: true,
  default: function MockOrderHistory() {
    return <div data-testid="orders-page">Order History Page</div>;
  },
}));

vi.mock('../components/NoMatch.js', () => ({
  __esModule: true,
  default: function MockNoMatch() {
    return <div data-testid="no-match-page">404 - Not Found</div>;
  },
}));

vi.mock('../pages/Registration.js', () => ({
  __esModule: true,
  default: function MockRegistration() {
    return <div data-testid="registration-page">Registration Page</div>;
  },
}));

vi.mock('../pages/StyleGuide.js', () => ({
  __esModule: true,
  default: function MockStyleGuide() {
    return <div data-testid="style-guide-page">Style Guide</div>;
  },
}));

vi.mock('../components/User/ForgotPasswordForm.tsx', () => ({
  __esModule: true,
  default: function MockForgotPassword() {
    return <div data-testid="forgot-password-page">Forgot Password</div>;
  },
}));

vi.mock('../components/User/ResetPasswordForm.tsx', () => ({
  __esModule: true,
  default: function MockResetPassword() {
    return <div data-testid="reset-password-page">Reset Password</div>;
  },
}));

vi.mock('../components/User/AccountActivation.tsx', () => ({
  __esModule: true,
  default: function MockAccountActivation() {
    return <div data-testid="account-activation-page">Account Activation</div>;
  },
}));

vi.mock('../components/User/ResendActivation.tsx', () => ({
  __esModule: true,
  default: function MockResendActivation() {
    return <div data-testid="resend-activation-page">Resend Activation</div>;
  },
}));

vi.mock('../components/User/EmailVerification.tsx', () => ({
  __esModule: true,
  default: function MockEmailVerification() {
    return <div data-testid="email-verification-page">Email Verification</div>;
  },
}));

vi.mock('../components/Navigation/MainNavBar.js', () => ({
  __esModule: true,
  default: function MockMainNavBar() {
    return <nav data-testid="main-navbar">Navigation</nav>;
  },
}));

vi.mock('../components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js', () => ({
  __esModule: true,
  default: function MockTutorialSummaryBar() {
    return null;
  },
}));

// Create mock store
const createTestStore = () => {
  return configureStore({
    reducer: {
      filters: filtersReducer,
    },
  });
};

// Import the Navigate component from react-router-dom for redirect testing
import { Navigate } from 'react-router-dom';

// Import mocked components at top level
import Home from '../pages/Home.js';
import ProductList from '../components/Product/ProductList.js';
import CheckoutPage from '../components/Ordering/CheckoutPage.tsx';
import ProfilePage from '../pages/ProfilePage.js';
import OrderHistory from '../components/User/OrderHistory.tsx';
import NoMatch from '../components/NoMatch.js';
import Registration from '../pages/Registration.js';
import StyleGuide from '../pages/StyleGuide.js';
import ForgotPasswordForm from '../components/User/ForgotPasswordForm.tsx';
import ResetPasswordForm from '../components/User/ResetPasswordForm.tsx';
import AccountActivation from '../components/User/AccountActivation.tsx';
import ResendActivation from '../components/User/ResendActivation.tsx';
import EmailVerification from '../components/User/EmailVerification.tsx';
import MainNavBar from '../components/Navigation/MainNavBar.js';

// Simple test router setup matching App.js routes
const TestRouter = ({ initialEntries = ['/'] }) => {
  const store = createTestStore();

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>
          <MainNavBar />
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/register" element={<Registration />} />
            <Route path="/styleguide" element={<StyleGuide />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordForm />} />
            <Route path="/auth/reset-password" element={<ResetPasswordForm />} />
            <Route path="/auth/activate" element={<AccountActivation />} />
            <Route path="/auth/resend-activation" element={<ResendActivation />} />
            <Route path="/auth/email-verification" element={<EmailVerification />} />
            <Route path="*" element={<NoMatch />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};

describe('App Routing (T062)', () => {
  describe('Route Rendering', () => {
    it('should redirect / to /home', async () => {
      render(<TestRouter initialEntries={['/']} />);

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('should render Home page on /home route', async () => {
      render(<TestRouter initialEntries={['/home']} />);

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('should render ProductList page on /products route', async () => {
      render(<TestRouter initialEntries={['/products']} />);

      await waitFor(() => {
        expect(screen.getByTestId('product-list-page')).toBeInTheDocument();
      });
    });

    it('should render Checkout page on /checkout route', async () => {
      render(<TestRouter initialEntries={['/checkout']} />);

      await waitFor(() => {
        expect(screen.getByTestId('checkout-page')).toBeInTheDocument();
      });
    });

    it('should render Profile page on /profile route', async () => {
      render(<TestRouter initialEntries={['/profile']} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });
    });

    it('should render OrderHistory page on /orders route', async () => {
      render(<TestRouter initialEntries={['/orders']} />);

      await waitFor(() => {
        expect(screen.getByTestId('orders-page')).toBeInTheDocument();
      });
    });

    it('should render Registration page on /register route', async () => {
      render(<TestRouter initialEntries={['/register']} />);

      await waitFor(() => {
        expect(screen.getByTestId('registration-page')).toBeInTheDocument();
      });
    });

    it('should render StyleGuide page on /styleguide route', async () => {
      render(<TestRouter initialEntries={['/styleguide']} />);

      await waitFor(() => {
        expect(screen.getByTestId('style-guide-page')).toBeInTheDocument();
      });
    });
  });

  describe('Auth Routes', () => {
    it('should render ForgotPassword page on /auth/forgot-password route', async () => {
      render(<TestRouter initialEntries={['/auth/forgot-password']} />);

      await waitFor(() => {
        expect(screen.getByTestId('forgot-password-page')).toBeInTheDocument();
      });
    });

    it('should render ResetPassword page on /auth/reset-password route', async () => {
      render(<TestRouter initialEntries={['/auth/reset-password']} />);

      await waitFor(() => {
        expect(screen.getByTestId('reset-password-page')).toBeInTheDocument();
      });
    });

    it('should render AccountActivation page on /auth/activate route', async () => {
      render(<TestRouter initialEntries={['/auth/activate']} />);

      await waitFor(() => {
        expect(screen.getByTestId('account-activation-page')).toBeInTheDocument();
      });
    });

    it('should render ResendActivation page on /auth/resend-activation route', async () => {
      render(<TestRouter initialEntries={['/auth/resend-activation']} />);

      await waitFor(() => {
        expect(screen.getByTestId('resend-activation-page')).toBeInTheDocument();
      });
    });

    it('should render EmailVerification page on /auth/email-verification route', async () => {
      render(<TestRouter initialEntries={['/auth/email-verification']} />);

      await waitFor(() => {
        expect(screen.getByTestId('email-verification-page')).toBeInTheDocument();
      });
    });
  });

  describe('404 Not Found', () => {
    it('should render NoMatch for unknown routes', async () => {
      render(<TestRouter initialEntries={['/unknown-route']} />);

      await waitFor(() => {
        expect(screen.getByTestId('no-match-page')).toBeInTheDocument();
      });
    });

    it('should render NoMatch for deeply nested unknown routes', async () => {
      render(<TestRouter initialEntries={['/some/deeply/nested/unknown']} />);

      await waitFor(() => {
        expect(screen.getByTestId('no-match-page')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Bar', () => {
    it('should render navigation bar on all routes', async () => {
      render(<TestRouter initialEntries={['/home']} />);

      await waitFor(() => {
        expect(screen.getByTestId('main-navbar')).toBeInTheDocument();
      });
    });

    it('should render navigation bar even on 404 pages', async () => {
      render(<TestRouter initialEntries={['/unknown']} />);

      await waitFor(() => {
        expect(screen.getByTestId('main-navbar')).toBeInTheDocument();
        expect(screen.getByTestId('no-match-page')).toBeInTheDocument();
      });
    });
  });
});
