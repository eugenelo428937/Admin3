// theme.js - Backward Compatibility Layer
//
// This file re-exports from the new modular theme structure.
// New code should import from './theme/index.js' directly.
//
// MIGRATION: This file can be removed once all imports are updated.

export {
  default,
  typographyTheme,
  semanticSpacing,
  createGradientStyle,
  gradientColorSchemes,
} from './index';
