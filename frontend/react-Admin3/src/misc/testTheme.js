import { createTheme } from "@mui/material/styles";
import theme from "./theme";
import { legacyScales } from "./tokens/colors";
import liftKitTheme from "./liftKitTheme";

// Test theme that adds a custom ProductCard component with base + subvariants
// Usage with <ProductCard variant="product" producttype="material" /> etc.
const testTheme = createTheme(theme, {
  components: {
    ProductCard: {
      variants: [
        // Base product card structure
        {
          props: { variant: "product" },
          style: {
            minWidth: "20rem",
            maxWidth: "20rem",
            height: "31.6rem !important",
            overflow: "visible",
            aspectRatio: "5/7",
            boxShadow: "var(--Paper-shadow)",
            justifyContent: "space-between",
            position: "relative",

            "& .floating-badges-container": {
              position: "absolute",
              top: "calc(var(--product-card-header-height) - var(--badge-height) / 1.618)",
              right: spacing.sm,
              zIndex: 10,
              display: "flex",
              gap: spacing.xs2,
              pointerEvents: "none",
              "& .subject-badge, & .session-badge": {
                color: legacyScales.granite["100"],
                fontSize: liftKitTheme.typography.bodyBold.fontSize,
                paddingLeft: spacing.sm,
                paddingRight: spacing.sm,
                paddingTop: spacing.sm,
                paddingBottom: spacing.sm,
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
                "-webkit-backdrop-filter": "blur(20px)",
              },
            },

            // Header slot
            "& .product-header": {
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
                },
                "& .product-subtitle": {},
              },
              "& .MuiCardHeader-avatar": {
                order: 2,
                marginLeft: "auto",
                marginRight: "0",
                "& .product-avatar": {
                  backgroundColor: legacyScales.granite["020"],
                  boxShadow: "var(--Paper-shadow)",
                },
              },
            },

            // Content
            "& .MuiCardContent-root": {
              padding: spacing.md,
              paddingTop: spacing.lg,
              "& .product-chips": {
                display: "flex",
                gap: spacing.sm,
                marginBottom: spacing.md,
                "& .MuiChip-root": {
                  boxShadow: "var(--Paper-shadow)",
                },
              },
              "& .product-variations": {
                display: "flex",
                flexDirection: "column",
                alignItems: "start",
                justifyContent: "start",
                textAlign: "left",
                paddingLeft: spacing.sm,
                paddingRight: spacing.sm,
                "& .variations-title": {
                  marginBottom: spacing.xs2,
                  textAlign: "left",
                },
                "& .variations-group": {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  width: "100%",
                },
              },
            },

            // Actions
            "& .MuiCardActions-root": {
              height: "10.2rem !important",
              boxShadow: "var(--shadow-lg)",
              paddingTop: spacing.md,
              paddingLeft: spacing.md,
              paddingRight: spacing.md,
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "space-between",
              display: "flex",
              width: "100%",
              "& .price-container": {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "end",
              },
            },
          },
        },

        // Material product overrides
        {
          props: { variant: "product", producttype: "material" },
          style: {
            "& .floating-badges-container .subject-badge": {
              backgroundColor: legacyScales.cobalt["060"],
            },
            "& .floating-badges-container .session-badge": {
              backgroundColor: legacyScales.mint["030"],
            },
            "& .product-header": {
              backgroundColor: legacyScales.sky["020"],
              "& .MuiCardHeader-content .product-title": {
                color: legacyScales.sky["100"],
              },
              "& .MuiCardHeader-content .product-subtitle": {
                color: legacyScales.sky["090"],
              },
              "& .MuiCardHeader-avatar .product-avatar .product-avatar-icon": {
                color: legacyScales.sky["090"],
              },
            },
            "& .MuiCardActions-root": {
              backgroundColor: legacyScales.sky["030"],
              "& .add-to-cart-button": {
                color: legacyScales.sky["100"],
                backgroundColor: legacyScales.sky["020"],
              },
            },
          },
        },

        // Tutorial product overrides
        {
          props: { variant: "product", producttype: "tutorial" },
          style: {
            "& .floating-badges-container .subject-badge": {
              backgroundColor: legacyScales.cobalt["060"],
            },
            "& .floating-badges-container .session-badge": {
              backgroundColor: legacyScales.mint["030"],
            },
            "& .product-header": {
              backgroundColor: legacyScales.purple["020"],
              "& .MuiCardHeader-content .product-title": {
                color: legacyScales.sky["100"],
              },
              "& .MuiCardHeader-content .product-subtitle": {
                color: legacyScales.sky["090"],
              },
              "& .MuiCardHeader-avatar .product-avatar .product-avatar-icon": {
                color: legacyScales.purple["090"],
              },
            },
            "& .MuiCardActions-root": {
              backgroundColor: legacyScales.purple["030"],
              "& .add-to-cart-button": {
                color: legacyScales.purple["100"],
                backgroundColor: legacyScales.purple["020"],
              },
            },
          },
        },
      ],
    },
  },
});

export default testTheme;


