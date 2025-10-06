/**
 * Common styles and constants for Tutorial components
 * Centralized to ensure consistency across TutorialDetailCard, TutorialSelectionDialog, and TutorialSelectionSummaryBar
 */

/**
 * Minimum touch target size for mobile accessibility
 * Following WCAG 2.1 Level AAA guidelines (44x44 CSS pixels)
 */
export const TOUCH_TARGET_SIZE = '44px';

/**
 * Common button style for touch-optimized buttons
 * Ensures all interactive elements meet minimum touch target requirements
 */
export const touchButtonStyle = {
  minHeight: TOUCH_TARGET_SIZE,
};

/**
 * Common icon button style for touch-optimized icon buttons
 * Ensures square touch targets for icon-only buttons
 */
export const touchIconButtonStyle = {
  minWidth: TOUCH_TARGET_SIZE,
  minHeight: TOUCH_TARGET_SIZE,
};

/**
 * Responsive grid spacing for TutorialSelectionDialog
 * Reduces spacing on mobile, standard spacing on larger screens
 */
export const responsiveGridSpacing = {
  xs: 2,
  md: 3,
};
