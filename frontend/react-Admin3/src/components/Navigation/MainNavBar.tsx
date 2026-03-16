import React from 'react';
import {
   AppBar,
   Toolbar,
   Container,
   IconButton,
   Box,
   useTheme,
} from '@mui/material';
import SearchModal from './SearchModal.tsx';
import MobileNavigation from './MobileNavigation.tsx';
import AdminMobileNavigation from './AdminMobileNavigation.tsx';
import TopNavBar from './TopNavBar.tsx';
import NavbarBrand from './NavbarBrand.tsx';
import NavigationMenu from './NavigationMenu.tsx';
import AdminNavigationMenu from './AdminNavigationMenu.tsx';
import MainNavActions, { AdminNavActions } from './MainNavActions.tsx';
import AuthModal from './AuthModal.tsx';
import CartPanel from '../Ordering/CartPanel.tsx';
import useMainNavBarVM from './useMainNavBarVM.ts';

const MainNavBar: React.FC = () => {
   const vm = useMainNavBarVM();
   const theme = useTheme() as any;

   return (
      <div className="sticky-top">
         {/* TopNavBar hidden on mobile (sm and smaller), hidden entirely in internal mode */}
         {!vm.isInternal && (
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
               <TopNavBar onOpenSearch={vm.handleOpenSearchModal} />
            </Box>
         )}
         <AppBar
            position="sticky"
            component="nav"
            aria-label="Main navigation"
            elevation={5}
            sx={{
               alignContent: 'center',
            }}
            className="navbar navbar-expand-md navbar-main align-content-center justify-content-between"
         >
            <Toolbar disableGutters sx={{ width: '100%' }}>
               <Container
                  maxWidth={false}
                  disableGutters
                  sx={{
                     display: 'flex',
                     justifyContent: 'space-between',
                     px: '0 !Important',
                  }}
               >
                  {/* Left Box - Action icons (mobile for public, all screens for internal) */}
                  <Box
                     sx={{
                        display: {
                           xs: 'flex',
                           md: vm.isInternal ? 'flex' : 'none',
                        },
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        order: { xs: 1, lg: 3 },
                     }}
                  >
                     {vm.isInternal ? (
                        <AdminNavActions
                           onOpenAuth={vm.handleOpenAuthModal}
                           onOpenSearch={vm.handleOpenSearchModal}
                        />
                     ) : (
                        <MainNavActions
                           onOpenAuth={vm.handleOpenAuthModal}
                           onOpenCart={vm.handleOpenCartPanel}
                           onToggleMobileMenu={vm.toggleExpanded}
                           isMobile={false}
                        />
                     )}
                  </Box>

                  {/* Center Box - Brand/Logo (centered on mobile, left on desktop) */}
                  <Box
                     sx={{
                        display: 'flex',
                        justifyContent: { xs: 'center', md: 'flex-start' },
                        alignItems: 'center',
                        order: { xs: 2, md: 1 },
                     }}
                  >
                     <NavbarBrand />
                  </Box>

                  {/* Center Section - Navigation Menu (Desktop) */}
                  <Box
                     id="navbar-menu"
                     sx={{
                        display: { xs: 'none', md: 'flex' },
                        justifyContent: { md: 'flex-start', lg: 'center' },
                        order: { xs: 3, md: 2 },
                        flexDirection: { xs: 'column', md: 'row' },
                        width: 'auto',
                     }}
                  >
                     {/* Desktop Navigation - Hidden on mobile */}
                     <Container
                        disableGutters
                        sx={{
                           display: { xs: 'none', md: 'flex' },
                           width: 'auto',
                        }}
                     >
                        {vm.isInternal ? (
                           <AdminNavigationMenu
                              onCollapseNavbar={() => vm.setExpanded(false)}
                           />
                        ) : (
                           <NavigationMenu
                              subjects={vm.subjects}
                              navbarProductGroups={vm.navbarProductGroups}
                              distanceLearningData={vm.distanceLearningData}
                              tutorialData={vm.tutorialData}
                              loadingProductGroups={vm.loadingNavigation}
                              loadingDistanceLearning={vm.loadingNavigation}
                              loadingTutorial={vm.loadingNavigation}
                              handleSubjectClick={vm.handleSubjectClick}
                              handleProductClick={vm.handleProductClick}
                              handleProductGroupClick={vm.handleProductGroupClick}
                              handleSpecificProductClick={vm.handleSpecificProductClick}
                              handleProductVariationClick={vm.handleProductVariationClick}
                              handleMarkingVouchersClick={vm.handleMarkingVouchersClick}
                              onCollapseNavbar={() => vm.setExpanded(false)}
                           />
                        )}
                     </Container>

                     {/* Mobile Navigation - Visible only on mobile (below md breakpoint) */}
                     <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                        {vm.isInternal ? (
                           <AdminMobileNavigation
                              open={vm.expanded}
                              onClose={() => vm.setExpanded(false)}
                              onOpenSearch={vm.handleOpenSearchModal}
                           />
                        ) : (
                           <MobileNavigation
                              open={vm.expanded}
                              onClose={() => vm.setExpanded(false)}
                              subjects={vm.subjects}
                              navbarProductGroups={vm.navbarProductGroups}
                              distanceLearningData={vm.distanceLearningData}
                              tutorialData={vm.tutorialData}
                              loadingProductGroups={vm.loadingNavigation}
                              loadingDistanceLearning={vm.loadingNavigation}
                              loadingTutorial={vm.loadingNavigation}
                              handleSubjectClick={vm.handleSubjectClick}
                              handleProductClick={vm.handleProductClick}
                              handleProductGroupClick={vm.handleProductGroupClick}
                              handleSpecificProductClick={vm.handleSpecificProductClick}
                              handleProductVariationClick={vm.handleProductVariationClick}
                              handleMarkingVouchersClick={vm.handleMarkingVouchersClick}
                              onOpenSearch={vm.handleOpenSearchModal}
                              onOpenCart={vm.handleOpenCartPanel}
                              onOpenAuth={vm.handleOpenAuthModal}
                           />
                        )}
                     </Box>
                  </Box>

                  {/* Right Box - Actions (desktop only) and Hamburger */}
                  <Box
                     sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 1,
                        order: 3,
                     }}
                  >
                     {/* Desktop actions - hidden on mobile (not shown for internal - uses left box) */}
                     <Box
                        sx={{
                           display: {
                              xs: 'none',
                              md: vm.isInternal ? 'none' : 'flex',
                           },
                        }}
                     >
                        {vm.isInternal ? (
                           <AdminNavActions
                              onOpenAuth={vm.handleOpenAuthModal}
                              onOpenSearch={vm.handleOpenSearchModal}
                           />
                        ) : (
                           <MainNavActions
                              onOpenAuth={vm.handleOpenAuthModal}
                              onOpenCart={vm.handleOpenCartPanel}
                              onToggleMobileMenu={vm.toggleExpanded}
                              isMobile={false}
                           />
                        )}
                     </Box>

                     {/* Hamburger menu toggle - visible on mobile (below md breakpoint) */}
                     <IconButton
                        className={`menu-button justify-content-between ${
                           vm.expanded ? 'active' : ''
                        }`}
                        aria-controls="navbar-menu"
                        aria-label="Toggle navigation"
                        aria-expanded={vm.expanded}
                        id="navbar-menu-toggle"
                        onClick={vm.toggleExpanded}
                        variant={'hamburgerToggle' as any}
                        sx={{
                           display: { xs: 'flex', md: 'none' },
                        }}
                     >
                        <Box
                           sx={{
                              display: 'flex',
                              flexDirection: 'column',
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
         <SearchModal open={vm.showSearchModal} onClose={vm.handleCloseSearchModal} />

         {/* Auth Modal */}
         <AuthModal open={vm.showAuthModal} onClose={vm.handleCloseAuthModal} />

         {/* Cart Panel */}
         <CartPanel show={vm.showCartPanel} handleClose={vm.handleCloseCartPanel} />
      </div>
   );
};

export default MainNavBar;
