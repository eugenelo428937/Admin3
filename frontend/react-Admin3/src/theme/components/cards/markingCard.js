// Marking Product Card Variant Styles
import { spacing } from '../../tokens/spacing';
import { fontSizes } from '../../tokens/typography';
import { marking } from '../../semantic/productCards';
import { semantic } from '../../semantic/common';

/**
 * Marking card variant - Pink theme
 */
export const markingCardStyles = {
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: marking.actions,
      color: semantic.textPrimary,
    },
    "& .session-badge": {
      backgroundColor: marking.actions,
      color: semantic.textPrimary,
    },
  },
  "& .product-header": {
    backgroundColor: marking.header,
    color: "#ffffff",
    "& .MuiCardHeader-content": {
      "& .product-title": {
        color: marking.title,
      },
      "& .product-subtitle": {
        color: marking.subtitle,
      },
    },
    "& .MuiCardHeader-avatar": {
      "& .product-avatar": {
        backgroundColor: semantic.bgElevated,
        "& .product-avatar-icon": {
          color: marking.subtitle,
        },
      },
    },
  },
  "& .MuiCardContent-root": {
    padding: spacing.md,
    "& .submissions-info-row": {
      marginBottom: spacing.xs2,
    },
    "& .submissions-info-icon": {
      fontSize: "1rem",
      color: marking.subtitle,
    },
    "& .submissions-info-count": {
      marginLeft: spacing.lg,
    },
    "& .marking-deadline-message": {
      borderRadius: 1,
      border: 1,
      textAlign: "left",
    },
    "& .marking-pagination-container": {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    "& .pagination-dot-button": {
      padding: "0.3rem",
    },
    "& .pagination-dot.active": {
      fontSize: "0.5rem",
      color: "primary.main",
      cursor: "pointer",
    },
    "& .pagination-dot.inactive": {
      fontSize: "0.5rem",
      color: "grey.300",
      cursor: "pointer",
    },
    "& .MuiBox-root": {
      display: "flex",
      justifyContent: "center",
      width: "100%",
      "& .submission-deadlines-button": {
        marginTop: spacing.sm,
        alignSelf: "flex-start",
        textTransform: "none",
        border: "none",
        fontSize: fontSizes.body1,
        color: marking.subtitle,
        backgroundColor: marking.header,
        padding: spacing.sm,
        "&:hover": {
          backgroundColor: marking.badge,
          borderColor: marking.button,
          color: marking.title,
        },
      },
    },
  },
  "& .MuiCardActions-root": {
    backgroundColor: marking.badge,
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: semantic.textPrimary,
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: semantic.textPrimary,
            "& .MuiRadio-root": {
              color: semantic.textSecondary,
            },
            "& .discount-label": {
              color: semantic.textPrimary,
            },
          },
        },
      },
      "& .price-action-section": {
        "& .price-info-row": {
          "& .price-display": {
            color: semantic.textPrimary,
            lineHeight: 1,
          },
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: marking.button,
          "&:hover": {
            backgroundColor: marking.buttonHover,
          },
          "& .MuiSvgIcon-root": {
            color: "white",
          },
        },
      },
    },
  },
};

export default markingCardStyles;
