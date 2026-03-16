import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface SearchModalVM {
   searchResults: any;
   searchLoading: boolean;
   searchError: string | null;
   handleCloseSearchModal: () => void;
   handleSearchResults: (results: any) => void;
   handleShowMatchingProducts: () => void;
}

const useSearchModalVM = (open: boolean, onClose: () => void): SearchModalVM => {
   const navigate = useNavigate();

   const [searchResults, setSearchResults] = useState<any>(null);
   const [searchLoading] = useState(false);
   const [searchError, setSearchError] = useState<string | null>(null);

   // Ensure body overflow is properly restored when modal closes
   useEffect(() => {
      if (!open) {
         const timer = setTimeout(() => {
            const currentOverflow = document.body.style.overflow;
            if (currentOverflow === 'hidden') {
               document.body.style.overflow = 'visible auto';
            }
            document.body.classList.remove('mui-fixed');
         }, 100);
         return () => clearTimeout(timer);
      }
   }, [open]);

   const handleCloseSearchModal = useCallback(() => {
      onClose();
      setTimeout(() => {
         setSearchResults(null);
         setSearchError(null);
      }, 300);
   }, [onClose]);

   // Keyboard shortcut for Escape key
   useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
         if (event.key === 'Escape' && open) {
            handleCloseSearchModal();
         }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
         document.removeEventListener('keydown', handleKeyDown);
      };
   }, [open, handleCloseSearchModal]);

   const handleSearchResults = (results: any) => {
      setSearchResults(results);
      setSearchError(null);
   };

   const handleShowMatchingProducts = () => {
      handleCloseSearchModal();
      navigate('/products');
   };

   return {
      searchResults,
      searchLoading,
      searchError,
      handleCloseSearchModal,
      handleSearchResults,
      handleShowMatchingProducts,
   };
};

export default useSearchModalVM;
