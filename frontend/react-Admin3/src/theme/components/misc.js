/**
 * Miscellaneous Component Overrides
 *
 * Defines style overrides for various MUI components that don't fit into
 * specific categories (navigation, inputs, alerts, buttons).
 *
 * @module theme/components/misc
 *
 * ## Component Overrides
 *
 * @component MuiDivider
 * @description Divider lines with granite color and 50% opacity
 *
 * @component MuiTypography
 * @description Base typography with Inter/Poppins font family
 *
 * @component MuiSpeedDial
 * @description Speed dial with enlarged FAB (spacing.xl15 size)
 * @variant product-card-speeddial - Reserved for product card actions
 * @usage <SpeedDial variant="product-card-speeddial" ... />
 *
 * @component MuiBackdrop
 * @description Modal backdrop with 75% opacity black overlay
 *
 * @component MuiDrawer
 * @description Drawer panels with accessibility fixes and cart panel styles
 * @note Includes aria-hidden focus fix and cart panel button styles
 *
 * @component MuiContainer
 * @description Container with overflow: visible for dropdown menus
 *
 * @component MuiGrid
 * @description Grid container with products-container CSS class for product listings
 * @usage <Grid container className="products-container">...</Grid>
 *
 * @component MuiList
 * @description List with smooth hover transitions on items
 *
 * @component MuiListItem
 * @description List items with subtle gray hover background
 */

import { scales, staticColors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';

export const miscOverrides = {
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: scales.granite[50],
        opacity: 0.5,
      },
    },
  },
  MuiTypography: {
    styleOverrides: {
      root: {
        fontFamily: "'Inter', 'Poppins', sans-serif",
      },
    },
  },
  MuiSpeedDial: {
    styleOverrides: {
      root: {
        "& .MuiFab-root": {
          minWidth: spacing.xl15,
          minHeight: spacing.xl15,
          width: spacing.xl15,
          height: spacing.xl15,
          // White icon color for SpeedDial main button
          "& .MuiSvgIcon-root": {
            color: staticColors.white,
          },
        },
      },
    },
    variants: [
      {
        props: { variant: "product-card-speeddial" },
        style: {},
      },
    ],
  },
  // SpeedDialAction with white icon color
  MuiSpeedDialAction: {
    styleOverrides: {
      fab: {
        "& .MuiSvgIcon-root": {
          color: staticColors.white,
        },
      },
    },
  },
  MuiBackdrop: {
    styleOverrides: {
      root: {
        backgroundColor: "rgba(0, 0, 0, 0.75)",
      },
    },
  },
  // MuiDrawer overrides (migrated from cart_panel.css)
  MuiDrawer: {
    styleOverrides: {
      root: {
        // Fix for aria-hidden focus issues
        '&[aria-hidden="true"]': {
          pointerEvents: 'none',
        },
        // Ensure proper focus management during transitions
        '&.MuiDrawer-toggling[aria-hidden="true"]': {
          visibility: 'hidden',
        },
      },
      paper: {
        // Cart panel button styles
        '& .cart-panel-buttons button': {
          width: '128px',
        },
        '& .cart-panel-buttons .bi': {
          marginRight: '0.3rem',
        },
      },
    },
  },
  // Container overrides (migrated from product_list.css)
  MuiContainer: {
    styleOverrides: {
      root: {
        overflow: 'visible',
      },
    },
  },
  // Grid overrides (migrated from product_list.css)
  MuiGrid: {
    styleOverrides: {
      container: {
        '&.products-container': {
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          width: '100%',
          maxWidth: '100%',
        },
      },
    },
  },
  // List overrides (migrated from search_results.css)
  MuiList: {
    styleOverrides: {
      root: {
        '& .MuiListItem-root': {
          transition: 'background-color 0.2s ease',
        },
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        '&:hover': {
          backgroundColor: '#f8f9fa', // #f8f9fa
        },
      },
    },
  },
};

export default miscOverrides;
