/**
 * Input Component Overrides
 *
 * Defines MUI input component style overrides for TextField, InputBase, and FormHelperText.
 * Uses MD3 color tokens for text color and spacing tokens for consistent margins.
 *
 * @module theme/components/inputs
 *
 * ## Component Overrides
 *
 * @component MuiTextField
 * @description Text input fields with bottom margin and MD3-compliant text color
 * @usage <TextField label="Name" variant="outlined" />
 *
 * @component MuiInputBase
 * @description Base input styling with Inter/Poppins font family
 * @usage <InputBase placeholder="Search..." />
 *
 * @component MuiFormHelperText
 * @description Helper text below inputs with consistent top margin
 * @usage <FormHelperText>Required field</FormHelperText>
 *
 * @example
 * // Standard text field with helper text
 * <TextField
 *   label="Email"
 *   variant="outlined"
 *   helperText="We'll never share your email"
 * />
 *
 * @note All TextFields have marginBottom: spacing.sm by default
 */

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
