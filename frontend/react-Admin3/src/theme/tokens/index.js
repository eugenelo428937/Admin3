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
export { default as colors, md3, scales, staticColors } from './colors';

// Typography tokens - font families, sizes, weights
export { default as typography } from './typography';
export
{
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacing,
  scaleMultipliers,
} from './typography';

// Spacing tokens - spacing scale, gaps, padding, border radius
export { default as spacing } from './spacing';
export
{
  scaleFactor,
  multipliers,
  spacing as spacingScale,
  numericSpacing,
  gaps,
  padding,
  borderRadius,
} from './spacing';
export { iconSizes } from './icons'

// Consolidated export for convenience
const tokens = {
  colors: require('./colors').default,
  typography: require('./typography').default,
  spacing: require('./spacing').default,
  iconSizes: require('./icons').default,
};

export default tokens;
