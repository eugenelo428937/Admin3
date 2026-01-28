/**
 * Navigation Component Overrides
 *
 * Defines MUI component overrides and custom variants for navigation elements.
 * Includes AppBar, Tabs, Menu, Button, Typography, and IconButton overrides.
 *
 * @module theme/components/navigation
 *
 * ## Custom Button Variants
 *
 * @variant navAction
 * @description Action buttons in navigation areas (e.g., cart, account icons)
 * @usage <Button variant="navAction" startIcon={<CartIcon />}>Cart</Button>
 *
 * @variant navPrimary
 * @description Main nav buttons, MegaMenu triggers, conditional nav links
 * @usage <Button variant="navPrimary" endIcon={<ExpandMore />}>Products</Button>
 *
 * @variant navViewAll
 * @description "View All X" action buttons with bottom margin
 * @usage <Button variant="navViewAll">View All Products</Button>
 *
 * @variant topNavAction
 * @description Top navigation bar action buttons (search, download, help)
 * @usage <Button variant="topNavAction" startIcon={<SearchIcon />}>Search</Button>
 *
 * ## Custom Typography Variants
 *
 * @variant navViewAllText
 * @description Underlined text for "View All" links within navigation
 * @usage <Typography variant="navViewAllText">View All</Typography>
 *
 * @variant navHeading
 * @description Menu section headings (e.g., "Core Principles", "Location")
 * @usage <Typography variant="navHeading">Section Title</Typography>
 *
 * @variant mobileNavTitle
 * @description Mobile navigation panel title text
 * @usage <Typography variant="mobileNavTitle">Menu</Typography>
 *
 * ## Custom MenuItem Variants
 *
 * @variant navmenu
 * @description Navigation menu items with semantic colors
 * @usage <MenuItem variant="navmenu">Menu Item</MenuItem>
 *
 * ## Custom IconButton Variants
 *
 * @variant mobileNavIcon
 * @description Mobile nav action icons (search, cart, login, back)
 * @usage <IconButton variant="mobileNavIcon"><SearchIcon /></IconButton>
 *
 * @variant hamburgerToggle
 * @description Hamburger menu toggle button with hover effects
 * @usage <IconButton variant="hamburgerToggle"><MenuIcon /></IconButton>
 */

import { spacing } from '../tokens/spacing';
import { navigation } from '../semantic/navigation';

export const navigationOverrides = {
  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: navigation.background.default,
        // Use actual CSS properties with breakpoints
        paddingTop: spacing.xs3,
        paddingBottom: spacing.xs3,
        [theme.breakpoints.up('md')]: {
          paddingLeft: spacing.xl,
          paddingRight: spacing.xl,
        },
        [theme.breakpoints.up('lg')]: {
          paddingLeft: spacing.xl2,
          paddingRight: spacing.xl2,
        },
        [theme.breakpoints.up('xl')]: {
          paddingLeft: spacing.xl3,
          paddingRight: spacing.xl3,
        },
      }),
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
          color: navigation.text.secondary,
          '&:hover': {
            backgroundColor: navigation.background.hover,
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
      {
        props: { variant: 'navAction' },
        style: {
          color: navigation.text.primary,
          backgroundColor: 'transparent',
          paddingRight: 0,
          // "& .MuiSvgIcon-root":{
          //   fontSize:'',
          // }
        },
      },
      // navPrimary: Main nav buttons, MegaMenu triggers, conditional nav links
      {
        props: { variant: 'navPrimary' },
        style: {
          color: navigation.text.inverse,
          textTransform: 'none',
          padding: 0,
          '&:hover': {
            backgroundColor: 'transparent',
            color: navigation.text.inverse,
            opacity: 0.8,
          },
          '& .MuiButton-endIcon ': {
            marginRight: 0,
            marginLeft: 0,
          },
          '& .MuiSvgIcon-root': {
            color: navigation.text.inverse,
          },
        },
      },
      // navViewAll: "View All X" action buttons with bottom margin
      {
        props: { variant: 'navViewAll' },
        style: {
          color: navigation.button.color,
          textTransform: 'none',
          paddingTop: 0,
          marginBottom: spacing.sm,
        },
      },
      // topNavAction: Top navigation action buttons (search, cart, account)
      {
        props: { variant: 'topNavAction' },
        style: {
          color: navigation.text.inverse,
          textTransform: 'none',
          padding: 0,
          justifyContent: 'center',
          borderRadius: spacing.xs2,
          overflow: 'hidden', // Contain ripple effect within button boundary
          transition: 'background-color 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          '&:focus-visible': {
            outline: `2px solid ${navigation.text.inverse}`,
            outlineOffset: '2px',
          },
          "& .MuiButton-startIcon": {
            margin: 0,
            marginRight: spacing.xs3,
          },
          "& .MuiSvgIcon-root": {
            color: navigation.text.inverse,
          },
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
          borderBottom: `1px solid ${navigation.border.subtle}`,
        },
      },
      // navHeading: Menu section headings (e.g., "Core Principles", "Location")
      {
        props: { variant: 'navHeading' },
        style: {
          marginBottom: spacing.xs,
          fontWeight: 'bold',
          cursor: 'pointer',
        },
      },
      // mobileNavTitle: Mobile navigation panel title (Phase 7 - US4)
      {
        props: { variant: 'mobileNavTitle' },
        style: {
          flex: 1,
          fontSize: '1.1rem',
          fontWeight: '500',
          color: navigation.mobile.title,
        },
      },
      // topnavlink: Top navigation link text (used in topNavAction buttons)
      {
        props: { variant: 'topnavlink' },
        style: {
          color: navigation.text.inverse,
        },
      },
      // navlink: Main navigation link text (used in navPrimary buttons)
      {
        props: { variant: 'navlink' },
        style: {
          color: navigation.text.inverse,
        },
      },
    ],
  },

  // Mobile Navigation IconButton Variants (Phase 7 - US4)
  MuiIconButton: {
    variants: [
      // mobileNavIcon: Mobile nav action icons (search, cart, login, back)
      {
        props: { variant: 'mobileNavIcon' },
        style: {
          padding: '6px',
          color: navigation.mobile.icon,
        },
      },
      // hamburgerToggle: Hamburger menu toggle button
      {
        props: { variant: 'hamburgerToggle' },
        style: {
          borderRadius: spacing.sm,
          paddingLeft: spacing.xs,
          paddingRight: spacing.xs,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          border: 0,
          zIndex: 10000,
          '&:hover': {
            boxShadow: 'var(--Paper-shadow)',
            backgroundColor: navigation.hamburger.hover.background,
            transition: 'all 0.1s ease-in',
          },
        },
      },
    ],
  },
  MuiSvgIcon: {
    styleOverrides: {
      root: {
        color: navigation.mobile.icon,
      },
    },
  }

};

export default navigationOverrides;
