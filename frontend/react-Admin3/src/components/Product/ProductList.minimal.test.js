import { vi } from 'vitest';
/**
 * Minimal test for ProductList component - just verify it can be imported
 */

// Mock services BEFORE any imports
vi.mock("../../services/httpService", () => ({
   __esModule: true,
   default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
   },
}));

vi.mock("../../services/cartService", () => ({
   __esModule: true,
   default: {
      getCart: vi.fn(() => Promise.resolve({
         data: {
            items: [],
            vat_calculations: {
               region_info: { region: 'UK' }
            }
         }
      })),
      addToCart: vi.fn(),
      updateCartItem: vi.fn(),
      removeFromCart: vi.fn(),
   },
}));

// Mock child components
vi.mock("./FilterPanel", () => ({ __esModule: true, default: () => null }));
vi.mock("./ActiveFilters", () => ({ __esModule: true, default: () => null }));
vi.mock("./ProductGrid", () => ({ __esModule: true, default: () => null }));
vi.mock("../SearchBox", () => ({ __esModule: true, default: () => null }));
vi.mock("./FilterDebugger", () => ({ __esModule: true, default: () => null }));
vi.mock("../Common/RulesEngineInlineAlert", () => ({ __esModule: true, default: () => null }));

// Mock hooks
vi.mock("../../hooks/useProductsSearch", () => ({
   __esModule: true,
   default: () => ({
      products: [],
      filterCounts: {},
      pagination: {},
      isLoading: false,
      error: null,
      search: vi.fn(),
      refresh: vi.fn(),
   }),
}));

vi.mock("../../hooks/useProductCardHelpers", () => ({
   __esModule: true,
   default: () => ({
      handleAddToCart: vi.fn(),
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
