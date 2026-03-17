import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.tsx";

const useProfilePageVM = () => {
	const { isAuthenticated } = useAuth();
	const navigate = useNavigate();

	// Redirect to login if not authenticated
	useEffect(() => {
		if (!isAuthenticated) {
			navigate("/login");
		}
	}, [isAuthenticated, navigate]);

	const handleProfileUpdateSuccess = (result: any) => {
		// Profile updated successfully
		// The wizard already shows success notifications
		// Could add additional logic here if needed (e.g., analytics tracking)
		console.log("Profile updated successfully:", result);
	};

	const handleProfileUpdateError = (errorMessage: string) => {
		// Profile update error
		// The wizard already shows error messages
		console.error("Profile update error:", errorMessage);
	};

	return {
		isAuthenticated,
		navigate,
		handleProfileUpdateSuccess,
		handleProfileUpdateError,
	};
};

export default useProfilePageVM;
