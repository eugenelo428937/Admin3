import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useConfig } from '../../contexts/ConfigContext';
import productService from '../../services/productService';
import {
   navSelectSubject,
   navViewAllProducts,
   navSelectProductGroup,
   navSelectProduct,
} from '../../store/slices/filtersSlice';
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

   // Navigation handlers
   const handleSubjectClick = useCallback((subjectCode: string) => {
      dispatch(navSelectSubject(subjectCode));
      navigate('/products');
      setExpanded(false);
   }, [dispatch, navigate]);

   const handleProductClick = useCallback(() => {
      dispatch(navViewAllProducts());
      navigate('/products');
      setExpanded(false);
   }, [dispatch, navigate]);

   const handleProductGroupClick = useCallback((groupName: string) => {
      dispatch(navSelectProductGroup(groupName));
      navigate('/products');
      setExpanded(false);
   }, [dispatch, navigate]);

   const handleSpecificProductClick = useCallback((productId: number | string) => {
      dispatch(navSelectProduct(productId));
      navigate('/products');
      setExpanded(false);
   }, [dispatch, navigate]);

   const handleProductVariationClick = useCallback((_variationId: number | string) => {
      navigate('/products');
      setExpanded(false);
   }, [navigate]);

   const handleMarkingVouchersClick = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      dispatch(navSelectProductGroup('8'));
      navigate('/products');
      setExpanded(false);
   }, [dispatch, navigate]);

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
