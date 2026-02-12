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
// import { useAuth } from "../../hooks/useAuth"; // Now used by child components
import productService from "../../services/productService";
import SearchModal from "./SearchModal";
import MobileNavigation from "./MobileNavigation";
import TopNavBar from "./TopNavBar";
import NavbarBrand from "./NavbarBrand";
import NavigationMenu from "./NavigationMenu";
import MainNavActions from "./MainNavActions";
import AuthModal from "./AuthModal";
import CartPanel from "../Ordering/CartPanel";
// Redux imports for navigation integration
import {
   navSelectSubject,
   navViewAllProducts,
   navSelectProductGroup,
   navSelectProduct,
   resetFilters,
} from "../../store/slices/filtersSlice";

const MainNavBar = () => {
   // Auth hook is no longer needed in MainNavBar - used by child components
   const navigate = useNavigate();
   const dispatch = useDispatch();
   const theme = useTheme();
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

   // Fetch all navigation data in a single API call
   useEffect(() => {
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
   }, []);

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
         {/* TopNavBar hidden on mobile (sm and smaller) */}
         <div className="d-none d-sm-block">
            <TopNavBar onOpenSearch={handleOpenSearchModal}/>
         </div>
         <AppBar
            position="sticky"
            component="nav"
            aria-label="Main navigation"
            elevation={5}
            sx={{              
               alignContent:"center",
            }}
            className="navbar navbar-expand-md navbar-main align-content-center justify-content-between"
         >
            <Toolbar disableGutters sx={{ width: "100%" }}>
               <Container                  
                  maxWidth="xl"
                  disableGutters
                  sx={{
                     display: "flex",
                     justifyContent: "space-between",
                     px:"0 !Important",
                  }}
               >
                  {/* Left Box - Cart/Login icons (mobile only, left-aligned) */}
                  <div className="d-flex justify-content-start align-items-center order-1 order-lg-3 d-md-none">
                     <MainNavActions
                        onOpenAuth={handleOpenAuthModal}
                        onOpenCart={handleOpenCartPanel}
                        onToggleMobileMenu={() => setExpanded(!expanded)}
                        isMobile={false}
                     />
                  </div>

                  {/* Center Box - Brand/Logo (centered on mobile, left on desktop) */}
                  <div className="d-flex justify-content-center justify-content-md-start align-items-center order-2 order-md-1">
                     <NavbarBrand />
                  </div>

                  {/* Center Section - Navigation Menu (Desktop) */}
                  <Box
                     id="navbar-menu"
                     className="justify-content-lg-center justify-content-md-start order-3 order-md-2 d-none d-md-flex"
                     sx={{                        
                        flexDirection: { xs: "column", md: "row" },
                        width:"auto",
                     }}
                     
                  >
                     {/* Desktop Navigation - Hidden on mobile */}
                     <Container disableGutters sx={{ display: { xs: "none", md: "flex" }, width:"auto" }}>
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
                     </Container>

                     {/* Mobile Navigation - Visible only on mobile (below md breakpoint) */}
                     <Box sx={{ display: { xs: "block", md: "none" } }}>
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
                     </Box>
                  </Box>

                  {/* Right Box - Cart/Login (desktop only) and Hamburger */}
                  <div className="d-flex justify-content-end align-items-center gap-2 order-3 order-md-3">
                     {/* Desktop actions - hidden on mobile */}
                     <div className="d-none d-md-flex">
                        <MainNavActions
                           onOpenAuth={handleOpenAuthModal}
                           onOpenCart={handleOpenCartPanel}
                           onToggleMobileMenu={() => setExpanded(!expanded)}
                           isMobile={false}
                        />
                     </div>

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
                        <Box sx={{ display: "flex", flexDirection: "column",height: theme.spacingTokens.xl[1] }}>
                           <span className="toggler-icon top-bar"></span>
                           <span className="toggler-icon middle-bar"></span>
                           <span className="toggler-icon bottom-bar"></span>
                        </Box>
                     </IconButton>
                  </div>
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
