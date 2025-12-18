// Input Component Overrides (TextField, InputBase, etc.)
import colorTheme from '../colorTheme';
import liftKitTheme from '../liftKitTheme';

export const inputOverrides = {
  MuiTextField: {
    styleOverrides: {
      root: {
        marginBottom: liftKitTheme.spacing.sm,
        "& .MuiInputBase-input": {
          color: colorTheme.liftkit.light.onSurface,
        },
      },
    },
    variants: [
      {
        props: { variant: "filled" },
        style: {},
      },
    ],
  },
  MuiInputBase: {
    styleOverrides: {
      root: {
        fontFamily: "'Inter', 'Poppins', sans-serif",
      },
    },
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: {
        marginTop: liftKitTheme.spacing.xs2,
      },
    },
  },
};

export default inputOverrides;
