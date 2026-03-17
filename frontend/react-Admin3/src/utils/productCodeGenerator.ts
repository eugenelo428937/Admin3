/**
 * Utility function to generate custom product codes based on product type
 */

interface ItemMetadata {
  type?: string;
  subjectCode?: string;
  variationName?: string;
  isOnlineClassroom?: boolean;
  eventCode?: string;
  eventTitle?: string;
  examSessionCode?: string;
  sessionCode?: string;
  choices?: Array<{
    eventCode?: string;
    eventTitle?: string;
  }>;
  locations?: Array<{
    choices?: Array<{
      eventCode?: string;
      eventTitle?: string;
    }>;
  }>;
}

interface CartItem {
  product_type?: string;
  product_name?: string;
  product_code?: string;
  subject_code?: string;
  exam_session_code?: string;
  metadata?: ItemMetadata;
}

/**
 * Generate custom product code for cart/order items
 */
export const generateProductCode = (item: CartItem): string => {
  try {
    // Get product type from backend field or metadata or determine from product name
    const producttype = item.product_type || item.metadata?.type || determineProductType(item);

    if (producttype === 'tutorial') {
      return generateTutorialProductCode(item);
    } else {
      // Material and marking items
      return generateMaterialMarkingProductCode(item);
    }
  } catch (error) {

    // Fallback to original product code if available
    return item.product_code || 'N/A';
  }
};

/**
 * Determine product type from item data
 */
const determineProductType = (item: CartItem): string => {
  const productName = (item.product_name || '').toLowerCase();

  if (productName.includes('tutorial')) {
    return 'tutorial';
  } else if (productName.includes('marking')) {
    return 'marking';
  }

  return 'material'; // Default
};

/**
 * Generate product code for tutorial items
 */
const generateTutorialProductCode = (item: CartItem): string => {
  const subjectCode = item.subject_code || item.metadata?.subjectCode;

  if (!subjectCode) {
    return item.product_code || 'N/A';
  }

  // Check if it's an online classroom product
  const isOnlineClassroom = isOnlineClassroomProduct(item);

  if (isOnlineClassroom) {
    // For online classroom: {Subject.code}-OC-{exam_sessions.session_code}
    const examSessionCode = getExamSessionCode(item);
    return `${subjectCode}-OC-${examSessionCode}`;
  } else {
    // For face-to-face or live online tutorial: {tutorial_events.code}
    const eventCode = getTutorialEventCode(item);
    return eventCode || `${subjectCode}-TUT`;
  }
};

/**
 * Generate product code for material and marking items
 */
const generateMaterialMarkingProductCode = (item: CartItem): string => {
  const subjectCode = item.subject_code;
  const productCode = item.product_code;
  const variationCode = getVariationCode(item);
  const examSessionCode = getExamSessionCode(item);

  if (!subjectCode || !productCode || !examSessionCode) {
    return item.product_code || 'N/A';
  }

  // Format: {subject}/{product_variations.code}{products.code}/{exam_sessions.session_code}
  const variationPrefix = variationCode ? variationCode : '';
  return `${subjectCode}/${variationPrefix}${productCode}/${examSessionCode}`;
};

/**
 * Check if product is an online classroom product
 */
const isOnlineClassroomProduct = (item: CartItem): boolean => {
  const productName = (item.product_name || '').toLowerCase();
  const metadata = item.metadata || {};

  return (
    productName.includes('online classroom') ||
    productName.includes('recording') ||
    productName.includes('lms') ||
    metadata.isOnlineClassroom === true ||
    // Check if there are no events (indicating online classroom)
    (metadata.type === 'tutorial' && !metadata.eventCode && !metadata.choices)
  );
};

/**
 * Get variation code from item metadata
 */
const getVariationCode = (item: CartItem): string => {
  const metadata = item.metadata || {};

  // Try to get variation code from metadata
  if (metadata.variationName) {
    const variationName = metadata.variationName.toLowerCase();

    // Map variation names to codes based on common patterns
    if (variationName.includes('ebook')) return 'C';
    if (variationName.includes('printed')) return 'P';

    // Return first letter capitalized as fallback
    return variationName.charAt(0).toUpperCase();
  }

  return '';
};

/**
 * Get exam session code from item
 */
const getExamSessionCode = (item: CartItem): string => {
  // First try the backend field if available
  if (item.exam_session_code) {
    return item.exam_session_code;
  }

  const metadata = item.metadata || {};

  // Try to get from various possible locations
  return (
    metadata.examSessionCode ||
    metadata.sessionCode ||
    // Extract from existing product code if follows pattern
    extractSessionCodeFromProductCode(item.product_code) ||
    'SESSION'
  );
};

/**
 * Get tutorial event code from item metadata
 */
const getTutorialEventCode = (item: CartItem): string | null => {
  const metadata = item.metadata || {};

  // Try to get event code from different metadata structures
  if (metadata.eventCode) {
    return metadata.eventCode;
  }

  // Check choices array for event codes
  if (metadata.choices && metadata.choices.length > 0) {
    const firstChoice = metadata.choices[0];
    return firstChoice.eventCode || firstChoice.eventTitle || null;
  }

  // Check locations array for event codes
  if (metadata.locations && metadata.locations.length > 0) {
    const firstLocation = metadata.locations[0];
    if (firstLocation.choices && firstLocation.choices.length > 0) {
      return firstLocation.choices[0].eventCode || firstLocation.choices[0].eventTitle || null;
    }
  }

  return null;
};

/**
 * Extract session code from existing product code pattern
 */
const extractSessionCodeFromProductCode = (productCode: string | undefined): string | null => {
  if (!productCode) return null;

  // Try to extract session code from pattern like "SUBJECT/CODE/SESSION"
  const parts = productCode.split('/');
  if (parts.length >= 3) {
    return parts[parts.length - 1]; // Last part is likely session code
  }

  return null;
};
