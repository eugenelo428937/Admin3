// Liftkit Theme - Backward Compatibility Wrapper
// This file now imports from the consolidated token layer
// for backward compatibility with existing code.
//
// @see tokens/spacing.js for spacing values
// @see tokens/typography.js for typography values

import { liftkitSpacing } from './tokens/spacing';
import { liftkitTypography } from './tokens/typography';

const liftKitTheme = {
  // Spacing system using golden ratio (1.618) scaling
  // These correspond to the CSS custom properties in globals.css
  spacing: liftkitSpacing,

  // Typography system extracted from typography.css
  typography: liftkitTypography,

  // Responsive breakpoints for media queries
  breakpoints: {
    mobile: '479px',
    tablet: '767px',
    desktop: '991px',
  },

  // Media query responsive typography adjustments
  responsive: {
    // Tablet adjustments (max-width: 767px)
    tablet: {
      display1: {
        fontSize: '3.3301em',
      },
      display1Bold: {
        fontSize: '3.3301em',
      },
    },
    // Mobile adjustments (max-width: 479px)
    mobile: {
      display1: {
        fontSize: '2.61743em',
      },
      display1Bold: {
        fontSize: '2.61743em',
      },
      display2: {
        fontSize: '2.05818em',
      },
      display2Bold: {
        fontSize: '2.05818em',
      },
      title1: {
        fontSize: '1.82285em',
      },
      title1Bold: {
        fontSize: '1.82285em',
      },
    },
    // Base body font size adjustments
    desktopSmall: {
      body: {
        fontSize: '1vw', // max-width: 991px
      },
    },
  },
};

export default liftKitTheme;
