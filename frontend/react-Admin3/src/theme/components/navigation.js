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
import { fontSizes, fontWeights, fontFamilies  } from '../tokens/typography';
import { iconSizes } from '../tokens/icons'
import { shadows } from '../tokens/shadows'

const important = (value) => `${value} !important`;

export const navigationOverrides = {
  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: navigation.background.default,
        // Use actual CSS properties with breakpoints
        paddingTop: spacing.xs[3],
        paddingTop: spacing.xs[3],
        paddingBottom: spacing.xs[1],
        [theme.breakpoints.up('md')]: {
          paddingLeft: spacing.xl[1],
          paddingRight: spacing.xl[1],
        },
        [theme.breakpoints.up('lg')]: {
          paddingLeft: spacing.xl[2],
          paddingRight: spacing.xl[2],
        },
        [theme.breakpoints.up('xl')]: {
          paddingLeft: spacing.xl[3],
          paddingRight: spacing.xl[3],
        },
      }),
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {},
    },
    variants: [
      {
        props: { variant: 'navmenu' },
        style: {
          color: navigation.text.primary,
          '&:hover': {
            borderLeft: `3px solid ${navigation.text.hover}`,
            backgroundColor: navigation.background.hover,
            boxShadow: shadows.dark[1],
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
  // Navigation Button Variants
  MuiButton: {
    styleOverrides: {
      root: {
        '& .MuiSvgIcon-root': {
          color: navigation.button.icon,
        },
        '& .MuiButton-icon': {
          marginRight: spacing.xs[2],
        }
      },
    },
    variants: [
      {
        props: { variant: 'navAction' },
        style: {
          color: navigation.text.primary,
          backgroundColor: 'transparent',
          paddingRight: 0,
          '& .MuiSvgIcon-root': {
            fontSize: iconSizes.sm,
          },
        },
      },
      // navPrimary: Main nav buttons, MegaMenu triggers, conditional nav links
      {
        props: { variant: 'navPrimary' },
        style: {
          textTransform: 'none',
          padding: 0,
          color: navigation.text.hover,
          '&:hover': {
            backgroundColor: 'transparent',
            color: navigation.text.hover,
            opacity: 0.8,
          },
          '& .MuiButton-endIcon ': {
            marginRight: 0,
            marginLeft: 0,
          },
        },
      },
      // navViewAll: "View All X" action buttons with bottom margin
      {
        props: { variant: 'navViewAll' },
        style: {
          textTransform: 'none',
          padding: 0,
          borderRadius: 0,
          borderBottom: `1px solid ${navigation.border.subtle}`,
        },
      },
      // topNavAction: Top navigation action buttons (search, cart, account)
      {
        props: { variant: 'topNavAction' },
        style: {
          color: navigation.text.primary,
          textTransform: 'none',
          padding: 0,
          paddingleft: spacing.xs[3],
          paddingRight: spacing.xs[3],
          justifyContent: 'center',
          borderRadius: spacing.xs[2],
          overflow: 'hidden',
          transition: 'background-color 0.2s ease-in-out',
          minWidth: 'auto',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          '&:focus-visible': {
            outline: `2px solid ${navigation.text.inverse}`,
            outlineOffset: '2px',
          },
          "& .MuiButton-startIcon": {
            margin: 0,
            marginRight: spacing.xs[5],
            '& .MuiSvgIcon-root': {
              fontSize: iconSizes.xs,
            },

          },
        },
      },
    ],
  },

  // Navigation Typography Variants
  MuiTypography: {
    variants: [
      {
        props: { variant: 'topnavlink' },
        style: {
          fontFamily: fontFamilies.inter,
          fontWeight: fontWeights.extralight,
          fontSize: important(fontSizes.body.small),
          lineHeight: important(lineHeights.tall),
          letterSpacing: important(letterSpacing.scale[80]),
          textWrap: "balance",
        }
      },
      {
        props: { variant: 'mainnavlink' },
        style: {
          fontFamily: fontFamilies.inter,
          fontWeight: fontWeights.light,
          fontSize: important(fontSizes.heading[90]),
          lineHeight: important(lineHeights.normal),
          letterSpacing: important(letterSpacing.normal),
          textTransform: 'none',
          position: "static",
          top: "6.235em",
        }
      },
      {
        props: {
          variant: 'meganavlink',
          style: {
            fontFamily: fontFamilies.inter,
            fontWeight: fontWeights.light,
            fontSize: important(fontSizes.body.medium),
            lineHeight: important(lineHeights.tall),
            letterSpacing: important(letterSpacing.scale[80]),
            textWrap: "balance",
            color: navigation.text.primary,
          }
        }
      },
      // navViewAllText: Underlined text for "View All" links
      {
        props: { variant: 'navViewAllText' },
        style: {
          color: navigation.text.primary,
          fontSize: fontSizes.heading[90],
          paddingBottom: 1,

        },
      },
      // navHeading: Menu section headings (e.g., "Core Principles", "Location")
      {
        props: { variant: 'navHeading' },
        style: {
          marginBottom: 1,
          fontWeight: fontWeights.regular,
          cursor: 'pointer',
          color: navigation.text.secondary,
          borderBottom: `1px solid ${navigation.border.subtle}`,
        },
      },
      // mobileNavTitle: Mobile navigation panel title (Phase 7 - US4)
      {
        props: { variant: 'mobileNavTitle' },
        style: {
          flex: 1,
          fontSize: '1.1rem',
          fontWeight: '500',
          color: 'red'
        },
      },
      //mainnavlink: Main navigation link text (used in navPrimary buttons)
      {
        props: { variant: 'mainnavlink' },
        style: {
          color: navigation.text.primary,
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
          color: navigation.text.primary
        },
      },
      // hamburgerToggle: Hamburger menu toggle button
      {
        props: { variant: 'hamburgerToggle' },
        style: {
          borderRadius: spacing.sm,
          paddingLeft: spacing.xs[1],
          paddingRight: spacing.xs[1],
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
};

export default navigationOverrides;
