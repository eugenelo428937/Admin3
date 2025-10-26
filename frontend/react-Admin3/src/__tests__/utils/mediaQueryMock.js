/**
 * Media Query Mocking Utilities
 * Epic 4 - Story 3: Mobile Responsive Summary Bar
 *
 * Provides utilities to mock Material-UI useMediaQuery hook
 * for testing responsive behavior in components.
 *
 * Usage:
 *   import { mockMobile, mockDesktop } from '../utils/mediaQueryMock';
 *
 *   // In test setup
 *   mockMobile(); // Simulates mobile viewport (< 900px)
 *   mockDesktop(); // Simulates desktop viewport (≥ 900px)
 */

/**
 * Mock useMediaQuery to return true (mobile viewport < 900px)
 * Simulates: theme.breakpoints.down('md') → true
 */
export const mockMobile = () => {
  const useMediaQuery = require('@mui/material/useMediaQuery');
  useMediaQuery.default.mockReturnValue(true); // isMobile = true
};

/**
 * Mock useMediaQuery to return false (desktop viewport ≥ 900px)
 * Simulates: theme.breakpoints.down('md') → false
 */
export const mockDesktop = () => {
  const useMediaQuery = require('@mui/material/useMediaQuery');
  useMediaQuery.default.mockReturnValue(false); // isMobile = false
};

/**
 * Reset useMediaQuery mock to clear all mock data
 */
export const resetMediaQueryMock = () => {
  const useMediaQuery = require('@mui/material/useMediaQuery');
  useMediaQuery.default.mockReset();
};
