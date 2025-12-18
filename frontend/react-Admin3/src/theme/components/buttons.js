// Button Component Overrides
import liftKitTheme from '../liftKitTheme';

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
          height: liftKitTheme.typography.title1.fontSize,
          alignItems: "center",
          justifyContent: "center",
          "& .MuiButton-startIcon": {
            fontSize: liftKitTheme.typography.heading.fontSize,
            "& .MuiSvgIcon-root": {
              fontSize: liftKitTheme.typography.title3.fontSize,
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
