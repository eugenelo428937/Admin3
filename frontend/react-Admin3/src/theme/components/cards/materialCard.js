// Material Product Card Variant Styles
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Material card variant - Sky/Blue theme
 * For printed materials and eBooks
 */
export const materialCardStyles = {
  // Floating badges
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: colorTheme.bpp.sky["010"],
      color: colorTheme.bpp.granite["100"],
    },
    "& .session-badge": {
      backgroundColor: colorTheme.bpp.sky["010"],
      color: colorTheme.bpp.granite["100"],
    },
  },

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

  // Content styling
  "& .MuiCardContent-root": {
    padding: liftKitTheme.spacing.md,
    "& .product-variations": {
      display: "flex",
      flexDirection: "column",
      alignItems: "start",
      justifyContent: "start",
      textAlign: "left",
      "& .variations-title": {
        marginBottom: liftKitTheme.spacing.md,
        textAlign: "left",
        color: colorTheme.bpp.sky["100"],
        fontWeight: 600,
      },
      "& .variations-group": {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        width: "100%",
        "& .MuiStack-root": {
          width: "100%",
          "& .variation-option": {
            border: "1px solid",
            borderColor: "divider",
            borderRadius: liftKitTheme.spacing.xs,
            padding: liftKitTheme.spacing.xs,
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
          },
        },
      },
    },
  },

  // Actions styling
  "& .MuiCardActions-root": {
    backgroundColor: colorTheme.bpp.sky["030"],
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: colorTheme.bpp.sky["100"],
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: colorTheme.bpp.sky["100"],
            paddingRight: 0,
            marginRight: 0,
            "& .MuiRadio-root": {
              color: colorTheme.bpp.sky["090"],
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
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: colorTheme.bpp.sky["060"],
          "&:hover": {
            backgroundColor: colorTheme.bpp.sky["070"],
          },
          "& .MuiSvgIcon-root": {
            color: "white",
          },
        },
      },
    },
  },
};

export default materialCardStyles;
