/**
 * CssBaseline Component Overrides
 *
 * Global CSS baseline styles including accessibility features like
 * reduced motion support and skip links.
 *
 * @module theme/components/baseline
 *
 * ## Features
 *
 * @feature prefers-reduced-motion
 * @description Respects user's motion preferences by disabling animations
 * @usage Automatically applied globally via MuiCssBaseline
 *
 * @feature skip-link
 * @description Accessible skip-to-content link for keyboard users
 * @usage <a href="#main-content" className="skip-link">Skip to content</a>
 *
 * @example
 * // Reduced motion is automatically respected
 * // Users with prefers-reduced-motion: reduce will see:
 * // - No CSS animations
 * // - No CSS transitions
 * // - Instant scroll behavior
 */

import { a11y } from '../semantic/common';

export const baselineOverrides = {
  MuiCssBaseline: {
    styleOverrides: {
      // Reduced motion support - respects user's OS accessibility settings
      '@media (prefers-reduced-motion: reduce)': {
        '*, *::before, *::after': {
          animationDuration: '0.01ms !important',
          animationIterationCount: '1 !important',
          transitionDuration: '0.01ms !important',
          scrollBehavior: 'auto !important',
        },
      },

      // Skip link for keyboard navigation accessibility
      '.skip-link': {
        position: 'absolute',
        top: '-40px',
        left: 0,
        backgroundColor: a11y.skipLinkBg,
        color: a11y.skipLinkText,
        padding: '8px 16px',
        zIndex: 100000,
        textDecoration: 'none',
        fontWeight: 500,
        '&:focus': {
          top: 0,
        },
      },

      // Focus visible styles for keyboard navigation
      '*:focus-visible': {
        outline: `2px solid ${a11y.focusRing}`,
        outlineOffset: '2px',
      },

      // Remove focus outline for mouse users (only show for keyboard)
      '*:focus:not(:focus-visible)': {
        outline: 'none',
      },
    },
  },
};

export default baselineOverrides;
