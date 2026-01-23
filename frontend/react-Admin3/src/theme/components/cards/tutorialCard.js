// Tutorial Product Card Variant Styles
import { spacing } from '../../tokens/spacing';
import { fontWeights } from '../../tokens/typography';
import { tutorial } from '../../semantic/productCards';
import { semantic, status } from '../../semantic/common';
import { md3 } from '../../tokens/colors';

/**
 * Tutorial card variant - Purple theme
 * Extends base product card with tutorial-specific styling
 */
export const tutorialCardStyles = {
  // Floating badges
  "& .floating-badges-container": {
    "& .availability-badge": {
      color: md3.error,
      paddingLeft: spacing.sm ,
      paddingRight: spacing.sm ,
      alignItems: "center",
      justifyContent: "center",
      alignContent: "center",
      flexWrap: "wrap",
      fontWeight: 600,
      borderRadius: "16px",
      boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      backdropFilter: "blur(20px)",
      backgroundColor: md3.errorContainer,
      "& .MuiBox-root": {
        alignItems: "center",
        justifyContent: "center",
        alignContent: "center",
        "& .MuiTypography-root": {
          color: md3.error,
        },
        "& .MuiSvgIcon-root": {
          color: md3.error,
          fontSize: "1.2rem",
        },
      },
    },
    "& .subject-badge": {
      backgroundColor: tutorial.actions,
      color: semantic.textPrimary,
    },
    "& .session-badge": {
      backgroundColor: tutorial.actions,
      color: semantic.textPrimary,
    },
  },

  // Product Header
  "& .product-header": {
    backgroundColor: tutorial.header,
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
        color: tutorial.title,
      },
      "& .product-subtitle": {
        color: tutorial.subtitle,
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
          color: tutorial.subtitle,
        },
      },
    },
  },

  // Content styling
  "& .MuiCardContent-root": {
    padding: spacing.md ,
    paddingTop: spacing.lg ,
    "& .product-chips": {
      display: "flex",
      gap: spacing.sm ,
      marginBottom: spacing.md ,
      "& .MuiChip-root": {
        boxShadow: "var(--Paper-shadow)",
        "& .MuiChip-label": {
          fontWeight: fontWeights.regular,
          paddingX: spacing.md ,
          paddingY: spacing.xs ,
        },
      },
    },
    "& .tutorial-info-section": {
      display: "flex",
      flexDirection: "column",
      textAlign: "left",
      marginLeft: spacing.sm ,
      marginRight: spacing.sm ,
      "& .info-row": {
        display: "flex",
        marginBottom: spacing.sm ,
        alignItems: "flex-start",
        textAlign: "left",
        "& .info-title": {
          marginBottom: spacing.xs2 ,
        },
        "& .info-icon": {
          fontSize: "16px",
          color: tutorial.subtitle,
          marginRight: spacing.xs2 ,
        },
        "& .info-text": {
          color: tutorial.title,
          fontWeight: "600",
        },
      },
      "& .info-sub-text": {
        color: tutorial.subtitle,
        marginLeft: spacing.md ,
        fontWeight: "500",
      },
    },
  },

  // Actions styling
  "& .MuiCardActions-root": {
    backgroundColor: tutorial.badge,
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: tutorial.title,
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: tutorial.title,
            "& .MuiRadio-root": {
              color: tutorial.subtitle,
            },
            "& .discount-label": {
              color: tutorial.title,
            },
          },
        },
      },
      "& .price-action-section": {
        "& .price-info-row": {
          "& .price-display": {
            color: tutorial.title,
          },
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: tutorial.icon,
          "&:hover": {
            backgroundColor: tutorial.buttonHover,
          },
        },
      },
    },
  },
};

export default tutorialCardStyles;
