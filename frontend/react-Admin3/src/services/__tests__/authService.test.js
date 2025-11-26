/**
 * Tests for authService
 *
 * @module services/__tests__/authService.test
 */

// MUST be before imports to override setupTests.js global mock
jest.unmock('../authService');

// Mock dependencies BEFORE imports
jest.mock('../httpService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../loggerService', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../config', () => ({
  __esModule: true,
  default: {
    authUrl: '/api/auth',
    userUrl: '/api/users',
  },
}));

import authService from '../authService';
import httpService from '../httpService';
import logger from '../loggerService';

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    const credentials = { email: 'test@example.com', password: 'password123' };

    test('should return success with user data on successful login', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      httpService.get.mockResolvedValue({ status: 200 }); // CSRF
      httpService.post.mockResolvedValue({
        status: 200,
        data: {
          token: 'access-token',
          refresh: 'refresh-token',
          user: mockUser,
        },
      });

      const result = await authService.login(credentials);

      expect(result.status).toBe('success');
      expect(result.user).toEqual(mockUser);
      expect(localStorage.getItem('token')).toBe('access-token');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
      expect(localStorage.getItem('isAuthenticated')).toBe('true');
    });

    test('should clear existing auth data before login attempt', async () => {
      localStorage.setItem('token', 'old-token');
      localStorage.setItem('user', JSON.stringify({ id: 99 }));

      httpService.get.mockResolvedValue({ status: 200 });
      httpService.post.mockRejectedValue({ response: { status: 401 } });

      await authService.login(credentials);

      // Verify old data was cleared
      expect(localStorage.getItem('token')).toBeNull();
    });

    test('should return error for 401 unauthorized', async () => {
      httpService.get.mockResolvedValue({ status: 200 });
      httpService.post.mockRejectedValue({ response: { status: 401 } });

      const result = await authService.login(credentials);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid username or password');
      expect(result.code).toBe(401);
    });

    test('should return error for 403 forbidden', async () => {
      httpService.get.mockResolvedValue({ status: 200 });
      httpService.post.mockRejectedValue({ response: { status: 403 } });

      const result = await authService.login(credentials);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Access forbidden');
      expect(result.code).toBe(403);
    });

    test('should return server error message if provided', async () => {
      httpService.get.mockResolvedValue({ status: 200 });
      httpService.post.mockRejectedValue({
        response: { status: 400, data: { message: 'Account locked' } },
      });

      const result = await authService.login(credentials);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Account locked');
    });

    test('should return generic error for unexpected failures', async () => {
      httpService.get.mockResolvedValue({ status: 200 });
      httpService.post.mockRejectedValue(new Error('Network error'));

      const result = await authService.login(credentials);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Login failed. Please try again later.');
    });

    test('should return error for invalid response format', async () => {
      httpService.get.mockResolvedValue({ status: 200 });
      httpService.post.mockResolvedValue({
        status: 200,
        data: { invalid: 'response' }, // Missing token and user
      });

      const result = await authService.login(credentials);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid response format from server');
    });

    test('should store user without refresh token if not provided', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      httpService.get.mockResolvedValue({ status: 200 });
      httpService.post.mockResolvedValue({
        status: 200,
        data: {
          token: 'access-token',
          user: mockUser,
          // No refresh token
        },
      });

      const result = await authService.login(credentials);

      expect(result.status).toBe('success');
      expect(localStorage.getItem('token')).toBe('access-token');
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('register', () => {
    const userData = {
      email: 'new@example.com',
      password: 'password123',
      first_name: 'New',
      last_name: 'User',
    };

    test('should return success on successful registration with status 201', async () => {
      const mockUser = { id: 2, email: 'new@example.com' };
      httpService.post.mockResolvedValue({
        status: 201,
        data: { user: mockUser, token: 'new-token' },
      });

      const result = await authService.register(userData);

      expect(result.status).toBe('success');
      expect(result.user).toEqual(mockUser);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
      expect(localStorage.getItem('token')).toBe('new-token');
    });

    test('should return success on registration with status 200', async () => {
      const mockUser = { id: 2, email: 'new@example.com' };
      httpService.post.mockResolvedValue({
        status: 200,
        data: { user: mockUser },
      });

      const result = await authService.register(userData);

      expect(result.status).toBe('success');
      expect(result.user).toEqual(mockUser);
    });

    test('should return error on registration failure', async () => {
      httpService.post.mockRejectedValue({
        response: { status: 400, data: { message: 'Email already exists' } },
      });

      const result = await authService.register(userData);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Email already exists');
    });

    test('should return generic error when no message provided', async () => {
      httpService.post.mockRejectedValue({
        response: { status: 500 },
      });

      const result = await authService.register(userData);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Registration failed');
    });

    test('should return error when response has no user data', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { token: 'token-but-no-user' }, // Missing user
      });

      const result = await authService.register(userData);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Registration failed');
    });
  });

  describe('logout', () => {
    test('should clear localStorage and return success', async () => {
      localStorage.setItem('token', 'token');
      localStorage.setItem('refreshToken', 'refresh');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      localStorage.setItem('isAuthenticated', 'true');

      httpService.post.mockResolvedValue({ status: 200 });

      const result = await authService.logout();

      expect(result.status).toBe('success');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('isAuthenticated')).toBeNull();
    });

    test('should still clear localStorage if logout endpoint fails', async () => {
      localStorage.setItem('token', 'token');
      httpService.post.mockRejectedValue(new Error('Network error'));

      const result = await authService.logout();

      expect(result.status).toBe('success');
      expect(localStorage.getItem('token')).toBeNull();
    });

    test('should return error status if localStorage operations fail', async () => {
      // Mock localStorage.removeItem to throw only on first call (in try block)
      // When first removeItem throws, execution jumps to catch block
      // Catch block's removeItem calls should work normally
      const originalRemoveItem = localStorage.removeItem.bind(localStorage);
      let callCount = 0;
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
        callCount++;
        if (callCount === 1) {
          // First call (line 153) throws, triggering catch block
          throw new Error('Storage quota exceeded');
        }
        // Subsequent calls (in catch block, lines 164-167) work normally
        return originalRemoveItem(key);
      });

      httpService.post.mockResolvedValue({ status: 200 });

      const result = await authService.logout();

      // Should hit the outer catch block and return error status
      expect(result.status).toBe('error');
      expect(result.message).toBe('Error during logout');

      // Restore original
      Storage.prototype.removeItem.mockRestore();
    });
  });

  describe('getCurrentUser', () => {
    test('should return user from localStorage', () => {
      const user = { id: 1, email: 'test@example.com' };
      localStorage.setItem('user', JSON.stringify(user));

      const result = authService.getCurrentUser();

      expect(result).toEqual(user);
    });

    test('should return null if no user in localStorage', () => {
      const result = authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    test('should return true when authenticated and token exists', () => {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', 'valid-token');

      expect(authService.isAuthenticated()).toBe(true);
    });

    test('should return false when not authenticated', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    test('should return false when isAuthenticated but no token', () => {
      localStorage.setItem('isAuthenticated', 'true');

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('refreshToken', () => {
    test('should store new token on successful refresh', async () => {
      localStorage.setItem('refreshToken', 'refresh-token');
      httpService.post.mockResolvedValue({
        data: { token: 'new-access-token' },
      });

      const result = await authService.refreshToken();

      expect(localStorage.getItem('token')).toBe('new-access-token');
      expect(result.token).toBe('new-access-token');
    });

    test('should throw error on refresh failure', async () => {
      localStorage.setItem('refreshToken', 'expired-token');
      httpService.post.mockRejectedValue({
        response: { data: { error: 'Token expired' } },
      });

      await expect(authService.refreshToken()).rejects.toEqual({ error: 'Token expired' });
    });
  });

  describe('getUserDetails', () => {
    test('should return user details from API', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 123 }));
      const userDetails = { id: 123, email: 'test@example.com', profile: {} };
      httpService.get.mockResolvedValue({ data: userDetails });

      const result = await authService.getUserDetails();

      expect(result).toEqual(userDetails);
      expect(httpService.get).toHaveBeenCalledWith('/api/users/123/');
    });

    test('should throw error if no user in localStorage', async () => {
      await expect(authService.getUserDetails()).rejects.toThrow('No user data found');
    });
  });

  describe('activateAccount', () => {
    test('should return success on valid activation', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { status: 'success', message: 'Account activated' },
      });

      const result = await authService.activateAccount('uid123', 'token456');

      expect(result.status).toBe('success');
      expect(result.message).toBe('Account activated');
    });

    test('should handle already activated accounts', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { status: 'info', message: 'Account already activated' },
      });

      const result = await authService.activateAccount('uid123', 'token456');

      expect(result.status).toBe('success');
    });

    test('should return error for invalid activation link', async () => {
      httpService.post.mockRejectedValue({
        response: { status: 400, data: { error: 'Invalid link' } },
      });

      const result = await authService.activateAccount('uid123', 'bad-token');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid link');
    });

    test('should return generic error for unexpected failures', async () => {
      httpService.post.mockRejectedValue(new Error('Network error'));

      const result = await authService.activateAccount('uid123', 'token456');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Account activation failed. Please try again later.');
    });

    test('should return error for invalid response format', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { unexpected: 'format' }, // Missing status field
      });

      const result = await authService.activateAccount('uid123', 'token456');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid response format from server');
    });

    test('should return error for non-400 error with error message', async () => {
      httpService.post.mockRejectedValue({
        response: { status: 500, data: { error: 'Internal server error' } },
      });

      const result = await authService.activateAccount('uid123', 'token456');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Internal server error');
    });
  });

  describe('resendActivationEmail', () => {
    test('should return success when email sent', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { message: 'Email sent' },
      });

      const result = await authService.resendActivationEmail('test@example.com');

      expect(result.status).toBe('success');
      expect(result.message).toBe('Email sent');
    });

    test('should return error on failure', async () => {
      httpService.post.mockRejectedValue({
        response: { data: { error: 'User not found' } },
      });

      const result = await authService.resendActivationEmail('unknown@example.com');

      expect(result.status).toBe('error');
      expect(result.message).toBe('User not found');
    });

    test('should return error for invalid response format', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: null, // No data
      });

      const result = await authService.resendActivationEmail('test@example.com');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid response format from server');
    });

    test('should return generic error when no error message provided', async () => {
      httpService.post.mockRejectedValue(new Error('Network error'));

      const result = await authService.resendActivationEmail('test@example.com');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Failed to send activation email. Please try again later.');
    });
  });

  describe('verifyEmailChange', () => {
    const verificationData = {
      uid: 'uid123',
      token: 'token456',
      new_email: 'new@example.com',
    };

    test('should return success on valid verification', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { message: 'Email updated' },
      });

      const result = await authService.verifyEmailChange(verificationData);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Email updated');
    });

    test('should return error for expired link', async () => {
      httpService.post.mockRejectedValue({
        response: { status: 400, data: { error: 'Link expired' } },
      });

      const result = await authService.verifyEmailChange(verificationData);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Link expired');
    });

    test('should return error for invalid response format', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: null, // No data
      });

      const result = await authService.verifyEmailChange(verificationData);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid response format from server');
    });

    test('should return error for non-400 error with error message', async () => {
      httpService.post.mockRejectedValue({
        response: { status: 500, data: { error: 'Server error' } },
      });

      const result = await authService.verifyEmailChange(verificationData);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Server error');
    });

    test('should return generic error when no error message provided', async () => {
      httpService.post.mockRejectedValue(new Error('Network error'));

      const result = await authService.verifyEmailChange(verificationData);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Email verification failed. Please try again later.');
    });
  });

  describe('sendPasswordResetCompletedEmail', () => {
    test('should return success when notification sent', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { message: 'Notification sent' },
      });

      const result = await authService.sendPasswordResetCompletedEmail('test@example.com');

      expect(result.status).toBe('success');
    });

    test('should return error on failure', async () => {
      httpService.post.mockRejectedValue({
        response: { data: { error: 'Failed to send' } },
      });

      const result = await authService.sendPasswordResetCompletedEmail('test@example.com');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Failed to send');
    });

    test('should return error for invalid response format', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: null, // No data
      });

      const result = await authService.sendPasswordResetCompletedEmail('test@example.com');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid response format from server');
    });

    test('should return generic error when no error message provided', async () => {
      httpService.post.mockRejectedValue(new Error('Network error'));

      const result = await authService.sendPasswordResetCompletedEmail('test@example.com');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Failed to send password reset notification. Please try again later.');
    });
  });

  describe('requestPasswordReset', () => {
    test('should return success with expiry info', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { message: 'Reset email sent', expiry_hours: 48 },
      });

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.status).toBe('success');
      expect(result.expiry_hours).toBe(48);
    });

    test('should include recaptcha token if provided', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { message: 'Reset email sent' },
      });

      await authService.requestPasswordReset('test@example.com', 'recaptcha-token');

      expect(httpService.post).toHaveBeenCalledWith(
        '/api/auth/password_reset_request/',
        expect.objectContaining({ recaptcha_token: 'recaptcha-token' })
      );
    });

    test('should return error on failure', async () => {
      httpService.post.mockRejectedValue({
        response: { data: { error: 'Rate limited' } },
      });

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Rate limited');
    });

    test('should return error for invalid response format', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: null, // No data
      });

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid response format from server');
    });

    test('should return generic error when no error message provided', async () => {
      httpService.post.mockRejectedValue(new Error('Network error'));

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.status).toBe('error');
      expect(result.message).toBe('An error occurred. Please try again later.');
    });
  });

  describe('confirmPasswordReset', () => {
    test('should return success on valid confirmation', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { message: 'Password reset successful' },
      });

      const result = await authService.confirmPasswordReset('uid', 'token', 'newPass123');

      expect(result.status).toBe('success');
    });

    test('should return error for invalid/expired link', async () => {
      httpService.post.mockRejectedValue({
        response: { status: 400, data: { error: 'Token expired' } },
      });

      const result = await authService.confirmPasswordReset('uid', 'expired-token', 'newPass123');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Token expired');
    });

    test('should return generic error for unexpected failures', async () => {
      httpService.post.mockRejectedValue(new Error('Network error'));

      const result = await authService.confirmPasswordReset('uid', 'token', 'newPass123');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Password reset failed. Please try again later.');
    });

    test('should return error for invalid response format', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: null, // No data
      });

      const result = await authService.confirmPasswordReset('uid', 'token', 'newPass123');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid response format from server');
    });

    test('should return error for non-400 error with error message', async () => {
      httpService.post.mockRejectedValue({
        response: { status: 500, data: { error: 'Server error' } },
      });

      const result = await authService.confirmPasswordReset('uid', 'token', 'newPass123');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Server error');
    });
  });
});
