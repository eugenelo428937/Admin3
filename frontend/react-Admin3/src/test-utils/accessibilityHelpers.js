import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

/**
 * Run axe accessibility tests on a rendered component
 * @param {HTMLElement} container - RTL container element
 * @param {Object} axeOptions - Optional axe configuration
 * @returns {Promise<Object>} Axe results
 */
export const runAxeTest = async (container, axeOptions = {}) => {
  const results = await axe(container, {
    rules: {
      // Disable color-contrast for tests (requires visual rendering)
      'color-contrast': { enabled: false },
    },
    ...axeOptions,
  });
  return results;
};

/**
 * Assert that a component has no accessibility violations
 * Usage: await expectNoA11yViolations(container);
 * @param {HTMLElement} container - RTL container element
 * @param {Object} axeOptions - Optional axe configuration
 */
export const expectNoA11yViolations = async (container, axeOptions = {}) => {
  const results = await runAxeTest(container, axeOptions);
  expect(results).toHaveNoViolations();
};

/**
 * Custom axe configuration for WCAG 2.1 AA compliance
 */
export const wcag21AAConfig = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
};

/**
 * Test keyboard navigation for interactive elements
 * @param {HTMLElement} element - Element to test
 * @param {Object} user - userEvent instance
 */
export const testKeyboardNavigation = async (element, user) => {
  element.focus();
  expect(document.activeElement).toBe(element);
  
  await user.keyboard('{Tab}');
  expect(document.activeElement).not.toBe(element);
};

/**
 * Assert that element has proper ARIA attributes
 * @param {HTMLElement} element - Element to check
 * @param {Object} expectedAttrs - Expected ARIA attributes
 */
export const expectAriaAttributes = (element, expectedAttrs) => {
  Object.entries(expectedAttrs).forEach(([attr, value]) => {
    expect(element).toHaveAttribute(attr, value);
  });
};

export { axe };
