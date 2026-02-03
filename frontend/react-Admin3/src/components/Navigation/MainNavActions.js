import React, { useState } from "react";
import
{
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
import
{
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
}) =>
{
   const { isAuthenticated, user, logout } = useAuth();
   const { cartCount } = useCart();
   const navigate = useNavigate();
   const [profileAnchor, setProfileAnchor] = useState(null);
   const theme = useTheme();

   const handleProfileOpen = (event) =>
   {
      setProfileAnchor(event.currentTarget);
   };

   const handleProfileClose = () =>
   {
      setProfileAnchor(null);
   };

   const handleLogout = () =>
   {
      logout();
      handleProfileClose();
      navigate("/");
   };

   const handleProfile = () =>
   {
      navigate("/profile");
      handleProfileClose();
   };

   return (
      <Box
         sx={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: "center",
            gap: { xs: '0', md: theme.spacingTokens.md },
         }}
      >
         {/* Mobile Menu Button */}
         {isMobile && (
            <IconButton
               onClick={onToggleMobileMenu}
               sx={{ display: { xs: "flex", md: "none" } }}
               aria-label="open navigation menu"
            >
               <MenuIcon />
            </IconButton>
         )}

         {/* Shopping Cart - Show on desktop always, on mobile only when cart has items */}
         <Tooltip title="Shopping Cart">
            <Button
               onClick={onOpenCart}
               variant="navAction"
               size="medium"
               disableRipple
               sx={{
                  display: {
                     xs: cartCount > 0 ? "flex" : "none",
                     md: "flex",
                  },
               }}
               startIcon={
                  <Badge
                     badgeContent={cartCount}
                     color={theme.palette.productCards.material.badge}
                     max={99}
                     sx={{
                        "& .MuiBadge-badge": {
                           backgroundColor: theme.palette.productCards.material.icon,
                           color: "white",
                           pt: "2px"
                        },
                     }}
                     aria-label={`shopping cart with ${cartCount} items`}
                  >
                     <CartIcon />
                  </Badge>
               }
            >
               <Typography
                  variant="button"
                  noWrap
                  sx={{
                     display: { xs: "none", lg: "block" },
                  }}
               >
                  Cart
               </Typography>
            </Button>
         </Tooltip>

         {/* User Profile / Login - Show on desktop always, on mobile only when cart is empty */}
         {isAuthenticated ? (
            <>
               <Tooltip title="User Profile">
                  <Button
                     variant="navAction"
                     onClick={handleProfileOpen}
                     disableRipple
                     sx={{

                        display: {
                           xs: cartCount === 0 ? "flex" : "none",
                           md: "flex",
                        },
                     }}
                     aria-label="user profile menu"
                     startIcon={
                        <Avatar
                           sx={{
                              width: theme.typography.h4.fontSize,
                              height: theme.typography.h4.fontSize,
                              bgcolor: theme.palette.productCards.material.button,
                           }}
                        >
                           {user?.first_name ? (
                              <Typography
                                 variant="body1"
                                 noWrap
                                 color={theme.palette.navigation.text.inverse}
                              >
                                 {user?.email?.charAt(0).toUpperCase() || "U"}
                              </Typography>
                           ) : (
                              <ProfileIcon />
                           )}
                        </Avatar>
                     }
                  >
                     <Typography
                        variant="button"
                        noWrap
                        sx={{
                           display: { xs: "none", lg: "block" },
                           color: theme.palette.navigation.text.inverse,
                        }}
                     >
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
                  }}
               >
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
                     }}
                  >
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
            <Tooltip title="Login">
               <Button
                  onClick={onOpenAuth}
                  variant="navAction"
                  size="medium"
                  disableRipple
                  sx={{
                     display: {
                        xs: cartCount === 0 ? "flex" : "none",
                        md: "flex",
                     },
                  }}
                  startIcon={
                     <LoginIcon />
                  }
               >
                  <Typography
                     variant="button"
                     noWrap
                     sx={{
                        display: { xs: "none", lg: "block" },
                     }}
                  >
                     Login
                  </Typography>
               </Button>
            </Tooltip>
         )}
      </Box>
   );
};

export default MainNavActions;
