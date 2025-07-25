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

const UserActions = ({ onOpenSearch, onOpenAuth, onOpenCart, onToggleMobileMenu, isMobile }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [profileAnchor, setProfileAnchor] = useState(null);

  const cartItemCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

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
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          onClick={onToggleMobileMenu}
          sx={{ display: { xs: 'flex', md: 'none' } }}
          aria-label="open navigation menu"
        >
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
              textTransform: 'none',
              color: 'text.secondary',
              display: { xs: 'none', md: 'flex' }
            }}
          >
            Brochure
          </Button>
        </Tooltip>
      )}

      {/* Search Button */}
      <Tooltip title="Search Products (Ctrl+K)">
        <IconButton 
          onClick={onOpenSearch}
          sx={{ color: 'text.primary' }}
          aria-label="search products"
        >
          <SearchIcon />
        </IconButton>
      </Tooltip>

      {/* Shopping Cart */}
      <Tooltip title="Shopping Cart">
        <IconButton 
          onClick={onOpenCart}
          sx={{ color: 'text.primary' }}
          aria-label={`shopping cart with ${cartItemCount} items`}
        >
          <Badge 
            badgeContent={cartItemCount} 
            color="primary"
            max={99}
          >
            <CartIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* User Profile / Login */}
      {isAuthenticated ? (
        <>
          <Tooltip title="User Profile">
            <IconButton 
              onClick={handleProfileOpen}
              sx={{ color: 'text.primary' }}
              aria-label="user profile menu"
            >
              <Avatar 
                sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
          
          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={handleProfileClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" noWrap>
                {user?.first_name && user?.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : user?.email
                }
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.email}
              </Typography>
            </Box>
            <MenuItem onClick={handleProfile}>
              <ProfileIcon sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </>
      ) : (
        <Button
          onClick={onOpenAuth}
          variant="contained"
          size="small"
          sx={{ 
            textTransform: 'none',
            borderRadius: 2
          }}
        >
          Login
        </Button>
      )}
    </Box>
  );
};

export default UserActions;