/**
 * Tests for userService
 *
 * @module services/__tests__/userService.test
 *
 * Tests user-related operations including:
 * - getUserProfile: Fetch user profile data
 * - updateUserProfile: Update user profile with address and contact info
 * - changePassword: Change user password
 * - requestEmailVerification: Request email verification for new email
 */

describe('userService', () => {
  let userService;
  let httpService;
  let logger;

  beforeEach(() => {
    // Reset modules to get fresh instances
    jest.resetModules();

    // Mock config
    jest.doMock('../../config', () => ({
      __esModule: true,
      default: {
        userUrl: 'http://test-api/users',
      },
    }));

    // Mock httpService with controllable mocks
    jest.doMock('../httpService', () => ({
      __esModule: true,
      default: {
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
      },
    }));

    // Mock logger
    jest.doMock('../loggerService', () => ({
      __esModule: true,
      default: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      },
    }));

    // Import after mocks are set up
    userService = require('../userService').default;
    httpService = require('../httpService').default;
    logger = require('../loggerService').default;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    test('should fetch user profile successfully', async () => {
      const mockUserData = {
        id: 1,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        profile: {
          date_of_birth: '1990-01-01',
          gender: 'male',
        },
        home_address: {
          line1: '123 Test St',
          city: 'London',
        },
      };

      httpService.get.mockResolvedValue({
        status: 200,
        data: { data: mockUserData },
      });

      const result = await userService.getUserProfile();

      expect(result).toEqual({
        status: 'success',
        data: mockUserData,
      });
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/users/profile/');
      expect(logger.debug).toHaveBeenCalledWith('Fetching user profile');
      expect(logger.info).toHaveBeenCalledWith('User profile fetched successfully');
    });

    test('should return error for invalid response format (non-200 status)', async () => {
      httpService.get.mockResolvedValue({
        status: 201,
        data: { data: {} },
      });

      const result = await userService.getUserProfile();

      expect(result).toEqual({
        status: 'error',
        message: 'Invalid response format from server',
      });
    });

    test('should return error for invalid response format (missing data)', async () => {
      httpService.get.mockResolvedValue({
        status: 200,
        data: null,
      });

      const result = await userService.getUserProfile();

      expect(result).toEqual({
        status: 'error',
        message: 'Invalid response format from server',
      });
    });

    test('should handle API error with response data', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized access' },
        },
      };
      httpService.get.mockRejectedValue(mockError);

      const result = await userService.getUserProfile();

      expect(result).toEqual({
        status: 'error',
        message: 'Unauthorized access',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch user profile',
        expect.objectContaining({
          error: { message: 'Unauthorized access' },
          status: 401,
        })
      );
    });

    test('should handle API error without response data', async () => {
      const mockError = new Error('Network error');
      httpService.get.mockRejectedValue(mockError);

      const result = await userService.getUserProfile();

      expect(result).toEqual({
        status: 'error',
        message: 'Failed to fetch profile',
      });
    });

    test('should handle API error with response but no message', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {},
        },
      };
      httpService.get.mockRejectedValue(mockError);

      const result = await userService.getUserProfile();

      expect(result).toEqual({
        status: 'error',
        message: 'Failed to fetch profile',
      });
    });
  });

  describe('updateUserProfile', () => {
    const mockProfileData = {
      user: { first_name: 'John', last_name: 'Doe' },
      profile: { date_of_birth: '1990-01-01' },
      home_address: { line1: '123 Test St' },
      work_address: { line1: '456 Work Ave' },
      contact_numbers: [{ number: '1234567890', type: 'mobile' }],
    };

    test('should update user profile successfully', async () => {
      httpService.patch.mockResolvedValue({
        status: 200,
        data: {
          message: 'Profile updated successfully',
          email_verification_sent: false,
        },
      });

      const result = await userService.updateUserProfile(mockProfileData);

      expect(result).toEqual({
        status: 'success',
        message: 'Profile updated successfully',
        email_verification_sent: false,
      });
      expect(httpService.patch).toHaveBeenCalledWith(
        'http://test-api/users/update_profile/',
        mockProfileData
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Updating user profile',
        expect.objectContaining({
          hasUserData: true,
          hasProfileData: true,
          hasHomeAddress: true,
          hasWorkAddress: true,
          hasContactNumbers: true,
        })
      );
    });

    test('should update profile with email verification sent', async () => {
      httpService.patch.mockResolvedValue({
        status: 200,
        data: {
          message: 'Profile updated. Please verify new email.',
          email_verification_sent: true,
        },
      });

      const result = await userService.updateUserProfile(mockProfileData);

      expect(result).toEqual({
        status: 'success',
        message: 'Profile updated. Please verify new email.',
        email_verification_sent: true,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'User profile updated successfully',
        { emailVerificationSent: true }
      );
    });

    test('should handle partial profile data', async () => {
      const partialData = { user: { first_name: 'Jane' } };
      httpService.patch.mockResolvedValue({
        status: 200,
        data: { message: 'Profile updated' },
      });

      const result = await userService.updateUserProfile(partialData);

      expect(result.status).toBe('success');
      expect(logger.debug).toHaveBeenCalledWith(
        'Updating user profile',
        expect.objectContaining({
          hasUserData: true,
          hasProfileData: false,
          hasHomeAddress: false,
          hasWorkAddress: false,
          hasContactNumbers: false,
        })
      );
    });

    test('should default email_verification_sent to false when not in response', async () => {
      httpService.patch.mockResolvedValue({
        status: 200,
        data: { message: 'Profile updated' },
      });

      const result = await userService.updateUserProfile(mockProfileData);

      expect(result.email_verification_sent).toBe(false);
    });

    test('should return error for invalid response format (non-200 status)', async () => {
      httpService.patch.mockResolvedValue({
        status: 201,
        data: { message: 'Created' },
      });

      const result = await userService.updateUserProfile(mockProfileData);

      expect(result).toEqual({
        status: 'error',
        message: 'Invalid response format from server',
      });
    });

    test('should return error for invalid response format (missing data)', async () => {
      httpService.patch.mockResolvedValue({
        status: 200,
        data: null,
      });

      const result = await userService.updateUserProfile(mockProfileData);

      expect(result).toEqual({
        status: 'error',
        message: 'Invalid response format from server',
      });
    });

    test('should handle API error with response message', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Invalid date format' },
        },
      };
      httpService.patch.mockRejectedValue(mockError);

      const result = await userService.updateUserProfile(mockProfileData);

      expect(result).toEqual({
        status: 'error',
        message: 'Invalid date format',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update user profile',
        expect.objectContaining({
          error: { message: 'Invalid date format' },
          status: 400,
        })
      );
    });

    test('should handle API error without response message', async () => {
      const mockError = new Error('Network error');
      httpService.patch.mockRejectedValue(mockError);

      const result = await userService.updateUserProfile(mockProfileData);

      expect(result).toEqual({
        status: 'error',
        message: 'Failed to update profile',
      });
    });
  });

  describe('changePassword', () => {
    const mockPasswordData = {
      current_password: 'oldPassword123',
      new_password: 'newPassword456',
      confirm_password: 'newPassword456',
    };

    test('should change password successfully', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { message: 'Password changed successfully' },
      });

      const result = await userService.changePassword(mockPasswordData);

      expect(result).toEqual({
        status: 'success',
        message: 'Password changed successfully',
      });
      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/users/change_password/',
        mockPasswordData
      );
      expect(logger.debug).toHaveBeenCalledWith('Changing user password');
      expect(logger.info).toHaveBeenCalledWith('Password changed successfully');
    });

    test('should use default message when response has no message', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: {},
      });

      const result = await userService.changePassword(mockPasswordData);

      expect(result).toEqual({
        status: 'success',
        message: 'Password changed successfully',
      });
    });

    test('should return error for invalid response format (non-200 status)', async () => {
      httpService.post.mockResolvedValue({
        status: 201,
        data: { message: 'Created' },
      });

      const result = await userService.changePassword(mockPasswordData);

      expect(result).toEqual({
        status: 'error',
        message: 'Invalid response format from server',
      });
    });

    test('should return error for invalid response format (missing data)', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: null,
      });

      const result = await userService.changePassword(mockPasswordData);

      expect(result).toEqual({
        status: 'error',
        message: 'Invalid response format from server',
      });
    });

    test('should handle API error with response message', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Current password is incorrect' },
        },
      };
      httpService.post.mockRejectedValue(mockError);

      const result = await userService.changePassword(mockPasswordData);

      expect(result).toEqual({
        status: 'error',
        message: 'Current password is incorrect',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to change password',
        expect.objectContaining({
          error: { message: 'Current password is incorrect' },
          status: 400,
        })
      );
    });

    test('should handle API error without response message', async () => {
      const mockError = new Error('Network error');
      httpService.post.mockRejectedValue(mockError);

      const result = await userService.changePassword(mockPasswordData);

      expect(result).toEqual({
        status: 'error',
        message: 'Failed to change password',
      });
    });

    test('should handle validation error response', async () => {
      const mockError = {
        response: {
          status: 422,
          data: { message: 'Passwords do not match' },
        },
      };
      httpService.post.mockRejectedValue(mockError);

      const result = await userService.changePassword(mockPasswordData);

      expect(result).toEqual({
        status: 'error',
        message: 'Passwords do not match',
      });
    });
  });

  describe('requestEmailVerification', () => {
    const newEmail = 'newemail@example.com';

    test('should request email verification successfully', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: { message: 'Verification email sent to newemail@example.com' },
      });

      const result = await userService.requestEmailVerification(newEmail);

      expect(result).toEqual({
        status: 'success',
        message: 'Verification email sent to newemail@example.com',
      });
      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/users/request_email_verification/',
        { new_email: newEmail }
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Requesting email verification',
        { newEmail }
      );
      expect(logger.info).toHaveBeenCalledWith('Email verification requested successfully');
    });

    test('should return error for invalid response format (non-200 status)', async () => {
      httpService.post.mockResolvedValue({
        status: 201,
        data: { message: 'Created' },
      });

      const result = await userService.requestEmailVerification(newEmail);

      expect(result).toEqual({
        status: 'error',
        message: 'Invalid response format from server',
      });
    });

    test('should return error for invalid response format (missing data)', async () => {
      httpService.post.mockResolvedValue({
        status: 200,
        data: null,
      });

      const result = await userService.requestEmailVerification(newEmail);

      expect(result).toEqual({
        status: 'error',
        message: 'Invalid response format from server',
      });
    });

    test('should handle API error with response message', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Email already in use' },
        },
      };
      httpService.post.mockRejectedValue(mockError);

      const result = await userService.requestEmailVerification(newEmail);

      expect(result).toEqual({
        status: 'error',
        message: 'Email already in use',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to request email verification',
        expect.objectContaining({
          error: { message: 'Email already in use' },
          status: 400,
        })
      );
    });

    test('should handle API error without response message', async () => {
      const mockError = new Error('Network error');
      httpService.post.mockRejectedValue(mockError);

      const result = await userService.requestEmailVerification(newEmail);

      expect(result).toEqual({
        status: 'error',
        message: 'Failed to send verification email',
      });
    });

    test('should handle rate limiting error', async () => {
      const mockError = {
        response: {
          status: 429,
          data: { message: 'Too many requests. Please try again later.' },
        },
      };
      httpService.post.mockRejectedValue(mockError);

      const result = await userService.requestEmailVerification(newEmail);

      expect(result).toEqual({
        status: 'error',
        message: 'Too many requests. Please try again later.',
      });
    });

    test('should handle invalid email format error', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Invalid email format' },
        },
      };
      httpService.post.mockRejectedValue(mockError);

      const result = await userService.requestEmailVerification('invalid-email');

      expect(result).toEqual({
        status: 'error',
        message: 'Invalid email format',
      });
    });
  });

  describe('edge cases', () => {
    test('should handle empty profile data in update', async () => {
      const emptyData = {};
      httpService.patch.mockResolvedValue({
        status: 200,
        data: { message: 'No changes made' },
      });

      const result = await userService.updateUserProfile(emptyData);

      expect(result.status).toBe('success');
      expect(logger.debug).toHaveBeenCalledWith(
        'Updating user profile',
        expect.objectContaining({
          hasUserData: false,
          hasProfileData: false,
          hasHomeAddress: false,
          hasWorkAddress: false,
          hasContactNumbers: false,
        })
      );
    });

    test('should handle server 500 error', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };
      httpService.get.mockRejectedValue(mockError);

      const result = await userService.getUserProfile();

      expect(result).toEqual({
        status: 'error',
        message: 'Internal server error',
      });
    });

    test('should handle timeout error', async () => {
      const mockError = new Error('timeout of 30000ms exceeded');
      mockError.code = 'ECONNABORTED';
      httpService.get.mockRejectedValue(mockError);

      const result = await userService.getUserProfile();

      expect(result).toEqual({
        status: 'error',
        message: 'Failed to fetch profile',
      });
    });
  });
});
