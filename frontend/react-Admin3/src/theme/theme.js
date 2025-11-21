import { createTheme } from "@mui/material/styles";
import "../styles/liftkit-css/globals.css";
import colorTheme from "./colorTheme.js";
import liftKitTheme from "./liftKitTheme.js";

// Gradient utility function for interactive headers
const createGradientStyle = (mousePosition, isHovered, colorScheme) => {
   const { x, y } = mousePosition;
   const intensity = isHovered ? 0.15 : 0.03;
   const gradientAngle = Math.atan2(y - 50, x - 50) * (180 / Math.PI);

   return {
      background: `linear-gradient(${gradientAngle}deg,
			rgba(${colorScheme.primary}, ${intensity}) 0%,
			rgba(${colorScheme.secondary}, ${intensity * 0.7}) 30%,
			rgba(255, 255, 255, 0) 60%,
			rgba(${colorScheme.accent}, ${intensity * 0.5}) 100%)`,
      transition: isHovered
         ? "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
         : "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
   };
};

// base theme with breakpoints
const baseTheme = createTheme({
   breakpoints: {
      values: {
         xs: 0,
         sm: 600,
         md: 960,
         lg: 1280,
         xl: 1920,
      },
   },
});

//  custom theme
const theme = createTheme({
   ...baseTheme,
   typography: {
      fontFamily: [
         "Inter",
         "Poppins",
         "DM Sans Variable",
         "-apple-system",
         "BlinkMacSystemFont",
         '"Segoe UI"',
         "Roboto",
         '"Helvetica Neue"',
         "Arial",
         "sans-serif",
         '"Apple Color Emoji"',
         '"Segoe UI Emoji"',
         '"Segoe UI Symbol"',
      ].join(","),

      // Customize font weights and sizes
      BPP: {
         fontFamily: "'Inter', sans-serif",
         fontWeight: 600,
         fontSize:
            "calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep)) !important",
         lineHeight: "var(--halfstep-dec) !important",
         letterSpacing: "-0.022em",
         fontOpticalSizing: "auto",
         fontStyle: "normal",
         fontVariationSettings: "'wght' 600",
         [baseTheme.breakpoints.down("sm")]: {
            fontSize:
               "calc(1em * var(--wholestep) * var(--wholestep) * var(--halfstep)) !important",
            textAlign: "start",
            lineHeight:
               "calc(1em * var(--wholestep-dec) * var(--eighthstep)) !important",
         },
      },
      Acted: {
         fontFamily: "'Inter', sans-serif",
         fontWeight: 200,
         fontSize: "calc(1em * var(--wholestep) * var(--wholestep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.022em !important",
         fontOpticalSizing: "auto",
         fontStyle: "normal",
         fontVariationSettings: "'wght' 200",
         marginTop:
            "calc( var(--2xs) / var(--halfstep) / var(--halfstep) / var(--eighthstep))",
         [baseTheme.breakpoints.down("sm")]: {
            fontSize:
               "calc(1em * var(--wholestep) * var(--halfstep)) !important",
            textAlign: "start",
            lineHeight:
               "calc(1em * var(--wholestep-dec) * var(--quarterstep)  * var(--eighthstep) * var(--eighthstep)) !important",
            marginBottom: liftKitTheme.spacing.xs3,
         },
      },
      h1: {
         fontFamily: "'Inter', sans-serif",
         fontWeight: 400,
         fontSize:
            "calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep)) !important",
         lineHeight: "var(--quarterstep) !important",
         letterSpacing: "-0.022em !important",
      },
      h2: {
         fontFamily: "'Inter', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em * var(--wholestep) * var(--wholestep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.022em !important",
      },
      h3: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em * var(--wholestep) * var(--halfstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.022em !important",
         [baseTheme.breakpoints.down("sm")]: {
            fontSize:
               "calc(1em * var(--wholestep) * var(--eighthstep)) !important",
         },
      },
      price: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em * var(--wholestep) * var(--halfstep)) !important",
         lineHeight: "1 !important",
         letterSpacing: "-0.022em !important",
         [baseTheme.breakpoints.down("sm")]: {
            fontSize:
               "calc(1em * var(--wholestep) * var(--eighthstep)) !important",
         },
      },
      h4: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em * var(--wholestep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.02em !important",
      },
      h5: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em * var(--halfstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.017em !important",
      },
      h6: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 600,
         fontSize: "calc(1em * var(--quarterstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.014em !important",
      },
      subtitle1: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em / var(--quarterstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.007em !important",
      },
      subtitle2: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em / var(--halfstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.007em !important",
      },
      body1: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "1em !important",
         lineHeight: "var(--wholestep) !important",
         letterSpacing: "-0.011em !important",
      },
      body2: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em / var(--quarterstep)) !important",
         lineHeight: "calc(var(--wholestep) / var(--quarterstep)) !important",
         letterSpacing: "-0.011em !important",
      },
      button: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 500,
         fontSize: "calc( 1em * var(--eighthstep) )!important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.004em !important",
         textTransform: "none",
         position: "static",
         top: "6.235em",
      },
      caption: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em / var(--halfstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.007em !important",
      },
      caption2: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize:
            "calc(1em / var(--halfstep) / var(--quarterstep) ) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.007em !important",
      },
      overline: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em / var(--halfstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "0.0618em !important",
         textTransform: "uppercase",
      },
      fineprint: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 200,
         fontSize:
            "calc(1em /  var(--halfstep)/  var(--quarterstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.007em !important",
      },
   },

   // Enhanced palette with BPP Color System, Material Design 3, and Liftkit colors
   palette: {
      // Core Material-UI palette using Liftkit colors
      primary: colorTheme.primary,
      secondary: colorTheme.secondary,
      tertiary: colorTheme.tertiary,
      error: colorTheme.error,
      warning: colorTheme.warning,
      info: colorTheme.info,
      success: colorTheme.success,
      background: colorTheme.background,
      surface: colorTheme.surface,
      text: colorTheme.text,
      offwhite: colorTheme.offwhite,
      // BPP Color System
      bpp: colorTheme.bpp,

      // Material Design 3 System Colors
      md3: colorTheme.md3,

      // Liftkit Light Theme
      liftkit: colorTheme.liftkit,
   },

   // Optional: Customize components to better use Inter
   components: {
      MuiDivider: {
         styleOverrides: {
            root: {
               borderColor: colorTheme.bpp.granite["050"],
               opacity: 0.5,
            },
         },
      },
      MuiFormHelperText: {
         styleOverrides: {
            root: {
               marginTop: liftKitTheme.spacing.xs2,
            },
         },
      },
      MuiButton: {
         styleOverrides: {
            root: {},
            variants: [
               {
                  props: { variant: "transparent-background" },
                  style: {
                     fontFamily: "'Inter', 'Poppins', sans-serif",
                     fontWeight: 500,
                     textTransform: "none",
                     borderRadius: 6,
                     width: "auto",
                     height: liftKitTheme.typography.title1.fontSize,
                     alignItems: "center",
                     justifyContent: "center",
                     "& .MuiButton-startIcon": {
                        fontSize: liftKitTheme.typography.heading.fontSize,
                        "& .MuiSvgIcon-root": {
                           fontSize: liftKitTheme.typography.title3.fontSize,
                        },
                     },
                     "&:hover": {
                        boxShadow: "var(--Paper-shadow)",
                        backdropFilter: "brightness(1.26)",
                     },
                     backgroundColor: "transparent",
                     boxShadow: "none",
                  },
               },
            ],
         },
      },
      MuiTextField: {
         styleOverrides: {
            root: {
               marginBottom: liftKitTheme.spacing.sm,
               "& .MuiInputBase-input": {
                  color: colorTheme.liftkit.light.onSurface,
               },
            },
         },
         variants: [
            {
               props: { variant: "filled" },
               style: {},
            },
         ],
      },
      MuiTypography: {
         styleOverrides: {
            root: {
               fontFamily: "'Inter', 'Poppins', sans-serif",
               color: colorTheme.liftkit.light.onSurface,
            },
         },
      },
      MuiSpeedDial: {
         styleOverrides: {
            root: {
               "& .MuiFab-root": {
                  minWidth: liftKitTheme.spacing.xl15,
                  minHeight: liftKitTheme.spacing.xl15,
                  width: liftKitTheme.spacing.xl15,
                  height: liftKitTheme.spacing.xl15,
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
      MuiInputBase: {
         styleOverrides: {
            root: {
               fontFamily: "'Inter', 'Poppins', sans-serif",
            },
         },
      },
      MuiMenuItem: {
         styleOverrides: {
            root: {
               fontFamily: "'Inter', 'Poppins', sans-serif",
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
      // Product Card Variants
      MuiCard: {
         styleOverrides: {
            root: {
               backgroundColor:
                  "var(--md-sys-color-surface-container-lowest_lkv)",
            },
         },
         variants: [
            // base product card variant
            {
               props: { variant: "product" },
               style: {
                  minWidth: "20rem",
                  maxWidth: "20rem",
                  height: "31.6rem !important",
                  overflow: "visible",
                  aspectRatio: "5/7",
                  boxShadow: "var(--Paper-shadow)",
                  justifyContent: "space-between",
                  position: "relative",
                  transform: "scale(0.7)",

                  // Floating badges
                  "& .floating-badges-container": {
                     position: "absolute",
                     top: "calc(var(--product-card-header-height) - var(--badge-height) / 1.618)",
                     right: liftKitTheme.spacing.sm,
                     zIndex: 10,
                     display: "flex",
                     gap: liftKitTheme.spacing.xs2,
                     pointerEvents: "none",
                     "& .subject-badge": {
                        backgroundColor: colorTheme.bpp.cobalt["060"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                     "& .session-badge": {
                        backgroundColor: colorTheme.bpp.mint["030"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                  },
                  // Product Header
                  "& .product-header": {
                     height: "7.43rem",
                     width: "100%",
                     padding: "1rem",
                     boxShadow: "var(--shadow-sm)",
                     display: "flex",
                     flexDirection: "row",
                     alignItems: "center",
                     justifyContent: "flex-start",
                     flex: "0 0 auto",
                     "& .MuiCardHeader-content": {
                        order: 1,
                        flex: "1",
                        "& .product-title": {
                           width: "90%",
                           textAlign: "left",
                        },
                        "& .product-subtitle": {},
                     },
                     "& .MuiCardHeader-avatar": {
                        order: 2,
                        marginLeft: "auto",
                        marginRight: "0",
                        "& .product-avatar": {
                           boxShadow: "var(--Paper-shadow)",
                           "& .product-avatar-icon": {
                              fontSize: "1.5rem",
                           },
                        },
                     },
                  },

                  //  content styling
                  "& .MuiCardContent-root": {
                     padding: liftKitTheme.spacing.md,
                     paddingTop: liftKitTheme.spacing.lg,
                     flex: 1,
                     display: "flex",
                     flexDirection: "column",
                     justifyContent: "flex-start",
                     alignSelf: "flex-start",
                     width: "100%",
                  },

                  //  actions styling
                  "& .MuiCardActions-root": {
                     height: "10.2rem !important",
                     boxShadow: "var(--shadow-lg)",
                     paddingTop: liftKitTheme.spacing.md,
                     paddingLeft: liftKitTheme.spacing.md,
                     paddingRight: liftKitTheme.spacing.md,
                     flexDirection: "column",
                     alignItems: "stretch",
                     justifyContent: "space-between",
                     display: "flex",
                     width: "100%",
                     // Price & Action Section
                     "& .price-container": {
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "end",

                        // Discount Options
                        "& .discount-options": {
                           display: "flex",
                           flex: 1,
                           alignSelf: "flex-start",
                           flexDirection: "column",
                           alignItems: "start",
                           justifyContent: "start",
                           textAlign: "left",
                           paddingLeft: liftKitTheme.spacing.sm,
                           paddingRight: liftKitTheme.spacing.md,
                           "& .discount-title": {
                              textAlign: "left",
                           },
                           "& .discount-radio-group": {
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              justifyContent: "flex-start",
                              marginLeft: liftKitTheme.spacing.sm,
                              "& .discount-radio-option": {
                                 padding: liftKitTheme.spacing.xs2,
                                 paddingBottom: 0,
                                 width: "100%",
                                 transition: "all 0.2s ease-in-out",

                                 "&:hover": {
                                    boxShadow: "var(--Paper-shadow)",
                                    backdropFilter: "saturate(2.4)",
                                 },

                                 "& .MuiRadio-root": {
                                    // padding: liftKitTheme.spacing.sm,
                                    width: liftKitTheme.spacing.md,
                                    height: liftKitTheme.spacing.md,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    "& .MuiSvgIcon-root": {
                                       fontSize: liftKitTheme.spacing.md,
                                    },
                                 },

                                 "& .discount-label": {
                                    paddingLeft: liftKitTheme.spacing.xs,
                                 },
                              },
                           },
                        },
                        "& .price-action-section": {
                           flex: 1,
                           display: "flex",
                           flexDirection: "column",
                           "& .price-info-row": {
                              display: "flex",
                              alignItems: "baseline",
                              alignSelf: "flex-end",
                              "& .price-display": {
                                 lineHeight: 1,
                              },

                              "& .info-button": {
                                 minWidth: "auto",
                                 borderRadius: "50%",
                                 paddingBottom: 0,
                                 "&:hover": {
                                    backdropFilter: "saturate(2.4)",
                                    boxShadow: "var(--Paper-shadow)",
                                    transform: "translateY(-1px)",
                                 },

                                 "& .MuiSvgIcon-root": {
                                    fontSize: "1.2rem",
                                 },
                              },
                           },
                           "& .price-details-row": {
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              "& .price-level-text": {
                                 display: "block",
                                 textAlign: "right",
                              },
                              "& .vat-status-text": {
                                 display: "block",
                                 textAlign: "right",
                              },
                           },
                           "& .add-to-cart-button": {
                              alignSelf: "flex-end",
                              borderRadius: "50%",
                              minWidth: liftKitTheme.spacing.xl15,
                              minHeight: liftKitTheme.spacing.xl15,
                              width: liftKitTheme.spacing.xl15,
                              height: liftKitTheme.spacing.xl15,
                              padding: liftKitTheme.spacing.sm,
                              /* marginLeft: liftKitTheme.spacing.md,
                              marginRight: liftKitTheme.spacing.md,*/
                              marginTop: liftKitTheme.spacing.sm,
                              boxShadow: "var(--Paper-shadow)",
                              transition: "all 0.15s ease-in-out",
                              "&:hover": {
                                 boxShadow: "var(--Paper-shadow)",
                                 transform: "scale(1.05)",
                                 filter: "saturate(2)",
                              },

                              "& .MuiSvgIcon-root": {
                                 fontSize: "1.6rem",
                              },
                           },
                        },
                     },
                  },
               },
            },
            // Tutorial Product Card Variant
            {
               props: { variant: "product", productType: "tutorial" },
               style: {
                  minWidth: "20rem",
                  maxWidth: "20rem",
                  height: "31.6rem !important",
                  overflow: "visible",
                  aspectRatio: "5/7",
                  boxShadow: "var(--Paper-shadow)",
                  justifyContent: "space-between",
                  position: "relative",

                  // Floating badges
                  "& .floating-badges-container": {
                     position: "absolute",
                     top: "calc(var(--product-card-header-height) - var(--badge-height) / 1.618)",
                     right: liftKitTheme.spacing.sm,
                     zIndex: 10,
                     display: "flex",
                     gap: liftKitTheme.spacing.xs2,
                     pointerEvents: "none",
                     "& .subject-badge": {
                        backgroundColor: colorTheme.bpp.cobalt["060"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                     "& .session-badge": {
                        backgroundColor: colorTheme.bpp.mint["030"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                  },
                  // Product Header
                  "& .product-header": {
                     backgroundColor: colorTheme.bpp.purple["020"],
                     color: "#ffffff",

                     height: "7.43rem",
                     padding: "1rem",
                     boxShadow: "var(--shadow-sm)",
                     display: "flex",
                     flexDirection: "row",
                     alignItems: "center",
                     justifyContent: "flex-start",
                     flex: "0 0 auto",
                     "& .MuiCardHeader-content": {
                        order: 1,
                        flex: "1",
                        "& .product-title": {
                           width: "90%",
                           textAlign: "left",
                           color: colorTheme.bpp.sky["100"],
                        },
                        "& .product-subtitle": {
                           color: colorTheme.bpp.sky["090"],
                        },
                     },
                     "& .MuiCardHeader-avatar": {
                        order: 2,
                        marginLeft: "auto",
                        marginRight: "0",
                        "& .product-avatar": {
                           backgroundColor: colorTheme.bpp.granite["020"],
                           boxShadow: "var(--Paper-shadow)",
                           "& .product-avatar-icon": {
                              fontSize: "1.5rem",
                              color: colorTheme.bpp.purple["090"],
                           },
                        },
                     },
                  },
                  //  content styling
                  "& .MuiCardContent-root": {
                     padding: liftKitTheme.spacing.md,
                     paddingTop: liftKitTheme.spacing.lg,
                     // Chips section
                     "& .product-chips": {
                        display: "flex",
                        gap: liftKitTheme.spacing.sm,
                        marginBottom: liftKitTheme.spacing.md,

                        "& .MuiChip-root": {
                           boxShadow: "var(--Paper-shadow)",
                           "& .MuiChip-label": {
                              fontWeight:
                                 liftKitTheme.typography.overline.fontWeight,
                              paddingX: liftKitTheme.spacing.md,
                              paddingY: liftKitTheme.spacing.xs,
                           },
                        },
                     },

                     // Tutorial info section
                     "& .tutorial-info-section": {
                        display: "flex",
                        flexDirection: "column",
                        textAlign: "left",
                        marginBottom: liftKitTheme.spacing.md,
                        marginLeft: liftKitTheme.spacing.sm,
                        marginRight: liftKitTheme.spacing.sm,
                        "& .info-row": {
                           display: "flex",
                           marginBottom: liftKitTheme.spacing.sm,
                           alignItems: "flex-start",
                           textAlign: "left",
                           "& .info-title": {
                              marginBottom: liftKitTheme.spacing.xs2,
                           },
                           "& .info-icon": {
                              fontSize: "16px",
                              color: colorTheme.bpp.purple["090"],
                              marginRight: liftKitTheme.spacing.xs2,
                           },

                           "& .info-text": {
                              color: colorTheme.bpp.purple["100"],
                              fontWeight: "600",
                           },
                        },

                        "& .info-sub-text": {
                           color: colorTheme.bpp.purple["090"],
                           marginLeft: liftKitTheme.spacing.md,
                           fontWeight: "500",
                        },
                     },
                  },

                  //  actions styling
                  "& .MuiCardActions-root": {
                     backgroundColor: colorTheme.bpp.purple["030"],
                     // Price & Action Section
                     "& .price-container": {
                        // Discount Options
                        "& .discount-options": {
                           "& .discount-title": {
                              color: colorTheme.bpp.purple["100"],
                           },
                           "& .discount-radio-group": {
                              "& .discount-radio-option": {
                                 color: colorTheme.bpp.purple["100"],

                                 "&:hover": {},

                                 "& .MuiRadio-root": {
                                    color: colorTheme.bpp.purple["090"],

                                    "& .MuiSvgIcon-root": {},
                                 },

                                 "& .discount-label": {
                                    color: colorTheme.bpp.purple["100"],
                                 },
                              },
                           },
                        },
                        "& .price-action-section": {
                           "& .price-info-row": {
                              "& .price-display": {
                                 color: colorTheme.bpp.purple["100"],
                              },

                              "& .info-button": {
                                 "&:hover": {},

                                 "& .MuiSvgIcon-root": {},
                              },
                           },
                           "& .price-details-row": {
                              "& .price-level-text": {},
                              "& .vat-status-text": {},
                           },
                           "& .add-to-cart-button": {
                              color: "white",
                              backgroundColor: colorTheme.bpp.purple["050"],

                              "&:hover": {
                                 backgroundColor: colorTheme.bpp.purple["070"],
                              },

                              "& .MuiSvgIcon-root": {},
                           },
                        },
                     },
                  },
               },
            },

            // Material Product Card Variant Overrides
            {
               props: { variant: "product", productType: "material" },
               style: {
                  // Product Header
                  "& .product-header": {
                     backgroundColor: colorTheme.bpp.sky["020"],
                     color: "#ffffff",

                     "& .MuiCardHeader-content": {
                        "& .product-title": {
                           color: colorTheme.bpp.sky["100"],
                        },
                        "& .product-subtitle": {
                           color: colorTheme.bpp.sky["090"],
                        },
                     },
                     "& .MuiCardHeader-avatar": {
                        "& .product-avatar": {
                           backgroundColor: colorTheme.bpp.granite["020"],
                           "& .product-avatar-icon": {
                              color: colorTheme.bpp.sky["090"],
                           },
                        },
                     },
                  },

                  //  content styling
                  "& .MuiCardContent-root": {
                     // Product Variations
                     "& .product-variations": {
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "start",
                        justifyContent: "start",
                        textAlign: "left",
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,

                        "& .variations-title": {
                           marginBottom: liftKitTheme.spacing.xs2,
                           textAlign: "left",
                           color: colorTheme.bpp.sky["100"],
                        },

                        "& .variations-group": {
                           display: "flex",
                           flexDirection: "column",
                           alignItems: "flex-start",
                           justifyContent: "flex-start",
                           width: "100%",
                           "& .variation-option": {
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 1,
                              padding: liftKitTheme.spacing.sm,
                              marginBottom: liftKitTheme.spacing.xs2,
                              marginLeft: liftKitTheme.spacing.xs2,
                              width: "100%",
                              color: colorTheme.bpp.sky["100"],
                              transition: "all 0.2s ease-in-out",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              "& .MuiRadio-root": {
                                 padding: liftKitTheme.spacing.sm,
                                 width: liftKitTheme.spacing.md,
                                 height: liftKitTheme.spacing.md,
                                 color: colorTheme.bpp.sky["090"],
                                 alignItems: "center",
                                 justifyContent: "center",
                              },
                              "& .MuiSvgIcon-root": {
                                 fontSize: liftKitTheme.spacing.md,
                              },
                              "&:hover": {
                                 boxShadow: "var(--Paper-shadow)",
                                 backdropFilter: "saturate(2.4)",
                              },
                              "& .variation-control": {
                                 margin: 0,
                                 flex: 1,
                              },
                              "& .variation-label": {
                                 marginLeft: liftKitTheme.spacing.xs,
                              },
                              "& .variation-price": {
                                 paddingRight: liftKitTheme.spacing.md,
                              },
                              // Buy Both specific styling
                              "&.buy-both-option": {
                                 borderColor: "secondary.main",
                                 backgroundColor: "rgba(156, 39, 176, 0.05)", // Light secondary color
                                 "& .MuiRadio-root": {
                                    color: "secondary.main",
                                 },
                                 "& .buy-both-label": {
                                    fontWeight: 600,
                                    color: "secondary.main",
                                 },
                                 "& .buy-both-price": {
                                    color: "secondary.main",
                                    fontWeight: 600,
                                 },
                              },
                           },
                        },
                     },
                  },

                  //  actions styling
                  "& .MuiCardActions-root": {
                     backgroundColor: colorTheme.bpp.sky["030"],
                     // Price & Action Section
                     "& .price-container": {
                        // Discount Options
                        "& .discount-options": {
                           "& .discount-title": {
                              color: colorTheme.bpp.sky["100"],
                           },
                           "& .discount-radio-group": {
                              "& .discount-radio-option": {
                                 color: colorTheme.bpp.sky["100"],
                                 "&:hover": {},

                                 "& .MuiRadio-root": {
                                    color: colorTheme.bpp.sky["090"],
                                    "& .MuiSvgIcon-root": {},
                                 },

                                 "& .discount-label": {
                                    color: colorTheme.bpp.sky["100"],
                                 },
                              },
                           },
                        },
                        "& .price-action-section": {
                           "& .price-info-row": {
                              "& .price-display": {
                                 color: colorTheme.bpp.sky["100"],
                                 lineHeight: 1,
                              },

                              "& .info-button": {
                                 "&:hover": {},
                                 "& .MuiSvgIcon-root": {},
                              },
                           },
                           "& .price-details-row": {
                              "& .price-level-text": {},
                              "& .vat-status-text": {},
                           },
                           "& .add-to-cart-button": {
                              color: "white",
                              backgroundColor: colorTheme.bpp.sky["060"],

                              "&:hover": {
                                 backgroundColor: colorTheme.bpp.sky["080"],
                              },

                              "& .MuiSvgIcon-root": {
                                 color: "white",
                              },
                           },
                        },
                     },
                  },
               },
            },

            // Bundle Product Card Variant
            {
               props: { variant: "product", productType: "bundle" },
               style: {
                  minWidth: "20rem",
                  maxWidth: "20rem",
                  height: "31.6rem !important",
                  overflow: "visible",
                  aspectRatio: "5/7",
                  boxShadow: "var(--Paper-shadow)",
                  justifyContent: "space-between",
                  position: "relative",

                  // Floating badges
                  "& .floating-badges-container": {
                     position: "absolute",
                     top: "calc(var(--product-card-header-height) - var(--badge-height) / 1.618)",
                     right: liftKitTheme.spacing.sm,
                     zIndex: 10,
                     display: "flex",
                     gap: liftKitTheme.spacing.xs2,
                     pointerEvents: "none",
                     "& .subject-badge": {
                        backgroundColor: colorTheme.bpp.cobalt["060"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                     "& .session-badge": {
                        backgroundColor: colorTheme.bpp.mint["030"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                  },
                  // Product Header
                  "& .product-header": {
                     backgroundColor: colorTheme.bpp.green["030"],
                     color: "#ffffff",

                     height: "var(--product-card-header-height)",
                     padding: "1rem",
                     boxShadow: "var(--shadow-sm)",
                     display: "flex",
                     flexDirection: "row",
                     alignItems: "center",
                     justifyContent: "flex-start",
                     flex: "0 0 auto",
                     "& .MuiCardHeader-content": {
                        order: 1,
                        flex: "1",
                        "& .product-title": {
                           width: "90%",
                           textAlign: "left",
                           color: colorTheme.bpp.green["100"],
                           "& .title-info-button": {
                              minWidth: "auto",
                              padding: liftKitTheme.spacing.xs2,
                              borderRadius: "50%",
                              color: colorTheme.bpp.green["080"],
                              "&:hover": {
                                 backdropFilter: "saturate(2.4)",
                                 boxShadow: "var(--Paper-shadow)",
                                 transform: "translateY(-1px)",
                              },
                              "& .MuiSvgIcon-root": {
                                 fontSize: "1.2rem",
                              },
                           },
                        },
                        "& .product-subtitle-container": {
                           display: "flex",
                           alignItems: "center",
                           gap: liftKitTheme.spacing.xs,
                           "& .product-subtitle": {
                              color: colorTheme.bpp.green["090"],
                           },
                           "& .subtitle-info-button": {
                              minWidth: "auto",
                              padding: liftKitTheme.spacing.xs2,
                              borderRadius: "50%",
                              color: colorTheme.bpp.green["050"],
                              "&:hover": {
                                 backgroundColor: "rgba(255, 255, 255, 0.1)",
                              },
                              "& .MuiSvgIcon-root": {
                                 fontSize: "1rem",
                              },
                           },
                        },
                     },
                     "& .MuiCardHeader-avatar": {
                        order: 2,
                        marginLeft: "auto",
                        marginRight: "0",
                        "& .product-avatar": {
                           backgroundColor: colorTheme.bpp.granite["020"],
                           boxShadow: "var(--Paper-shadow)",
                           "& .product-avatar-icon": {
                              fontSize: "1.5rem",
                              color: colorTheme.bpp.green["090"],
                           },
                        },
                     },
                  },

                  //  content styling
                  "& .MuiCardContent-root": {
                     padding: liftKitTheme.spacing.md,
                     paddingTop: liftKitTheme.spacing.lg,
                     // Chips section
                     "& .product-chips": {
                        display: "flex",
                        gap: liftKitTheme.spacing.sm,
                        marginBottom: liftKitTheme.spacing.md,
                        "& .MuiChip-root": {
                           boxShadow: "var(--Paper-shadow)",
                        },
                     },
                     // Bundle-specific styling
                     "& .bundle-details-title": {
                        color: colorTheme.bpp.green["100"],
                        textAlign: "left",
                        marginBottom: liftKitTheme.spacing.xs3,
                     },
                     "& .MuiList-root": {
                        paddingTop: 0,
                        paddingBottom: 0,
                        "& .MuiListItem-root": {
                           padding: 0,
                           margin: 0,
                           "& .MuiListItemIcon-root": {
                              minWidth: liftKitTheme.typography.caption,
                              "& .MuiSvgIcon-root": {
                                 fontSize: liftKitTheme.typography.caption,
                                 color: colorTheme.bpp.green["080"],
                              },
                           },
                           "& .MuiListItemText-root": {
                              marginBottom: liftKitTheme.spacing.xs3,
                              marginBottom: 0,
                              "& .MuiListItemText-primary": {
                                 color: colorTheme.bpp.green["100"],
                              },
                           },
                        },
                     },
                  },

                  //  actions styling
                  "& .MuiCardActions-root": {
                     backgroundColor: colorTheme.bpp.green["040"],
                     // Price & Action Section
                     "& .price-container": {
                        // Discount Options
                        "& .discount-options": {
                           "& .discount-title": {
                              color: colorTheme.bpp.green["100"],
                           },
                           "& .discount-radio-group": {
                              "& .discount-radio-option": {
                                 color: colorTheme.bpp.green["100"],
                                 "&:hover": {},

                                 "& .MuiRadio-root": {
                                    color: colorTheme.bpp.green["090"],
                                    "& .MuiSvgIcon-root": {},
                                 },

                                 "& .discount-label": {
                                    color: colorTheme.bpp.green["100"],
                                 },
                              },
                           },
                        },

                        "& .price-action-section": {
                           "& .price-info-row": {
                              "& .price-display": {
                                 color: colorTheme.bpp.green["100"],
                                 lineHeight: 1,
                              },
                              "& .info-button": {
                                 color: colorTheme.bpp.green["080"],
                                 "&:hover": {},
                                 "& .MuiSvgIcon-root": {},
                              },
                           },
                           "& .price-details-row": {
                              "& .price-level-text": {},
                              "& .vat-status-text": {},
                           },
                           "& .add-to-cart-button": {
                              color: "white",
                              backgroundColor: colorTheme.bpp.green["060"],

                              "&:hover": {
                                 backgroundColor: colorTheme.bpp.green["080"],
                              },
                              "& .MuiSvgIcon-root": {
                                 color: "white",
                              },
                           },
                        },
                     },
                  },
               },
            },

            // Online Classroom Product Card Variant
            {
               props: { variant: "product", productType: "online-classroom" },
               style: {
                  minWidth: "20rem",
                  maxWidth: "20rem",
                  height: "31.6rem !important",
                  overflow: "visible",
                  aspectRatio: "5/7",
                  boxShadow: "var(--Paper-shadow)",
                  justifyContent: "space-between",
                  position: "relative",

                  // Floating badges
                  "& .floating-badges-container": {
                     position: "absolute",
                     top: "calc(var(--product-card-header-height) - var(--badge-height) / 1.618)",
                     right: liftKitTheme.spacing.sm,
                     zIndex: 10,
                     display: "flex",
                     gap: liftKitTheme.spacing.xs2,
                     pointerEvents: "none",
                     "& .subject-badge": {
                        backgroundColor: colorTheme.bpp.cobalt["060"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                     "& .session-badge": {
                        backgroundColor: colorTheme.bpp.mint["030"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                  },
                  // Product Header
                  "& .product-header": {
                     backgroundColor: colorTheme.bpp.cobalt["030"],
                     color: "#ffffff",

                     height: "7.43rem",
                     padding: "1rem",
                     boxShadow: "var(--shadow-sm)",
                     display: "flex",
                     flexDirection: "row",
                     alignItems: "center",
                     justifyContent: "flex-start",
                     flex: "0 0 auto",
                     "& .MuiCardHeader-content": {
                        order: 1,
                        flex: "1",
                        "& .product-title": {
                           width: "90%",
                           textAlign: "left",
                           color: colorTheme.bpp.cobalt["100"],
                        },
                        "& .product-subtitle": {
                           color: colorTheme.bpp.cobalt["090"],
                        },
                     },
                     "& .MuiCardHeader-avatar": {
                        order: 2,
                        marginLeft: "auto",
                        marginRight: "0",
                        "& .product-avatar": {
                           backgroundColor: colorTheme.bpp.granite["020"],
                           boxShadow: "var(--Paper-shadow)",
                           "& .product-avatar-icon": {
                              fontSize: "1.5rem",
                              color: colorTheme.bpp.cobalt["090"],
                           },
                        },
                     },
                  },

                  //  content styling
                  "& .MuiCardContent-root": {
                     padding: liftKitTheme.spacing.md,
                     paddingTop: liftKitTheme.spacing.lg,
                     // Chips section
                     "& .product-chips": {
                        display: "flex",
                        gap: liftKitTheme.spacing.sm,
                        marginBottom: liftKitTheme.spacing.md,
                        "& .MuiChip-root": {
                           boxShadow: "var(--Paper-shadow)",
                           "& .MuiChip-label": {
                              fontWeight:
                                 liftKitTheme.typography.overline.fontWeight,
                              paddingX: liftKitTheme.spacing.md,
                              paddingY: liftKitTheme.spacing.xs,
                           },
                        },
                     },

                     // Product Variations
                     "& .product-variations": {
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "start",
                        justifyContent: "start",
                        textAlign: "left",
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,

                        "& .variations-title": {
                           marginBottom: liftKitTheme.spacing.xs2,
                           textAlign: "left",
                           color: colorTheme.bpp.cobalt["100"],
                        },

                        "& .variations-group": {
                           display: "flex",
                           flexDirection: "column",
                           alignItems: "flex-start",
                           justifyContent: "flex-start",
                           width: "100%",
                           "& .variation-option": {
                              width: "100%",
                              color: colorTheme.bpp.cobalt["100"],
                              transition: "all 0.2s ease-in-out",
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: liftKitTheme.spacing.xs,
                              padding: liftKitTheme.spacing.md,
                              backgroundColor: "transparent",

                              "&:hover": {
                                 boxShadow: "var(--Paper-shadow)",
                                 backdropFilter: "saturate(2.4)",
                                 borderColor: colorTheme.bpp.cobalt["050"],
                              },
                              "& .MuiRadio-root": {
                                 padding: liftKitTheme.spacing.sm,
                                 width: liftKitTheme.spacing.md,
                                 height: liftKitTheme.spacing.md,
                                 color: colorTheme.bpp.cobalt["090"],
                                 alignItems: "center",
                                 justifyContent: "center",
                                 "& .MuiSvgIcon-root": {
                                    fontSize: liftKitTheme.spacing.md,
                                 },
                              },
                              "& .variation-label": {
                                 marginLeft: liftKitTheme.spacing.xs,
                                 "& .variation-description": {
                                    marginTop: liftKitTheme.spacing.xs,
                                    textAlign: "left",
                                    display: "block",
                                 },
                              },
                           },
                        },
                     },
                  },

                  //  actions styling
                  "& .MuiCardActions-root": {
                     backgroundColor: colorTheme.bpp.cobalt["030"],
                     // Price & Action Section
                     "& .price-container": {
                        // Discount Options
                        "& .discount-options": {
                           "& .discount-title": {
                              color: colorTheme.bpp.cobalt["100"],
                           },
                           "& .discount-radio-group": {
                              "& .discount-radio-option": {
                                 color: colorTheme.bpp.cobalt["100"],

                                 "&:hover": {},

                                 "& .MuiRadio-root": {
                                    color: colorTheme.bpp.cobalt["090"],
                                    "& .MuiSvgIcon-root": {},
                                 },

                                 "& .discount-label": {
                                    color: colorTheme.bpp.cobalt["100"],
                                 },
                              },
                           },
                        },
                        "& .price-action-section": {
                           "& .price-info-row": {
                              "& .price-display": {
                                 color: colorTheme.bpp.cobalt["100"],
                              },
                              "& .info-button": {
                                 "&:hover": {},
                                 "& .MuiSvgIcon-root": {},
                              },
                           },
                           "& .price-details-row": {
                              "& .price-level-text": {},
                              "& .vat-status-text": {},
                           },
                           "& .add-to-cart-button": {
                              color: "white",
                              backgroundColor: colorTheme.bpp.cobalt["055"],
                              "&:hover": {
                                 backgroundColor: colorTheme.bpp.cobalt["070"],
                              },
                              "& .MuiSvgIcon-root": {
                                 color: "white",
                              },
                           },
                        },
                     },
                  },
               },
            },

            // Marking Product Card Variant (Orange theme)
            {
               props: { variant: "product", productType: "marking" },
               style: {
                  minWidth: "20rem",
                  maxWidth: "20rem",
                  height: "31.6rem !important",
                  overflow: "visible",
                  aspectRatio: "5/7",
                  boxShadow: "var(--Paper-shadow)",
                  justifyContent: "space-between",
                  position: "relative",
                  // Floating badges
                  "& .floating-badges-container": {
                     position: "absolute",
                     top: "calc(var(--product-card-header-height) - var(--badge-height) / 1.618)",
                     right: liftKitTheme.spacing.sm,
                     zIndex: 10,
                     display: "flex",
                     gap: liftKitTheme.spacing.xs2,
                     pointerEvents: "none",
                     "& .subject-badge": {
                        backgroundColor: colorTheme.bpp.cobalt["060"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                     "& .session-badge": {
                        backgroundColor: colorTheme.bpp.mint["030"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                  },
                  // Product Header
                  "& .product-header": {
                     backgroundColor: colorTheme.bpp.pink["020"],
                     color: "#ffffff",

                     height: "7.43rem",
                     padding: "1rem",
                     boxShadow: "var(--shadow-sm)",
                     display: "flex",
                     flexDirection: "row",
                     alignItems: "center",
                     justifyContent: "flex-start",
                     flex: "0 0 auto",
                     "& .MuiCardHeader-content": {
                        order: 1,
                        flex: "1",
                        "& .product-title": {
                           width: "90%",
                           textAlign: "left",
                           color: colorTheme.bpp.orange["100"],
                        },
                        "& .product-subtitle": {
                           color: colorTheme.bpp.orange["090"],
                        },
                     },
                     "& .MuiCardHeader-avatar": {
                        order: 2,
                        marginLeft: "auto",
                        marginRight: "0",
                        "& .product-avatar": {
                           backgroundColor: colorTheme.bpp.granite["020"],
                           boxShadow: "var(--Paper-shadow)",
                           "& .product-avatar-icon": {
                              fontSize: "1.5rem",
                              color: colorTheme.bpp.orange["090"],
                           },
                        },
                     },
                  },

                  //  content styling
                  "& .MuiCardContent-root": {
                     padding: liftKitTheme.spacing.md,
                     paddingTop: liftKitTheme.spacing.lg,
                     // Chips section
                     "& .product-chips": {
                        display: "flex",
                        gap: liftKitTheme.spacing.sm,
                        marginBottom: liftKitTheme.spacing.md,
                        "& .MuiChip-root": {
                           boxShadow: "var(--Paper-shadow)",
                        },
                     },

                     // Marking submissions info
                     "& .marking-submissions-info": {},

                     // Submissions info row
                     "& .submissions-info-row": {
                        marginBottom: liftKitTheme.spacing.sm,
                     },

                     // Submissions info icon
                     "& .submissions-info-icon": {
                        fontSize: "1rem",
                        color: "text.secondary",
                     },

                     // Submissions info count
                     "& .submissions-info-count": {
                        marginLeft: liftKitTheme.spacing.lg,
                     },

                     // Marking deadline message
                     "& .marking-deadline-message": {
                        marginTop: liftKitTheme.spacing.md,
                        borderRadius: 1,
                        border: 1,
                        textAlign: "left",
                     },

                     // Deadline message content (handled by Stack, no specific styles needed)
                     "& .deadline-message-content": {},

                     // Deadline message icon
                     "& .deadline-message-icon": {
                        fontSize: "1rem",
                        marginTop: "0.2rem",
                     },

                     // Deadline message text
                     "& .deadline-message-text": {
                        textAlign: "left",
                     },

                     // Deadline message secondary text
                     "& .deadline-message-secondary": {
                        display: "block",
                     },

                     // Marking pagination container
                     "& .marking-pagination-container": {
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginTop: liftKitTheme.spacing.lg,
                     },

                     // Pagination dot button
                     "& .pagination-dot-button": {
                        padding: "0.5rem",
                     },

                     // Active pagination dot
                     "& .pagination-dot.active": {
                        fontSize: "0.5rem",
                        color: "primary.main",
                        cursor: "pointer",
                     },

                     // Inactive pagination dot
                     "& .pagination-dot.inactive": {
                        fontSize: "0.5rem",
                        color: "grey.300",
                        cursor: "pointer",
                     },

                     // Submission Deadlines Button
                     "& .submission-deadlines-button": {
                        marginTop: liftKitTheme.spacing.md,
                        alignSelf: "flex-start",
                        textTransform: "none",
                        border: "none",
                        fontSize: liftKitTheme.typography.body.fontSize,
                        color: colorTheme.bpp.pink["090"],
                        backgroundColor: colorTheme.bpp.pink["020"],
                        "&:hover": {
                           backgroundColor: colorTheme.bpp.pink["030"],
                           borderColor: colorTheme.bpp.pink["060"],
                           color: colorTheme.bpp.pink["100"],
                        },
                     },
                  },

                  //  actions styling
                  "& .MuiCardActions-root": {
                     backgroundColor: colorTheme.bpp.pink["030"],
                     // Price & Action Section
                     "& .price-container": {
                        // Discount Options
                        "& .discount-options": {
                           "& .discount-title": {
                              color: colorTheme.bpp.cobalt["100"],
                           },
                           "& .discount-radio-group": {
                              "& .discount-radio-option": {
                                 color: colorTheme.bpp.granite["100"],
                                 "&:hover": {},

                                 "& .MuiRadio-root": {
                                    color: colorTheme.bpp.granite["090"],
                                    "& .MuiSvgIcon-root": {},
                                 },

                                 "& .discount-label": {
                                    color: colorTheme.bpp.granite["100"],
                                 },
                              },
                           },
                        },
                        "& .price-action-section": {
                           "& .price-info-row": {
                              "& .price-display": {
                                 color: colorTheme.bpp.granite["100"],
                                 lineHeight: 1,
                              },

                              "& .info-button": {
                                 "&:hover": {},
                                 "& .MuiSvgIcon-root": {},
                              },
                           },
                           "& .price-details-row": {
                              "& .price-level-text": {},
                              "& .vat-status-text": {},
                           },
                           "& .add-to-cart-button": {
                              color: "white",
                              backgroundColor: colorTheme.bpp.pink["060"],
                              "&:hover": {
                                 backgroundColor: colorTheme.bpp.pink["080"],
                              },
                              "& .MuiSvgIcon-root": {
                                 color: "white",
                              },
                           },
                        },
                     },
                  },
               },
            },
            // Marking VoucherProduct Card Variant (Orange theme)
            {
               props: { variant: "marking-voucher-product" },
               style: {
                  minWidth: "20rem",
                  maxWidth: "20rem",
                  height: "31.6rem !important",
                  overflow: "visible",
                  aspectRatio: "5/7",
                  boxShadow: "var(--Paper-shadow)",
                  justifyContent: "space-between",
                  position: "relative",
                  // Floating badges
                  "& .floating-badges-container": {
                     position: "absolute",
                     top: "calc(var(--product-card-header-height) - var(--badge-height) / 1.618)",
                     right: liftKitTheme.spacing.sm,
                     zIndex: 10,
                     display: "flex",
                     gap: liftKitTheme.spacing.xs2,
                     pointerEvents: "none",
                     "& .subject-badge": {
                        backgroundColor: colorTheme.bpp.cobalt["060"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                     "& .session-badge": {
                        backgroundColor: colorTheme.bpp.mint["030"],
                        color: colorTheme.bpp.granite["100"],
                        fontSize: liftKitTheme.typography.bodyBold.fontSize,
                        paddingLeft: liftKitTheme.spacing.sm,
                        paddingRight: liftKitTheme.spacing.sm,
                        paddingTop: liftKitTheme.spacing.sm,
                        paddingBottom: liftKitTheme.spacing.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        fontWeight: 600,
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "16px",
                        boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(20px)",
                     },
                  },
                  // Product Header
                  "& .product-header": {
                     backgroundColor: colorTheme.bpp.orange["020"],
                     color: "#ffffff",

                     height: "7.43rem",
                     padding: "1rem",
                     boxShadow: "var(--shadow-sm)",
                     display: "flex",
                     flexDirection: "row",
                     alignItems: "center",
                     justifyContent: "flex-start",
                     flex: "0 0 auto",
                     "& .MuiCardHeader-content": {
                        order: 1,
                        flex: "1",
                        "& .product-title": {
                           width: "90%",
                           textAlign: "left",
                           color: colorTheme.bpp.orange["100"],
                        },
                        "& .product-subtitle": {
                           color: colorTheme.bpp.orange["090"],
                        },
                     },
                     "& .MuiCardHeader-avatar": {
                        order: 2,
                        marginLeft: "auto",
                        marginRight: "0",
                        "& .product-avatar": {
                           backgroundColor: colorTheme.bpp.granite["020"],
                           boxShadow: "var(--Paper-shadow)",
                           "& .product-avatar-icon": {
                              fontSize: "1.5rem",
                              color: colorTheme.bpp.orange["090"],
                           },
                        },
                     },
                  },

                  //  content styling
                  "& .MuiCardContent-root": {
                     padding: liftKitTheme.spacing.md,
                     paddingTop: liftKitTheme.spacing.lg,
                     // Chips section
                     "& .product-chips": {
                        display: "flex",
                        gap: liftKitTheme.spacing.sm,
                        marginBottom: liftKitTheme.spacing.md,
                        "& .MuiChip-root": {
                           boxShadow: "var(--Paper-shadow)",
                        },
                     },
                     // Product description styling
                     "& .product-description": {
                        marginBottom: liftKitTheme.spacing.sm,
                        textAlign: "left",
                     },
                     // Voucher info alert styling
                     "& .voucher-info-alert": {
                        marginBottom: liftKitTheme.spacing.sm,
                        textAlign: "left",
                     },
                     // Voucher validity info styling
                     "& .voucher-validity-info": {
                        marginBottom: liftKitTheme.spacing.sm,
                     },
                     // Validity info row styling
                     "& .validity-info-row": {
                        marginBottom: liftKitTheme.spacing.sm,
                     },
                     // Validity info icon styling
                     "& .validity-info-icon": {
                        fontSize: "1rem",
                        color: "text.secondary",
                     },
                     // Voucher quantity section styling
                     "& .voucher-quantity-section": {
                        display: "flex",
                        alignItems: "center",
                        marginTop: liftKitTheme.spacing.lg,
                        flexDirection: "row",
                     },
                  },

                  //  actions styling
                  "& .MuiCardActions-root": {
                     height: "10.2rem !important",
                     backgroundColor: colorTheme.bpp.orange["030"],
                     boxShadow: "var(--shadow-lg)",
                     paddingTop: liftKitTheme.spacing.md,
                     paddingLeft: liftKitTheme.spacing.md,
                     paddingRight: liftKitTheme.spacing.md,
                     flexDirection: "column",
                     alignItems: "stretch",
                     justifyContent: "space-between",
                     // Price & Action Section
                     "& .price-container": {
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "end",
                        "& .price-action-section": {
                           flex: 1,
                           display: "flex",
                           flexDirection: "column",
                           "& .price-info-row": {
                              display: "flex",
                              alignItems: "baseline",
                              alignSelf: "flex-end",
                              justifyContent: "flex-end",
                              "& .price-display": {
                                 color: colorTheme.bpp.orange["100"],
                              },

                              "& .info-button": {
                                 minWidth: "auto",
                                 borderRadius: "50%",
                                 paddingBottom: 0,

                                 "&:hover": {
                                    backdropFilter: "saturate(2.4)",
                                    boxShadow: "var(--Paper-shadow)",
                                    transform: "translateY(-1px)",
                                 },

                                 "& .MuiSvgIcon-root": {
                                    fontSize: "1.2rem",
                                 },
                              },
                           },
                           "& .price-details-row": {
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              "& .price-level-text": {
                                 display: "block",
                                 textAlign: "right",
                              },
                              "& .vat-status-text": {
                                 display: "block",
                                 textAlign: "right",
                              },
                           },
                           "& .add-to-cart-button": {
                              color: colorTheme.bpp.orange["100"],
                              alignSelf: "flex-end",
                              borderRadius: "50%",
                              minWidth: liftKitTheme.spacing.xl15,
                              minHeight: liftKitTheme.spacing.xl15,
                              width: liftKitTheme.spacing.xl15,
                              height: liftKitTheme.spacing.xl15,
                              padding: liftKitTheme.spacing.sm,
                              marginLeft: liftKitTheme.spacing.md,
                              marginRight: liftKitTheme.spacing.md,
                              marginTop: liftKitTheme.spacing.md,
                              boxShadow: "var(--Paper-shadow)",
                              backgroundColor: colorTheme.bpp.orange["020"],
                              transition: "all 0.15s ease-in-out",
                              "&:hover": {
                                 boxShadow: "var(--Paper-shadow)",
                                 transform: "scale(1.05)",
                                 filter: "saturate(2)",
                              },

                              "& .MuiSvgIcon-root": {
                                 fontSize: "1.6rem",
                              },
                           },
                        },
                     },
                  },
               },
            },
         ],
      },
   },

   // Custom Liftkit spacing system - use the extracted liftKitTheme
   liftkit: {
      spacing: liftKitTheme.spacing,
      typography: liftKitTheme.typography,
   },

   // Add custom breakpoints to work with the Liftkit responsive system
   breakpoints: {
      values: {
         xs: 0,
         sm: 600,
         md: 960,
         lg: 1280,
         xl: 1920,
      },
   },
   // Custom gradient utilities
   gradients: {
      createGradientStyle,
      colorSchemes: {
         material: {
            primary: "140, 250, 250", //rgb(140, 212, 246)

            secondary: "33, 150, 243", // #2196F3
            accent: "173, 63, 181", //rgb(173, 63, 181)
         },
         tutorial: {
            primary: "156, 39, 176", // #9C27B0
            secondary: "233, 30, 99", // #E91E63
            accent: "103, 58, 183", // #673AB7
         },
         online: {
            primary: "33, 150, 243", // #2196F3
            secondary: "3, 169, 244", // #03A9F4
            accent: "63, 81, 181", // #3F51B5
         },
         bundle: {
            primary: "76, 175, 80", // #4CAF50
            secondary: "139, 195, 74", // #8BC34A
            accent: "46, 125, 50", // #2E7D32
         },
         assessment: {
            primary: "156, 39, 176", // #9C27B0
            secondary: "233, 30, 99", // #E91E63
            accent: "103, 58, 183", // #673AB7
         },
         marking: {
            primary: "255, 152, 0", // #FF9800
            secondary: "255, 193, 7", // #FFC107
            accent: "255, 111, 0", // #FF6F00
         },
      },
      // Chakra UI NumberInput styling
      ".chakra-number-input": {
         "& .chakra-numberinput__field": {
            borderRadius: "6px",
            border: "1px solid rgba(0, 0, 0, 0.23)",
            fontSize: "0.875rem",
            fontFamily: "'Inter', 'Poppins', 'DM Sans Variable', sans-serif",
            textAlign: "center",
            "&:focus": {
               borderColor: colorTheme.primary.main,
               boxShadow: `0 0 0 2px ${colorTheme.primary.main}25`,
            },
         },
         "& .chakra-numberinput__stepper": {
            borderColor: "rgba(0, 0, 0, 0.23)",
         },
         "& .chakra-numberinput__stepper:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
         },
      },
   },
});

export default theme;
export { liftKitTheme, colorTheme };
