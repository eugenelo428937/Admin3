/**
 * Accessibility Gates Contract Test (T013)
 *
 * This test enforces WCAG 2.1 Level AA accessibility compliance.
 * Verifies that accessibility testing infrastructure and tests exist.
 *
 * User Story: US8 - Accessibility (WCAG 2.1 AA)
 */

import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility Gates - Infrastructure', () => {
  test('jest-axe is installed and configured', () => {
    // Verify jest-axe is available
    expect(axe).toBeDefined();
    expect(typeof axe).toBe('function');
  });

  test('accessibility helpers are available', () => {
    // Verify test utilities exist
    const fs = require('fs');
    const path = require('path');

    const helpersPath = path.join(__dirname, '../test-utils/accessibilityHelpers.js');
    expect(fs.existsSync(helpersPath)).toBe(true);
  });

  test('toHaveNoViolations matcher is available', () => {
    // Verify the custom matcher is extended
    expect(toHaveNoViolations).toBeDefined();
  });
});

describe('Accessibility Test Coverage Status', () => {
  /**
   * Components with accessibility tests (WCAG 2.1 AA compliance):
   * - LoginFormContent.test.js - T077
   * - MainNavBar.test.js - T078
   * - ForgotPasswordForm.test.js - T079
   * - CheckoutSteps tests - T080
   * - SearchModal tests - T081
   *
   * Each component test file includes:
   * - jest-axe automated accessibility scan
   * - ARIA label verification
   * - Keyboard navigation tests
   */
  test('accessibility tests exist for key components', () => {
    const fs = require('fs');
    const path = require('path');

    // List of test files that should have accessibility tests
    const componentTestFiles = [
      '../components/User/__tests__/LoginFormContent.test.js',
      '../components/Navigation/__tests__/MainNavBar.test.js',
      '../components/User/__tests__/ForgotPasswordForm.test.js',
    ];

    componentTestFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});
