import React, { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Button,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Badge,
  Tooltip
} from '@mui/material';
import { 
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  AccountCircle as PersonIcon,
  Download as DownloadIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Person as ProfileIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

const UserActions = ({ onOpenSearch, onOpenAuth, onOpenCart, onToggleMobileMenu, isMobile }) => {
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
    navigate('/');
  };

  const handleProfile = () => {
    navigate('/profile');
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

			{/* Brochure Download - Desktop Only */}
			{!isMobile && (
				<Tooltip title="Download Brochure">
					<Button
						component="a"
						href="/brochure"
						target="_blank"
						startIcon={<DownloadIcon />}
						sx={{
							textTransform: "none",
							color: theme.palette.liftkit.light.background,
							display: { xs: "none", md: "flex" },
						}}>
						Brochure
					</Button>
				</Tooltip>
			)}

			{/* Search Button */}
			<Tooltip title="Search Products (Ctrl+K)">
				<Button
					onClick={onOpenSearch}
					sx={{ color: theme.palette.liftkit.light.background }}
					aria-label="search products">
					<SearchIcon />
					Search
				</Button>
			</Tooltip>

			{/* Shopping Cart */}
			<Tooltip title="Shopping Cart">
				<IconButton
					onClick={onOpenCart}
					sx={{ color: theme.palette.liftkit.light.onSurface }}
					aria-label={`shopping cart with {cartCount} items`}>
					<Badge badgeContent={cartCount} color="primary" max={99}>
						<CartIcon
							sx={{ color: theme.palette.liftkit.light.background }}
						/>
					</Badge>
				</IconButton>
			</Tooltip>

			{/* User Profile / Login */}
			{isAuthenticated ? (
				<>
					<Tooltip title="User Profile">
						<IconButton
							onClick={handleProfileOpen}
							sx={{ color: "text.primary" }}
							aria-label="user profile menu">
							<Avatar
								sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
								{user?.email?.charAt(0).toUpperCase() || "U"}
							</Avatar>
						</IconButton>
					</Tooltip>

					<Menu
						anchorEl={profileAnchor}
						open={Boolean(profileAnchor)}
						onClose={handleProfileClose}
						transformOrigin={{ horizontal: "right", vertical: "top" }}
						anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
						sx={{
							"& .MuiPaper-root": {
								width: "200px",
								maxWidth: "100%",
							},
						}}>
						<Box
							sx={{
								px: 2,
								py: 1,
								overflow: "visible",
								zIndex: 9999,
								backgroundcolor: theme.palette.grey[50],
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
					variant="contained"
					size="small"
					sx={{
						textTransform: "none",
						borderRadius: 2,
					}}>
					Login
				</Button>
			)}
		</Box>
  );
};

export default UserActions;