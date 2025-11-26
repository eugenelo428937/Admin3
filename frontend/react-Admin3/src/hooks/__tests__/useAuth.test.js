/**
 * Tests for useAuth Hook and AuthProvider
 *
 * Tests authentication flows including:
 * - Login/Logout functionality
 * - Registration
 * - Session persistence from localStorage
 * - Error handling
 * - User role states
 */

// Mock react-router-dom BEFORE any imports
// This overrides the global mock in setupTests.js for this test file
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    __esModule: true,
    BrowserRouter: ({ children }) => React.createElement('div', { 'data-testid': 'browser-router' }, children),
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
  };
});

// Mock authService - using jest.fn() directly in the mock factory
jest.mock('../../services/authService', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    getUserDetails: jest.fn(),
  },
}));

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../useAuth';
import authService from '../../services/authService';

// Helper to render hook with AuthProvider
const renderUseAuth = () => {
  const wrapper = ({ children }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Default mock implementations - use authService directly
    authService.getUserDetails.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      is_superuser: false,
    });
  });

  describe('Initial State', () => {
    it('should start with unauthenticated state when no localStorage data', async () => {
      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should restore authentication state from localStorage', async () => {
      const storedUser = { id: 1, email: 'test@example.com', is_superuser: true };
      localStorage.setItem('user', JSON.stringify(storedUser));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', 'fake-token');

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(storedUser);
      expect(result.current.isSuperuser).toBe(true);
    });

    it('should clear state if stored token is invalid', async () => {
      const storedUser = { id: 1, email: 'test@example.com' };
      localStorage.setItem('user', JSON.stringify(storedUser));
      localStorage.setItem('isAuthenticated', 'true');

      // Token verification fails
      authService.getUserDetails.mockRejectedValue(new Error('Invalid token'));

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Login Flow', () => {
    it('should login successfully and update state', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        is_superuser: false,
      };

      // Mock login to store user in localStorage (like real authService does)
      authService.login.mockImplementation(async () => {
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('token', 'fake-token');
        return {
          status: 'success',
          user: mockUser,
        };
      });

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Verify mock was called and returned success
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(loginResult.status).toBe('success');
      expect(mockNavigate).toHaveBeenCalledWith('/');

      // Wait for all state updates to be reflected in result.current
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.error).toBeNull();
      });
    });

    it('should login superuser and set isSuperuser flag', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        is_superuser: true,
      };

      // Mock login to store user in localStorage (like real authService does)
      authService.login.mockImplementation(async () => {
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('token', 'fake-token');
        return {
          status: 'success',
          user: mockUser,
        };
      });

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login({
          email: 'admin@example.com',
          password: 'password123',
        });
      });

      // Wait for state updates to complete
      await waitFor(() => {
        expect(result.current.isSuperuser).toBe(true);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should handle login failure', async () => {
      authService.login.mockResolvedValue({
        status: 'error',
        message: 'Invalid credentials',
      });

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        });
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe('Invalid credentials');
      expect(loginResult.status).toBe('error');
    });

    it('should handle login exception', async () => {
      authService.login.mockRejectedValue(new Error('Network error'));

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(loginResult.status).toBe('error');
    });

    it('should redirect to stored path after login', async () => {
      localStorage.setItem('postLoginRedirect', '/checkout');

      authService.login.mockResolvedValue({
        status: 'success',
        user: { id: 1, email: 'test@example.com' },
      });

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/checkout');
      expect(localStorage.getItem('postLoginRedirect')).toBeNull();
    });
  });

  describe('Logout Flow', () => {
    it('should logout and clear state with redirect', async () => {
      // Setup authenticated state
      const storedUser = { id: 1, email: 'test@example.com' };
      localStorage.setItem('user', JSON.stringify(storedUser));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', 'fake-token');
      localStorage.setItem('refreshToken', 'fake-refresh-token');

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isSuperuser).toBe(false);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should logout without redirect when specified', async () => {
      // Setup authenticated state
      const storedUser = { id: 1, email: 'test@example.com' };
      localStorage.setItem('user', JSON.stringify(storedUser));
      localStorage.setItem('isAuthenticated', 'true');

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      mockNavigate.mockClear();

      await act(async () => {
        await result.current.logout({ redirect: false });
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Registration Flow', () => {
    it('should register successfully and update state', async () => {
      const mockUser = {
        id: 1,
        email: 'newuser@example.com',
        is_superuser: false,
      };

      // Mock register to store user in localStorage (like real authService does)
      authService.register.mockImplementation(async () => {
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('token', 'fake-token');
        return {
          status: 'success',
          user: mockUser,
        };
      });

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let registerResult;
      await act(async () => {
        registerResult = await result.current.register({
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });
      });

      // Wait for state updates to complete
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      expect(result.current.user).toEqual(mockUser);
      expect(registerResult.status).toBe('success');
    });

    it('should handle registration failure', async () => {
      authService.register.mockResolvedValue({
        status: 'error',
        message: 'Email already exists',
      });

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let registerResult;
      await act(async () => {
        registerResult = await result.current.register({
          email: 'existing@example.com',
          password: 'password123',
        });
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Email already exists');
      expect(registerResult.status).toBe('error');
    });

    it('should handle registration exception', async () => {
      authService.register.mockRejectedValue(new Error('Server error'));

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let registerResult;
      await act(async () => {
        registerResult = await result.current.register({
          email: 'newuser@example.com',
          password: 'password123',
        });
      });

      expect(result.current.error).toBe('Server error');
      expect(registerResult.status).toBe('error');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      // This test needs special handling since we expect an error to be thrown
      const consoleError = console.error;
      console.error = jest.fn(); // Suppress error output

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = consoleError;
    });
  });

  describe('Loading States', () => {
    it('should set loading during login', async () => {
      // Create a promise we can control
      let resolveLogin;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      authService.login.mockReturnValue(loginPromise);

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start login - don't await it
      act(() => {
        result.current.login({ email: 'test@example.com', password: 'password' });
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Complete the login
      await act(async () => {
        resolveLogin({ status: 'success', user: { id: 1 } });
      });

      // Should no longer be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('User Roles', () => {
    it('should initialize role states to false', async () => {
      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSuperuser).toBe(false);
      expect(result.current.isApprentice).toBe(false);
      expect(result.current.isStudyPlus).toBe(false);
    });

    it('should clear role states on logout', async () => {
      const storedUser = { id: 1, email: 'admin@example.com', is_superuser: true };
      localStorage.setItem('user', JSON.stringify(storedUser));
      localStorage.setItem('isAuthenticated', 'true');

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.isSuperuser).toBe(true);
      });

      await act(async () => {
        await result.current.logout({ redirect: false });
      });

      expect(result.current.isSuperuser).toBe(false);
    });
  });
});
