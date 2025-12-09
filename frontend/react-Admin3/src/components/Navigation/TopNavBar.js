// src/components/TopNavBar.js
import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button, NavDropdown } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
   Home as HomeIcon,
   HelpOutline as HelpIcon,
   ShoppingCart as CartIcon,
   AccountCircle as PersonIcon,
} from "@mui/icons-material";
import { useCart } from "../../contexts/CartContext";
import AuthModal from "./AuthModal";
import CartPanel from "../Ordering/CartPanel";
import TopNavActions from "./TopNavActions";
import SearchModal from "./SearchModal";
import { Box, Typography, useTheme } from "@mui/material";

const TopNavBar = () => {
   // State for authentication status
   const { isAuthenticated, user, logout } = useAuth();
   const theme = useTheme();
   const [showAuthModal, setShowAuthModal] = useState(false);
   const navigate = useNavigate();
   const location = useLocation();
   const [showCartPanel, setShowCartPanel] = useState(false);
   const [showSearchModal, setShowSearchModal] = useState(false);

   // Listen for navigation state to auto-trigger auth modal
   useEffect(() => {
      if (location.state?.showLogin && !isAuthenticated) {
         setShowAuthModal(true);
         // Clear the state to prevent repeated triggering
         navigate(location.pathname, { replace: true, state: null });
      }
   }, [location, isAuthenticated, navigate]);

   const { cartCount, refreshCart } = useCart();

   // Close cart panel and refresh cart when user authenticates
   useEffect(() => {
      if (isAuthenticated) {
         setShowCartPanel(false);
         // Refresh cart to recalculate VAT with user profile
         refreshCart().catch((err) => {
            console.error("Failed to refresh cart after login:", err);
         });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isAuthenticated]); // Only run when isAuthenticated changes, not when refreshCart changes

   // Listen for custom event to show auth modal (from CartPanel checkout)
   useEffect(() => {
      const handleShowAuthModal = () => {
         if (!isAuthenticated) {
            setShowAuthModal(true);
         }
      };

      window.addEventListener("show-login-modal", handleShowAuthModal);

      return () => {
         window.removeEventListener("show-login-modal", handleShowAuthModal);
      };
   }, [isAuthenticated]);

   // Handle closing the auth modal
   const handleCloseAuthModal = () => {
      setShowAuthModal(false);
   };

   // Handle logout
   const handleLogout = async (e) => {
      e.preventDefault();
      try {
         await logout();
      } catch (error) {
         console.error("Logout error:", error);
      }
   };

   // Handle user icon click
   const handleUserIconClick = () => {
      if (!isAuthenticated) {
         setShowAuthModal(true);
      }
      // If authenticated, the dropdown will handle showing logout option
   };

   // Handle opening the search modal
   const handleOpenSearchModal = () => {
      setShowSearchModal(true);
   };

   // Handle closing the search modal
   const handleCloseSearchModal = () => {
      setShowSearchModal(false);
   };

   return (
      <>
         <Box
            className="d-flex flex-row navbar-top justify-content-between align-content-end"
            sx={{
               py: {
                  xs: theme.liftkit.spacing.xs3,
                  lg: theme.liftkit.spacing.xs3,
               },
            }}
         >
            {/* Left Group - ActEd Home and Help */}
            <div className="d-flex flex-row flex-wrap px-3 px-xl-5 px-lg-4 px-md-3 px-sm-2 px-xs-1">
               <Box
                  className="d-flex flex-row align-content-center flex-wrap"
                  sx={{
                     minWidth: {
                        xs: theme.liftkit.spacing.xl,
                        lg: 64,
                     },
                  }}
               >
                  <Link to="/Home">
                     <Box className="p-0 mx-0 mx-xl-1 flex-wrap align-items-center d-flex flex-row">
                        <HomeIcon className="bi d-flex flex-row align-items-center" />
                        <span className="d-none d-md-block mx-0 mx-xl-1 body">
                           <Typography
                              varitant="topnavlink"
                              color={theme.palette.offwhite["000"]}
                              sx={{
                                 display: { xs: "none", lg: "flex" },
                              }}
                           >
                              ActEd Home
                           </Typography>
                        </span>
                     </Box>
                  </Link>
               </Box>
               <Box
                  className="d-flex flex-row align-content-center flex-wrap"
                  sx={{
                     minWidth: {
                        xs: theme.liftkit.spacing.xl,
                        lg: 64,
                     },
                  }}
               >
                  <Link to="/styleguide">
                     <Box
                        className="p-0 mx-0 mx-xl-1 flex-wrap align-items-center d-flex flex-row"
                        sx={{
                           minWidth: {
                              xs: theme.liftkit.spacing.xl,
                              lg: 64,
                           },
                        }}
                     >
                        <HelpIcon className="bi d-flex flex-row align-items-center"></HelpIcon>
                        <span className="d-none d-md-block mx-0 mx-xl-1 body">
                           <Typography
                              varitant="topnavlink"
                              color={theme.palette.offwhite["000"]}
                              sx={{
                                 display: { xs: "none", lg: "flex" },
                              }}
                           >
                              Help
                           </Typography>
                        </span>
                     </Box>
                  </Link>
               </Box>
            </div>

            {/* Right Group - TopNavActions (Brochure and Search) */}
            <div className="d-flex flex-row px-3 px-xl-5 px-lg-4 px-md-3 px-sm-2 px-xs-1">
               <TopNavActions onOpenSearch={handleOpenSearchModal} />
            </div>
         </Box>

         {/* Search Modal */}
         <SearchModal open={showSearchModal} onClose={handleCloseSearchModal} />

         {/* Auth Modal */}
         <AuthModal open={showAuthModal} onClose={handleCloseAuthModal} />

         {/* Cart Panel */}
         <CartPanel
            show={showCartPanel}
            handleClose={() => setShowCartPanel(false)}
         />
      </>
   );
};

export default TopNavBar;
