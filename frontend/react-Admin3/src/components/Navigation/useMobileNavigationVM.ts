import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.tsx';
import { useCart } from '../../contexts/CartContext.tsx';
import type { MobileNavigationPanel, MobilePanelType } from '../../types/navigation';

export interface MobileNavigationVM {
   // Auth
   isSuperuser: boolean;
   isApprentice: boolean;
   isStudyPlus: boolean;
   isAuthenticated: boolean;

   // Cart
   cartCount: number;

   // Navigation state
   currentPanel: MobileNavigationPanel;

   // Actions
   handleNavigation: (path: string, params?: Record<string, string>) => void;
   navigateToPanel: (panelType: MobilePanelType, title: string, data?: any) => void;
   navigateBack: () => void;
   closeNavigation: () => void;
}

const useMobileNavigationVM = (onClose: () => void): MobileNavigationVM => {
   const { isSuperuser, isApprentice, isStudyPlus, isAuthenticated } = useAuth();
   const { cartCount } = useCart();
   const navigate = useNavigate();

   const [navigationStack, setNavigationStack] = useState<MobileNavigationPanel[]>([
      { type: 'main', title: 'Menu' },
   ]);

   const currentPanel = navigationStack[navigationStack.length - 1];

   const closeNavigation = useCallback(() => {
      setNavigationStack([{ type: 'main', title: 'Menu' }]);
      if (onClose) onClose();
   }, [onClose]);

   const handleNavigation = useCallback((path: string, params: Record<string, string> = {}) => {
      if (params && Object.keys(params).length > 0) {
         const searchParams = new URLSearchParams(params);
         navigate(`${path}?${searchParams.toString()}`);
      } else {
         navigate(path);
      }
      closeNavigation();
   }, [navigate, closeNavigation]);

   const navigateToPanel = useCallback((panelType: MobilePanelType, title: string, data: any = null) => {
      setNavigationStack((prev) => [...prev, { type: panelType, title, data }]);
   }, []);

   const navigateBack = useCallback(() => {
      setNavigationStack((prev) => {
         if (prev.length > 1) {
            return prev.slice(0, -1);
         }
         return prev;
      });
   }, []);

   return {
      isSuperuser,
      isApprentice,
      isStudyPlus,
      isAuthenticated,
      cartCount,
      currentPanel,
      handleNavigation,
      navigateToPanel,
      navigateBack,
      closeNavigation,
   };
};

export default useMobileNavigationVM;
