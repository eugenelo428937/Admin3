// Online Classroom Product Card Variant Styles
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Online Classroom card variant - Cobalt/Blue theme
 */
export const onlineClassroomCardStyles = {
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: colorTheme.bpp.cobalt["010"],
      color: colorTheme.bpp.granite["100"],
    },
    "& .session-badge": {
      backgroundColor: colorTheme.bpp.cobalt["010"],
      color: colorTheme.bpp.granite["100"],
    },
  },
  "& .product-header": {
    backgroundColor: colorTheme.bpp.cobalt["020"],
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
        color: colorTheme.bpp.cobalt["100"],
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
            color: colorTheme.bpp.cobalt["100"],
            transition: "all 0.2s ease-in-out",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            "& .MuiRadio-root": {
              padding: liftKitTheme.spacing.sm,
              width: liftKitTheme.spacing.md,
              height: liftKitTheme.spacing.md,
              color: colorTheme.bpp.cobalt["090"],
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
  "& .MuiCardActions-root": {
    backgroundColor: colorTheme.bpp.cobalt["030"],
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: colorTheme.bpp.cobalt["100"],
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: colorTheme.bpp.cobalt["100"],
            "& .MuiRadio-root": {
              color: colorTheme.bpp.cobalt["090"],
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
};

export default onlineClassroomCardStyles;
