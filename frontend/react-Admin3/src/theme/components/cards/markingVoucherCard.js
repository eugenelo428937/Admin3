// Marking Voucher Product Card Variant Styles
import liftKitTheme from '../../liftKitTheme';
import { markingVoucher } from '../../semantic/productCards';
import { semantic } from '../../semantic/common';

/**
 * Marking Voucher card variant - Orange theme
 */
export const markingVoucherCardStyles = {
  "& .product-header": {
    backgroundColor: markingVoucher.header,
    color: "#ffffff",
    "& .MuiCardHeader-content": {
      "& .product-title": {
        color: markingVoucher.title,
      },
      "& .product-subtitle": {
        color: markingVoucher.subtitle,
      },
    },
    "& .MuiCardHeader-avatar": {
      "& .product-avatar": {
        backgroundColor: semantic.bgElevated,
        "& .product-avatar-icon": {
          color: markingVoucher.subtitle,
        },
      },
    },
  },
  "& .floating-badges-container": {
    "& .expiry-badge": {
      backgroundColor: markingVoucher.button,
      color: semantic.textPrimary,
      fontSize: liftKitTheme.typography.bodyBold.fontSize,
      paddingLeft: liftKitTheme.spacing.sm,
      paddingRight: liftKitTheme.spacing.sm,
      paddingTop: liftKitTheme.spacing.sm,
      paddingBottom: liftKitTheme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      alignContent: "center",
      flexWrap: "wrap",
      fontWeight: 600,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      borderRadius: "16px",
      boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      backdropFilter: "blur(20px)",
    },
  },
  "& .MuiCardContent-root": {
    "& .product-chips": {
      display: "flex",
      gap: liftKitTheme.spacing.sm,
      marginBottom: liftKitTheme.spacing.md,
      "& .MuiChip-root": {
        boxShadow: "var(--Paper-shadow)",
      },
    },
    "& .product-description": {
      marginBottom: liftKitTheme.spacing.sm,
      textAlign: "left",
    },
    "& .voucher-info-alert": {
      marginBottom: liftKitTheme.spacing.sm,
      textAlign: "left",
    },
    "& .voucher-validity-info": {
      marginBottom: liftKitTheme.spacing.sm,
    },
    "& .validity-info-row": {
      marginBottom: liftKitTheme.spacing.sm,
    },
    "& .validity-info-icon": {
      fontSize: "1rem",
      color: "text.secondary",
    },
    "& .voucher-quantity-section": {
      display: "flex",
      alignItems: "center",
      marginTop: liftKitTheme.spacing.sm,
      flexDirection: "row",
    },
  },
  "& .MuiCardActions-root": {
    height: "10.2rem !important",
    backgroundColor: markingVoucher.badge,
    boxShadow: "var(--shadow-lg)",
    paddingTop: liftKitTheme.spacing.md,
    paddingLeft: liftKitTheme.spacing.md,
    paddingRight: liftKitTheme.spacing.md,
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "space-between",
    "& .price-container": {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "end",
      "& .price-action-section": {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        "& .price-info-row": {
          display: "flex",
          alignItems: "baseline",
          alignSelf: "flex-end",
          justifyContent: "flex-end",
          "& .price-display": {
            color: markingVoucher.title,
          },
          "& .info-button": {
            minWidth: "auto",
            borderRadius: "50%",
            paddingBottom: 0,
            "&:hover": {
              backdropFilter: "saturate(2.4)",
              boxShadow: "var(--Paper-shadow)",
              transform: "translateY(-1px)",
            },
            "& .MuiSvgIcon-root": {
              fontSize: "1.2rem",
            },
          },
        },
        "& .price-details-row": {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          "& .price-level-text": {
            display: "block",
            textAlign: "right",
          },
          "& .vat-status-text": {
            display: "block",
            textAlign: "right",
          },
        },
        "& .add-to-cart-button": {
          color: markingVoucher.title,
          alignSelf: "flex-end",
          borderRadius: "50%",
          minWidth: liftKitTheme.spacing.xl15,
          minHeight: liftKitTheme.spacing.xl15,
          width: liftKitTheme.spacing.xl15,
          height: liftKitTheme.spacing.xl15,
          padding: liftKitTheme.spacing.sm,
          marginLeft: liftKitTheme.spacing.md,
          marginRight: liftKitTheme.spacing.md,
          marginTop: liftKitTheme.spacing.md,
          boxShadow: "var(--Paper-shadow)",
          backgroundColor: markingVoucher.header,
          transition: "all 0.15s ease-in-out",
          "&:hover": {
            boxShadow: "var(--Paper-shadow)",
            transform: "scale(1.05)",
            filter: "saturate(2)",
          },
          "& .MuiSvgIcon-root": {
            fontSize: "1.6rem",
          },
        },
      },
    },
  },
};

export default markingVoucherCardStyles;
