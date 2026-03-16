// src/services/userService.ts
import httpService from "./httpService.js";
import config from "../config.js";
import logger from "./loggerService";
import type {
  ProfileUpdateData,
  ProfileUpdateResult,
  ChangePasswordData,
  ChangePasswordResult,
  EmailVerificationRequestResult,
  ServiceResponse,
  UserProfile,
} from "../types/auth";

const API_USER_URL = (config as any).userUrl;

const userService = {
  // ─── Get User Profile ──────────────────────────────────────────
  getUserProfile: async (): Promise<ServiceResponse<UserProfile>> => {
    try {
      (logger as any).debug("Fetching user profile");
      const response = await httpService.get(`${API_USER_URL}/profile/`);

      if (response.status === 200 && response.data) {
        (logger as any).info("User profile fetched successfully");
        return {
          status: "success",
          data: response.data.data,
        };
      }

      return {
        status: "error",
        message: "Invalid response format from server",
      };
    } catch (error: any) {
      (logger as any).error("Failed to fetch user profile", {
        error: error.response?.data || error,
        status: error.response?.status,
      });

      return {
        status: "error",
        message:
          error.response?.data?.message || "Failed to fetch profile",
      };
    }
  },

  // ─── Update User Profile ───────────────────────────────────────
  updateUserProfile: async (
    profileData: ProfileUpdateData,
  ): Promise<ProfileUpdateResult> => {
    try {
      (logger as any).debug("Updating user profile", {
        hasUserData: !!profileData.user,
        hasProfileData: !!profileData.profile,
        hasHomeAddress: !!profileData.home_address,
        hasWorkAddress: !!profileData.work_address,
        hasContactNumbers: !!profileData.contact_numbers,
      });

      const response = await httpService.patch(
        `${API_USER_URL}/update_profile/`,
        profileData,
      );

      if (response.status === 200 && response.data) {
        (logger as any).info("User profile updated successfully", {
          emailVerificationSent: response.data.email_verification_sent,
        });

        return {
          status: "success",
          message: response.data.message,
          email_verification_sent:
            response.data.email_verification_sent || false,
        };
      }

      return {
        status: "error",
        message: "Invalid response format from server",
      };
    } catch (error: any) {
      (logger as any).error("Failed to update user profile", {
        error: error.response?.data || error,
        status: error.response?.status,
      });

      return {
        status: "error",
        message:
          error.response?.data?.message || "Failed to update profile",
      };
    }
  },

  // ─── Change Password ───────────────────────────────────────────
  changePassword: async (
    passwordData: ChangePasswordData,
  ): Promise<ChangePasswordResult> => {
    try {
      (logger as any).debug("Changing user password");

      const response = await httpService.post(
        `${API_USER_URL}/change_password/`,
        passwordData,
      );

      if (response.status === 200 && response.data) {
        (logger as any).info("Password changed successfully");
        return {
          status: "success",
          message:
            response.data.message || "Password changed successfully",
        };
      }

      return {
        status: "error",
        message: "Invalid response format from server",
      };
    } catch (error: any) {
      (logger as any).error("Failed to change password", {
        error: error.response?.data || error,
        status: error.response?.status,
      });

      return {
        status: "error",
        message:
          error.response?.data?.message || "Failed to change password",
      };
    }
  },

  // ─── Request Email Verification ────────────────────────────────
  requestEmailVerification: async (
    newEmail: string,
  ): Promise<EmailVerificationRequestResult> => {
    try {
      (logger as any).debug("Requesting email verification", { newEmail });

      const response = await httpService.post(
        `${API_USER_URL}/request_email_verification/`,
        { new_email: newEmail },
      );

      if (response.status === 200 && response.data) {
        (logger as any).info(
          "Email verification requested successfully",
        );
        return {
          status: "success",
          message: response.data.message,
        };
      }

      return {
        status: "error",
        message: "Invalid response format from server",
      };
    } catch (error: any) {
      (logger as any).error("Failed to request email verification", {
        error: error.response?.data || error,
        status: error.response?.status,
      });

      return {
        status: "error",
        message:
          error.response?.data?.message ||
          "Failed to send verification email",
      };
    }
  },
};

export default userService;
