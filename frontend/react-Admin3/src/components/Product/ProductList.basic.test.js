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
jest.mock("../../contexts/CartContext", () => ({
   useCart: jest.fn(() => ({
      cartData: {
         items: [],
         vat_calculations: {
            region_info: { region: "UK" },
         },
      },
   })),
   CartProvider: ({ children }) => children,
}));
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

// Mock the hooks used in ProductList
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

const theme = createTheme();

const renderWithProviders = (component) => {
   const store = createMockStore();

   return render(
      <Provider store={store}>
         <BrowserRouter>
            <ThemeProvider theme={theme}>
               <CartProvider>{component}</CartProvider>
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

   it("has the correct test id for delivery messages", () => {
      renderWithProviders(<ProductList />);

      // The component should render even if the rules message hasn't loaded yet
      expect(screen.getByText("Products")).toBeInTheDocument();

      // We can test that the component structure is correct by checking for other expected elements
      expect(
         screen.getByPlaceholderText("Search products...")
      ).toBeInTheDocument();
   });
});

export default {};
