import React from "react";
import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import { Home as HomeIcon, Person as PersonIcon } from "@mui/icons-material";
import UserFormWizard from "../components/User/UserFormWizard.tsx";
import useProfilePageVM from "./useProfilePageVM";

const ProfilePage: React.FC = () => {
	const vm = useProfilePageVM();

	// Don't render anything if not authenticated (will redirect)
	if (!vm.isAuthenticated) {
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
						onClick={() => vm.navigate('/home')}
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
				onSuccess={vm.handleProfileUpdateSuccess}
				onError={vm.handleProfileUpdateError}
			/>
		</Box>
	);
};

export default ProfilePage;
