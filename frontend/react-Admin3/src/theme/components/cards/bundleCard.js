// Bundle Product Card Variant Styles
import { spacing } from '../../spacing'
import { bundle } from '../../semantic/productCards';
import { semantic } from '../../semantic/common';

/**
 * Bundle card variant - Green theme
 * Includes hover effects migrated from product_card.css
 */
export const bundleCardStyles = {
  // Bundle hover effects (migrated from product_card.css)
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 4px 12px rgba(34, 197, 94, 0.15) !important",
  },
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: bundle.actions,
      color: semantic.textPrimary,
    },
    "& .session-badge": {
      backgroundColor: bundle.actions,
      color: semantic.textPrimary,
    },
  },
  "& .product-header": {
    backgroundColor: bundle.badge,
    color: "#ffffff",
    "& .MuiCardHeader-content": {
      "& .product-title": {
        color: bundle.title,
        "& .title-info-button": {
          color: bundle.buttonHover,
          minWidth: "1.2rem",
          "& .MuiSvgIcon-root": {
            fontSize: "1.2rem",
          },
        },
      },
      "& .product-subtitle-container": {
        "& .product-subtitle": {
          color: bundle.subtitle,
        },
        "& .subtitle-info-button": {
          color: bundle.icon,
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
      "& .product-avatar": {
        backgroundColor: semantic.bgElevated,
        "& .product-avatar-icon": {
          color: bundle.subtitle,
        },
      },
    },
  },
  "& .MuiCardContent-root": {
    "& .bundle-details-title": {
      color: bundle.title,
      textAlign: "left",
      marginBottom: spacing.xs3,
    },
    "& .MuiList-root": {
      paddingTop: 0,
      paddingBottom: 0,
      "& .MuiListItem-root": {
        padding: 0,
        margin: 0,
        "& .MuiListItemIcon-root": {
          minWidth: "1.2rem",
          "& .MuiSvgIcon-root": {
            fontSize: "1.2rem",
            color: bundle.buttonHover,
          },
          marginRight: spacing.sm,
        },
        "& .MuiListItemText-root": {
          marginBottom: 0,
          "& .MuiListItemText-primary": {
            color: bundle.title,
          },
        },
      },
    },
  },
  "& .MuiCardActions-root": {
    backgroundColor: bundle.header,
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: bundle.title,
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: bundle.title,
            "& .MuiRadio-root": {
              color: bundle.subtitle,
            },
            "& .discount-label": {
              color: bundle.title,
            },
          },
        },
      },
      "& .price-action-section": {
        "& .price-info-row": {
          "& .price-display": {
            color: bundle.title,
            lineHeight: 1,
          },
          "& .info-button": {
            color: bundle.buttonHover,
          },
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: bundle.button,
          "&:hover": {
            backgroundColor: bundle.buttonHover,
          },
          "& .MuiSvgIcon-root": {
            color: "white",
          },
        },
      },
    },
  },
};

export default bundleCardStyles;
