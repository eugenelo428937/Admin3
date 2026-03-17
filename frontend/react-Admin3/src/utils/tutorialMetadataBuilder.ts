/**
 * Tutorial Metadata Builder Utility
 *
 * Single source of truth for building tutorial metadata structures
 * used in cart operations (add/update).
 */

interface TutorialChoice {
  choiceLevel: string;
  variationId: number | string;
  eventId: number | string;
  variationName: string;
  eventTitle: string;
  eventCode: string;
  venue: string;
  location: string;
  startDate: string;
  endDate: string;
}

interface LocationChoice {
  choice: string;
  variationId: number | string;
  eventId: number | string;
  variationName: string;
  eventTitle: string;
  eventCode: string;
  venue: string;
  location: string;
  startDate: string;
  endDate: string;
  price: string;
}

export interface TutorialMetadata {
  type: string;
  title: string;
  locations: Array<{
    location: string;
    choices: LocationChoice[];
    choiceCount: number;
  }>;
  subjectCode: string;
  totalChoiceCount: number;
}

export interface TutorialProductData {
  id: number | string;
  essp_id: number | string;
  product_id: number | string;
  subject_code: string;
  subject_name: string;
  product_name: string;
  product_type: string;
  quantity: number;
}

export interface TutorialPriceData {
  priceType: string;
  actualPrice: number;
  metadata: TutorialMetadata | null;
}

/**
 * Builds tutorial metadata structure for cart operations
 */
export const buildTutorialMetadata = (
  choices: Record<string, TutorialChoice>,
  subjectCode: string,
  location: string,
  actualPrice: number
): TutorialMetadata | null => {
  // Get ordered choices (1st, 2nd, 3rd)
  const orderedChoices = ["1st", "2nd", "3rd"]
    .filter(level => choices[level])
    .map(level => choices[level]);

  if (orderedChoices.length === 0) {
    return null;
  }

  // Build location choices array
  const locationChoices: LocationChoice[] = orderedChoices.map(choice => ({
    choice: choice.choiceLevel,
    variationId: choice.variationId,
    eventId: choice.eventId,
    variationName: choice.variationName,
    eventTitle: choice.eventTitle,
    eventCode: choice.eventCode,
    venue: choice.venue,
    location: choice.location,
    startDate: choice.startDate,
    endDate: choice.endDate,
    price: `\u00A3${actualPrice}`,
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
 */
export const buildTutorialProductData = (
  productId: number | string,
  subjectCode: string,
  subjectName: string,
  location: string
): TutorialProductData => ({
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
 */
export const buildTutorialPriceData = (
  actualPrice: number,
  metadata: TutorialMetadata | null,
  priceType: string = "standard"
): TutorialPriceData => ({
  priceType,
  actualPrice,
  metadata
});
