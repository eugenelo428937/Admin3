// Material Product Card Variant Styles
import liftKitTheme from '../../liftKitTheme';
import { material } from '../../semantic/productCards';
import { semantic } from '../../semantic/common';

/**
 * Material card variant - Sky/Blue theme
 * For printed materials and eBooks
 */
export const materialCardStyles = {
  // Floating badges
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: material.actions,
      color: semantic.textPrimary,
    },
    "& .session-badge": {
      backgroundColor: material.actions,
      color: semantic.textPrimary,
    },
  },

  // Product Header
  "& .product-header": {
    backgroundColor: material.header,
    color: "#ffffff",
    "& .MuiCardHeader-content": {
      "& .product-title": {
        color: material.title,
      },
      "& .product-subtitle": {
        color: material.subtitle,
      },
    },
    "& .MuiCardHeader-avatar": {
      "& .product-avatar": {
        backgroundColor: semantic.bgElevated,
        "& .product-avatar-icon": {
          color: material.subtitle,
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
        color: material.title,
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
            color: material.title,
            transition: "all 0.2s ease-in-out",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            "& .MuiRadio-root": {
              padding: liftKitTheme.spacing.sm,
              width: liftKitTheme.spacing.md,
              height: liftKitTheme.spacing.md,
              color: material.subtitle,
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
    backgroundColor: material.badge,
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: material.title,
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: material.title,
            paddingRight: 0,
            marginRight: 0,
            "& .MuiRadio-root": {
              color: material.subtitle,
            },
            "& .discount-label": {
              color: material.title,
            },
          },
        },
      },
      "& .price-action-section": {
        "& .price-info-row": {
          "& .price-display": {
            color: material.title,
            lineHeight: 1,
          },
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: material.button,
          "&:hover": {
            backgroundColor: material.buttonHover,
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
