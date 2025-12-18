// Marking Product Card Variant Styles
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Marking card variant - Pink theme
 */
export const markingCardStyles = {
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: colorTheme.bpp.pink["010"],
      color: colorTheme.bpp.granite["100"],
    },
    "& .session-badge": {
      backgroundColor: colorTheme.bpp.pink["010"],
      color: colorTheme.bpp.granite["100"],
    },
  },
  "& .product-header": {
    backgroundColor: colorTheme.bpp.pink["020"],
    color: "#ffffff",
    "& .MuiCardHeader-content": {
      "& .product-title": {
        color: colorTheme.bpp.pink["100"],
      },
      "& .product-subtitle": {
        color: colorTheme.bpp.pink["090"],
      },
    },
    "& .MuiCardHeader-avatar": {
      "& .product-avatar": {
        backgroundColor: colorTheme.bpp.granite["020"],
        "& .product-avatar-icon": {
          color: colorTheme.bpp.pink["090"],
        },
      },
    },
  },
  "& .MuiCardContent-root": {
    padding: liftKitTheme.spacing.md,
    "& .submissions-info-row": {
      marginBottom: liftKitTheme.spacing.xs2,
    },
    "& .submissions-info-icon": {
      fontSize: "1rem",
      color: colorTheme.bpp.pink["090"],
    },
    "& .submissions-info-count": {
      marginLeft: liftKitTheme.spacing.lg,
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
        marginTop: liftKitTheme.spacing.sm,
        alignSelf: "flex-start",
        textTransform: "none",
        border: "none",
        fontSize: liftKitTheme.typography.body.fontSize,
        color: colorTheme.bpp.pink["090"],
        backgroundColor: colorTheme.bpp.pink["020"],
        padding: liftKitTheme.spacing.sm,
        "&:hover": {
          backgroundColor: colorTheme.bpp.pink["030"],
          borderColor: colorTheme.bpp.pink["060"],
          color: colorTheme.bpp.pink["100"],
        },
      },
    },
  },
  "& .MuiCardActions-root": {
    backgroundColor: colorTheme.bpp.pink["030"],
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: colorTheme.bpp.cobalt["100"],
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: colorTheme.bpp.granite["100"],
            "& .MuiRadio-root": {
              color: colorTheme.bpp.granite["090"],
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
};

export default markingCardStyles;
