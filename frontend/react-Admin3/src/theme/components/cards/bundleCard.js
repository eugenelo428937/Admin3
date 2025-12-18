// Bundle Product Card Variant Styles
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Bundle card variant - Green theme
 */
export const bundleCardStyles = {
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: colorTheme.bpp.green["010"],
      color: colorTheme.bpp.granite["100"],
    },
    "& .session-badge": {
      backgroundColor: colorTheme.bpp.green["010"],
      color: colorTheme.bpp.granite["100"],
    },
  },
  "& .product-header": {
    backgroundColor: colorTheme.bpp.green["030"],
    color: "#ffffff",
    "& .MuiCardHeader-content": {
      "& .product-title": {
        color: colorTheme.bpp.green["100"],
        "& .title-info-button": {
          color: colorTheme.bpp.green["080"],
          minWidth: "1.2rem",
          "& .MuiSvgIcon-root": {
            fontSize: "1.2rem",
          },
        },
      },
      "& .product-subtitle-container": {
        "& .product-subtitle": {
          color: colorTheme.bpp.green["090"],
        },
        "& .subtitle-info-button": {
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
      "& .product-avatar": {
        backgroundColor: colorTheme.bpp.granite["020"],
        "& .product-avatar-icon": {
          color: colorTheme.bpp.green["090"],
        },
      },
    },
  },
  "& .MuiCardContent-root": {
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
          minWidth: "1.2rem",
          "& .MuiSvgIcon-root": {
            fontSize: "1.2rem",
            color: colorTheme.bpp.green["080"],
          },
          marginRight: liftKitTheme.spacing.sm,
        },
        "& .MuiListItemText-root": {
          marginBottom: 0,
          "& .MuiListItemText-primary": {
            color: colorTheme.bpp.green["100"],
          },
        },
      },
    },
  },
  "& .MuiCardActions-root": {
    backgroundColor: colorTheme.bpp.green["040"],
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: colorTheme.bpp.green["100"],
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: colorTheme.bpp.green["100"],
            "& .MuiRadio-root": {
              color: colorTheme.bpp.green["090"],
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
          },
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
};

export default bundleCardStyles;
