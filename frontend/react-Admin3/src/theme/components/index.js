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
 * All MUI component overrides combined.
 * Used in createTheme({ components: componentOverrides })
 */
export const componentOverrides = {
  ...baselineOverrides,
  ...cardOverrides,
  ...alertOverrides,
  ...buttonOverrides,
  ...inputOverrides,
  ...navigationOverrides,
  ...miscOverrides,
};

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
