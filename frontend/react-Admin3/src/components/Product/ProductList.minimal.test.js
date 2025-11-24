/**
 * Minimal test for ProductList component - just verify it can be imported
 */

// Mock services BEFORE any imports
jest.mock("../../services/httpService", () => ({
   __esModule: true,
   default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
   },
}));

jest.mock("../../services/cartService", () => ({
   __esModule: true,
   default: {
      getCart: jest.fn(() => Promise.resolve({
         data: {
            items: [],
            vat_calculations: {
               region_info: { region: 'UK' }
            }
         }
      })),
      addToCart: jest.fn(),
      updateCartItem: jest.fn(),
      removeFromCart: jest.fn(),
   },
}));

// Mock child components
jest.mock("./FilterPanel", () => ({ __esModule: true, default: () => null }));
jest.mock("./ActiveFilters", () => ({ __esModule: true, default: () => null }));
jest.mock("./ProductGrid", () => ({ __esModule: true, default: () => null }));
jest.mock("../SearchBox", () => ({ __esModule: true, default: () => null }));
jest.mock("./FilterDebugger", () => ({ __esModule: true, default: () => null }));
jest.mock("../Common/RulesEngineInlineAlert", () => ({ __esModule: true, default: () => null }));

// Mock hooks
jest.mock("../../hooks/useProductsSearch", () => ({
   __esModule: true,
   default: () => ({
      products: [],
      filterCounts: {},
      pagination: {},
      isLoading: false,
      error: null,
      search: jest.fn(),
      refresh: jest.fn(),
   }),
}));

jest.mock("../../hooks/useProductCardHelpers", () => ({
   __esModule: true,
   default: () => ({
      handleAddToCart: jest.fn(),
      allEsspIds: [],
      bulkDeadlines: {},
   }),
}));

describe('ProductList - Import Test', () => {
   it('should import ProductList without errors', () => {
      const ProductList = require('./ProductList').default;
      expect(ProductList).toBeDefined();
      // ProductList is wrapped in React.memo(), so it's an object not a function
      expect(typeof ProductList).toBe('object');
   });
});
