import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.tsx';
import type { AdminMobileNavigationPanel, AdminMobilePanelType, AdminNavLink } from '../../types/navigation';

export interface AdminMobileNavigationVM {
   // Auth
   isSuperuser: boolean;

   // Navigation state
   currentPanel: AdminMobileNavigationPanel;

   // Link data
   emailLinks: AdminNavLink[];
   usersLinks: AdminNavLink[];
   markingLinks: AdminNavLink[];
   tutorialLinks: AdminNavLink[];
   adminLinks: AdminNavLink[];

   // Actions
   handleNavigation: (path: string) => void;
   navigateToPanel: (panelType: AdminMobilePanelType, title: string, data?: any) => void;
   navigateBack: () => void;
   closeNavigation: () => void;
}

const useAdminMobileNavigationVM = (onClose: () => void): AdminMobileNavigationVM => {
   const { isSuperuser } = useAuth();
   const navigate = useNavigate();

   const [navigationStack, setNavigationStack] = useState<AdminMobileNavigationPanel[]>([
      { type: 'main', title: 'Menu' },
   ]);

   const currentPanel = navigationStack[navigationStack.length - 1];

   const closeNavigation = useCallback(() => {
      setNavigationStack([{ type: 'main', title: 'Menu' }]);
      if (onClose) onClose();
   }, [onClose]);

   const handleNavigation = useCallback((path: string) => {
      navigate(path);
      closeNavigation();
   }, [navigate, closeNavigation]);

   const navigateToPanel = useCallback((panelType: AdminMobilePanelType, title: string, data: any = null) => {
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

   // Link data
   const emailLinks: AdminNavLink[] = [
      { label: 'Settings', to: '/admin/email/settings' },
      { label: 'Templates', to: '/admin/email/templates' },
      { label: 'Queue', to: '/admin/email/queue' },
      { label: 'Attachments', to: '/admin/email/attachments' },
      { label: 'Content Rules', to: '/admin/email/content-rules' },
      { label: 'Placeholders', to: '/admin/email/placeholders' },
      { label: 'Closing Salutations', to: '/admin/email/closing-salutations' },
   ];

   const usersLinks: AdminNavLink[] = [
      { label: 'User List', to: '/admin/user-profiles' },
      { label: 'Staff List', to: '/admin/staff' },
      { label: 'Student List', to: '/admin/students', disabled: true },
   ];

   const markingLinks: AdminNavLink[] = [
      { label: 'Marking History', to: '/admin/marking-history', disabled: true },
      { label: 'Markers', to: '/admin/markers', disabled: true },
   ];

   const tutorialLinks: AdminNavLink[] = [
      { label: 'New Session Setup', to: '/admin/new-session-setup' },
      { label: 'Events', to: '/admin/tutorial-events', disabled: true },
      { label: 'Course Templates', to: '/admin/course-templates', disabled: true },
      { label: 'Instructors', to: '/admin/instructors', disabled: true },
      { label: 'Locations', to: '/admin/locations', disabled: true },
      { label: 'Venues', to: '/admin/venues', disabled: true },
      { label: 'Price Levels', to: '/admin/price-levels', disabled: true },
      { label: 'Custom Fields', to: '/admin/custom-fields', disabled: true },
   ];

   const adminLinks: AdminNavLink[] = [
      { label: 'Exam Sessions', to: '/admin/exam-sessions' },
      { label: 'Subjects', to: '/admin/subjects' },
      { label: 'Products', to: '/admin/products' },
      { label: 'Store Products', to: '/admin/store-products' },
      { label: 'New Session Setup', to: '/admin/new-session-setup' },
   ];

   return {
      isSuperuser,
      currentPanel,
      emailLinks,
      usersLinks,
      markingLinks,
      tutorialLinks,
      adminLinks,
      handleNavigation,
      navigateToPanel,
      navigateBack,
      closeNavigation,
   };
};

export default useAdminMobileNavigationVM;
