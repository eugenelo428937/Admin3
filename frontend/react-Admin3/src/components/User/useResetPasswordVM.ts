import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import authService from "../../services/authService.ts";

interface PasswordValidationResult {
  valid: boolean;
  message: string;
}

interface Passwords {
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordVM {
  // State
  passwords: Passwords;
  isLoading: boolean;
  error: string;
  success: boolean;
  tokenValid: boolean | null;
  passwordStrength: string;

  // Actions
  handlePasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleBackToLogin: () => void;
  getPasswordStrengthColor: () => string;
  navigateToForgotPassword: () => void;
}

const useResetPasswordVM = (): ResetPasswordVM => {
  const [passwords, setPasswords] = useState<Passwords>({
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<string>("");

  const navigate = useNavigate();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const uid = urlParams.get("uid");
  const token = urlParams.get("token");

  useEffect(() => {
    if (!uid || !token) {
      setError("Invalid reset link. Please request a new password reset.");
      setTokenValid(false);
    } else {
      setTokenValid(true);
    }
  }, [uid, token]);

  const validatePassword = (password: string): PasswordValidationResult => {
    if (password.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters long" };
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: "Password must contain at least one number" };
    }
    return { valid: true, message: "Strong password" };
  };

  const getPasswordStrength = (password: string): string => {
    if (password.length === 0) return "";

    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[!@#$%^&*])/.test(password)) score++;

    if (score < 2) return "Weak";
    if (score < 4) return "Medium";
    return "Strong";
  };

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setPasswords((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "newPassword") {
      setPasswordStrength(getPasswordStrength(value));
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");

    if (!passwords.newPassword.trim()) {
      setError("New password is required");
      return;
    }

    const passwordValidation = validatePassword(passwords.newPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.confirmPasswordReset(uid!, token!, passwords.newPassword);

      if (result.status === "success") {
        setSuccess(true);
      } else {
        setError(result.message || "Failed to reset password");
      }
    } catch (err: unknown) {
      console.error("Password reset confirm error:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [passwords, uid, token]);

  const handleBackToLogin = useCallback((): void => {
    navigate("/home", { state: { showLogin: true } });
  }, [navigate]);

  const navigateToForgotPassword = useCallback((): void => {
    navigate("/auth/forgot-password");
  }, [navigate]);

  const getPasswordStrengthColor = useCallback((): string => {
    switch (passwordStrength) {
      case "Weak":
        return "error";
      case "Medium":
        return "warning";
      case "Strong":
        return "success";
      default:
        return "text.secondary";
    }
  }, [passwordStrength]);

  return {
    passwords,
    isLoading,
    error,
    success,
    tokenValid,
    passwordStrength,
    handlePasswordChange,
    handleSubmit,
    handleBackToLogin,
    getPasswordStrengthColor,
    navigateToForgotPassword,
  };
};

export default useResetPasswordVM;
