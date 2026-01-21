// Colors Module
// Exports color tokens and semantic color mappings

// Import from consolidated token layer (single source of truth)
import colors, {
  md3,
  scales,
  staticColors,
  darkMd3,
  legacyScales,
  statusColors,
  liftkitColors,
} from '../tokens/colors';
import semanticColors from './semantic';

// =============================================================================
// Token Layer Exports (Use these in new code)
// =============================================================================
export { colors, md3, scales, staticColors, darkMd3, legacyScales, statusColors, liftkitColors };

// =============================================================================
// DEPRECATED: Legacy Exports (Backward compatibility wrappers)
// =============================================================================

// @deprecated Use `legacyScales` or `scales` from tokens/colors.js instead
// Creates colorTheme-like structure from tokens for backward compatibility
const colorTheme = {
  palette: {
    ...legacyScales,
    ...statusColors,
    md3: md3,
    liftkit: liftkitColors,
    bpp: legacyScales,
  },
};
export { colorTheme };

// @deprecated Use `md3` from tokens/colors.js instead
const palettesTheme = md3;
export { palettesTheme };

// Export semantic mappings
export { semanticColors };

// Default export includes both new and legacy for transition period
export default {
  // New token layer
  colors,
  md3,
  scales,
  legacyScales,
  // Legacy (deprecated - wrappers only)
  colorTheme,
  palettesTheme,
};
