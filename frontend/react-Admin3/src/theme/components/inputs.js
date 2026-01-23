// Input Component Overrides (TextField, InputBase, etc.)
import { md3 } from '../tokens/colors';
import { spacing } from '../tokens/spacing';

export const inputOverrides = {
  MuiTextField: {
    styleOverrides: {
      root: {
        marginBottom: spacing.sm,
        "& .MuiInputBase-input": {
          color: md3.onSurface,
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
        marginTop: spacing.xs2,
      },
    },
  },
};

export default inputOverrides;
