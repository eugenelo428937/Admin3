/**
 * Tutorial Metadata Builder Utility
 *
 * Single source of truth for building tutorial metadata structures
 * used in cart operations (add/update).
 */

/**
 * Builds tutorial metadata structure for cart operations
 *
 * @param {Object} choices - Tutorial choices object keyed by level ("1st", "2nd", "3rd")
 * @param {string} subjectCode - Subject code (e.g., "CS2")
 * @param {string} location - Tutorial location
 * @param {number} actualPrice - Price amount for display
 * @returns {Object|null} Metadata object or null if no choices
 */
export const buildTutorialMetadata = (choices, subjectCode, location, actualPrice) => {
  // Get ordered choices (1st, 2nd, 3rd)
  const orderedChoices = ["1st", "2nd", "3rd"]
    .filter(level => choices[level])
    .map(level => choices[level]);

  if (orderedChoices.length === 0) {
    return null;
  }

  // Build location choices array
  const locationChoices = orderedChoices.map(choice => ({
    choice: choice.choiceLevel,
    variationId: choice.variationId,
    eventId: choice.eventId,
    variationName: choice.variationName,
    eventTitle: choice.eventTitle,
    eventCode: choice.eventCode,
    venue: choice.venue,
    startDate: choice.startDate,
    endDate: choice.endDate,
    price: `£${actualPrice}`,
  }));

  // Build complete metadata structure
  return {
    type: "tutorial",
    title: `${subjectCode} Tutorial`,
    locations: [
      {
        location: location,
        choices: locationChoices,
        choiceCount: locationChoices.length,
      }
    ],
    subjectCode: subjectCode,
    totalChoiceCount: locationChoices.length
  };
};

/**
 * Builds product data object for cart operations
 *
 * @param {number|string} productId - Product ID
 * @param {string} subjectCode - Subject code
 * @param {string} subjectName - Subject display name
 * @param {string} location - Tutorial location
 * @returns {Object} Product data object
 */
export const buildTutorialProductData = (productId, subjectCode, subjectName, location) => ({
  id: productId,
  essp_id: productId,
  product_id: productId,
  subject_code: subjectCode,
  subject_name: subjectName,
  product_name: `${subjectCode} Tutorial - ${location}`,
  product_type: "tutorial",
  quantity: 1
});

/**
 * Builds price data object for cart operations
 *
 * @param {number} actualPrice - Actual price amount
 * @param {Object} metadata - Tutorial metadata
 * @param {string} priceType - Price type (default: "standard")
 * @returns {Object} Price data object
 */
export const buildTutorialPriceData = (actualPrice, metadata, priceType = "standard") => ({
  priceType,
  actualPrice,
  metadata
});
