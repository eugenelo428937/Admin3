import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import authService from "../../services/authService.ts";
import logger from "../../services/loggerService.js";

type VerificationStatus = "success" | null;

export interface EmailVerificationVM {
  // State
  loading: boolean;
  verificationStatus: VerificationStatus;
  error: string | null;
  newEmail: string | null;

  // Actions
  handleBackToProfile: () => void;
  handleBackToLogin: () => void;
  handleReload: () => void;
}

const useEmailVerificationVM = (): EmailVerificationVM => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>(null);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async (): Promise<void> => {
      try {
        const uid = searchParams.get("uid");
        const token = searchParams.get("token");
        const email = searchParams.get("email");

        if (!uid || !token || !email) {
          setError(
            "Invalid verification link. Please check the link from your email."
          );
          return;
        }

        setNewEmail(email);
        logger.debug("Verifying email change", { uid, email });

        const result = await authService.verifyEmailChange({
          uid,
          token,
          new_email: email,
        });

        if (result.status === "success") {
          setVerificationStatus("success");
          logger.info("Email verification successful", { email });
        } else {
          setError(result.message || "Email verification failed");
          logger.error("Email verification failed", {
            error: result.message,
          });
        }
      } catch (err: unknown) {
        setError(
          "An error occurred during email verification. Please try again."
        );
        logger.error("Email verification error", { error: err });
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams]);

  const handleBackToProfile = useCallback((): void => {
    navigate("/profile");
  }, [navigate]);

  const handleBackToLogin = useCallback((): void => {
    navigate("/");
  }, [navigate]);

  const handleReload = useCallback((): void => {
    window.location.reload();
  }, []);

  return {
    loading,
    verificationStatus,
    error,
    newEmail,
    handleBackToProfile,
    handleBackToLogin,
    handleReload,
  };
};

export default useEmailVerificationVM;
