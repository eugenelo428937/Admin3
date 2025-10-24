/**
 * FilterUrlManager Tests
 *
 * Comprehensive test suite for centralized URL parameter utility.
 * Target: 75+ tests, ≥95% coverage
 *
 * Story 1.10 - Centralized URL Parameter Utility
 */

import {
  URL_PARAM_KEYS,
  toUrlParams,
  fromUrlParams,
  buildUrl,
  hasActiveFilters,
  areFiltersEqual
} from '../filterUrlManager';

describe('FilterUrlManager', () => {
  describe('toUrlParams', () => {
    describe('Positive cases', () => {
      // T004 - 18 positive tests

      test('converts subjects array to indexed parameters', () => {
        const filters = {
          subjects: ['CM2', 'SA1', 'CB1'],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('subject_code')).toBe('CM2');
        expect(params.get('subject_1')).toBe('SA1');
        expect(params.get('subject_2')).toBe('CB1');
      });

      test('converts product_types to comma-separated group parameter', () => {
        const filters = {
          subjects: [],
          categories: [],
          product_types: ['Materials', 'Tutorials', 'Mocks'],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('group')).toBe('Materials,Tutorials,Mocks');
      });


      test('handles single subject', () => {
        const filters = {
          subjects: ['CM2'],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('subject_code')).toBe('CM2');
        expect(params.get('subject_1')).toBeNull();
      });

      test('handles multiple subjects (2)', () => {
        const filters = {
          subjects: ['CM2', 'SA1'],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('subject_code')).toBe('CM2');
        expect(params.get('subject_1')).toBe('SA1');
        expect(params.get('subject_2')).toBeNull();
      });

      test('handles multiple subjects (10)', () => {
        const filters = {
          subjects: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('subject_code')).toBe('S1');
        expect(params.get('subject_1')).toBe('S2');
        expect(params.get('subject_9')).toBe('S10');
      });

      test('converts all filter types simultaneously', () => {
        const filters = {
          subjects: ['CM2', 'SA1'],
          categories: ['Bundle', 'Core'],
          product_types: ['Materials', 'Tutorials'],
          products: ['PROD1', 'PROD2'],
          modes_of_delivery: ['Online', 'In-Person'],
          searchQuery: 'actuarial exam'
        };

        const params = toUrlParams(filters);

        // Subjects (indexed)
        expect(params.get('subject_code')).toBe('CM2');
        expect(params.get('subject_1')).toBe('SA1');

        // Categories (indexed)
        expect(params.get('category_code')).toBe('Bundle');
        expect(params.get('category_1')).toBe('Core');

        // Product types (comma-separated)
        expect(params.get('group')).toBe('Materials,Tutorials');

        // Products (comma-separated)
        expect(params.get('product')).toBe('PROD1,PROD2');

        // Modes of delivery (comma-separated)
        expect(params.get('mode_of_delivery')).toBe('Online,In-Person');

        // Search query
        expect(params.get('search_query')).toBe('actuarial exam');
      });

      test('handles categories with indexed format', () => {
        const filters = {
          subjects: [],
          categories: ['Bundle', 'Core', 'Revision'],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('category_code')).toBe('Bundle');
        expect(params.get('category_1')).toBe('Core');
        expect(params.get('category_2')).toBe('Revision');
      });

      test('handles products comma-separated format', () => {
        const filters = {
          subjects: [],
          categories: [],
          product_types: [],
          products: ['PROD1', 'PROD2', 'PROD3'],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('product')).toBe('PROD1,PROD2,PROD3');
      });

      test('handles modes_of_delivery comma-separated format', () => {
        const filters = {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: ['Online', 'Hybrid'],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('mode_of_delivery')).toBe('Online,Hybrid');
      });


      test('handles search query', () => {
        const filters = {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: 'mock exam papers'
        };

        const params = toUrlParams(filters);
        expect(params.get('search_query')).toBe('mock exam papers');
      });




      test('handles combination of indexed and comma-separated arrays', () => {
        const filters = {
          subjects: ['CM2', 'SA1'],  // indexed
          categories: [],
          product_types: ['Materials', 'Mocks'],  // comma-separated
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('subject_code')).toBe('CM2');
        expect(params.get('subject_1')).toBe('SA1');
        expect(params.get('group')).toBe('Materials,Mocks');
      });

      test('preserves parameter order consistency', () => {
        const filters = {
          subjects: ['CM2'],
          categories: ['Bundle'],
          product_types: ['Materials'],
          products: ['PROD1'],
          modes_of_delivery: ['Online'],
          searchQuery: 'test'
        };

        const params = toUrlParams(filters);
        const str = params.toString();

        // Verify all parameters are present
        expect(str).toContain('subject_code=CM2');
        expect(str).toContain('category_code=Bundle');
        expect(str).toContain('group=Materials');
        expect(str).toContain('product=PROD1');
        expect(str).toContain('mode_of_delivery=Online');
        expect(str).toContain('search_query=test');
      });
    });

    describe('Negative cases', () => {
      // T005 - 8 negative tests


      test('omits null values', () => {
        const filters = {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        // Empty arrays should not produce parameters
        expect(params.get('subject_code')).toBeNull();
      });

      test('omits undefined values', () => {
        const filters = {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: undefined
        };

        const params = toUrlParams(filters);
        // Undefined search query should not produce parameter
        expect(params.get('search_query')).toBeNull();
      });

      test('omits empty arrays', () => {
        const filters = {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('subject_code')).toBeNull();
        expect(params.get('category_code')).toBeNull();
        expect(params.get('group')).toBeNull();
        expect(params.get('product')).toBeNull();
        expect(params.get('mode_of_delivery')).toBeNull();
      });

      test('returns empty params for empty filters', () => {
        const filters = {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.toString()).toBe('');
      });

      test('handles null filters gracefully', () => {
        const params = toUrlParams(null);
        expect(params.toString()).toBe('');
      });

      test('handles undefined filters gracefully', () => {
        const params = toUrlParams(undefined);
        expect(params.toString()).toBe('');
      });

      test('omits empty search query', () => {
        const filters = {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('search_query')).toBeNull();
      });
    });

    describe('Edge cases', () => {
      // T006 - 6 edge case tests

      test('trims search query whitespace', () => {
        const filters = {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: '  mock exam  '
        };

        const params = toUrlParams(filters);
        expect(params.get('search_query')).toBe('mock exam');
      });

      test('handles empty strings in arrays', () => {
        const filters = {
          subjects: ['CM2', '', 'SA1'],
          categories: [],
          product_types: ['Materials', '', 'Mocks'],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);

        // Empty strings should be filtered out
        expect(params.get('subject_code')).toBe('CM2');
        expect(params.get('subject_1')).toBe('SA1');
        expect(params.get('subject_2')).toBeNull();

        expect(params.get('group')).toBe('Materials,Mocks');
      });

      test('handles very long filter arrays (100+ items)', () => {
        const longArray = Array.from({ length: 150 }, (_, i) => `SUB${i}`);
        const filters = {
          subjects: longArray,
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        };

        const params = toUrlParams(filters);
        expect(params.get('subject_code')).toBe('SUB0');
        expect(params.get('subject_1')).toBe('SUB1');
        expect(params.get('subject_149')).toBe('SUB149');
      });

      test('handles whitespace-only search query', () => {
        const filters = {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: '   '
        };

        const params = toUrlParams(filters);
        expect(params.get('search_query')).toBeNull();
      });

      test('handles special characters in filter values', () => {
        const filters = {
          subjects: ['CM2 & SA1', 'CB1/CB2'],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: 'test & practice'
        };

        const params = toUrlParams(filters);
        expect(params.get('subject_code')).toBe('CM2 & SA1');
        expect(params.get('subject_1')).toBe('CB1/CB2');
        expect(params.get('search_query')).toBe('test & practice');
      });

    });
  });

  describe('fromUrlParams', () => {
    describe('Positive cases', () => {
      // T007 - 18 positive tests

      test('parses subject_code parameter to subjects array', () => {
        const params = new URLSearchParams('subject_code=CM2');
        const filters = fromUrlParams(params);

        expect(filters.subjects).toEqual(['CM2']);
      });

      test('parses multiple subjects with subject_1, subject_2', () => {
        const params = new URLSearchParams('subject_code=CM2&subject_1=SA1&subject_2=CB1');
        const filters = fromUrlParams(params);

        expect(filters.subjects).toEqual(['CM2', 'SA1', 'CB1']);
      });

      test('parses comma-separated group to product_types array', () => {
        const params = new URLSearchParams('group=Materials,Tutorials,Mocks');
        const filters = fromUrlParams(params);

        expect(filters.product_types).toEqual(['Materials', 'Tutorials', 'Mocks']);
      });


      test('parses search query from search_query parameter', () => {
        const params = new URLSearchParams('search_query=mock+exam');
        const filters = fromUrlParams(params);

        expect(filters.searchQuery).toBe('mock exam');
      });

      test('parses search query from q parameter (alias)', () => {
        const params = new URLSearchParams('q=actuarial');
        const filters = fromUrlParams(params);

        expect(filters.searchQuery).toBe('actuarial');
      });

      test('parses all filter types simultaneously', () => {
        const queryString = 'subject_code=CM2&subject_1=SA1&category_code=Bundle&group=Materials,Tutorials&product=PROD1&mode_of_delivery=Online,Hybrid&search_query=test';
        const params = new URLSearchParams(queryString);
        const filters = fromUrlParams(params);

        expect(filters.subjects).toEqual(['CM2', 'SA1']);
        expect(filters.categories).toEqual(['Bundle']);
        expect(filters.product_types).toEqual(['Materials', 'Tutorials']);
        expect(filters.products).toEqual(['PROD1']);
        expect(filters.modes_of_delivery).toEqual(['Online', 'Hybrid']);
        expect(filters.searchQuery).toBe('test');
      });

      test('parses categories with indexed format', () => {
        const params = new URLSearchParams('category_code=Bundle&category_1=Core&category_2=Revision');
        const filters = fromUrlParams(params);

        expect(filters.categories).toEqual(['Bundle', 'Core', 'Revision']);
      });

      test('parses products comma-separated format', () => {
        const params = new URLSearchParams('product=PROD1,PROD2,PROD3');
        const filters = fromUrlParams(params);

        expect(filters.products).toEqual(['PROD1', 'PROD2', 'PROD3']);
      });

      test('parses modes_of_delivery comma-separated format', () => {
        const params = new URLSearchParams('mode_of_delivery=Online,In-Person');
        const filters = fromUrlParams(params);

        expect(filters.modes_of_delivery).toEqual(['Online', 'In-Person']);
      });




      test('parses subject with only indexed parameters', () => {
        const params = new URLSearchParams('subject_1=SA1&subject_2=CB1');
        const filters = fromUrlParams(params);

        expect(filters.subjects).toEqual(['SA1', 'CB1']);
      });

      test('parses parameters with URL encoding', () => {
        const params = new URLSearchParams('search_query=mock+exam+%26+practice');
        const filters = fromUrlParams(params);

        expect(filters.searchQuery).toBe('mock exam & practice');
      });

      test('handles mixed case parameter names (case-insensitive)', () => {
        // URLSearchParams is case-sensitive, but we'll test standard casing
        const params = new URLSearchParams('subject_code=CM2&group=Materials');
        const filters = fromUrlParams(params);

        expect(filters.subjects).toEqual(['CM2']);
        expect(filters.product_types).toEqual(['Materials']);
      });

      test('parses very long indexed subject arrays', () => {
        let queryString = 'subject_code=SUB0';
        for (let i = 1; i < 50; i++) {
          queryString += `&subject_${i}=SUB${i}`;
        }

        const params = new URLSearchParams(queryString);
        const filters = fromUrlParams(params);

        expect(filters.subjects.length).toBe(50);
        expect(filters.subjects[0]).toBe('SUB0');
        expect(filters.subjects[49]).toBe('SUB49');
      });

      test('preserves filter order within arrays', () => {
        const params = new URLSearchParams('subject_code=CM2&subject_1=SA1&subject_2=CB1&subject_3=CP1');
        const filters = fromUrlParams(params);

        expect(filters.subjects).toEqual(['CM2', 'SA1', 'CB1', 'CP1']);
      });
    });

    describe('Negative cases', () => {
      // T008 - 8 negative tests

      test('returns default empty filter structure for empty params', () => {
        const params = new URLSearchParams('');
        const filters = fromUrlParams(params);

        expect(filters).toEqual({
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        });
      });

      test('ignores unknown parameters', () => {
        const params = new URLSearchParams('unknown_param=value&invalid=test');
        const filters = fromUrlParams(params);

        expect(filters).toEqual({
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        });
      });



      test('handles null input gracefully', () => {
        const filters = fromUrlParams(null);

        expect(filters).toEqual({
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        });
      });

      test('handles undefined input gracefully', () => {
        const filters = fromUrlParams(undefined);

        expect(filters).toEqual({
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        });
      });


      test('handles empty parameter values', () => {
        const params = new URLSearchParams('subject_code=&group=&search_query=');
        const filters = fromUrlParams(params);

        expect(filters.subjects).toEqual([]);
        expect(filters.product_types).toEqual([]);
        expect(filters.searchQuery).toBe('');
      });
    });

    describe('Edge cases', () => {
      // T009 - 6 edge case tests

      test('handles whitespace in comma-separated values', () => {
        const params = new URLSearchParams('group=Materials, Tutorials , Mocks');
        const filters = fromUrlParams(params);

        // Whitespace should be trimmed
        expect(filters.product_types).toEqual(['Materials', 'Tutorials', 'Mocks']);
      });

      test('handles empty array entries from comma-separated values', () => {
        const params = new URLSearchParams('group=Materials,,Mocks');
        const filters = fromUrlParams(params);

        // Empty entries should be filtered out
        expect(filters.product_types).toEqual(['Materials', 'Mocks']);
      });

      test('accepts string parameter format', () => {
        const queryString = 'subject_code=CM2&group=Materials';
        const filters = fromUrlParams(queryString);

        expect(filters.subjects).toEqual(['CM2']);
        expect(filters.product_types).toEqual(['Materials']);
      });

      test('handles parameters with only commas', () => {
        const params = new URLSearchParams('group=,,,');
        const filters = fromUrlParams(params);

        expect(filters.product_types).toEqual([]);
      });

      test('handles gaps in indexed parameters', () => {
        // Missing subject_1
        const params = new URLSearchParams('subject_code=CM2&subject_2=CB1&subject_3=CP1');
        const filters = fromUrlParams(params);

        // Should stop at first gap
        expect(filters.subjects).toEqual(['CM2']);
      });

      test('handles special characters in parameter values', () => {
        const params = new URLSearchParams();
        params.set('subject_code', 'CM2 & SA1');
        params.set('search_query', 'test & practice');

        const filters = fromUrlParams(params);

        expect(filters.subjects).toEqual(['CM2 & SA1']);
        expect(filters.searchQuery).toBe('test & practice');
      });
    });
  });

  describe('buildUrl', () => {
    // T010 - buildUrl tests

    test('builds complete URL with query parameters', () => {
      const filters = {
        subjects: ['CM2', 'SA1'],
        categories: [],
        product_types: ['Materials'],
        products: [],
        modes_of_delivery: [],
        searchQuery: ''
      };

      const url = buildUrl(filters);

      expect(url).toContain('/products?');
      expect(url).toContain('subject_code=CM2');
      expect(url).toContain('subject_1=SA1');
      expect(url).toContain('group=Materials');
    });

    test('returns base path for empty filters', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: ''
      };

      const url = buildUrl(filters);
      expect(url).toBe('/products');
    });

    test('accepts custom base path', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: ''
      };

      const url = buildUrl(filters, '/custom/path');

      expect(url).toContain('/custom/path?');
      expect(url).toContain('subject_code=CM2');
    });
  });

  describe('Bidirectional conversion (idempotency)', () => {
    // T010 - idempotency tests

    test('filters → URL → filters produces same result', () => {
      const originalFilters = {
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: ['Materials', 'Tutorials'],
        products: ['PROD1'],
        modes_of_delivery: ['Online'],
        searchQuery: 'mock exam'
      };

      const params = toUrlParams(originalFilters);
      const reconstructedFilters = fromUrlParams(params);

      expect(reconstructedFilters).toEqual(originalFilters);
    });

    test('URL → filters → URL produces same result', () => {
      const originalUrl = 'subject_code=CM2&subject_1=SA1&group=Materials&search_query=test';
      const params1 = new URLSearchParams(originalUrl);

      const filters = fromUrlParams(params1);
      const params2 = toUrlParams(filters);

      // Compare parameter sets (order may differ)
      expect(params2.get('subject_code')).toBe(params1.get('subject_code'));
      expect(params2.get('subject_1')).toBe(params1.get('subject_1'));
      expect(params2.get('group')).toBe(params1.get('group'));
      expect(params2.get('search_query')).toBe(params1.get('search_query'));
    });
  });

  describe('hasActiveFilters', () => {
    // T010 - hasActiveFilters tests

    test('returns true when filters are active', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: ''
      };

      expect(hasActiveFilters(filters)).toBe(true);
    });

    test('returns true when product_types active', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: ['Materials'],
        products: [],
        modes_of_delivery: [],
        searchQuery: ''
      };

      expect(hasActiveFilters(filters)).toBe(true);
    });


    test('returns true when search query active', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: 'mock exam'
      };

      expect(hasActiveFilters(filters)).toBe(true);
    });

    test('returns false when no filters are active', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: ''
      };

      expect(hasActiveFilters(filters)).toBe(false);
    });

    test('returns false for null filters', () => {
      expect(hasActiveFilters(null)).toBe(false);
    });
  });

  describe('areFiltersEqual', () => {
    // T010 - areFiltersEqual tests

    test('returns true for identical filters', () => {
      const filters1 = {
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: ['Materials'],
        products: [],
        modes_of_delivery: [],
        searchQuery: 'test'
      };

      const filters2 = { ...filters1 };

      expect(areFiltersEqual(filters1, filters2)).toBe(true);
    });

    test('returns false for different array values', () => {
      const filters1 = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: ''
      };

      const filters2 = {
        subjects: ['SA1'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: ''
      };

      expect(areFiltersEqual(filters1, filters2)).toBe(false);
    });


    test('returns false for different search queries', () => {
      const filters1 = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: 'test1'
      };

      const filters2 = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: 'test2'
      };

      expect(areFiltersEqual(filters1, filters2)).toBe(false);
    });

    test('returns true for both null', () => {
      expect(areFiltersEqual(null, null)).toBe(true);
    });

    test('returns false when one is null', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: ''
      };

      expect(areFiltersEqual(filters, null)).toBe(false);
      expect(areFiltersEqual(null, filters)).toBe(false);
    });
  });

  describe('Performance', () => {
    // T011 - performance tests

    test('toUrlParams executes in < 1ms', () => {
      const filters = {
        subjects: ['CM2', 'SA1', 'CB1'],
        categories: ['Bundle', 'Core'],
        product_types: ['Materials', 'Tutorials'],
        products: ['PROD1', 'PROD2'],
        modes_of_delivery: ['Online', 'Hybrid'],
        searchQuery: 'mock exam papers'
      };

      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        toUrlParams(filters);
      }
      const endTime = performance.now();

      const avgTime = (endTime - startTime) / 100;
      expect(avgTime).toBeLessThan(1); // < 1ms average
    });

    test('fromUrlParams executes in < 1ms', () => {
      const params = new URLSearchParams('subject_code=CM2&subject_1=SA1&group=Materials,Tutorials&search_query=test');

      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        fromUrlParams(params);
      }
      const endTime = performance.now();

      const avgTime = (endTime - startTime) / 100;
      expect(avgTime).toBeLessThan(1); // < 1ms average
    });

    test('buildUrl executes in < 1ms', () => {
      const filters = {
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: ['Materials'],
        products: [],
        modes_of_delivery: [],
        searchQuery: 'test'
      };

      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        buildUrl(filters);
      }
      const endTime = performance.now();

      const avgTime = (endTime - startTime) / 100;
      expect(avgTime).toBeLessThan(1); // < 1ms average
    });
  });
});
