/**
 * Token Layer Index
 *
 * Central export point for all design tokens.
 * This is the ONLY place components should import raw token values from.
 *
 * Usage:
 * import { colors, typography, spacing } from '../theme/tokens';
 * import { md3, scales } from '../theme/tokens/colors';
 *
 * For components, prefer semantic tokens:
 * import { semantic, productCards } from '../theme/semantic';
 */
// Color tokens - single source of truth for all colors
export { default as colors, md3, scales, staticColors } from './colors.js';

// Typography tokens - font families, sizes, weights
export { default as typography } from './typography.js';
export
{
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacings,
  scaleMultipliers,
} from './typography.js';

// Spacing tokens - spacing scale, gaps, padding, border radius
export { default as spacing } from './spacing.js';
export
{
  scaleFactor,
  multipliers,
  spacing as spacingScale,
  gaps,
  padding,
} from './spacing.js';
export { iconSizes } from './icons.js'

export { shadows } from './shadows.js'

export { borderRadius } from './borderRadius.js'

// Re-import defaults for consolidated export
import colorsDefault from './colors.js';
import typographyDefault from './typography.js';
import spacingDefault from './spacing.js';
import iconSizesDefault from './icons.js';
import shadowsDefault from './shadows.js';
import borderRadiusDefault from './borderRadius.js';

// Consolidated export for convenience
const tokens = {
  colors: colorsDefault,
  typography: typographyDefault,
  spacing: spacingDefault,
  iconSizes: iconSizesDefault,
  shadows: shadowsDefault,
  borderRadius: borderRadiusDefault,
};

export default tokens;
