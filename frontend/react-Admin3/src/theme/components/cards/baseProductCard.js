// Base Product Card Styles
// Common styles shared by all product card variants
import liftKitTheme from '../../liftKitTheme';
import { semantic } from '../../semantic/common';

/**
 * Base product card variant styles.
 * All product-specific variants extend these base styles.
 */
export const baseProductCardStyles = {
  minWidth: "18rem",
  maxWidth: "18rem",
  height: "28.4rem !important",
  overflow: "visible",
  aspectRatio: "5/7",
  boxShadow: "var(--Paper-shadow)",
  justifyContent: "space-between",
  position: "relative",

  // Floating badges container
  "& .floating-badges-container": {
    position: "absolute",
    top: "calc(var(--product-card-header-height) - var(--badge-height) / 1.618)",
    right: liftKitTheme.spacing.sm,
    zIndex: 10,
    display: "flex",
    gap: liftKitTheme.spacing.xs2,
    pointerEvents: "none",
    "& .subject-badge": {
      padding: liftKitTheme.spacing.sm,
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
      color: semantic.textPrimary,
    },
    "& .session-badge": {
      padding: liftKitTheme.spacing.sm,
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
      color: semantic.textPrimary,
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
      textAlign: "left",
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

  // Content styling
  "& .MuiCardContent-root": {
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '4px',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      },
    },
    padding: liftKitTheme.spacing.md,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignSelf: "flex-start",
    width: "100%",
  },

  // Actions styling
  "& .MuiCardActions-root": {
    height: "9.4em !important",
    boxShadow: "var(--shadow-lg)",
    paddingTop: liftKitTheme.spacing.md,
    paddingLeft: liftKitTheme.spacing.md,
    paddingRight: liftKitTheme.spacing.md,
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "space-between",
    display: "flex",
    width: "100%",
    "& .price-container": {
      display: "flex",
      flexDirection: "row",
      justifyContent: "end",
      "& .discount-options": {
        display: "flex",
        flex: 1,
        alignSelf: "flex-start",
        flexDirection: "column",
        alignItems: "start",
        justifyContent: "start",
        textAlign: "left",
        maxWidth: "7.5rem",
        paddingRight: liftKitTheme.spacing.xs2,
        "& .discount-title": {
          textAlign: "left",
        },
        "& .discount-radio-group": {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          marginLeft: liftKitTheme.spacing.sm,
          maxWidth: "7.5rem",
          "& .discount-radio-option": {
            padding: liftKitTheme.spacing.xs3,
            paddingBottom: 0,
            width: "100%",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              boxShadow: "var(--Paper-shadow)",
              backdropFilter: "saturate(2.4)",
            },
            "& .MuiRadio-root": {
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
};

export default baseProductCardStyles;
