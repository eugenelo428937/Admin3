/**
 * FilterValidator - Client-side validation logic for filter combinations
 *
 * Prevents invalid filter combinations and provides user guidance.
 * Performance target: < 5ms execution time
 */

class FilterValidator {
  /**
   * Validate complete filter state against all rules
   *
   * NOTE: Tutorial-related filters (tutorial_format, distance_learning, tutorial)
   * were removed from the filter state in previous implementation.
   * This validator provides the architecture for future validation rules
   * on existing filter fields (subjects, categories, product_types, products, modes_of_delivery).
   *
   * @param {Object} filters - Complete filter state from Redux
   * @returns {Array} Array of validation errors (empty if valid)
   */
  static validate(filters) {
    if (!filters) {
      return [];
    }

    const errors = [];

    // Run all validation rules
    // NOTE: Currently returns empty array as placeholder validation rules
    // have been removed (tutorial_format, distance_learning validation).
    // Add new validation rules here for existing filter fields as needed.
    errors.push(...this.validateProductGroups(filters));

    // Sort by severity (errors before warnings)
    return errors.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Validate product groups (future implementation)
   *
   * Placeholder for validation rules on existing filter fields:
   * - subjects, categories, product_types, products, modes_of_delivery
   *
   * Example future rule: Validate products must belong to selected product_types
   *
   * @param {Object} filters - Filter state
   * @returns {Array} Empty array (placeholder)
   */
  static validateProductGroups(filters) {
    // Placeholder for future implementation
    // Example rule: products must belong to selected product_types
    // Example rule: categories must be compatible with selected subjects
    return [];
  }

  /**
   * Check if any error-severity issues exist
   * @param {Object} filters - Filter state
   * @returns {boolean} True if error-severity issues exist
   */
  static hasErrors(filters) {
    const validationResults = this.validate(filters);
    return validationResults.some(error => error.severity === 'error');
  }

  /**
   * Get only error-severity validation issues
   * @param {Object} filters - Filter state
   * @returns {Array} Array of error-severity issues
   */
  static getErrors(filters) {
    const validationResults = this.validate(filters);
    return validationResults.filter(error => error.severity === 'error');
  }

  /**
   * Get only warning-severity validation issues
   * @param {Object} filters - Filter state
   * @returns {Array} Array of warning-severity issues
   */
  static getWarnings(filters) {
    const validationResults = this.validate(filters);
    return validationResults.filter(error => error.severity === 'warning');
  }
}

export default FilterValidator;
