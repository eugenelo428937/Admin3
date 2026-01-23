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
} from '../tokens/colors';
import semanticColors from './semantic';

// =============================================================================
// Token Layer Exports (Use these in new code)
// =============================================================================
export { colors, md3, scales, staticColors, darkMd3, legacyScales, statusColors };

// Export semantic mappings
export { semanticColors };

// Default export includes both new and legacy for transition period
export default {
  // New token layer
  colors,
  md3,
  scales,
  legacyScales,
};
