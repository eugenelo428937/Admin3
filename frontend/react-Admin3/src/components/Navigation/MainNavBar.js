// src/components/MainNavBar.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
   AppBar,
   Toolbar,
   Container,
   IconButton,
   Box,
   useTheme,
} from "@mui/material";
import {
   Search as SearchIcon,
   MenuBook as KnowledgeBaseIcon,
} from "@mui/icons-material";
// import { useAuth } from "../../hooks/useAuth.js"; // Now used by child components
import { useConfig } from "../../contexts/ConfigContext.js";
import productService from "../../services/productService.js";
import SearchModal from "./SearchModal.js";
import MobileNavigation from "./MobileNavigation.js";
import AdminMobileNavigation from "./AdminMobileNavigation.js";
import TopNavBar from "./TopNavBar.js";
import NavbarBrand from "./NavbarBrand.js";
import NavigationMenu from "./NavigationMenu.js";
import AdminNavigationMenu from "./AdminNavigationMenu.js";
import MainNavActions, { AdminNavActions } from "./MainNavActions.js";
import AuthModal from "./AuthModal.js";
import CartPanel from "../Ordering/CartPanel.js";
// Redux imports for navigation integration
import {
   navSelectSubject,
   navViewAllProducts,
   navSelectProductGroup,
   navSelectProduct,
   resetFilters,
} from "../../store/slices/filtersSlice.js";

const MainNavBar = () => {
   // Auth hook is no longer needed in MainNavBar - used by child components
   const navigate = useNavigate();
   const dispatch = useDispatch();
   const theme = useTheme();
   const { isInternal, configLoaded } = useConfig();
   // State for navbar expansion
   const [expanded, setExpanded] = useState(false);

   // Combined navigation data state (single API call)
   const [subjects, setSubjects] = useState([]);
   const [navbarProductGroups, setNavbarProductGroups] = useState([]);
   const [distanceLearningData, setDistanceLearningData] = useState([]);
   const [tutorialData, setTutorialData] = useState(null);
   const [loadingNavigation, setLoadingNavigation] = useState(true);

   // State for search modal
   const [showSearchModal, setShowSearchModal] = useState(false);

   // State for auth modal
   const [showAuthModal, setShowAuthModal] = useState(false);

   // State for cart panel
   const [showCartPanel, setShowCartPanel] = useState(false);

   // Add keyboard shortcut for search modal (Ctrl+K / Cmd+K)
   useEffect(() => {
      const handleKeyDown = (event) => {
         // Ctrl+K or Cmd+K to open search modal
         if ((event.ctrlKey || event.metaKey) && event.key === "k") {
            event.preventDefault();
            if (!showSearchModal) {
               setShowSearchModal(true);
            }
         }
      };

      document.addEventListener("keydown", handleKeyDown);

      return () => {
         document.removeEventListener("keydown", handleKeyDown);
      };
   }, [showSearchModal]);

   // Fetch all navigation data in a single API call (skip in internal mode)
   useEffect(() => {
      if (!configLoaded) return;

      if (isInternal) {
         setLoadingNavigation(false);
         return;
      }
      const fetchNavigationData = async () => {
         try {
            const data = await productService.getNavigationData();
            setSubjects(data.subjects);
            setNavbarProductGroups(data.navbarProductGroups);
            setDistanceLearningData(data.distanceLearningData);
            setTutorialData(data.tutorialData);
         } catch (err) {
            console.error("Error fetching navigation data:", err);
            setSubjects([]);
            setNavbarProductGroups([]);
            setDistanceLearningData([]);
            setTutorialData(null);
         } finally {
            setLoadingNavigation(false);
         }
      };
      fetchNavigationData();
   }, [configLoaded, isInternal]);

   // Handle navigating to product list with subject filter
   const handleSubjectClick = (subjectCode) => {
      // Dispatch Redux action for navigation behavior (clear existing subjects, then apply new subject)
      dispatch(navSelectSubject(subjectCode));
      // Navigate to products page (URL sync middleware will update URL automatically)
      navigate("/products");
      setExpanded(false); // Close mobile menu
   };

   // Handle navigating to product list (view all products)
   const handleProductClick = () => {
      // Dispatch Redux action for "View All Products" behavior (clear all filters except subjects)
      dispatch(navViewAllProducts());
      // Navigate to products page
      navigate(`/products`);
      setExpanded(false); // Close mobile menu
   };

   // Handle navigating to product list with product group filter
   const handleProductGroupClick = (groupName) => {
      // Dispatch Redux action for product group selection (clear all except subjects, then apply product type filter)
      dispatch(navSelectProductGroup(groupName));
      // Navigate to products page (URL sync middleware will update URL automatically)
      navigate("/products");
      setExpanded(false); // Close mobile menu
   };

   // Handle navigating to product list with specific product filter
   const handleSpecificProductClick = (productId) => {
      // Dispatch Redux action for product selection (clear all except subjects, then apply product filter)
      dispatch(navSelectProduct(productId));
      // Navigate to products page (URL sync middleware will update URL automatically)
      navigate("/products");
      setExpanded(false); // Close mobile menu
   };

   // Handle navigating to product variation
   const handleProductVariationClick = (variationId) => {
      // Note: Variation filtering not yet integrated with Redux filters
      // This handler may need Redux action in future story
      navigate("/products");
      setExpanded(false); // Close mobile menu
   };

   // Handle navigating to marking vouchers
   const handleMarkingVouchersClick = (e) => {
      e.preventDefault();
      // Dispatch Redux action for marking vouchers (group 8)
      dispatch(navSelectProductGroup("8"));
      // Navigate to products page (URL sync middleware will update URL automatically)
      navigate("/products");
      setExpanded(false); // Close mobile menu
   };

   // Handle opening the search modal
   const handleOpenSearchModal = () => {
      setShowSearchModal(true);
   };

   // Handle closing the search modal
   const handleCloseSearchModal = () => {
      setShowSearchModal(false);
   };

   // Handle opening the auth modal
   const handleOpenAuthModal = () => {
      setShowAuthModal(true);
   };

   // Handle closing the auth modal
   const handleCloseAuthModal = () => {
      setShowAuthModal(false);
   };

   // Handle opening the cart panel
   const handleOpenCartPanel = () => {
      setShowCartPanel(true);
   };

   // Handle closing the cart panel
   const handleCloseCartPanel = () => {
      setShowCartPanel(false);
   };

   return (
      <div className="sticky-top">
         {/* TopNavBar hidden on mobile (sm and smaller), hidden entirely in internal mode */}
         {!isInternal && (
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
               <TopNavBar onOpenSearch={handleOpenSearchModal} />
            </Box>
         )}
         <AppBar
            position="sticky"
            component="nav"
            aria-label="Main navigation"
            elevation={5}
            sx={{
               alignContent: "center",
            }}
            className="navbar navbar-expand-md navbar-main align-content-center justify-content-between"
         >
            <Toolbar disableGutters sx={{ width: "100%" }}>
               <Container
                  maxWidth={false}
                  disableGutters
                  sx={{
                     display: "flex",
                     justifyContent: "space-between",
                     px: "0 !Important",
                  }}
               >
                  {/* Left Box - Action icons (mobile for public, all screens for internal) */}
                  <Box
                     sx={{
                        display: {
                           xs: "flex",
                           md: isInternal ? "flex" : "none",
                        },
                        justifyContent: "flex-start",
                        alignItems: "center",
                        order: { xs: 1, lg: 3 },
                     }}
                  >
                     {isInternal ? (
                        <AdminNavActions
                           onOpenAuth={handleOpenAuthModal}
                           onOpenSearch={handleOpenSearchModal}
                        />
                     ) : (
                        <MainNavActions
                           onOpenAuth={handleOpenAuthModal}
                           onOpenCart={handleOpenCartPanel}
                           onToggleMobileMenu={() => setExpanded(!expanded)}
                           isMobile={false}
                        />
                     )}
                  </Box>

                  {/* Center Box - Brand/Logo (centered on mobile, left on desktop) */}
                  <Box
                     sx={{
                        display: "flex",
                        justifyContent: { xs: "center", md: "flex-start" },
                        alignItems: "center",
                        order: { xs: 2, md: 1 },
                     }}
                  >
                     <NavbarBrand />
                  </Box>

                  {/* Center Section - Navigation Menu (Desktop) */}
                  <Box
                     id="navbar-menu"
                     sx={{
                        display: { xs: "none", md: "flex" },
                        justifyContent: { md: "flex-start", lg: "center" },
                        order: { xs: 3, md: 2 },
                        flexDirection: { xs: "column", md: "row" },
                        width: "auto",
                     }}
                  >
                     {/* Desktop Navigation - Hidden on mobile */}
                     <Container
                        disableGutters
                        sx={{
                           display: { xs: "none", md: "flex" },
                           width: "auto",
                        }}
                     >
                        {isInternal ? (
                           <AdminNavigationMenu
                              onCollapseNavbar={() => setExpanded(false)}
                           />
                        ) : (
                           <NavigationMenu
                              subjects={subjects}
                              navbarProductGroups={navbarProductGroups}
                              distanceLearningData={distanceLearningData}
                              tutorialData={tutorialData}
                              loadingProductGroups={loadingNavigation}
                              loadingDistanceLearning={loadingNavigation}
                              loadingTutorial={loadingNavigation}
                              handleSubjectClick={handleSubjectClick}
                              handleProductClick={handleProductClick}
                              handleProductGroupClick={handleProductGroupClick}
                              handleSpecificProductClick={
                                 handleSpecificProductClick
                              }
                              handleProductVariationClick={
                                 handleProductVariationClick
                              }
                              handleMarkingVouchersClick={
                                 handleMarkingVouchersClick
                              }
                              onCollapseNavbar={() => setExpanded(false)}
                           />
                        )}
                     </Container>

                     {/* Mobile Navigation - Visible only on mobile (below md breakpoint) */}
                     <Box sx={{ display: { xs: "block", md: "none" } }}>
                        {isInternal ? (
                           <AdminMobileNavigation
                              open={expanded}
                              onClose={() => setExpanded(false)}
                              onOpenSearch={handleOpenSearchModal}
                           />
                        ) : (
                           <MobileNavigation
                              open={expanded}
                              onClose={() => setExpanded(false)}
                              subjects={subjects}
                              navbarProductGroups={navbarProductGroups}
                              distanceLearningData={distanceLearningData}
                              tutorialData={tutorialData}
                              loadingProductGroups={loadingNavigation}
                              loadingDistanceLearning={loadingNavigation}
                              loadingTutorial={loadingNavigation}
                              handleSubjectClick={handleSubjectClick}
                              handleProductClick={handleProductClick}
                              handleProductGroupClick={handleProductGroupClick}
                              handleSpecificProductClick={
                                 handleSpecificProductClick
                              }
                              handleProductVariationClick={
                                 handleProductVariationClick
                              }
                              handleMarkingVouchersClick={
                                 handleMarkingVouchersClick
                              }
                              onOpenSearch={handleOpenSearchModal}
                              onOpenCart={handleOpenCartPanel}
                              onOpenAuth={handleOpenAuthModal}
                           />
                        )}
                     </Box>
                  </Box>

                  {/* Right Box - Actions (desktop only) and Hamburger */}
                  <Box
                     sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: 1,
                        order: 3,
                     }}
                  >
                     {/* Desktop actions - hidden on mobile (not shown for internal - uses left box) */}
                     <Box
                        sx={{
                           display: {
                              xs: "none",
                              md: isInternal ? "none" : "flex",
                           },
                        }}
                     >
                        {isInternal ? (
                           <AdminNavActions
                              onOpenAuth={handleOpenAuthModal}
                              onOpenSearch={handleOpenSearchModal}
                           />
                        ) : (
                           <MainNavActions
                              onOpenAuth={handleOpenAuthModal}
                              onOpenCart={handleOpenCartPanel}
                              onToggleMobileMenu={() => setExpanded(!expanded)}
                              isMobile={false}
                           />
                        )}
                     </Box>

                     {/* Hamburger menu toggle - visible on mobile (below md breakpoint) */}
                     <IconButton
                        className={`menu-button justify-content-between ${
                           expanded ? "active" : ""
                        }`}
                        aria-controls="navbar-menu"
                        aria-label="Toggle navigation"
                        aria-expanded={expanded}
                        id="navbar-menu-toggle"
                        onClick={() => setExpanded(!expanded)}
                        variant="hamburgerToggle"
                        sx={{
                           display: { xs: "flex", md: "none" },
                        }}
                     >
                        <Box
                           sx={{
                              display: "flex",
                              flexDirection: "column",
                              height: theme.spacingTokens.xl[1],
                           }}
                        >
                           <span className="toggler-icon top-bar"></span>
                           <span className="toggler-icon middle-bar"></span>
                           <span className="toggler-icon bottom-bar"></span>
                        </Box>
                     </IconButton>
                  </Box>
               </Container>
            </Toolbar>
         </AppBar>

         {/* Search Modal */}
         <SearchModal open={showSearchModal} onClose={handleCloseSearchModal} />

         {/* Auth Modal */}
         <AuthModal open={showAuthModal} onClose={handleCloseAuthModal} />

         {/* Cart Panel */}
         <CartPanel show={showCartPanel} handleClose={handleCloseCartPanel} />
      </div>
   );
};

export default MainNavBar;
