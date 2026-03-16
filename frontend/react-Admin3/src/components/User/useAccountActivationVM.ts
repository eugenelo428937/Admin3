import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import authService from "../../services/authService.ts";

type ActivationStatus = "processing" | "success" | "error";
type ActivationMode = "activation" | "email_verification";

export interface AccountActivationVM {
  // State
  status: ActivationStatus;
  message: string;
  isLoading: boolean;
  mode: ActivationMode;
  newEmail: string | null;

  // Derived
  title: string;
  successIcon: "email" | "check";
  successHeading: string;
  errorHeading: string;
  loadingMessage: string;

  // Actions
  handleLoginRedirect: () => void;
  handleProfileRedirect: () => void;
  handleResendActivation: () => void;
  handleReload: () => void;
  handleHomeRedirect: () => void;
}

const useAccountActivationVM = (): AccountActivationVM => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ActivationStatus>("processing");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mode, setMode] = useState<ActivationMode>("activation");
  const [newEmail, setNewEmail] = useState<string | null>(null);

  useEffect(() => {
    const handleVerification = async (): Promise<void> => {
      const uid = searchParams.get("uid");
      const token = searchParams.get("token");
      const email = searchParams.get("email");

      if (!uid || !token) {
        setStatus("error");
        setMessage("Invalid verification link. Missing required parameters.");
        setIsLoading(false);
        return;
      }

      const verificationMode: ActivationMode = email
        ? "email_verification"
        : "activation";
      setMode(verificationMode);

      if (email) {
        setNewEmail(email);
      }

      try {
        setIsLoading(true);
        let response: any;

        if (verificationMode === "email_verification") {
          response = await authService.verifyEmailChange({
            uid,
            token,
            new_email: email!,
          });
        } else {
          response = await authService.activateAccount(uid, token);
        }

        if (response.status === "success") {
          setStatus("success");
          if (verificationMode === "email_verification") {
            setMessage(
              response.message ||
                `Email address verified and updated to ${email} successfully!`
            );
          } else {
            setMessage(
              response.message ||
                "Account activated successfully! You can now log in."
            );
          }
        } else {
          setStatus("error");
          setMessage(
            response.message ||
              response.error ||
              `${
                verificationMode === "email_verification"
                  ? "Email verification"
                  : "Account activation"
              } failed.`
          );
        }
      } catch (error: any) {
        setStatus("error");
        setMessage(
          error.message ||
            `${
              verificationMode === "email_verification"
                ? "Email verification"
                : "Account activation"
            } failed. Please try again.`
        );
      } finally {
        setIsLoading(false);
      }
    };

    handleVerification();
  }, [searchParams]);

  // Redirect to products page after successful account activation (with delay)
  useEffect(() => {
    if (status === "success" && mode === "activation" && !isLoading) {
      const timer = setTimeout(() => {
        navigate("/products");
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [status, mode, isLoading, navigate]);

  const handleLoginRedirect = useCallback((): void => {
    navigate("/products");
  }, [navigate]);

  const handleProfileRedirect = useCallback((): void => {
    navigate("/profile");
  }, [navigate]);

  const handleResendActivation = useCallback((): void => {
    navigate("/auth/resend-activation");
  }, [navigate]);

  const handleReload = useCallback((): void => {
    window.location.reload();
  }, []);

  const handleHomeRedirect = useCallback((): void => {
    navigate("/");
  }, [navigate]);

  const title =
    mode === "email_verification" ? "Email Verification" : "Account Activation";

  const successIcon: "email" | "check" =
    mode === "email_verification" ? "email" : "check";

  const successHeading =
    mode === "email_verification"
      ? "Email Verified Successfully!"
      : "Account Activated Successfully!";

  const errorHeading =
    mode === "email_verification"
      ? "Email Verification Failed"
      : "Account Activation Failed";

  const loadingMessage =
    mode === "email_verification"
      ? "Verifying your email address..."
      : "Activating your account...";

  return {
    status,
    message,
    isLoading,
    mode,
    newEmail,
    title,
    successIcon,
    successHeading,
    errorHeading,
    loadingMessage,
    handleLoginRedirect,
    handleProfileRedirect,
    handleResendActivation,
    handleReload,
    handleHomeRedirect,
  };
};

export default useAccountActivationVM;
