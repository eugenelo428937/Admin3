import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.tsx";

const useRegistrationVM = () => {
	const [success, setSuccess] = useState(false);
	const [successMessage, setSuccessMessage] = useState("");
	const [error, setError] = useState("");

	const { isAuthenticated } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		// Redirect authenticated users to dashboard
		if (isAuthenticated) {
			navigate("/dashboard");
		}
	}, [isAuthenticated, navigate]);

	const handleRegistrationSuccess = (result: any) => {
		setError("");
		setSuccess(true);
		setSuccessMessage(
			result.message ||
			"Account created successfully! Please check your email for account activation instructions."
		);
	};

	const handleRegistrationError = (errorMessage: string) => {
		setSuccess(false);
		setSuccessMessage("");
		setError(errorMessage);
	};

	const handleSwitchToLogin = () => {
		navigate("/login");
	};

	const handleBackToLogin = () => {
		navigate("/login");
	};

	const clearError = () => {
		setError("");
	};

	return {
		success,
		successMessage,
		error,
		handleRegistrationSuccess,
		handleRegistrationError,
		handleSwitchToLogin,
		handleBackToLogin,
		clearError,
	};
};

export default useRegistrationVM;
