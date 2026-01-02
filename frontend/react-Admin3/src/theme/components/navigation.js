// Navigation Component Overrides (AppBar, Tabs, Menu)
import colorTheme from '../colorTheme';

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
};

export default navigationOverrides;
