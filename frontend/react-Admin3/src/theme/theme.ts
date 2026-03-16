// theme.ts - Backward Compatibility Layer
//
// This file re-exports from the new modular theme structure.
// New code should import from './theme/index' directly.
//
// MIGRATION: This file can be removed once all imports are updated.

export {
  default,
  typographyTheme,
  semanticSpacing,
  createGradientStyle,
  gradientColorSchemes,
} from './index';
