// Colors Module
// Exports raw color palette and semantic color mappings

import colorTheme from '../colorTheme';
import semanticColors from './semantic';

// Re-export everything from colorTheme
export * from '../colorTheme';
export { colorTheme };

// Export semantic mappings
export { semanticColors };

// Default export is the raw colorTheme for backward compatibility
export default colorTheme;
