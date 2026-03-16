import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.tsx';
import { useCart } from '../../contexts/CartContext.tsx';

export interface TopNavBarVM {
   // Auth
   isAuthenticated: boolean;
   user: any;

   // UI state
   showAuthModal: boolean;
   showCartPanel: boolean;
   showSearchModal: boolean;

   // Actions
   handleLogout: (e: React.MouseEvent) => Promise<void>;
   handleUserIconClick: () => void;
   handleCloseAuthModal: () => void;
   handleOpenSearchModal: () => void;
   handleCloseSearchModal: () => void;
   setShowCartPanel: (value: boolean) => void;
}

const useTopNavBarVM = (): TopNavBarVM => {
   const { isAuthenticated, user, logout } = useAuth();
   const navigate = useNavigate();
   const location = useLocation();
   const [showAuthModal, setShowAuthModal] = useState(false);
   const [showCartPanel, setShowCartPanel] = useState(false);
   const [showSearchModal, setShowSearchModal] = useState(false);
   const { refreshCart } = useCart();

   // Listen for navigation state to auto-trigger auth modal
   useEffect(() => {
      if (location.state?.showLogin && !isAuthenticated) {
         setShowAuthModal(true);
         navigate(location.pathname, { replace: true, state: null });
      }
   }, [location, isAuthenticated, navigate]);

   // Close cart panel and refresh cart when user authenticates
   useEffect(() => {
      if (isAuthenticated) {
         setShowCartPanel(false);
         refreshCart().catch((err: Error) => {
            console.error('Failed to refresh cart after login:', err);
         });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isAuthenticated]);

   // Show login modal after 401 redirect (auth token expired)
   useEffect(() => {
      if (sessionStorage.getItem('authExpired')) {
         sessionStorage.removeItem('authExpired');
         if (!isAuthenticated) {
            setShowAuthModal(true);
         }
      }
   }, []); // eslint-disable-line react-hooks/exhaustive-deps

   // Listen for custom event to show auth modal (from CartPanel checkout)
   useEffect(() => {
      const handleShowAuthModal = () => {
         if (!isAuthenticated) {
            setShowAuthModal(true);
         }
      };

      window.addEventListener('show-login-modal', handleShowAuthModal);
      return () => {
         window.removeEventListener('show-login-modal', handleShowAuthModal);
      };
   }, [isAuthenticated]);

   const handleCloseAuthModal = () => {
      setShowAuthModal(false);
   };

   const handleLogout = async (e: React.MouseEvent) => {
      e.preventDefault();
      try {
         await logout();
      } catch (error) {
         console.error('Logout error:', error);
      }
   };

   const handleUserIconClick = () => {
      if (!isAuthenticated) {
         setShowAuthModal(true);
      }
   };

   const handleOpenSearchModal = () => {
      setShowSearchModal(true);
   };

   const handleCloseSearchModal = () => {
      setShowSearchModal(false);
   };

   return {
      isAuthenticated,
      user,
      showAuthModal,
      showCartPanel,
      showSearchModal,
      handleLogout,
      handleUserIconClick,
      handleCloseAuthModal,
      handleOpenSearchModal,
      handleCloseSearchModal,
      setShowCartPanel,
   };
};

export default useTopNavBarVM;
