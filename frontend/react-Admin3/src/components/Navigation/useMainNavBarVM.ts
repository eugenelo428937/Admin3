import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useConfig } from '../../contexts/ConfigContext';
import productService from '../../services/productService';
import { navSelectFilter } from '../../store/slices/filtersSlice';
import type {
   NavigationSubject,
   NavigationProductGroup,
   TutorialData,
} from '../../types/navigation';

export interface MainNavBarVM {
   // Config
   isInternal: boolean;

   // Navigation data
   subjects: NavigationSubject[];
   navbarProductGroups: NavigationProductGroup[];
   distanceLearningData: NavigationProductGroup[];
   tutorialData: TutorialData | null;
   loadingNavigation: boolean;

   // UI state
   expanded: boolean;
   showSearchModal: boolean;
   showAuthModal: boolean;
   showCartPanel: boolean;

   // Navigation handlers
   handleSubjectClick: (subjectCode: string) => void;
   handleProductClick: () => void;
   handleProductGroupClick: (groupName: string) => void;
   handleSpecificProductClick: (productId: number | string) => void;
   handleProductVariationClick: (variationId: number | string) => void;
   handleMarkingVouchersClick: (e: React.MouseEvent) => void;
   /**
    * Generic nav-filter handler. Consumes the `filter` object that the
    * backend embeds on each clickable nav item (see
    * catalog/services/navigation_filter_mapping.py). Adding a new
    * filter type is a backend-only change once nav items declare their
    * target via this object.
    */
   handleNavFilter: (target: { filterKey: string; value: string; preserve?: string[] }) => void;

   // UI handlers
   toggleExpanded: () => void;
   setExpanded: (value: boolean) => void;
   handleOpenSearchModal: () => void;
   handleCloseSearchModal: () => void;
   handleOpenAuthModal: () => void;
   handleCloseAuthModal: () => void;
   handleOpenCartPanel: () => void;
   handleCloseCartPanel: () => void;
}

const useMainNavBarVM = (): MainNavBarVM => {
   const navigate = useNavigate();
   const dispatch = useDispatch();
   const { isInternal, configLoaded } = useConfig();

   // State for navbar expansion
   const [expanded, setExpanded] = useState(false);

   // Combined navigation data state (single API call)
   const [subjects, setSubjects] = useState<NavigationSubject[]>([]);
   const [navbarProductGroups, setNavbarProductGroups] = useState<NavigationProductGroup[]>([]);
   const [distanceLearningData, setDistanceLearningData] = useState<NavigationProductGroup[]>([]);
   const [tutorialData, setTutorialData] = useState<TutorialData | null>(null);
   const [loadingNavigation, setLoadingNavigation] = useState(true);

   // Modal/panel state
   const [showSearchModal, setShowSearchModal] = useState(false);
   const [showAuthModal, setShowAuthModal] = useState(false);
   const [showCartPanel, setShowCartPanel] = useState(false);

   // Keyboard shortcut for search modal (Ctrl+K / Cmd+K)
   useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
         if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            if (!showSearchModal) {
               setShowSearchModal(true);
            }
         }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
         document.removeEventListener('keydown', handleKeyDown);
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
            console.error('Error fetching navigation data:', err);
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

   // Generic nav-filter handler. Every per-dimension handler below
   // routes through this; new filter types added via the DB become
   // navigable as soon as the navigation API embeds a `filter` object
   // on the relevant item.
   const handleNavFilter = useCallback(
      (target: { filterKey: string; value: string; preserve?: string[] }) => {
         dispatch(navSelectFilter(target));
         navigate('/products');
         setExpanded(false);
      },
      [dispatch, navigate]
   );

   // Per-dimension navigation handlers (kept for NavigationMenu.tsx
   // call sites — see docs/to-dos/filter-registry-architecture-debt.md
   // for the follow-up that threads the API's `filter` object all the
   // way through and lets these go away).
   const handleSubjectClick = useCallback((subjectCode: string) => {
      handleNavFilter({ filterKey: 'subjects', value: subjectCode, preserve: [] });
   }, [handleNavFilter]);

   const handleProductClick = useCallback(() => {
      // "View all products for the current subjects": clear everything
      // else but keep the active subjects.
      handleNavFilter({ filterKey: 'subjects', value: '__keep__', preserve: ['subjects'] });
   }, [handleNavFilter]);

   const handleProductGroupClick = useCallback((groupName: string) => {
      handleNavFilter({ filterKey: 'product_types', value: groupName, preserve: ['subjects'] });
   }, [handleNavFilter]);

   const handleSpecificProductClick = useCallback((productId: number | string) => {
      handleNavFilter({ filterKey: 'products', value: String(productId), preserve: ['subjects'] });
   }, [handleNavFilter]);

   const handleProductVariationClick = useCallback((_variationId: number | string) => {
      navigate('/products');
      setExpanded(false);
   }, [navigate]);

   const handleMarkingVouchersClick = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      handleNavFilter({ filterKey: 'product_types', value: '8', preserve: ['subjects'] });
   }, [handleNavFilter]);

   // UI handlers
   const toggleExpanded = useCallback(() => {
      setExpanded((prev) => !prev);
   }, []);

   const handleOpenSearchModal = useCallback(() => {
      setShowSearchModal(true);
   }, []);

   const handleCloseSearchModal = useCallback(() => {
      setShowSearchModal(false);
   }, []);

   const handleOpenAuthModal = useCallback(() => {
      setShowAuthModal(true);
   }, []);

   const handleCloseAuthModal = useCallback(() => {
      setShowAuthModal(false);
   }, []);

   const handleOpenCartPanel = useCallback(() => {
      setShowCartPanel(true);
   }, []);

   const handleCloseCartPanel = useCallback(() => {
      setShowCartPanel(false);
   }, []);

   return {
      isInternal,
      subjects,
      navbarProductGroups,
      distanceLearningData,
      tutorialData,
      loadingNavigation,
      expanded,
      showSearchModal,
      showAuthModal,
      showCartPanel,
      handleSubjectClick,
      handleProductClick,
      handleProductGroupClick,
      handleSpecificProductClick,
      handleProductVariationClick,
      handleMarkingVouchersClick,
      handleNavFilter,
      toggleExpanded,
      setExpanded,
      handleOpenSearchModal,
      handleCloseSearchModal,
      handleOpenAuthModal,
      handleCloseAuthModal,
      handleOpenCartPanel,
      handleCloseCartPanel,
   };
};

export default useMainNavBarVM;
