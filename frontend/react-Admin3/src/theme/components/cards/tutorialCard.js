// Tutorial Product Card Variant Styles
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Tutorial card variant - Purple theme
 * Extends base product card with tutorial-specific styling
 */
export const tutorialCardStyles = {
  // Floating badges
  "& .floating-badges-container": {
    "& .availability-badge": {
      color: colorTheme.md3.error,
      paddingLeft: liftKitTheme.spacing.sm,
      paddingRight: liftKitTheme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      alignContent: "center",
      flexWrap: "wrap",
      fontWeight: 600,
      borderRadius: "16px",
      boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      backdropFilter: "blur(20px)",
      backgroundColor: colorTheme.md3.errorContainer,
      "& .MuiBox-root": {
        alignItems: "center",
        justifyContent: "center",
        alignContent: "center",
        "& .MuiTypography-root": {
          color: colorTheme.md3.error,
        },
        "& .MuiSvgIcon-root": {
          color: colorTheme.md3.error,
          fontSize: "1.2rem",
        },
      },
    },
    "& .subject-badge": {
      backgroundColor: colorTheme.bpp.purple["010"],
      color: colorTheme.bpp.granite["100"],
    },
    "& .session-badge": {
      backgroundColor: colorTheme.bpp.purple["010"],
      color: colorTheme.bpp.granite["100"],
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

  // Content styling
  "& .MuiCardContent-root": {
    padding: liftKitTheme.spacing.md,
    paddingTop: liftKitTheme.spacing.lg,
    "& .product-chips": {
      display: "flex",
      gap: liftKitTheme.spacing.sm,
      marginBottom: liftKitTheme.spacing.md,
      "& .MuiChip-root": {
        boxShadow: "var(--Paper-shadow)",
        "& .MuiChip-label": {
          fontWeight: liftKitTheme.typography.overline.fontWeight,
          paddingX: liftKitTheme.spacing.md,
          paddingY: liftKitTheme.spacing.xs,
        },
      },
    },
    "& .tutorial-info-section": {
      display: "flex",
      flexDirection: "column",
      textAlign: "left",
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

  // Actions styling
  "& .MuiCardActions-root": {
    backgroundColor: colorTheme.bpp.purple["030"],
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: colorTheme.bpp.purple["100"],
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: colorTheme.bpp.purple["100"],
            "& .MuiRadio-root": {
              color: colorTheme.bpp.purple["090"],
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
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: colorTheme.bpp.purple["050"],
          "&:hover": {
            backgroundColor: colorTheme.bpp.purple["070"],
          },
        },
      },
    },
  },
};

export default tutorialCardStyles;
