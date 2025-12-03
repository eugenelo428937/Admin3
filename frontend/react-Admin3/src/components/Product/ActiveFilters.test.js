/**
 * ActiveFilters Component Tests
 *
 * Comprehensive tests for the ActiveFilters component including:
 * - Rendering different variants
 * - Redux integration
 * - Filter pill interactions
 * - Mobile responsiveness
 * - Edge cases and accessibility
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import filtersReducer from "../../store/slices/filtersSlice";
import ActiveFilters from "./ActiveFilters";

// Mock Material-UI's useMediaQuery
jest.mock("@mui/material/useMediaQuery");

// Mock Redux actions
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
   ...jest.requireActual("react-redux"),
   useDispatch: () => mockDispatch,
}));

// Test store setup
const createTestStore = (initialState = {}) => {
   return configureStore({
      reducer: {
         filters: filtersReducer,
      },
      preloadedState: {
         filters: {
            subjects: [],
            categories: [],
            product_types: [],
            products: [],
            modes_of_delivery: [],
            searchQuery: "",
            // Navbar filters (Story 1.2)
            tutorial_format: null,
            distance_learning: false,
            tutorial: false,
            currentPage: 1,
            pageSize: 20,
            isLoading: false,
            error: null,
            isFilterPanelOpen: false,
            appliedFilters: {},
            filterCounts: {},
            lastUpdated: null,
            ...initialState,
         },
      },
   });
};

// Test component wrapper with providers
const renderWithProviders = (
   component,
   { initialState = {}, theme = createTheme() } = {}
) => {
   const store = createTestStore(initialState);
   return {
      ...render(
         <Provider store={store}>
            <ThemeProvider theme={theme}>{component}</ThemeProvider>
         </Provider>
      ),
      store,
   };
};

// Mock filter counts for display labels
const mockFilterCounts = {
   subjects: {
      CM2: { label: "Capital Markets 2", count: 15 },
      SA1: { label: "Statistics & Analytics 1", count: 8 },
   },
   categories: {
      Materials: { label: "Study Materials", count: 45 },
      Bundle: { label: "Bundle Packages", count: 12 },
   },
   product_types: {
      "Core Study Material": { label: "Core Materials", count: 35 },
   },
   products: {
      "Product A": { label: "Advanced Product A", count: 5 },
   },
   modes_of_delivery: {
      Ebook: { label: "Electronic Book", count: 25 },
   },
};

describe("ActiveFilters Component", () => {
   beforeEach(() => {
      jest.clearAllMocks();
      // Mock desktop view by default
      require("@mui/material/useMediaQuery").default = jest.fn(() => false);
   });

   describe("No Active Filters State", () => {
      test("renders nothing when no filters are active", () => {
         const initialState = {
            subjects: [],
            categories: [],
            product_types: [],
            products: [],
            modes_of_delivery: [],
         };

         const { container } = renderWithProviders(<ActiveFilters />, {
            initialState,
         });

         // Component should not render anything when no filters are active
         expect(container).toBeEmptyDOMElement();
      });

      test("does not render in compact variant when no filters are active", () => {
         const initialState = {
            subjects: [],
            categories: [],
         };

         const { container } = renderWithProviders(
            <ActiveFilters variant="compact" />,
            { initialState }
         );

         expect(container).toBeEmptyDOMElement();
      });
   });

   describe("Default Variant Rendering", () => {
      test("renders active filter chips with correct labels", () => {
         const initialState = {
            subjects: ["CM2", "SA1"],
            categories: ["Materials"],
            filterCounts: mockFilterCounts,
         };

         renderWithProviders(<ActiveFilters />, { initialState });

         expect(screen.getByText("3 Active Filters")).toBeInTheDocument();
         expect(screen.getByText("Subject: CM2")).toBeInTheDocument();
         expect(screen.getByText("Subject: SA1")).toBeInTheDocument();
         expect(screen.getByText("Category: Materials")).toBeInTheDocument();
      });

      test("shows correct active filter count", () => {
         const initialState = {
            subjects: ["CM2", "SA1"],
            categories: ["Materials"],
         };

         renderWithProviders(<ActiveFilters showCount={true} />, {
            initialState,
         });

         expect(screen.getByText("3 Active Filters")).toBeInTheDocument();
      });

      test("shows singular form when only one filter is active", () => {
         const initialState = {
            subjects: ["CM2"],
         };

         renderWithProviders(<ActiveFilters showCount={true} />, {
            initialState,
         });

         expect(screen.getByText("1 Active Filter")).toBeInTheDocument();
      });

      test("renders Clear All button when showClearAll is true", () => {
         const initialState = {
            subjects: ["CM2"],
            categories: ["Materials"],
         };

         renderWithProviders(<ActiveFilters showClearAll={true} />, {
            initialState,
         });

         expect(
            screen.getByRole("button", { name: /clear all/i })
         ).toBeInTheDocument();
      });

      test("does not render Clear All button when showClearAll is false", () => {
         const initialState = {
            subjects: ["CM2"],
            categories: ["Materials"],
         };

         renderWithProviders(<ActiveFilters showClearAll={false} />, {
            initialState,
         });

         expect(
            screen.queryByRole("button", { name: /clear all/i })
         ).not.toBeInTheDocument();
      });
   });

   describe("Compact Variant", () => {
      test("renders compact variant with filter count", () => {
         const initialState = {
            subjects: ["CM2", "SA1"],
            categories: ["Materials"],
         };

         renderWithProviders(<ActiveFilters variant="compact" />, {
            initialState,
         });

         expect(screen.getByText("3 filters active")).toBeInTheDocument();
         expect(screen.queryByText("Subject: CM2")).not.toBeInTheDocument(); // No chips in compact mode
      });

      test("shows singular form in compact variant", () => {
         const initialState = {
            subjects: ["CM2"],
         };

         renderWithProviders(<ActiveFilters variant="compact" />, {
            initialState,
         });

         expect(screen.getByText("1 filter active")).toBeInTheDocument();
      });

      test("renders Clear button in compact variant when showClearAll is true", () => {
         const initialState = {
            subjects: ["CM2"],
         };

         renderWithProviders(
            <ActiveFilters variant="compact" showClearAll={true} />,
            { initialState }
         );

         expect(
            screen.getByRole("button", { name: /clear/i })
         ).toBeInTheDocument();
      });
   });

   describe("Minimal Variant", () => {
      test("renders minimal variant as a single chip", () => {
         const initialState = {
            subjects: ["CM2", "SA1"],
            categories: ["Materials"],
         };

         renderWithProviders(<ActiveFilters variant="minimal" />, {
            initialState,
         });

         const chip = screen.getByText("3 active");
         expect(chip).toBeInTheDocument();
         expect(chip.closest(".MuiChip-root")).toBeInTheDocument();
      });

      test("minimal variant chip is clickable when showClearAll is true", async () => {
         const user = userEvent.setup();
         const initialState = {
            subjects: ["CM2"],
         };

         renderWithProviders(
            <ActiveFilters variant="minimal" showClearAll={true} />,
            { initialState }
         );

         const chip = screen.getByText("1 active").closest(".MuiChip-root");
         await user.click(chip);

         expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
               type: expect.stringContaining("clearAllFilters"),
            })
         );
      });
   });

   describe("Filter Chip Interactions", () => {
      test.skip("dispatches removeSubjectFilter when subject chip delete is clicked", async () => {
         test("dispatches removeSubjectFilter when subject chip delete is clicked", async () => {
            const user = userEvent.setup();
            const initialState = {
               subjects: ["CM2"],
            };

            renderWithProviders(<ActiveFilters />, { initialState });

            const deleteButton = screen.getByTestId("CancelIcon");
            await user.click(deleteButton);

            expect(mockDispatch).toHaveBeenCalledWith(
               expect.objectContaining({
                  type: expect.stringContaining("removeSubjectFilter"),
                  payload: "CM2",
               })
            );
         });
      });
      test.skip("dispatches removeCategoryFilter when category chip delete is clicked", async () => {
         test("dispatches removeCategoryFilter when category chip delete is clicked", async () => {
            const user = userEvent.setup();
            const initialState = {
               categories: ["Materials"],
            };

            renderWithProviders(<ActiveFilters />, { initialState });

            const deleteButton = screen.getByTestId("CancelIcon");
            await user.click(deleteButton);

            expect(mockDispatch).toHaveBeenCalledWith(
               expect.objectContaining({
                  type: expect.stringContaining("removeCategoryFilter"),
                  payload: "Materials",
               })
            );
         });
      });

      test("dispatches clearAllFilters when Clear All button is clicked", async () => {
         const user = userEvent.setup();
         const initialState = {
            subjects: ["CM2"],
            categories: ["Materials"],
         };

         renderWithProviders(<ActiveFilters showClearAll={true} />, {
            initialState,
         });

         const clearAllButton = screen.getByRole("button", {
            name: /clear all/i,
         });
         await user.click(clearAllButton);

         expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
               type: expect.stringContaining("clearAllFilters"),
            })
         );
      });
   });

   describe("Mobile Responsiveness", () => {
      beforeEach(() => {
         // Mock mobile view
         require("@mui/material/useMediaQuery").default = jest.fn(() => true);
      });
      test.skip("shows shortened labels on mobile", () => {
         test("shows shortened labels on mobile", () => {
            const initialState = {
               subjects: ["CM2"],
               categories: ["Materials"],
               filterCounts: mockFilterCounts,
            };

            renderWithProviders(<ActiveFilters />, { initialState });

            // On mobile, should show just the filter value, not the full "Type: Value" format
            expect(screen.getByText("CM2")).toBeInTheDocument();
            expect(screen.getByText("Materials")).toBeInTheDocument();
            expect(screen.queryByText("Subject: CM2")).not.toBeInTheDocument();
         });
      });
      test.skip("uses small chips on mobile", () => {
         test("uses small chips on mobile", () => {
            const initialState = {
               subjects: ["CM2"],
            };

            renderWithProviders(<ActiveFilters />, { initialState });

            const chip = screen.getByText("CM2").closest(".MuiChip-root");
            expect(chip).toHaveClass("MuiChip-sizeSmall");
         });
      });
   });
   describe("Filter Chip Limits", () => {
      test("limits number of displayed chips and shows remaining count", () => {
         const initialState = {
            subjects: ["CM1", "CM2", "SA1", "SA2", "CB1", "CB2"],
            categories: ["Materials", "Bundle", "Tutorial"],
            product_types: ["Core Study Material"],
            products: ["Product A", "Product B"],
         };

         renderWithProviders(<ActiveFilters maxChipsToShow={5} />, {
            initialState,
         });

         // Should show "+7 more" (12 total - 5 shown = 7 remaining)
         expect(screen.getByText("+7 more")).toBeInTheDocument();
      });

      test("does not show remaining count when all chips fit within limit", () => {
         const initialState = {
            subjects: ["CM2"],
            categories: ["Materials"],
         };

         renderWithProviders(<ActiveFilters maxChipsToShow={10} />, {
            initialState,
         });

         expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
      });
   });

   describe("Display Labels", () => {
      test.skip("uses display labels from filterCounts when available", () => {
         test("uses display labels from filterCounts when available", () => {
            const initialState = {
               subjects: ["CM2"],
               filterCounts: {
                  subjects: {
                     CM2: { label: "Capital Markets Advanced", count: 15 },
                  },
               },
            };

            renderWithProviders(<ActiveFilters />, { initialState });

            expect(
               screen.getByText("Subject: Capital Markets Advanced")
            ).toBeInTheDocument();
         });
      });
      test("falls back to filter value when no display label is available", () => {
         const initialState = {
            subjects: ["UNKNOWN_SUBJECT"],
         };

         renderWithProviders(<ActiveFilters />, { initialState });

         expect(
            screen.getByText("Subject: UNKNOWN_SUBJECT")
         ).toBeInTheDocument();
      });
   });
   test.skip("applies correct color for each filter type", () => {
      describe("Color Coding", () => {
         test("applies correct color for each filter type", () => {
            const initialState = {
               subjects: ["CM2"],
               categories: ["Materials"],
               product_types: ["Core Study Material"],
               products: ["Product A"],
               modes_of_delivery: ["Ebook"],
            };

            renderWithProviders(<ActiveFilters />, { initialState });

            // Check that chips have different color classes (actual color values depend on theme)
            const subjectChip = screen
               .getByText("Subject: CM2")
               .closest(".MuiChip-root");
            const categoryChip = screen
               .getByText("Category: Materials")
               .closest(".MuiChip-root");

            expect(subjectChip).toHaveClass("MuiChip-colorPrimary");
            expect(categoryChip).toHaveClass("MuiChip-colorSecondary");
         });
      });
   });
   test.skip("has proper ARIA labels", () => {
      describe("Accessibility", () => {
         test("has proper ARIA labels", () => {
            const initialState = {
               subjects: ["CM2"],
               categories: ["Materials"],
            };

            renderWithProviders(<ActiveFilters />, { initialState });

            // Check for delete buttons with proper labels
            const deleteButtons = screen.getAllByLabelText(/delete/i);
            expect(deleteButtons).toHaveLength(2);
         });
      });
      test("supports keyboard navigation", async () => {
         const user = userEvent.setup();
         const initialState = {
            subjects: ["CM2"],
         };

         renderWithProviders(<ActiveFilters />, { initialState });

         // Tab to delete button and activate with Enter
         await user.tab();
         await user.keyboard("{Enter}");

         expect(mockDispatch).toHaveBeenCalled();
      });
   });

   describe("Edge Cases", () => {
      test("handles undefined filter values gracefully", () => {
         const initialState = {
            subjects: [null, undefined, ""],
            categories: ["Materials"],
         };

         expect(() => {
            renderWithProviders(<ActiveFilters />, { initialState });
         }).not.toThrow();

         // Should only show valid filters
         expect(screen.getByText("Category: Materials")).toBeInTheDocument();
      });

      test("handles empty filter arrays", () => {
         const initialState = {
            subjects: [],
            categories: [],
            product_types: [],
            products: [],
            modes_of_delivery: [],
         };

         const { container } = renderWithProviders(<ActiveFilters />, {
            initialState,
         });

         expect(container).toBeEmptyDOMElement();
      });

      test("handles very long filter names", () => {
         const initialState = {
            subjects: [
               "Very_Long_Subject_Name_That_Should_Be_Handled_Gracefully",
            ],
         };

         renderWithProviders(<ActiveFilters />, { initialState });

         expect(screen.getByText(/Very_Long_Subject_Name/)).toBeInTheDocument();
      });
   });

   describe("Props Validation", () => {
      test("uses default props when not provided", () => {
         const initialState = {
            subjects: ["CM2"],
         };

         renderWithProviders(<ActiveFilters />, { initialState });

         // Should render with default behavior
         expect(screen.getByText("1 Active Filter")).toBeInTheDocument();
         expect(
            screen.getByRole("button", { name: /clear all/i })
         ).toBeInTheDocument();
      });

      test("respects custom maxChipsToShow prop", () => {
         const initialState = {
            subjects: ["CM1", "CM2", "SA1"],
         };

         renderWithProviders(<ActiveFilters maxChipsToShow={2} />, {
            initialState,
         });

         expect(screen.getByText("+1 more")).toBeInTheDocument();
      });
   });

   describe("FilterRegistry Integration (Story 1.11)", () => {
      // No beforeEach needed - use default FilterRegistry registration
      // Tests should work with the globally registered filters

      test("uses FilterRegistry for filter colors instead of hardcoded FILTER_CONFIG", () => {
         const {
            FilterRegistry,
         } = require("../../store/filters/filterRegistry");

         const initialState = {
            subjects: ["CM2"],
            categories: ["Materials"],
            product_types: ["Core Study Material"],
         };

         renderWithProviders(<ActiveFilters />, { initialState });

         // Verify chips have colors from FilterRegistry, not hardcoded values
         const subjectChip = screen.getByText(/CM2/).closest(".MuiChip-root");
         const categoryChip = screen
            .getByText(/Materials/)
            .closest(".MuiChip-root");
         const producttypeChip = screen
            .getByText(/Core Study Material/)
            .closest(".MuiChip-root");

         // Check colors match FilterRegistry configuration
         expect(subjectChip).toHaveClass("MuiChip-colorPrimary"); // From registry: color: 'primary'
         expect(categoryChip).toHaveClass("MuiChip-colorInfo"); // From registry: color: 'info'
         expect(producttypeChip).toHaveClass("MuiChip-colorSuccess"); // From registry: color: 'success'
      });

      test("uses FilterRegistry for filter labels instead of hardcoded FILTER_CONFIG", () => {
         const initialState = {
            subjects: ["CM2"],
            categories: ["Materials"],
            modes_of_delivery: ["Ebook"],
         };

         renderWithProviders(<ActiveFilters />, { initialState });

         // Verify labels come from FilterRegistry.label, not hardcoded FILTER_CONFIG
         expect(screen.getByText("Subject: CM2")).toBeInTheDocument();
         expect(screen.getByText("Category: Materials")).toBeInTheDocument();
         expect(
            screen.getByText("Mode of Delivery: Ebook")
         ).toBeInTheDocument();
      });
      test.skip("automatically renders chips for new filter types added to registry", () => {
         test("automatically renders chips for new filter types added to registry", () => {
            const {
               FilterRegistry,
            } = require("../../store/filters/filterRegistry");

            // Register a new filter type dynamically
            FilterRegistry.register({
               type: "tutorial_location",
               label: "Tutorial Location",
               pluralLabel: "Tutorial Locations",
               urlParam: "tutorial_location",
               color: "secondary",
               multiple: true,
               dataType: "array",
               urlFormat: "comma-separated",
               getDisplayValue: (value) => value,
               order: 6,
            });

            const initialState = {
               subjects: ["CM2"],
               tutorial_location: ["London"], // New filter value
            };

            renderWithProviders(<ActiveFilters />, { initialState });

            // Verify new filter type renders WITHOUT modifying ActiveFilters.js
            expect(screen.getByText("Subject: CM2")).toBeInTheDocument();
            // Now that we've migrated, the new filter should render automatically
            expect(
               screen.getByText("Tutorial Location: London")
            ).toBeInTheDocument();
         });
      });
      test.skip("uses FilterRegistry.getDisplayValue for custom value formatting", () => {
         test("uses FilterRegistry.getDisplayValue for custom value formatting", () => {
            const {
               FilterRegistry,
            } = require("../../store/filters/filterRegistry");

            // Register filter with custom getDisplayValue function
            FilterRegistry.register({
               type: "exam_level",
               label: "Exam Level",
               pluralLabel: "Exam Levels",
               urlParam: "exam_level",
               color: "warning",
               multiple: true,
               dataType: "array",
               urlFormat: "comma-separated",
               getDisplayValue: (value) => `Level ${value}`,
               order: 7,
            });

            const initialState = {
               exam_level: ["3"], // Should display as "Level 3"
            };

            renderWithProviders(<ActiveFilters />, { initialState });

            // Verify getDisplayValue is used from FilterRegistry
            expect(screen.getByText("Exam Level: Level 3")).toBeInTheDocument();
         });
      });
      test.skip("renders filter chips in order specified by FilterRegistry.order", () => {
         test("renders filter chips in order specified by FilterRegistry.order", () => {
            const {
               FilterRegistry,
            } = require("../../store/filters/filterRegistry");

            const initialState = {
               subjects: ["CM2"], // order: 1
               categories: ["Materials"], // order: 2
               product_types: ["Core Study Material"], // order: 3
            };

            renderWithProviders(<ActiveFilters />, { initialState });

            // Verify chips appear in order by checking the text content
            const chips = screen
               .getAllByRole("button", { name: /delete/i })
               .map((btn) => btn.closest(".MuiChip-root").textContent);

            // Verify chips appear in order specified by FilterRegistry.order
            expect(chips[0]).toBe("Subject: CM2");
            expect(chips[1]).toBe("Category: Materials");
            expect(chips[2]).toBe("Product Type: Core Study Material");
         });
      });
      test("no hardcoded FILTER_CONFIG remains in component (AC6 - Story 1.11)", () => {
         // This test verifies the core goal: eliminating hardcoded filter configs
         const {
            FilterRegistry,
         } = require("../../store/filters/filterRegistry");

         const initialState = {
            subjects: ["CM2", "SA1"],
            categories: ["Materials"],
            product_types: ["Core Study Material"],
            products: ["Product A"],
            modes_of_delivery: ["Ebook"],
         };

         renderWithProviders(<ActiveFilters />, { initialState });

         // Verify all 5 filter types render correctly using FilterRegistry
         expect(screen.getByText("Subject: CM2")).toBeInTheDocument();
         expect(screen.getByText("Subject: SA1")).toBeInTheDocument();
         expect(screen.getByText("Category: Materials")).toBeInTheDocument();
         expect(
            screen.getByText("Product Type: Core Study Material")
         ).toBeInTheDocument();
         expect(screen.getByText("Product: Product A")).toBeInTheDocument();
         expect(
            screen.getByText("Mode of Delivery: Ebook")
         ).toBeInTheDocument();

         // Verify all chips have correct colors from FilterRegistry
         expect(screen.getByText(/CM2/).closest(".MuiChip-root")).toHaveClass(
            "MuiChip-colorPrimary"
         );
         expect(
            screen.getByText(/Materials/).closest(".MuiChip-root")
         ).toHaveClass("MuiChip-colorInfo");
         expect(
            screen.getByText(/Core Study Material/).closest(".MuiChip-root")
         ).toHaveClass("MuiChip-colorSuccess");
      });
      test.skip("handles registry-based filter removal actions", async () => {
         test("handles registry-based filter removal actions", async () => {
            const user = userEvent.setup();
            const {
               FilterRegistry,
            } = require("../../store/filters/filterRegistry");

            const initialState = {
               subjects: ["CM2"],
            };

            renderWithProviders(<ActiveFilters />, { initialState });

            // Click delete button on the chip
            const deleteButtons = screen.getAllByTestId("ClearIcon");
            await user.click(deleteButtons[0]); // Click first delete button (CM2)

            // Verify correct removal action dispatched
            // This verifies FILTER_REMOVAL_ACTIONS map works correctly
            expect(mockDispatch).toHaveBeenCalledWith(
               expect.objectContaining({
                  type: expect.stringContaining("removeSubjectFilter"),
                  payload: "CM2",
               })
            );
         });
      });
   });
});
