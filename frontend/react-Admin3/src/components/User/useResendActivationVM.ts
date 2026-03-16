import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService.ts";

type ResendStatus = "success" | "error" | null;

export interface ResendActivationVM {
  // State
  email: string;
  isLoading: boolean;
  status: ResendStatus;
  message: string;

  // Actions
  setEmail: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleBackToLogin: () => void;
}

const useResendActivationVM = (): ResendActivationVM => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<ResendStatus>(null);
  const [message, setMessage] = useState<string>("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();

      if (!email.trim()) {
        setStatus("error");
        setMessage("Please enter your email address.");
        return;
      }

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        setStatus("error");
        setMessage("Please enter a valid email address.");
        return;
      }

      setIsLoading(true);
      setStatus(null);
      setMessage("");

      try {
        const response = await authService.resendActivationEmail(email);

        if (response.status === "success") {
          setStatus("success");
          setMessage(
            response.message ||
              "Activation email sent successfully! Please check your inbox."
          );
        } else {
          setStatus("error");
          setMessage(
            response.message || "Failed to send activation email."
          );
        }
      } catch (error: any) {
        setStatus("error");
        setMessage(
          error.message ||
            "Failed to send activation email. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [email]
  );

  const handleBackToLogin = useCallback((): void => {
    navigate("/auth/login");
  }, [navigate]);

  return {
    email,
    isLoading,
    status,
    message,
    setEmail,
    handleSubmit,
    handleBackToLogin,
  };
};

export default useResendActivationVM;
