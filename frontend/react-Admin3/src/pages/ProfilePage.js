import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import { Home as HomeIcon, Person as PersonIcon } from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import UserFormWizard from "../components/User/UserFormWizard";

/**
 * ProfilePage - User profile editing page using UserFormWizard
 *
 * This page provides profile editing functionality by rendering UserFormWizard in profile mode.
 * The wizard handles all profile data fetching, saving, email verification, and password notifications.
 *
 * Features:
 * - Automatic authentication check and redirect
 * - Breadcrumb navigation
 * - Step-by-step profile editing with save progress
 * - Email verification on email change
 * - Password change notifications
 */
const ProfilePage = () => {
	const { isAuthenticated } = useAuth();
	const navigate = useNavigate();

	// Redirect to login if not authenticated
	useEffect(() => {
		if (!isAuthenticated) {
			navigate("/login");
		}
	}, [isAuthenticated, navigate]);

	const handleProfileUpdateSuccess = (result) => {
		// Profile updated successfully
		// The wizard already shows success notifications
		// Could add additional logic here if needed (e.g., analytics tracking)
		console.log("Profile updated successfully:", result);
	};

	const handleProfileUpdateError = (errorMessage) => {
		// Profile update error
		// The wizard already shows error messages
		console.error("Profile update error:", errorMessage);
	};

	// Don't render anything if not authenticated (will redirect)
	if (!isAuthenticated) {
		return null;
	}

	return (
		<Box sx={{ py: 3 }}>
			{/* Breadcrumb Navigation (T041) */}
			<Box sx={{ maxWidth: '800px', margin: '0 auto'}}>
				<Breadcrumbs aria-label="breadcrumb">
					<Link
						underline="hover"
						sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
						color="inherit"
						onClick={() => navigate('/home')}
					>
						<HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
						Home
					</Link>
					<Typography
						sx={{ display: 'flex', alignItems: 'center' }}
						color="text.primary"
					>
						<PersonIcon sx={{ mr: 0.5 }} fontSize="inherit" />
						My Profile
					</Typography>
				</Breadcrumbs>
			</Box>

			{/* UserFormWizard in Profile Mode */}
			<UserFormWizard
				mode="profile"
				onSuccess={handleProfileUpdateSuccess}
				onError={handleProfileUpdateError}
			/>
		</Box>
	);
};

export default ProfilePage;
