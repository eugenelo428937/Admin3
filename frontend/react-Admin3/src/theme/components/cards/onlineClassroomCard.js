// Online Classroom Product Card Variant Styles
import liftKitTheme from '../../liftKitTheme';
import { onlineClassroom } from '../../semantic/productCards';
import { semantic } from '../../semantic/common';

/**
 * Online Classroom card variant - Cobalt/Blue theme
 */
export const onlineClassroomCardStyles = {
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: onlineClassroom.actions,
      color: semantic.textPrimary,
    },
    "& .session-badge": {
      backgroundColor: onlineClassroom.actions,
      color: semantic.textPrimary,
    },
  },
  "& .product-header": {
    backgroundColor: onlineClassroom.header,
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
        color: onlineClassroom.title,
      },
      "& .product-subtitle": {
        color: onlineClassroom.subtitle,
      },
    },
    "& .MuiCardHeader-avatar": {
      order: 2,
      marginLeft: "auto",
      marginRight: "0",
      "& .product-avatar": {
        backgroundColor: semantic.bgElevated,
        boxShadow: "var(--Paper-shadow)",
        "& .product-avatar-icon": {
          fontSize: "1.5rem",
          color: onlineClassroom.subtitle,
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
        color: onlineClassroom.title,
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
            color: onlineClassroom.title,
            transition: "all 0.2s ease-in-out",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            "& .MuiRadio-root": {
              padding: liftKitTheme.spacing.sm,
              width: liftKitTheme.spacing.md,
              height: liftKitTheme.spacing.md,
              color: onlineClassroom.subtitle,
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
    backgroundColor: onlineClassroom.badge,
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: onlineClassroom.title,
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: onlineClassroom.title,
            "& .MuiRadio-root": {
              color: onlineClassroom.subtitle,
            },
            "& .discount-label": {
              color: onlineClassroom.title,
            },
          },
        },
      },
      "& .price-action-section": {
        "& .price-info-row": {
          "& .price-display": {
            color: onlineClassroom.title,
          },
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: onlineClassroom.button,
          "&:hover": {
            backgroundColor: onlineClassroom.buttonHover,
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
