// Components Module
// Aggregates all component style overrides into single export

import { cardOverrides } from './cards';
import alertOverrides from './alerts';
import baselineOverrides from './baseline';
import buttonOverrides from './buttons';
import inputOverrides from './inputs';
import navigationOverrides from './navigation';
import miscOverrides from './misc';

/**
 * Deep-merges two MUI component override objects.
 * - Arrays (e.g. variants) are concatenated, not replaced.
 * - Nested objects are recursively merged.
 * - Primitives from `source` overwrite those in `target`.
 */
function deepMergeOverrides(target, source) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value) && Array.isArray(result[key])) {
      result[key] = [...result[key], ...value];
    } else if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
    ) {
      result[key] = deepMergeOverrides(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Merges multiple MUI component override objects, deep-merging
 * any component keys (e.g. MuiButton) that appear in more than one source.
 */
function mergeComponentOverrides(...sources) {
  const result = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (result[key]) {
        result[key] = deepMergeOverrides(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * All MUI component overrides combined.
 * Uses deep merge so that component keys appearing in multiple files
 * (e.g. MuiButton in buttons.js and navigation.js) are merged, not overwritten.
 */
export const componentOverrides = mergeComponentOverrides(
  baselineOverrides,
  cardOverrides,
  alertOverrides,
  buttonOverrides,
  inputOverrides,
  navigationOverrides,
  miscOverrides,
);

// Export individual overrides for selective use
export {
  baselineOverrides,
  cardOverrides,
  alertOverrides,
  buttonOverrides,
  inputOverrides,
  navigationOverrides,
  miscOverrides,
};

export default componentOverrides;
