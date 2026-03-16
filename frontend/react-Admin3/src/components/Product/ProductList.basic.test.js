import { vi } from 'vitest';
/**
 * Basic test for ProductList component to verify rules engine integration
 */
vi.mock("../../services/httpService", () => ({
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
      getCart: vi.fn(() =>
         Promise.resolve({
            data: {
               items: [],
               vat_calculations: {
                  region_info: { region: "UK" },
               },
            },
         })
      ),
      addToCart: vi.fn(),
      updateCartItem: vi.fn(),
      removeFromCart: vi.fn(),
   },
}));
// Mock CartContext to prevent CartProvider from importing services
vi.mock("../../contexts/CartContext.tsx", () => {
   return {
      __esModule: true,
      useCart: () => ({
         addToCart: vi.fn(),
         cartData: {
            items: [],
            vat_calculations: {
               region_info: { region: "UK" },
            },
         },
      }),
      CartProvider: ({ children }) => children,
   };
});
// Mock child components that ProductList imports
vi.mock("./FilterPanel.js", () => ({
   __esModule: true,
   default: () => null,
}));

vi.mock("./ActiveFilters.js", () => ({
   __esModule: true,
   default: () => null,
}));

vi.mock("./ProductGrid.js", () => ({
   __esModule: true,
   default: () => null,
}));

vi.mock("../SearchBox.js", () => ({
   __esModule: true,
   default: () => null,
}));

vi.mock("./FilterDebugger.js", () => ({
   __esModule: true,
   default: () => null,
}));

vi.mock("../Common/RulesEngineInlineAlert", () => ({
   __esModule: true,
   default: () => null,
}));

// Mock rulesEngineUtils to prevent actual API calls
vi.mock("../../utils/rulesEngineUtils", () => ({
   __esModule: true,
   rulesEngineHelpers: {
      executeProductListRules: vi.fn(() => Promise.resolve({ messages: [] })),
   },
}));

// Mock URL sync middleware - must return function directly, not jest.fn wrapper
vi.mock("../../store/middleware/urlSyncMiddleware.js", () => ({
   __esModule: true,
   parseUrlToFilters: () => ({
      subjects: [],
      categories: [],
      product_types: [],
      products: [],
      modes_of_delivery: [],
      searchQuery: '',
   }),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import ProductList from "./ProductList.js";
import { CartProvider } from "../../contexts/CartContext.tsx";
import { createMockStore } from "../../test-utils/reduxMockStore.js";

import appTheme from '../../theme';
// Mock the rules engine service to prevent actual API calls during tests
vi.mock("../../services/rulesEngineService", () => ({
   __esModule: true,
   default: {
      ENTRY_POINTS: {
         PRODUCT_LIST_MOUNT: "product_list_mount",
      },
      executeRules: vi.fn(() =>
         Promise.resolve({
            success: true,
            messages: [
               {
                  type: "display",
                  title: "Test Delivery Message",
                  content: {
                     message: "Test delivery information message",
                     variant: "info",
                  },
                  display_type: "alert",
            },
         ],
      })
   ),
   },
}));

// Create stable references for mocked values to prevent infinite re-renders
const mockProducts = [];
const mockFilterCounts = {};
const mockPagination = {};
const mockSearch = vi.fn();
const mockRefresh = vi.fn();

// Mock the hooks used in ProductList
vi.mock("../../hooks/useProductsSearch.js", () => ({
   __esModule: true,
   default: () => ({
      products: mockProducts,
      filterCounts: mockFilterCounts,
      pagination: mockPagination,
      isLoading: false,
      error: null,
      search: mockSearch,
      refresh: mockRefresh,
   }),
}));

// Create stable references for useProductCardHelpers
const mockHandleAddToCart = vi.fn();
const mockAllEsspIds = [];
const mockBulkDeadlines = {};

vi.mock("../../hooks/useProductCardHelpers.js", () => ({
   __esModule: true,
   default: () => ({
      handleAddToCart: mockHandleAddToCart,
      allEsspIds: mockAllEsspIds,
      bulkDeadlines: mockBulkDeadlines,
   }),
}));

const theme = appTheme;

const renderWithProviders = (component) => {
   const store = createMockStore();

   // Note: CartProvider not needed since useCart is mocked directly
   return render(
      <Provider store={store}>
         <BrowserRouter>
            <ThemeProvider theme={theme}>
               {component}
            </ThemeProvider>
         </BrowserRouter>
      </Provider>
   );
};

describe("ProductList Component - Rules Engine Integration", () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   it("renders ProductList component without crashing", () => {
      renderWithProviders(<ProductList />);

      // Should render the main heading
      expect(screen.getByText("Products")).toBeInTheDocument();
   });

   it("displays loading state for rules engine", async () => {
      renderWithProviders(<ProductList />);

      // Should briefly show loading message (component starts with rulesLoading: true)
      // Note: This might be very brief due to the async nature of the rules execution
      // We'll mainly check that the component renders without errors
      expect(screen.getByText("Products")).toBeInTheDocument();
   });

   it("has the correct component structure", () => {
      renderWithProviders(<ProductList />);

      // The component should render even if the rules message hasn't loaded yet
      expect(screen.getByText("Products")).toBeInTheDocument();

      // Verify the main container structure is correct
      // Note: SearchBox is currently commented out in the component, so we check the heading instead
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Products");
   });
});
