// Input Component Overrides (TextField, InputBase, etc.)
import { liftkitColors } from '../tokens/colors';
import liftKitTheme from '../liftKitTheme';

export const inputOverrides = {
  MuiTextField: {
    styleOverrides: {
      root: {
        marginBottom: liftKitTheme.spacing.sm,
        "& .MuiInputBase-input": {
          color: liftkitColors.light.onSurface,
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
