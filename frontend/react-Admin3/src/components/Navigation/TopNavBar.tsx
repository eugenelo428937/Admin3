import React from 'react';
import {
   Home as HomeIcon,
   HelpOutline as HelpIcon,
   Search as SearchIcon,
   Download as DownloadIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import AuthModal from './AuthModal.tsx';
import CartPanel from '../Ordering/CartPanel.tsx';
import SearchModal from './SearchModal.tsx';
import { Box, Button, Container, Tooltip, Typography, useTheme, useMediaQuery } from '@mui/material';
import useTopNavBarVM from './useTopNavBarVM.ts';
import type { TopNavBarProps } from '../../types/navigation';

const TopNavBar: React.FC<TopNavBarProps> = ({ onOpenSearch }) => {
   const vm = useTopNavBarVM();
   const theme = useTheme() as any;
   const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

   return (
      <>
         <Container
            maxWidth={false}
            sx={{
               display: 'flex',
               justifyContent: 'space-between',
               alignContent: 'end',
               bgcolor: 'navigation.background.topNavBar.primary',
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
                     variant={'topNavAction' as any}
                     component={Link as any}
                     to="/Home"
                     target="_blank"
                     startIcon={isDesktop ? <HomeIcon /> : null}
                     endIcon={!isDesktop ? <HomeIcon /> : null}
                     sx={{
                        justifyContent: 'center',
                     }}>
                     <Typography variant={'top_nav_link' as any}>
                        ActEd
                     </Typography>
                  </Button>
               </Tooltip>
               <Tooltip title="Style Guide">
                  <Button
                     variant={'topNavAction' as any}
                     component={Link as any}
                     to="/styleguide"
                     target="_blank"
                     startIcon={isDesktop ? <HelpIcon /> : null}
                     endIcon={!isDesktop ? <HelpIcon /> : null}
                     sx={{
                        justifyContent: 'center',
                     }}>
                     <Typography variant={'top_nav_link' as any}>
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
                     variant={'topNavAction' as any}
                     component="a"
                     href="/brochure"
                     target="_blank"
                     startIcon={isDesktop ? <DownloadIcon /> : null}
                     endIcon={!isDesktop ? <DownloadIcon /> : null}
                     sx={{
                        justifyContent: 'center',
                     }}
                  >
                     <Typography variant={'top_nav_link' as any}>
                        Brochure
                     </Typography>
                  </Button>
               </Tooltip>

               {/* Search Button */}
               <Tooltip title="Search Products (Ctrl+K)">
                  <Button
                     variant={'topNavAction' as any}
                     onClick={onOpenSearch}
                     sx={{
                        justifyContent: 'center',
                     }}
                     aria-label="search products"
                     startIcon={isDesktop ? <SearchIcon /> : null}
                     endIcon={!isDesktop ? <SearchIcon /> : null}
                  >
                     <Typography variant={'top_nav_link' as any}>
                        Search
                     </Typography>
                  </Button>
               </Tooltip>
            </Box>
         </Container>

         {/* Search Modal */}
         <SearchModal open={vm.showSearchModal} onClose={vm.handleCloseSearchModal} />

         {/* Auth Modal */}
         <AuthModal open={vm.showAuthModal} onClose={vm.handleCloseAuthModal} />

         {/* Cart Panel */}
         <CartPanel
            show={vm.showCartPanel}
            handleClose={() => vm.setShowCartPanel(false)}
         />
      </>
   );
};

export default TopNavBar;
