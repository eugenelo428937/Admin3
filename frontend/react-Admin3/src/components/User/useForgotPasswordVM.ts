import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import authService from "../../services/authService.ts";

export interface ForgotPasswordVM {
  // State
  email: string;
  isLoading: boolean;
  message: string;
  error: string;
  isSubmitted: boolean;
  expiryHours: number;
  countdown: number;
  disableRecaptchaInDev: boolean;

  // Actions
  setEmail: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleBackToLogin: () => void;
  handleResendEmail: () => void;
}

const useForgotPasswordVM = (): ForgotPasswordVM => {
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [countdown, setCountdown] = useState<number>(10);
  const navigate = useNavigate();

  const { executeRecaptcha } = useGoogleReCaptcha();

  const disableRecaptchaInDev: boolean =
    !!(import.meta.env?.DEV &&
    import.meta.env?.VITE_DISABLE_RECAPTCHA === "true");

  // Handle automatic redirect after email is sent
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isSubmitted && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isSubmitted && countdown === 0) {
      navigate("/home", { state: { showLogin: true } });
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isSubmitted, countdown, navigate]);

  const validateEmail = (emailValue: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      let recaptchaToken: string | null = null;

      if (!disableRecaptchaInDev && executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha("password_reset");
        } catch (recaptchaError: unknown) {
          console.error("reCAPTCHA execution failed:", recaptchaError);
          setError("reCAPTCHA verification failed. Please try again.");
          setIsLoading(false);
          return;
        }
      }

      if (!disableRecaptchaInDev && !recaptchaToken) {
        setError("reCAPTCHA verification is required");
        setIsLoading(false);
        return;
      }

      const result = await authService.requestPasswordReset(email, recaptchaToken);

      if (result.status === "success") {
        setMessage(result.message);
        setExpiryHours(result.expiry_hours || 24);
        setIsSubmitted(true);
        setCountdown(10);
      } else {
        setError(result.message || "Failed to send password reset email");
      }
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [email, disableRecaptchaInDev, executeRecaptcha]);

  const handleBackToLogin = useCallback((): void => {
    navigate("/home", { state: { showLogin: true } });
  }, [navigate]);

  const handleResendEmail = useCallback((): void => {
    setIsSubmitted(false);
    setMessage("");
    setError("");
    setEmail("");
    setCountdown(10);
  }, []);

  return {
    email,
    isLoading,
    message,
    error,
    isSubmitted,
    expiryHours,
    countdown,
    disableRecaptchaInDev,
    setEmail,
    handleSubmit,
    handleBackToLogin,
    handleResendEmail,
  };
};

export default useForgotPasswordVM;
