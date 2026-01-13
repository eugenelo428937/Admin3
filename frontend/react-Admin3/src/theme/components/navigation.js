// Navigation Component Overrides (AppBar, Tabs, Menu, Button, Typography)
import colorTheme from '../colorTheme';
import { semanticColors } from '../colors/semantic';
import liftKitTheme from '../liftKitTheme';

export const navigationOverrides = {
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: colorTheme.bpp.granite["080"],
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: {
        fontFamily: "'Inter', 'Poppins', sans-serif",
        minHeight: "48px",
        "& .MuiTabs-flexContainer": {
          display: "flex !important",
          alignItems: "center !important",
        },
        "& .MuiTabs-indicator": {
          backgroundColor: "#1976d2 !important",
          height: "3px !important",
          display: "block !important",
        },
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        fontFamily: "'Inter', 'Poppins', sans-serif",
        display: "flex !important",
        alignItems: "center !important",
        justifyContent: "center !important",
        minHeight: "48px !important",
        height: "48px !important",
        padding: "12px 16px !important",
        color: "#666666 !important",
        fontSize: "14px !important",
        fontWeight: "500 !important",
        textTransform: "none !important",
        border: "none !important",
        background: "transparent !important",
        cursor: "pointer !important",
        transition: "all 0.2s ease !important",
        boxSizing: "border-box !important",
        visibility: "visible !important",
        opacity: "1 !important",
        position: "relative !important",
        "&.Mui-selected": {
          color: "#1976d2 !important",
          fontWeight: "600 !important",
          backgroundColor: "transparent !important",
        },
        "&:hover": {
          color: "#1976d2 !important",
          backgroundColor: "rgba(25, 118, 210, 0.04) !important",
        },
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        fontFamily: "'Inter', 'Poppins', sans-serif",
      },
    },
    variants: [
      {
        props: { variant: 'navmenu' },
        style: {
          color: colorTheme.offwhite['001'],
          '&:hover': {
            backgroundColor: colorTheme.bpp.granite['070'],
          },
        },
      },
    ],
  },
  MuiMenuList: {
    styleOverrides: {
      root: {},
    },
    variants: [
      {
        props: { variant: 'navmenu' },
        style: {
          paddingLeft: 0,
          paddingRight: 0,
        },
      },
    ],
  },

  // Navigation Button Variants (20260113-Styling-Clean-up)
  MuiButton: {
    variants: [
      // navPrimary: Main nav buttons, MegaMenu triggers, conditional nav links
      {
        props: { variant: 'navPrimary' },
        style: {
          color: semanticColors.navigation.button.color,
          textTransform: 'none',
          padding: 0,
          '&:hover': {
            backgroundColor: 'transparent',
            color: semanticColors.navigation.button.hoverColor,
          },
        },
      },
      // navViewAll: "View All X" action buttons with bottom margin
      {
        props: { variant: 'navViewAll' },
        style: {
          color: semanticColors.navigation.button.color,
          textTransform: 'none',
          paddingTop: 0,
          marginBottom: liftKitTheme.spacing.sm,
        },
      },
      // topNavAction: Top navigation action buttons (search, cart, account)
      {
        props: { variant: 'topNavAction' },
        style: {
          color: semanticColors.navigation.text.primary,
          textTransform: 'none',
          padding: 0,
          justifyContent: 'center',
        },
      },
    ],
  },

  // Navigation Typography Variants (20260113-Styling-Clean-up)
  MuiTypography: {
    variants: [
      // navViewAllText: Underlined text for "View All" links
      {
        props: { variant: 'navViewAllText' },
        style: {
          borderBottom: `1px solid ${semanticColors.navigation.border.subtle}`,
        },
      },
      // navHeading: Menu section headings (e.g., "Core Principles", "Location")
      {
        props: { variant: 'navHeading' },
        style: {
          marginBottom: liftKitTheme.spacing.xs,
          fontWeight: 'bold',
          cursor: 'pointer',
        },
      },
    ],
  },
};

export default navigationOverrides;
