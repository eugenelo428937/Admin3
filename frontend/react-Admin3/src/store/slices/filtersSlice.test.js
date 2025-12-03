/**
 * Tests for filtersSlice Redux slice
 * 
 * Tests actions, reducers, and selectors for the filtering system
 */

import {
  default as filtersReducer,
  setSubjects,
  setCategories,
  setProductTypes,
  setProducts,
  setModesOfDelivery,
  setSearchQuery,
  setMultipleFilters,
  navSelectSubject,
  navViewAllProducts,
  navSelectProductGroup,
  navSelectProduct,
  setCurrentPage,
  setPageSize,
  toggleFilterPanel,
  setFilterPanelOpen,
  setLoading,
  setError,
  clearError,
  resetFilters,
  applyFilters,
  selectFilters,
  selectHasActiveFilters,
  selectActiveFilterCount,
} from './filtersSlice';

// Initial state for testing (Story 1.14 - updated to match baseFiltersInitialState)
const initialState = {
  subjects: [],
  categories: [],
  product_types: [],
  products: [],
  modes_of_delivery: [],
  searchQuery: '',
  searchFilterProductIds: [], // Story 1.14: Added from baseFiltersInitialState
  currentPage: 1,
  pageSize: 20,
  isFilterPanelOpen: false,
  appliedFilters: {},
  isLoading: false,
  error: null,
  lastUpdated: null,
  // Filter counts from API responses
  filterCounts: {
    subjects: {},
    categories: {},
    product_types: {},
    products: {},
    modes_of_delivery: {}
  },
  validationErrors: [], // Story 1.14: Added from baseFiltersInitialState
};

describe('filtersSlice', () => {
  
  describe('reducers', () => {
    
    it('should return the initial state', () => {
      expect(filtersReducer(undefined, {})).toEqual(initialState);
    });
    
    it('should handle setSubjects', () => {
      const previousState = { ...initialState };
      const subjects = ['CM2', 'SA1'];
      
      const newState = filtersReducer(previousState, setSubjects(subjects));
      
      expect(newState.subjects).toEqual(subjects);
      expect(newState.currentPage).toBe(1); // Should reset to page 1
      expect(newState.lastUpdated).toBeTruthy();
    });
    
    it('should handle setCategories', () => {
      const previousState = { ...initialState, currentPage: 3 };
      const categories = ['Bundle', 'Materials'];
      
      const newState = filtersReducer(previousState, setCategories(categories));
      
      expect(newState.categories).toEqual(categories);
      expect(newState.currentPage).toBe(1); // Should reset to page 1
    });
    
    it('should handle setProductTypes', () => {
      const producttypes = ['Core Study Material'];
      const newState = filtersReducer(initialState, setProductTypes(producttypes));
      
      expect(newState.product_types).toEqual(producttypes);
    });
    
    it('should handle setProducts', () => {
      const products = ['Additional Mock Pack'];
      const newState = filtersReducer(initialState, setProducts(products));
      
      expect(newState.products).toEqual(products);
    });
    
    it('should handle setModesOfDelivery', () => {
      const modes = ['Ebook', 'Printed'];
      const newState = filtersReducer(initialState, setModesOfDelivery(modes));
      
      expect(newState.modes_of_delivery).toEqual(modes);
    });
    
    it('should handle setSearchQuery', () => {
      const query = 'test search';
      const newState = filtersReducer(initialState, setSearchQuery(query));
      
      expect(newState.searchQuery).toBe(query);
      expect(newState.currentPage).toBe(1);
    });
    
    it('should handle setMultipleFilters', () => {
      const filters = {
        subjects: ['CM2'],
        categories: ['Bundle'],
        product_types: ['Core Study Material'],
      };
      
      const newState = filtersReducer(initialState, setMultipleFilters(filters));
      
      expect(newState.subjects).toEqual(['CM2']);
      expect(newState.categories).toEqual(['Bundle']);
      expect(newState.product_types).toEqual(['Core Study Material']);
      expect(newState.currentPage).toBe(1);
    });
    
    describe('navigation actions', () => {
      
      it('should handle navSelectSubject', () => {
        const previousState = {
          ...initialState,
          subjects: ['SA1', 'CM2'],
          currentPage: 3,
        };
        
        const newState = filtersReducer(previousState, navSelectSubject('FM1'));
        
        expect(newState.subjects).toEqual(['FM1']); // Should replace existing subjects
        expect(newState.currentPage).toBe(1);
      });
      
      it('should handle navViewAllProducts', () => {
        const previousState = {
          ...initialState,
          subjects: ['CM2'],
          products: ['Test Product'],
          categories: ['Bundle'],
          product_types: ['Core Study Material'],
          modes_of_delivery: ['Ebook'],
          searchQuery: 'test',
          currentPage: 3,
        };
        
        const newState = filtersReducer(previousState, navViewAllProducts());
        
        // Should keep subjects but clear everything else
        expect(newState.subjects).toEqual(['CM2']);
        expect(newState.products).toEqual([]);
        expect(newState.categories).toEqual([]);
        expect(newState.product_types).toEqual([]);
        expect(newState.modes_of_delivery).toEqual([]);
        expect(newState.searchQuery).toBe('');
        expect(newState.currentPage).toBe(1);
      });
      
      it('should handle navSelectProductGroup', () => {
        const previousState = {
          ...initialState,
          subjects: ['CM2'],
          products: ['Test Product'],
          categories: ['Bundle'],
          searchQuery: 'test',
        };
        
        const newState = filtersReducer(previousState, navSelectProductGroup('Core Study Material'));
        
        // Should keep subjects, set product_types, clear others
        expect(newState.subjects).toEqual(['CM2']);
        expect(newState.product_types).toEqual(['Core Study Material']);
        expect(newState.products).toEqual([]);
        expect(newState.categories).toEqual([]);
        expect(newState.modes_of_delivery).toEqual([]);
        expect(newState.searchQuery).toBe('');
      });
      
      it('should handle navSelectProduct', () => {
        const previousState = {
          ...initialState,
          subjects: ['CM2'],
          categories: ['Bundle'],
          product_types: ['Core Study Material'],
          searchQuery: 'test',
        };
        
        const newState = filtersReducer(previousState, navSelectProduct('Test Product'));
        
        // Should keep subjects, set products, clear others
        expect(newState.subjects).toEqual(['CM2']);
        expect(newState.products).toEqual(['Test Product']);
        expect(newState.categories).toEqual([]);
        expect(newState.product_types).toEqual([]);
        expect(newState.modes_of_delivery).toEqual([]);
        expect(newState.searchQuery).toBe('');
      });
      
    });
    
    it('should handle setCurrentPage', () => {
      const newState = filtersReducer(initialState, setCurrentPage(5));
      expect(newState.currentPage).toBe(5);
    });
    
    it('should handle setPageSize', () => {
      const previousState = { ...initialState, currentPage: 3 };
      const newState = filtersReducer(previousState, setPageSize(50));
      
      expect(newState.pageSize).toBe(50);
      expect(newState.currentPage).toBe(1); // Should reset to page 1
    });
    
    it('should handle toggleFilterPanel', () => {
      const newState1 = filtersReducer(initialState, toggleFilterPanel());
      expect(newState1.isFilterPanelOpen).toBe(true);
      
      const newState2 = filtersReducer(newState1, toggleFilterPanel());
      expect(newState2.isFilterPanelOpen).toBe(false);
    });
    
    it('should handle setFilterPanelOpen', () => {
      const newState = filtersReducer(initialState, setFilterPanelOpen(true));
      expect(newState.isFilterPanelOpen).toBe(true);
    });
    
    it('should handle setLoading', () => {
      const newState = filtersReducer(initialState, setLoading(true));
      expect(newState.isLoading).toBe(true);
    });
    
    it('should handle setError', () => {
      const previousState = { ...initialState, isLoading: true };
      const error = 'Test error message';
      
      const newState = filtersReducer(previousState, setError(error));
      
      expect(newState.error).toBe(error);
      expect(newState.isLoading).toBe(false); // Should set loading to false
    });
    
    it('should handle clearError', () => {
      const previousState = { ...initialState, error: 'Test error' };
      const newState = filtersReducer(previousState, clearError());
      
      expect(newState.error).toBeNull();
    });
    
    it('should handle resetFilters', () => {
      const previousState = {
        ...initialState,
        subjects: ['CM2'],
        categories: ['Bundle'],
        searchQuery: 'test',
        currentPage: 3,
        error: 'Some error',
      };
      
      const newState = filtersReducer(previousState, resetFilters());
      
      expect(newState.subjects).toEqual([]);
      expect(newState.categories).toEqual([]);
      expect(newState.product_types).toEqual([]);
      expect(newState.products).toEqual([]);
      expect(newState.modes_of_delivery).toEqual([]);
      expect(newState.searchQuery).toBe('');
      expect(newState.currentPage).toBe(1);
      expect(newState.error).toBeNull();
      expect(newState.lastUpdated).toBeTruthy();
    });
    
    it('should handle applyFilters', () => {
      const previousState = {
        ...initialState,
        subjects: ['CM2'],
        categories: ['Bundle'],
        searchQuery: 'test',
      };
      
      const newState = filtersReducer(previousState, applyFilters());
      
      expect(newState.appliedFilters).toEqual({
        subjects: ['CM2'],
        categories: ['Bundle'],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: 'test',
      });
    });

  });
  
  describe('selectors', () => {
    
    const mockState = {
      filters: {
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: ['Core Study Material'],
        products: [],
        modes_of_delivery: ['Ebook'],
        searchQuery: 'test search',
        currentPage: 2,
        pageSize: 50,
        isFilterPanelOpen: true,
        isLoading: true,
        error: 'Test error',
        appliedFilters: { subjects: ['CM2'] },
        lastUpdated: 1234567890,
      },
    };
    
    it('should select filters', () => {
      const result = selectFilters(mockState);
      
      expect(result).toEqual({
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: ['Core Study Material'],
        products: [],
        modes_of_delivery: ['Ebook'],
        searchQuery: 'test search', // Story 1.14: selectFilters now includes searchQuery
      });
    });
    
    it('should select hasActiveFilters', () => {
      expect(selectHasActiveFilters(mockState)).toBe(true);
      
      const emptyState = {
        filters: {
          ...mockState.filters,
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: '',
        },
      };
      
      expect(selectHasActiveFilters(emptyState)).toBe(false);
    });
    
    it('should select activeFilterCount', () => {
      const count = selectActiveFilterCount(mockState);
      expect(count).toBe(6); // 2 subjects + 1 category + 1 product_type + 1 mode + 1 search query
    });
    
    it('should count search query as one filter', () => {
      const stateWithSearch = {
        filters: {
          ...mockState.filters,
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: 'test',
        },
      };
      
      expect(selectActiveFilterCount(stateWithSearch)).toBe(1);
    });
    
  });
  
});