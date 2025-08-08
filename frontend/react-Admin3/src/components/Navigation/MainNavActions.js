import React, { useState } from "react";
import {
	Box,
	IconButton,
	Button,
	Menu,
	MenuItem,
	Avatar,
	Typography,
	Badge,
	Tooltip,
} from "@mui/material";
import {
	Login as LoginIcon,
	ShoppingCartOutlined as CartIcon,
	Menu as MenuIcon,
	Logout as LogoutIcon,
	Person as ProfileIcon,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

const MainNavActions = ({
	onOpenAuth,
	onOpenCart,
	onToggleMobileMenu,
	isMobile,
}) => {
	const { isAuthenticated, user, logout } = useAuth();
	const { cartCount } = useCart();
	const navigate = useNavigate();
	const [profileAnchor, setProfileAnchor] = useState(null);
	const theme = useTheme();

	const handleProfileOpen = (event) => {
		setProfileAnchor(event.currentTarget);
	};

	const handleProfileClose = () => {
		setProfileAnchor(null);
	};

	const handleLogout = () => {
		logout();
		handleProfileClose();
		navigate("/");
	};

	const handleProfile = () => {
		navigate("/profile");
		handleProfileClose();
	};

	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
			{/* Mobile Menu Button */}
			{isMobile && (
				<IconButton
					onClick={onToggleMobileMenu}
					sx={{ display: { xs: "flex", md: "none" } }}
					aria-label="open navigation menu">
					<MenuIcon />
				</IconButton>
			)}

			{/* Shopping Cart */}
			<Tooltip title="Shopping Cart">
				<Button
					onClick={onOpenCart}
					variant="transparent-background"
					size="medium"					
					startIcon={
						<Badge
							badgeContent={cartCount}
							color={theme.palette.bpp.sky["030"]}
							max={99}
							sx={{
								"& .MuiBadge-badge": {
									backgroundColor: theme.palette.bpp.sky["050"],
									color: "white",
								},
							}}
							aria-label={`shopping cart with ${cartCount} items`}>
							<CartIcon sx={{ color: theme.palette.offwhite["000"] }} />
						</Badge>
					}>
					<Typography
						variant="button"
						noWrap
						color={theme.palette.offwhite["000"]}>
						Cart
					</Typography>
				</Button>
			</Tooltip>

			{/* User Profile / Login */}
			{isAuthenticated ? (
				<>
					<Tooltip title="User Profile">
						<Button
							variant="transparent-background"
							onClick={handleProfileOpen}
							sx={{ color: "text.primary" }}
							aria-label="user profile menu"
							startIcon={
								<Avatar
									sx={{
										width: theme.typography.h4.fontSize,
										height: theme.typography.h4.fontSize,
										bgcolor: theme.palette.bpp.sky["060"],
									}}>
									{user?.first_name ? (
										<Typography
											variant="body1"
											noWrap
											color={theme.palette.offwhite["000"]}>
											{user?.email?.charAt(0).toUpperCase() || "U"}
										</Typography>
									) : (
										<ProfileIcon />
									)}
								</Avatar>
							}>
							<Typography
								variant="button"
								noWrap
								color={theme.palette.offwhite["000"]}>
								{user?.first_name ? `${user.first_name}` : user?.email}
							</Typography>
						</Button>
					</Tooltip>

					<Menu
						anchorEl={profileAnchor}
						open={Boolean(profileAnchor)}
						onClose={handleProfileClose}
						transformOrigin={{ horizontal: "right", vertical: "top" }}
						anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
						sx={{
							"& .MuiPaper-root": {
								width: "15rem",
								maxWidth: "100%",
							},
						}}>
						<Box
							sx={{
								px: 2,
								py: 1,
								overflow: "visible",
								zIndex: 9999,
								backgroundColor: theme.palette.grey[50],
								borderRadius: 2,
								boxShadow: 2,
								border: "1px solid rgba(0, 0, 0, 0.12)",
							}}>
							<Typography variant="body1" noWrap>
								{user?.first_name && user?.last_name
									? `${user.first_name} ${user.last_name}`
									: user?.email}
							</Typography>
							<Typography variant="body1" color="text.secondary" noWrap>
								{user?.email}
							</Typography>
						</Box>
						<MenuItem onClick={handleProfile}>
							<ProfileIcon sx={{ mr: 1 }} />
							<Typography variant="body1" noWrap>
								Profile
							</Typography>
						</MenuItem>
						<MenuItem onClick={handleLogout}>
							<LogoutIcon sx={{ mr: 1 }} />
							<Typography variant="body1" noWrap>
								Logout
							</Typography>
						</MenuItem>
					</Menu>
				</>
			) : (
				<Button
					onClick={onOpenAuth}
					variant="transparent-background"
					size="medium"
					startIcon={<LoginIcon sx={{ color: theme.palette.offwhite["000"] }} />}>
					<Typography
						variant="button"
						noWrap
						color={theme.palette.offwhite["000"]}>
						Login
					</Typography>
				</Button>
			)}
		</Box>
	);
};

export default MainNavActions;
