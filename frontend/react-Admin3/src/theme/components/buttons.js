/**
 * Button Component Overrides
 *
 * Defines MUI Button component size-based style overrides.
 * Font sizes are driven by typography tokens for consistency.
 *
 * @module theme/components/buttons
 *
 * ## Size Overrides
 *
 * @size small - Uses typographyConfig.buttonSmall font size
 * @size medium - Uses typographyConfig.buttonMedium font size, enlarged icons (28-29px)
 * @size large - Uses typographyConfig.buttonLarge font size
 *
 * @example
 * // Standard MUI button sizes - no variant prop needed
 * <Button size="small">Small</Button>
 * <Button size="medium">Medium</Button>
 * <Button size="large">Large</Button>
 *
 * @note For navigation-specific button variants, see navigation.js
 */

import { spacing } from '../tokens/spacing';
import { staticColors } from '../tokens/colors';
import { typographyConfig } from '../typography';

export const buttonOverrides = {
  MuiButton: {
    styleOverrides: {
      root: ({ ownerState }) => ({
        ...(ownerState.size === 'small' && {
          fontSize: typographyConfig.buttonSmall,
        }),
        ...(ownerState.size === 'medium' && {
          fontSize: typographyConfig.buttonMedium,
          "& .MuiButton-startIcon > *:nth-of-type(1), & .MuiButton-endIcon > *:nth-of-type(1)": {
            fontSize: '29px',
          },
          "& .MuiSvgIcon-root": {
            fontSize: '28px',
          },
        }),
        ...(ownerState.size === 'large' && {
          fontSize: typographyConfig.buttonLarge,
        }),
      }),
      // Contained buttons should have white icons
      contained: {
        "& .MuiSvgIcon-root": {
          color: staticColors.white,
        },
      },
    },
  },
};

export default buttonOverrides;
