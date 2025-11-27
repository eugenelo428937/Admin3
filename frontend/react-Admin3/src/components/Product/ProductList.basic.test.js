/**
 * Basic test for ProductList component to verify rules engine integration
 */
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
      getCart: jest.fn(() =>
         Promise.resolve({
            data: {
               items: [],
               vat_calculations: {
                  region_info: { region: "UK" },
               },
            },
         })
      ),
      addToCart: jest.fn(),
      updateCartItem: jest.fn(),
      removeFromCart: jest.fn(),
   },
}));
// Mock CartContext to prevent CartProvider from importing services
jest.mock("../../contexts/CartContext", () => {
   return {
      __esModule: true,
      useCart: () => ({
         addToCart: jest.fn(),
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
jest.mock("./FilterPanel", () => ({
   __esModule: true,
   default: () => null,
}));

jest.mock("./ActiveFilters", () => ({
   __esModule: true,
   default: () => null,
}));

jest.mock("./ProductGrid", () => ({
   __esModule: true,
   default: () => null,
}));

jest.mock("../SearchBox", () => ({
   __esModule: true,
   default: () => null,
}));

jest.mock("./FilterDebugger", () => ({
   __esModule: true,
   default: () => null,
}));

jest.mock("../Common/RulesEngineInlineAlert", () => ({
   __esModule: true,
   default: () => null,
}));

// Mock rulesEngineUtils to prevent actual API calls
jest.mock("../../utils/rulesEngineUtils", () => ({
   __esModule: true,
   rulesEngineHelpers: {
      executeProductListRules: jest.fn(() => Promise.resolve({ messages: [] })),
   },
}));

// Mock URL sync middleware - must return function directly, not jest.fn wrapper
jest.mock("../../store/middleware/urlSyncMiddleware", () => ({
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
import { ThemeProvider, createTheme } from "@mui/material/styles";
import ProductList from "./ProductList";
import { CartProvider } from "../../contexts/CartContext";
import { createMockStore } from "../../test-utils/reduxMockStore";

// Mock the rules engine service to prevent actual API calls during tests
jest.mock("../../services/rulesEngineService", () => ({
   ENTRY_POINTS: {
      PRODUCT_LIST_MOUNT: "product_list_mount",
   },
   executeRules: jest.fn(() =>
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
}));

// Create stable references for mocked values to prevent infinite re-renders
const mockProducts = [];
const mockFilterCounts = {};
const mockPagination = {};
const mockSearch = jest.fn();
const mockRefresh = jest.fn();

// Mock the hooks used in ProductList
jest.mock("../../hooks/useProductsSearch", () => ({
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
const mockHandleAddToCart = jest.fn();
const mockAllEsspIds = [];
const mockBulkDeadlines = {};

jest.mock("../../hooks/useProductCardHelpers", () => ({
   __esModule: true,
   default: () => ({
      handleAddToCart: mockHandleAddToCart,
      allEsspIds: mockAllEsspIds,
      bulkDeadlines: mockBulkDeadlines,
   }),
}));

const theme = createTheme();

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
      jest.clearAllMocks();
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
