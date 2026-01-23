// Miscellaneous Component Overrides
import { legacyScales } from '../tokens/colors';
import { spacing } from '../tokens/spacing';

export const miscOverrides = {
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: legacyScales.granite["050"],
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
        },
      },
      variants: [
        {
          props: { variant: "product-card-speeddial" },
          style: {},
        },
      ],
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
