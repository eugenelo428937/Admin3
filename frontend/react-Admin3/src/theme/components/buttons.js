// Button Component Overrides
import { spacing } from '../tokens/spacing';
import { fontSizes } from '../tokens/typography';

export const buttonOverrides = {
  MuiButton: {
    styleOverrides: {
      root: {},
    },
    variants: [
      {
        props: { variant: "transparent-background" },
        style: {
          fontFamily: "'Inter', 'Poppins', sans-serif",
          fontWeight: 500,
          textTransform: "none",
          borderRadius: 6,
          width: "auto",
          height: fontSizes.title1,
          alignItems: "center",
          justifyContent: "center",
          "& .MuiButton-startIcon": {
            fontSize: fontSizes.heading,
            "& .MuiSvgIcon-root": {
              fontSize: fontSizes.title3,
            },
          },
          "&:hover": {
            boxShadow: "var(--Paper-shadow)",
            backdropFilter: "brightness(1.26)",
          },
          backgroundColor: "transparent",
          boxShadow: "none",
        },
      },
    ],
  },
};

export default buttonOverrides;
