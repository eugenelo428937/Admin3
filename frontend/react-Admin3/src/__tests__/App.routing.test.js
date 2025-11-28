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
import filtersReducer from '../store/slices/filtersSlice';

// Mock all services before component imports
jest.mock('../services/httpService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('../services/cartService', () => ({
  __esModule: true,
  default: {
    getCart: jest.fn(() => Promise.resolve({ data: { items: [] } })),
    fetchCart: jest.fn(() => Promise.resolve({ data: { items: [] } })),
    addToCart: jest.fn(() => Promise.resolve({ data: {} })),
    removeItem: jest.fn(() => Promise.resolve({ data: {} })),
    clearCart: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('../services/productService', () => ({
  getNavbarProductGroups: jest.fn(() => Promise.resolve([])),
  getDistanceLearningDropdown: jest.fn(() => Promise.resolve([])),
  getTutorialDropdown: jest.fn(() => Promise.resolve(null)),
  getProductById: jest.fn(() => Promise.resolve(null)),
  searchProducts: jest.fn(() => Promise.resolve({ data: { results: [] } })),
}));

jest.mock('../services/subjectService', () => ({
  getSubjects: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../services/rulesEngineService', () => ({
  __esModule: true,
  default: {
    executeRules: jest.fn(() => Promise.resolve({ messages: [], actions: [], blocked: false })),
    acknowledgeRule: jest.fn(() => Promise.resolve({ success: true })),
    ENTRY_POINTS: {
      HOME_PAGE_MOUNT: 'home_page_mount',
      CHECKOUT_START: 'checkout_start',
    }
  }
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: jest.fn(),
    login: jest.fn(),
    isSuperuser: false,
  }),
  AuthProvider: ({ children }) => children,
}));

// Mock page components to make routing tests fast and focused
jest.mock('../pages/Home', () => {
  return function MockHome() {
    return <div data-testid="home-page">Home Page</div>;
  };
});

jest.mock('../components/Product/ProductList', () => {
  return function MockProductList() {
    return <div data-testid="product-list-page">Product List Page</div>;
  };
});

jest.mock('../components/Ordering/CheckoutPage', () => {
  return function MockCheckoutPage() {
    return <div data-testid="checkout-page">Checkout Page</div>;
  };
});

jest.mock('../pages/ProfilePage', () => {
  return function MockProfilePage() {
    return <div data-testid="profile-page">Profile Page</div>;
  };
});

jest.mock('../components/User/OrderHistory', () => {
  return function MockOrderHistory() {
    return <div data-testid="orders-page">Order History Page</div>;
  };
});

jest.mock('../components/NoMatch', () => {
  return function MockNoMatch() {
    return <div data-testid="no-match-page">404 - Not Found</div>;
  };
});

jest.mock('../pages/Registration', () => {
  return function MockRegistration() {
    return <div data-testid="registration-page">Registration Page</div>;
  };
});

jest.mock('../components/StyleGuide', () => {
  return function MockStyleGuide() {
    return <div data-testid="style-guide-page">Style Guide</div>;
  };
});

jest.mock('../components/User/ForgotPasswordForm', () => {
  return function MockForgotPassword() {
    return <div data-testid="forgot-password-page">Forgot Password</div>;
  };
});

jest.mock('../components/User/ResetPasswordForm', () => {
  return function MockResetPassword() {
    return <div data-testid="reset-password-page">Reset Password</div>;
  };
});

jest.mock('../components/User/AccountActivation', () => {
  return function MockAccountActivation() {
    return <div data-testid="account-activation-page">Account Activation</div>;
  };
});

jest.mock('../components/User/ResendActivation', () => {
  return function MockResendActivation() {
    return <div data-testid="resend-activation-page">Resend Activation</div>;
  };
});

jest.mock('../components/User/EmailVerification', () => {
  return function MockEmailVerification() {
    return <div data-testid="email-verification-page">Email Verification</div>;
  };
});

jest.mock('../components/Navigation/MainNavBar', () => {
  return function MockMainNavBar() {
    return <nav data-testid="main-navbar">Navigation</nav>;
  };
});

jest.mock('../components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer', () => {
  return function MockTutorialSummaryBar() {
    return null;
  };
});

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

// Simple test router setup matching App.js routes
const TestRouter = ({ initialEntries = ['/'] }) => {
  const store = createTestStore();

  // Import mocked components
  const Home = require('../pages/Home');
  const ProductList = require('../components/Product/ProductList');
  const CheckoutPage = require('../components/Ordering/CheckoutPage');
  const ProfilePage = require('../pages/ProfilePage');
  const OrderHistory = require('../components/User/OrderHistory');
  const NoMatch = require('../components/NoMatch');
  const Registration = require('../pages/Registration');
  const StyleGuide = require('../components/StyleGuide');
  const ForgotPasswordForm = require('../components/User/ForgotPasswordForm');
  const ResetPasswordForm = require('../components/User/ResetPasswordForm');
  const AccountActivation = require('../components/User/AccountActivation');
  const ResendActivation = require('../components/User/ResendActivation');
  const EmailVerification = require('../components/User/EmailVerification');
  const MainNavBar = require('../components/Navigation/MainNavBar');

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

    it('should render StyleGuide page on /style-guide route', async () => {

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
