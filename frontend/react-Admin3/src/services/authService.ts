// src/services/authService.ts
import httpService from "./httpService.js";
import config from "../config.js";
import logger from "./loggerService";
import type {
  LoginCredentials,
  AuthResult,
  RegistrationData,
  RegistrationResult,
  PasswordResetRequestResult,
  PasswordResetConfirmResult,
  ActivationResult,
  EmailVerificationData,
  EmailVerificationResult,
  TokenRefreshResult,
  AuthUser,
} from "../types/auth";

const API_AUTH_URL = (config as any).authUrl;
const API_USER_URL = (config as any).userUrl;

const authService = {
  // ─── Login ─────────────────────────────────────────────────────
  login: async (credentials: LoginCredentials): Promise<AuthResult> => {
    (logger as any).debug("Attempting login", { email: credentials.email });

    // Clear any existing auth data before attempting login
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("isAuthenticated");

    try {
      // First, get CSRF token
      await httpService.get(`${API_AUTH_URL}/csrf/`);

      // Send login request with email as username
      const response = await httpService.post(`${API_AUTH_URL}/login/`, {
        username: credentials.email,
        password: credentials.password,
      });

      (logger as any).debug("Login response received", response.data);

      if (
        response.status === 200 &&
        response.data &&
        response.data.token &&
        response.data.user
      ) {
        // Store tokens
        localStorage.setItem("token", response.data.token);
        if (response.data.refresh) {
          localStorage.setItem("refreshToken", response.data.refresh);
        }
        (logger as any).debug("Tokens stored in localStorage");

        // Store user data
        const userData = response.data.user;
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("isAuthenticated", "true");
        (logger as any).info("Login successful", {
          userId: userData.id,
          status: response.status,
        });

        return {
          status: "success",
          user: userData,
          message: "Login successful",
        };
      }

      // If we reach here without returning, the response format was invalid
      return {
        status: "error",
        message: "Invalid response format from server",
        code: 500,
      };
    } catch (error: any) {
      // Clear any existing auth data on error
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("isAuthenticated");

      (logger as any).error("Login failed", {
        error: error.response?.data || error,
        status: error.response?.status,
        url: `${API_AUTH_URL}/login/`,
      });

      if (error.response?.status === 401) {
        return {
          status: "error",
          message: "Invalid username or password",
          code: 401,
        };
      } else if (error.response?.status === 403) {
        return {
          status: "error",
          message: "Access forbidden",
          code: 403,
        };
      } else if (error.response?.data?.message) {
        return {
          status: "error",
          message: error.response.data.message,
          code: error.response?.status,
        };
      }

      return {
        status: "error",
        message: "Login failed. Please try again later.",
        code: error.response?.status || 500,
      };
    }
  },

  // ─── Register ──────────────────────────────────────────────────
  register: async (userData: RegistrationData): Promise<RegistrationResult> => {
    try {
      const response = await httpService.post(
        `${API_AUTH_URL}/register/`,
        userData,
      );

      if (response.status === 201 || response.status === 200) {
        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
          localStorage.setItem("isAuthenticated", "true");
          if (response.data.token) {
            localStorage.setItem("token", response.data.token);
          }

          return {
            status: "success",
            user: response.data.user,
            message: "Registration successful",
          };
        }
      }

      throw new Error("Invalid registration response");
    } catch (error: any) {
      (logger as any).error("Registration failed", {
        error: error.response?.data || error,
        status: error.response?.status,
      });

      return {
        status: "error",
        message: error.response?.data?.message || "Registration failed",
        code: error.response?.status || 500,
      };
    }
  },

  // ─── Logout ────────────────────────────────────────────────────
  logout: async (): Promise<AuthResult> => {
    try {
      try {
        await httpService.post(`${API_AUTH_URL}/logout/`);
      } catch (error: any) {
        (logger as any).debug("Logout endpoint error", error);
      }

      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("isAuthenticated");

      return {
        status: "success",
        message: "Logged out successfully",
      };
    } catch (error: any) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("isAuthenticated");

      return {
        status: "error",
        message: "Error during logout",
      };
    }
  },

  // ─── Get Current User ──────────────────────────────────────────
  getCurrentUser: (): AuthUser | null => {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  },

  // ─── Is Authenticated ─────────────────────────────────────────
  isAuthenticated: (): boolean => {
    return (
      localStorage.getItem("isAuthenticated") === "true" &&
      localStorage.getItem("token") !== null
    );
  },

  // ─── Refresh Token ─────────────────────────────────────────────
  refreshToken: async (): Promise<TokenRefreshResult> => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      const response = await httpService.post(`${API_AUTH_URL}/refresh/`, {
        refresh: refreshToken,
      });

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }

      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  },

  // ─── Get User Details ──────────────────────────────────────────
  getUserDetails: async (): Promise<AuthUser> => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) {
        throw new Error("No user data found");
      }

      const user = JSON.parse(userData);
      const userId = user.id;

      const response = await httpService.get(`${API_USER_URL}/${userId}/`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // ─── Activate Account ──────────────────────────────────────────
  activateAccount: async (
    uid: string,
    token: string,
  ): Promise<ActivationResult> => {
    try {
      (logger as any).debug("Attempting account activation", { uid });

      const response = await httpService.post(`${API_AUTH_URL}/activate/`, {
        uid: uid,
        token: token,
      });

      (logger as any).debug(
        "Account activation response received",
        response.data,
      );

      if (response.status === 200 && response.data) {
        (logger as any).info("Account activation successful", { uid });

        if (
          response.data.status === "success" ||
          response.data.status === "info"
        ) {
          return {
            status: "success",
            message:
              response.data.message || "Account activated successfully",
          };
        }
      }

      return {
        status: "error",
        message: "Invalid response format from server",
      };
    } catch (error: any) {
      (logger as any).error("Account activation failed", {
        error: error.response?.data || error,
        status: error.response?.status,
        uid: uid,
      });

      if (error.response?.status === 400) {
        return {
          status: "error",
          message:
            error.response.data.error ||
            "Invalid or expired activation link",
        };
      } else if (error.response?.data?.error) {
        return {
          status: "error",
          message: error.response.data.error,
        };
      }

      return {
        status: "error",
        message:
          "Account activation failed. Please try again later.",
      };
    }
  },

  // ─── Resend Activation Email ───────────────────────────────────
  resendActivationEmail: async (
    email: string,
  ): Promise<ActivationResult> => {
    try {
      (logger as any).debug("Attempting to resend activation email", {
        email,
      });

      const response = await httpService.post(
        `${API_AUTH_URL}/send_activation/`,
        { email: email },
      );

      (logger as any).debug(
        "Resend activation response received",
        response.data,
      );

      if (response.status === 200 && response.data) {
        (logger as any).info("Activation email resent successfully", {
          email,
        });
        return {
          status: "success",
          message:
            response.data.message ||
            "Activation email sent successfully",
        };
      }

      return {
        status: "error",
        message: "Invalid response format from server",
      };
    } catch (error: any) {
      (logger as any).error("Resend activation email failed", {
        error: error.response?.data || error,
        status: error.response?.status,
        email: email,
      });

      if (error.response?.data?.error) {
        return {
          status: "error",
          message: error.response.data.error,
        };
      }

      return {
        status: "error",
        message:
          "Failed to send activation email. Please try again later.",
      };
    }
  },

  // ─── Verify Email Change ───────────────────────────────────────
  verifyEmailChange: async (
    verificationData: EmailVerificationData,
  ): Promise<EmailVerificationResult> => {
    try {
      (logger as any).debug("Attempting email change verification", {
        uid: verificationData.uid,
        newEmail: verificationData.new_email,
      });

      const response = await httpService.post(
        `${API_AUTH_URL}/verify_email/`,
        verificationData,
      );

      (logger as any).debug(
        "Email verification response received",
        response.data,
      );

      if (response.status === 200 && response.data) {
        (logger as any).info("Email verification successful", {
          newEmail: verificationData.new_email,
        });
        return {
          status: "success",
          message:
            response.data.message ||
            "Email verified and updated successfully",
        };
      }

      return {
        status: "error",
        message: "Invalid response format from server",
      };
    } catch (error: any) {
      (logger as any).error("Email verification failed", {
        error: error.response?.data || error,
        status: error.response?.status,
        newEmail: verificationData.new_email,
      });

      if (error.response?.status === 400) {
        return {
          status: "error",
          message:
            error.response.data.error ||
            "Invalid or expired verification link",
        };
      } else if (error.response?.data?.error) {
        return {
          status: "error",
          message: error.response.data.error,
        };
      }

      return {
        status: "error",
        message:
          "Email verification failed. Please try again later.",
      };
    }
  },

  // ─── Send Password Reset Completed Email ───────────────────────
  sendPasswordResetCompletedEmail: async (
    email: string,
  ): Promise<AuthResult> => {
    try {
      (logger as any).debug(
        "Sending password reset completed notification",
        { email },
      );

      const response = await httpService.post(
        `${API_AUTH_URL}/password-reset-completed/`,
        { email: email },
      );

      (logger as any).debug(
        "Password reset completed notification response received",
        response.data,
      );

      if (response.status === 200 && response.data) {
        (logger as any).info(
          "Password reset completed notification sent successfully",
          { email },
        );
        return {
          status: "success",
          message:
            response.data.message ||
            "Password reset notification sent successfully",
        };
      }

      return {
        status: "error",
        message: "Invalid response format from server",
      };
    } catch (error: any) {
      (logger as any).error(
        "Password reset completed notification failed",
        {
          error: error.response?.data || error,
          status: error.response?.status,
          email: email,
        },
      );

      if (error.response?.data?.error) {
        return {
          status: "error",
          message: error.response.data.error,
        };
      }

      return {
        status: "error",
        message:
          "Failed to send password reset notification. Please try again later.",
      };
    }
  },

  // ─── Request Password Reset ────────────────────────────────────
  requestPasswordReset: async (
    email: string,
    recaptchaToken?: string | null,
  ): Promise<PasswordResetRequestResult> => {
    try {
      (logger as any).debug("Requesting password reset", { email });

      const requestData: Record<string, string> = {
        email: email.trim(),
      };

      if (recaptchaToken) {
        requestData.recaptcha_token = recaptchaToken;
      }

      const response = await httpService.post(
        `${API_AUTH_URL}/password_reset_request/`,
        requestData,
      );

      (logger as any).debug(
        "Password reset request response received",
        response.data,
      );

      if (response.status === 200 && response.data) {
        (logger as any).info("Password reset email sent successfully", {
          email,
        });
        return {
          status: "success",
          message:
            response.data.message ||
            "Password reset email sent successfully",
          expiry_hours: response.data.expiry_hours || 24,
        };
      }

      return {
        status: "error",
        message: "Invalid response format from server",
      };
    } catch (error: any) {
      (logger as any).error("Password reset request failed", {
        error: error.response?.data || error,
        status: error.response?.status,
        email: email,
      });

      if (error.response?.data?.error) {
        return {
          status: "error",
          message: error.response.data.error,
        };
      }

      return {
        status: "error",
        message: "An error occurred. Please try again later.",
      };
    }
  },

  // ─── Confirm Password Reset ────────────────────────────────────
  confirmPasswordReset: async (
    uid: string,
    token: string,
    newPassword: string,
  ): Promise<PasswordResetConfirmResult> => {
    try {
      (logger as any).debug("Confirming password reset", { uid });

      const response = await httpService.post(
        `${API_AUTH_URL}/password_reset_confirm/`,
        {
          uid: uid,
          token: token,
          new_password: newPassword,
        },
      );

      (logger as any).debug(
        "Password reset confirmation response received",
        response.data,
      );

      if (response.status === 200 && response.data) {
        (logger as any).info("Password reset confirmed successfully", {
          uid,
        });
        return {
          status: "success",
          message:
            response.data.message || "Password reset successful",
        };
      }

      return {
        status: "error",
        message: "Invalid response format from server",
      };
    } catch (error: any) {
      (logger as any).error("Password reset confirmation failed", {
        error: error.response?.data || error,
        status: error.response?.status,
        uid: uid,
      });

      if (error.response?.status === 400) {
        return {
          status: "error",
          message:
            error.response.data.error ||
            "Invalid or expired reset link",
        };
      } else if (error.response?.data?.error) {
        return {
          status: "error",
          message: error.response.data.error,
        };
      }

      return {
        status: "error",
        message:
          "Password reset failed. Please try again later.",
      };
    }
  },
};

export default authService;
