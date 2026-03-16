import { vi } from 'vitest';
/**
 * Minimal test for ProductList component - just verify it can be imported
 */

// Mock services BEFORE any imports
vi.mock("../../services/httpService.js", () => ({
   __esModule: true,
   default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
   },
}));

vi.mock("../../services/cartService.ts", () => ({
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
vi.mock("./FilterPanel.js", () => ({ __esModule: true, default: () => null }));
vi.mock("./ActiveFilters.js", () => ({ __esModule: true, default: () => null }));
vi.mock("./ProductGrid.js", () => ({ __esModule: true, default: () => null }));
vi.mock("../SearchBox.js", () => ({ __esModule: true, default: () => null }));
vi.mock("./FilterDebugger.js", () => ({ __esModule: true, default: () => null }));
vi.mock("../Common/RulesEngineInlineAlert.js", () => ({ __esModule: true, default: () => null }));

// Mock hooks
vi.mock("../../hooks/useProductsSearch.js", () => ({
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

vi.mock("../../hooks/useProductCardHelpers.js", () => ({
   __esModule: true,
   default: () => ({
      handleAddToCart: vi.fn(),
      allEsspIds: [],
      bulkDeadlines: {},
   }),
}));

describe('ProductList - Import Test', () => {
   it('should import ProductList without errors', async () => {
      const { default: ProductList } = await import('./ProductList.js');
      expect(ProductList).toBeDefined();
      // ProductList is wrapped in React.memo(), so it's an object not a function
      expect(typeof ProductList).toBe('object');
   });
});
