// src/components/TopNavBar.js
import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link, useNavigate, useLocation } from "react-router-dom";
import
{
   Home as HomeIcon,
   HelpOutline as HelpIcon,
   Search as SearchIcon,
   Download as DownloadIcon,
} from "@mui/icons-material";
import { useCart } from "../../contexts/CartContext";
import AuthModal from "./AuthModal";
import CartPanel from "../Ordering/CartPanel";
import SearchModal from "./SearchModal";
import { Box, Button, Container, Tooltip, Typography, useTheme, useMediaQuery } from "@mui/material";

const TopNavBar = ({ onOpenSearch }) =>
{
   // State for authentication status
   const { isAuthenticated, user, logout } = useAuth();
   const theme = useTheme();
   const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
   const [showAuthModal, setShowAuthModal] = useState(false);
   const navigate = useNavigate();
   const location = useLocation();
   const [showCartPanel, setShowCartPanel] = useState(false);
   const [showSearchModal, setShowSearchModal] = useState(false);

   // Listen for navigation state to auto-trigger auth modal
   useEffect(() =>
   {
      if (location.state?.showLogin && !isAuthenticated)
      {
         setShowAuthModal(true);
         // Clear the state to prevent repeated triggering
         navigate(location.pathname, { replace: true, state: null });
      }
   }, [location, isAuthenticated, navigate]);

   const { cartCount, refreshCart } = useCart();

   // Close cart panel and refresh cart when user authenticates
   useEffect(() =>
   {
      if (isAuthenticated)
      {
         setShowCartPanel(false);
         // Refresh cart to recalculate VAT with user profile
         refreshCart().catch((err) =>
         {
            console.error("Failed to refresh cart after login:", err);
         });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isAuthenticated]); // Only run when isAuthenticated changes, not when refreshCart changes

   // Listen for custom event to show auth modal (from CartPanel checkout)
   useEffect(() =>
   {
      const handleShowAuthModal = () =>
      {
         if (!isAuthenticated)
         {
            setShowAuthModal(true);
         }
      };

      window.addEventListener("show-login-modal", handleShowAuthModal);

      return () =>
      {
         window.removeEventListener("show-login-modal", handleShowAuthModal);
      };
   }, [isAuthenticated]);

   // Handle closing the auth modal
   const handleCloseAuthModal = () =>
   {
      setShowAuthModal(false);
   };

   // Handle logout
   const handleLogout = async (e) =>
   {
      e.preventDefault();
      try
      {
         await logout();
      } catch (error)
      {
         console.error("Logout error:", error);
      }
   };

   // Handle user icon click
   const handleUserIconClick = () =>
   {
      if (!isAuthenticated)
      {
         setShowAuthModal(true);
      }
      // If authenticated, the dropdown will handle showing logout option
   };

   // Handle opening the search modal
   const handleOpenSearchModal = () =>
   {
      setShowSearchModal(true);
   };

   // Handle closing the search modal
   const handleCloseSearchModal = () =>
   {
      setShowSearchModal(false);
   };

   return (
      <>
         <Container
         maxWidth={false}            
            sx={{
               display: 'flex',
               justifyContent: 'space-between',
               alignContent: 'end',
               bgcolor: 'navigation.background.topNavBar',
               px: {
                  sm: theme.spacingTokens.lg,
                  md: theme.spacingTokens.xl[1],
                  lg: theme.spacingTokens.xl[2],
                  xl: theme.spacingTokens.xl[3],
               },
               py: {
                  xs: theme.spacingTokens.xs[3],
                  lg: theme.spacingTokens.xs[3],
               },
            }}
         >
            {/* Left Group - ActEd Home and Help */}
            <Box sx={{
               display: 'flex',
               flexDirection: 'row',
               flexWrap: 'wrap',
               gap: theme.spacingTokens.md,
            }}>
               <Tooltip title="ActEd Homepage">
                  <Button
                     variant="topNavAction"
                     component={Link}
                     to="/Home"
                     target="_blank"
                     startIcon={isDesktop ? <HomeIcon /> : null}
                     endIcon={!isDesktop ? <HomeIcon /> : null}
                     sx={{                        
                        justifyContent: "center",
                     }}>
                     <Typography
                        variant="top_nav_link"
                     >
                        ActEd
                     </Typography>
                  </Button>
               </Tooltip>
               <Tooltip title="Style Guide">
                  <Button
                     variant="topNavAction"
                     component={Link}
                     to="/styleguide"
                     target="_blank"
                     startIcon={isDesktop ? <HelpIcon /> : null}
                     endIcon={!isDesktop ? <HelpIcon /> : null}
                     sx={{                       
                        justifyContent: "center",
                     }}>
                     <Typography
                        variant="top_nav_link"
                     >
                        Help
                     </Typography>
                  </Button>
               </Tooltip>
            </Box>

            {/* Right Group - TopNavActions (Brochure and Search) */}
            <Box sx={{
               display: 'flex',
               flexDirection: 'row',
               flexWrap: 'wrap',
               gap: theme.spacingTokens.md,
            }}>
               {/* Brochure Download - Desktop Only */}
               <Tooltip title="Download Brochure">
                  <Button
                     variant="topNavAction"
                     component="a"
                     href="/brochure"
                     target="_blank"
                     startIcon={isDesktop ? <DownloadIcon /> : null}
                     endIcon={!isDesktop ? <DownloadIcon /> : null}
                     sx={{                       
                        justifyContent: "center",
                     }}
                  >
                     <Typography
                        variant="top_nav_link"
                     >
                        Brochure
                     </Typography>
                  </Button>
               </Tooltip>

               {/* Search Button */}
               <Tooltip title="Search Products (Ctrl+K)">
                  <Button
                     variant="topNavAction"
                     onClick={onOpenSearch}
                     sx={{                        
                        justifyContent: "center",
                     }}
                     aria-label="search products"
                     startIcon={isDesktop ? <SearchIcon /> : null}
                     endIcon={!isDesktop ? <SearchIcon /> : null}
                  >
                     <Typography
                        variant="top_nav_link"
                     >
                        Search
                     </Typography>
                  </Button>
               </Tooltip>
            </Box>
            {/* <TopNavActions onOpenSearch={handleOpenSearchModal} /> */}

         </Container >

         {/* Search Modal */}
         < SearchModal open={showSearchModal} onClose={handleCloseSearchModal} />

         {/* Auth Modal */}
         < AuthModal open={showAuthModal} onClose={handleCloseAuthModal} />

         {/* Cart Panel */}
         < CartPanel
            show={showCartPanel}
            handleClose={() => setShowCartPanel(false)}
         />
      </>
   );
};

export default TopNavBar;
