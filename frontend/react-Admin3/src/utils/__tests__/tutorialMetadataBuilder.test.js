/**
 * Tests for tutorialMetadataBuilder utility
 *
 * @module utils/__tests__/tutorialMetadataBuilder.test
 *
 * Tests tutorial metadata building including:
 * - buildTutorialMetadata: Build metadata for cart operations
 * - buildTutorialProductData: Build product data object
 * - buildTutorialPriceData: Build price data object
 */

import {
  buildTutorialMetadata,
  buildTutorialProductData,
  buildTutorialPriceData,
} from '../tutorialMetadataBuilder';

describe('tutorialMetadataBuilder', () => {
  describe('buildTutorialMetadata', () => {
    const mockChoice = {
      choiceLevel: '1st',
      variationId: 'var-123',
      eventId: 'evt-456',
      variationName: 'London Tutorial',
      eventTitle: 'CS2 London January 2025',
      eventCode: 'CS2-LON-JAN25',
      venue: 'Conference Centre',
      location: 'London',
      startDate: '2025-01-15',
      endDate: '2025-01-17',
    };

    test('should build metadata with single choice', () => {
      const choices = { '1st': mockChoice };
      const result = buildTutorialMetadata(choices, 'CS2', 'London', 150);

      expect(result).toEqual({
        type: 'tutorial',
        title: 'CS2 Tutorial',
        locations: [
          {
            location: 'London',
            choices: [
              {
                choice: '1st',
                variationId: 'var-123',
                eventId: 'evt-456',
                variationName: 'London Tutorial',
                eventTitle: 'CS2 London January 2025',
                eventCode: 'CS2-LON-JAN25',
                venue: 'Conference Centre',
                location: 'London',
                startDate: '2025-01-15',
                endDate: '2025-01-17',
                price: '£150',
              },
            ],
            choiceCount: 1,
          },
        ],
        subjectCode: 'CS2',
        totalChoiceCount: 1,
      });
    });

    test('should build metadata with multiple choices in correct order', () => {
      const choice1 = { ...mockChoice, choiceLevel: '1st' };
      const choice2 = {
        ...mockChoice,
        choiceLevel: '2nd',
        variationId: 'var-789',
        eventId: 'evt-012',
        location: 'Manchester',
      };
      const choice3 = {
        ...mockChoice,
        choiceLevel: '3rd',
        variationId: 'var-345',
        eventId: 'evt-678',
        location: 'Birmingham',
      };

      const choices = {
        '3rd': choice3, // Out of order
        '1st': choice1,
        '2nd': choice2,
      };

      const result = buildTutorialMetadata(choices, 'SA1', 'London', 200);

      // Should be ordered: 1st, 2nd, 3rd
      expect(result.locations[0].choices).toHaveLength(3);
      expect(result.locations[0].choices[0].choice).toBe('1st');
      expect(result.locations[0].choices[1].choice).toBe('2nd');
      expect(result.locations[0].choices[2].choice).toBe('3rd');
      expect(result.totalChoiceCount).toBe(3);
    });

    test('should return null when no choices provided', () => {
      const result = buildTutorialMetadata({}, 'CS2', 'London', 150);

      expect(result).toBeNull();
    });

    test('should return null when choices are all undefined', () => {
      const choices = { '1st': undefined, '2nd': undefined, '3rd': undefined };
      const result = buildTutorialMetadata(choices, 'CS2', 'London', 150);

      expect(result).toBeNull();
    });

    test('should handle partial choices (only 2nd choice)', () => {
      const choice2 = { ...mockChoice, choiceLevel: '2nd' };
      const choices = { '2nd': choice2 };

      const result = buildTutorialMetadata(choices, 'CM1', 'Online', 100);

      expect(result.locations[0].choices).toHaveLength(1);
      expect(result.locations[0].choices[0].choice).toBe('2nd');
      expect(result.totalChoiceCount).toBe(1);
    });

    test('should include location from function parameter', () => {
      const choices = { '1st': mockChoice };
      const result = buildTutorialMetadata(choices, 'CS2', 'Manchester', 150);

      expect(result.locations[0].location).toBe('Manchester');
    });

    test('should format price with pound symbol', () => {
      const choices = { '1st': mockChoice };
      const result = buildTutorialMetadata(choices, 'CS2', 'London', 99.99);

      expect(result.locations[0].choices[0].price).toBe('£99.99');
    });

    test('should handle zero price', () => {
      const choices = { '1st': mockChoice };
      const result = buildTutorialMetadata(choices, 'CS2', 'London', 0);

      expect(result.locations[0].choices[0].price).toBe('£0');
    });

    test('should preserve all choice properties', () => {
      const choices = { '1st': mockChoice };
      const result = buildTutorialMetadata(choices, 'CS2', 'London', 150);

      const choice = result.locations[0].choices[0];
      expect(choice.variationId).toBe('var-123');
      expect(choice.eventId).toBe('evt-456');
      expect(choice.variationName).toBe('London Tutorial');
      expect(choice.eventTitle).toBe('CS2 London January 2025');
      expect(choice.eventCode).toBe('CS2-LON-JAN25');
      expect(choice.venue).toBe('Conference Centre');
      expect(choice.location).toBe('London');
      expect(choice.startDate).toBe('2025-01-15');
      expect(choice.endDate).toBe('2025-01-17');
    });

    test('should handle choice with missing optional properties', () => {
      const minimalChoice = {
        choiceLevel: '1st',
        variationId: 'var-123',
        eventId: 'evt-456',
      };
      const choices = { '1st': minimalChoice };

      const result = buildTutorialMetadata(choices, 'CS2', 'London', 150);

      expect(result.locations[0].choices[0]).toEqual({
        choice: '1st',
        variationId: 'var-123',
        eventId: 'evt-456',
        variationName: undefined,
        eventTitle: undefined,
        eventCode: undefined,
        venue: undefined,
        location: undefined,
        startDate: undefined,
        endDate: undefined,
        price: '£150',
      });
    });
  });

  describe('buildTutorialProductData', () => {
    test('should build product data with all fields', () => {
      const result = buildTutorialProductData(
        123,
        'CS2',
        'Communication Sciences 2',
        'London'
      );

      expect(result).toEqual({
        id: 123,
        essp_id: 123,
        product_id: 123,
        subject_code: 'CS2',
        subject_name: 'Communication Sciences 2',
        product_name: 'CS2 Tutorial - London',
        product_type: 'tutorial',
        quantity: 1,
      });
    });

    test('should handle string product ID', () => {
      const result = buildTutorialProductData(
        'prod-456',
        'SA1',
        'Subject A1',
        'Manchester'
      );

      expect(result.id).toBe('prod-456');
      expect(result.essp_id).toBe('prod-456');
      expect(result.product_id).toBe('prod-456');
    });

    test('should format product name correctly', () => {
      const result = buildTutorialProductData(
        123,
        'CM1',
        'Core Mathematics 1',
        'Online Classroom'
      );

      expect(result.product_name).toBe('CM1 Tutorial - Online Classroom');
    });

    test('should always set quantity to 1', () => {
      const result = buildTutorialProductData(123, 'CS2', 'CS2', 'London');

      expect(result.quantity).toBe(1);
    });

    test('should always set product_type to tutorial', () => {
      const result = buildTutorialProductData(123, 'CS2', 'CS2', 'London');

      expect(result.product_type).toBe('tutorial');
    });
  });

  describe('buildTutorialPriceData', () => {
    test('should build price data with default price type', () => {
      const metadata = { type: 'tutorial', title: 'CS2 Tutorial' };
      const result = buildTutorialPriceData(150, metadata);

      expect(result).toEqual({
        priceType: 'standard',
        actualPrice: 150,
        metadata,
      });
    });

    test('should build price data with custom price type', () => {
      const metadata = { type: 'tutorial', title: 'CS2 Tutorial' };
      const result = buildTutorialPriceData(100, metadata, 'retaker');

      expect(result).toEqual({
        priceType: 'retaker',
        actualPrice: 100,
        metadata,
      });
    });

    test('should handle null metadata', () => {
      const result = buildTutorialPriceData(150, null);

      expect(result).toEqual({
        priceType: 'standard',
        actualPrice: 150,
        metadata: null,
      });
    });

    test('should handle zero price', () => {
      const metadata = { type: 'tutorial' };
      const result = buildTutorialPriceData(0, metadata);

      expect(result.actualPrice).toBe(0);
    });

    test('should handle decimal prices', () => {
      const metadata = { type: 'tutorial' };
      const result = buildTutorialPriceData(99.99, metadata);

      expect(result.actualPrice).toBe(99.99);
    });

    test('should preserve complex metadata structure', () => {
      const metadata = {
        type: 'tutorial',
        title: 'CS2 Tutorial',
        locations: [
          {
            location: 'London',
            choices: [{ choice: '1st' }],
          },
        ],
      };

      const result = buildTutorialPriceData(150, metadata);

      expect(result.metadata).toEqual(metadata);
    });

    test('should work with additional price type', () => {
      const metadata = { type: 'tutorial' };
      const result = buildTutorialPriceData(75, metadata, 'additional');

      expect(result.priceType).toBe('additional');
    });
  });

  describe('integration scenarios', () => {
    test('should build complete cart data for tutorial', () => {
      // Simulate building complete cart data
      const choice = {
        choiceLevel: '1st',
        variationId: 'var-123',
        eventId: 'evt-456',
        variationName: 'London Tutorial',
        eventTitle: 'CS2 London January 2025',
        eventCode: 'CS2-LON-JAN25',
        venue: 'Conference Centre',
        location: 'London',
        startDate: '2025-01-15',
        endDate: '2025-01-17',
      };

      const choices = { '1st': choice };
      const productId = 123;
      const subjectCode = 'CS2';
      const subjectName = 'Communication Sciences 2';
      const location = 'London';
      const actualPrice = 150;

      // Build all cart data pieces
      const metadata = buildTutorialMetadata(choices, subjectCode, location, actualPrice);
      const productData = buildTutorialProductData(productId, subjectCode, subjectName, location);
      const priceData = buildTutorialPriceData(actualPrice, metadata);

      // Verify structure integrity
      expect(metadata.type).toBe('tutorial');
      expect(productData.product_type).toBe('tutorial');
      expect(priceData.metadata).toBe(metadata);
      expect(priceData.actualPrice).toBe(actualPrice);
    });

    test('should handle scenario with no choices', () => {
      const metadata = buildTutorialMetadata({}, 'CS2', 'London', 150);
      const priceData = buildTutorialPriceData(150, metadata);

      expect(metadata).toBeNull();
      expect(priceData.metadata).toBeNull();
    });
  });
});
