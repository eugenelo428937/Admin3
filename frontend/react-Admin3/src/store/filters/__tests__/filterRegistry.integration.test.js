/**
 * FilterRegistry Integration Tests (Story 1.16)
 *
 * TDD RED Phase: These tests MUST FAIL until test utilities are implemented (T026)
 *
 * Tests FilterRegistry integration with:
 * - URL parameter parsing
 * - Component rendering (ActiveFilters)
 * - Filter state management
 * - Performance tracking
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders, createMockStore } from '../../../test-utils/testHelpers';
import { FilterRegistry } from '../filterRegistry';
import { setSubjects, setCategories, setProductTypes } from '../../slices/filtersSlice';

// Simple component to test registry integration
const TestFilterDisplay = () => {
  const subjectConfig = FilterRegistry.get('subjects');
  const categoryConfig = FilterRegistry.get('categories');

  return (
    <div>
      <div data-testid="subject-label">{subjectConfig?.label}</div>
      <div data-testid="subject-color">{subjectConfig?.color}</div>
      <div data-testid="category-label">{categoryConfig?.label}</div>
      <div data-testid="category-color">{categoryConfig?.color}</div>
    </div>
  );
};

describe('FilterRegistry Integration', () => {

  describe('Registry Configuration Access', () => {
    it('should provide configuration for all filter types', () => {
      const subjectsConfig = FilterRegistry.get('subjects');
      const categoriesConfig = FilterRegistry.get('categories');
      const productTypesConfig = FilterRegistry.get('product_types');
      const productsConfig = FilterRegistry.get('products');
      const modsConfig = FilterRegistry.get('modes_of_delivery');

      expect(subjectsConfig).toBeDefined();
      expect(categoriesConfig).toBeDefined();
      expect(productTypesConfig).toBeDefined();
      expect(productsConfig).toBeDefined();
      expect(modsConfig).toBeDefined();
    });

    it('should return undefined for unknown filter type', () => {
      const unknown = FilterRegistry.get('unknown_filter');
      expect(unknown).toBeUndefined();
    });

    it('should provide all required configuration fields', () => {
      const config = FilterRegistry.get('subjects');

      expect(config).toHaveProperty('type');
      expect(config).toHaveProperty('label');
      expect(config).toHaveProperty('pluralLabel');
      expect(config).toHaveProperty('urlParam');
      expect(config).toHaveProperty('color');
      expect(config).toHaveProperty('multiple');
      expect(config).toHaveProperty('dataType');
      expect(config).toHaveProperty('urlFormat');
      expect(config).toHaveProperty('getDisplayValue');
    });
  });

  describe('URL Parameter Mapping', () => {
    it('should map subject_code to subjects filter', () => {
      const config = FilterRegistry.getByUrlParam('subject_code');

      expect(config).toBeDefined();
      expect(config.type).toBe('subjects');
    });

    it('should map category_code to categories filter', () => {
      const config = FilterRegistry.getByUrlParam('category_code');

      expect(config).toBeDefined();
      expect(config.type).toBe('categories');
    });

    it('should map group to product_types filter', () => {
      const config = FilterRegistry.getByUrlParam('group');

      expect(config).toBeDefined();
      expect(config.type).toBe('product_types');
    });

    it('should map product to products filter', () => {
      const config = FilterRegistry.getByUrlParam('product');

      expect(config).toBeDefined();
      expect(config.type).toBe('products');
    });

    it('should map mode_of_delivery to modes_of_delivery filter', () => {
      const config = FilterRegistry.getByUrlParam('mode_of_delivery');

      expect(config).toBeDefined();
      expect(config.type).toBe('modes_of_delivery');
    });

    it('should support URL parameter aliases', () => {
      const byPrimary = FilterRegistry.getByUrlParam('subject_code');
      const byAlias = FilterRegistry.getByUrlParam('subject');

      expect(byPrimary).toBeDefined();
      expect(byAlias).toBeDefined();
      expect(byPrimary.type).toBe(byAlias.type);
    });

    it('should return undefined for unknown URL parameter', () => {
      const config = FilterRegistry.getByUrlParam('unknown_param');
      expect(config).toBeUndefined();
    });
  });

  describe('Component Integration', () => {
    it('should provide configuration to React components', () => {
      renderWithProviders(<TestFilterDisplay />);

      expect(screen.getByTestId('subject-label')).toHaveTextContent('Subject');
      expect(screen.getByTestId('subject-color')).toHaveTextContent('primary');
      expect(screen.getByTestId('category-label')).toHaveTextContent('Category');
      expect(screen.getByTestId('category-color')).toHaveTextContent('info');
    });

    it('should handle missing configuration gracefully in components', () => {
      const TestComponentWithMissing = () => {
        const unknown = FilterRegistry.get('unknown_type');
        return <div data-testid="unknown">{unknown?.label || 'Not Found'}</div>;
      };

      renderWithProviders(<TestComponentWithMissing />);

      expect(screen.getByTestId('unknown')).toHaveTextContent('Not Found');
    });
  });

  describe('Display Value Formatting', () => {
    it('should format subject display values', () => {
      const config = FilterRegistry.get('subjects');
      const displayValue = config.getDisplayValue('CM2');

      expect(displayValue).toBe('CM2');
    });

    it('should format category display values', () => {
      const config = FilterRegistry.get('categories');
      const displayValue = config.getDisplayValue('Bundle');

      expect(displayValue).toBe('Bundle');
    });

    it('should format product display values with filter counts', () => {
      const config = FilterRegistry.get('products');

      const mockCounts = {
        'PROD_123': {
          count: 5,
          name: 'Core Reading',
          display_name: 'Core Reading Materials'
        }
      };

      const displayValue = config.getDisplayValue('PROD_123', mockCounts);
      expect(displayValue).toBe('Core Reading Materials');
    });

    it('should fallback to product ID when no counts available', () => {
      const config = FilterRegistry.get('products');
      const displayValue = config.getDisplayValue('PROD_123');

      expect(displayValue).toBe('PROD_123');
    });

    it('should handle null/undefined display values gracefully', () => {
      const config = FilterRegistry.get('subjects');

      expect(() => {
        config.getDisplayValue(null);
      }).not.toThrow();
    });
  });

  describe('Filter Ordering', () => {
    it('should return filters in correct order', () => {
      const allFilters = FilterRegistry.getAll();

      // Search query should be first (order: 0)
      expect(allFilters[0].type).toBe('searchQuery');

      // Then subjects (order: 1)
      expect(allFilters[1].type).toBe('subjects');

      // Then categories (order: 2)
      expect(allFilters[2].type).toBe('categories');

      // Then product types (order: 3)
      expect(allFilters[3].type).toBe('product_types');
    });

    it('should include all registered filters', () => {
      const allFilters = FilterRegistry.getAll();

      expect(allFilters.length).toBeGreaterThanOrEqual(6); // At least 6 filter types
    });
  });

  describe('Filter Type Queries', () => {
    it('should identify multiple-select filters', () => {
      const multipleFilters = FilterRegistry.getMultipleSelectFilters();

      expect(multipleFilters.some(f => f.type === 'subjects')).toBe(true);
      expect(multipleFilters.some(f => f.type === 'categories')).toBe(true);
      expect(multipleFilters.some(f => f.type === 'product_types')).toBe(true);
    });

    it('should identify array filters', () => {
      const arrayFilters = FilterRegistry.getArrayFilters();

      expect(arrayFilters.some(f => f.type === 'subjects')).toBe(true);
      expect(arrayFilters.some(f => f.type === 'categories')).toBe(true);
    });

    it('should check filter existence', () => {
      expect(FilterRegistry.has('subjects')).toBe(true);
      expect(FilterRegistry.has('categories')).toBe(true);
      expect(FilterRegistry.has('unknown_filter')).toBe(false);
    });
  });

  describe('URL Format Configuration', () => {
    it('should use indexed format for subjects', () => {
      const config = FilterRegistry.get('subjects');
      expect(config.urlFormat).toBe('indexed');
    });

    it('should use indexed format for categories', () => {
      const config = FilterRegistry.get('categories');
      expect(config.urlFormat).toBe('indexed');
    });

    it('should use comma-separated format for product types', () => {
      const config = FilterRegistry.get('product_types');
      expect(config.urlFormat).toBe('comma-separated');
    });

    it('should use comma-separated format for products', () => {
      const config = FilterRegistry.get('products');
      expect(config.urlFormat).toBe('comma-separated');
    });

    it('should use comma-separated format for modes of delivery', () => {
      const config = FilterRegistry.get('modes_of_delivery');
      expect(config.urlFormat).toBe('comma-separated');
    });
  });

  describe('Color Theming', () => {
    it('should assign appropriate colors to filter types', () => {
      expect(FilterRegistry.get('subjects').color).toBe('primary');
      expect(FilterRegistry.get('categories').color).toBe('info');
      expect(FilterRegistry.get('product_types').color).toBe('success');
      expect(FilterRegistry.get('products').color).toBe('default');
      expect(FilterRegistry.get('modes_of_delivery').color).toBe('warning');
    });

    it('should provide consistent colors for same filter type', () => {
      const color1 = FilterRegistry.get('subjects').color;
      const color2 = FilterRegistry.get('subjects').color;

      expect(color1).toBe(color2);
    });
  });

  describe('Integration with Redux State', () => {
    it('should map registry filter types to Redux state keys', () => {
      const store = createMockStore();
      const state = store.getState().filters;

      // Registry types should match Redux state keys
      expect(state).toHaveProperty('subjects');
      expect(state).toHaveProperty('categories');
      expect(state).toHaveProperty('product_types');
      expect(state).toHaveProperty('products');
      expect(state).toHaveProperty('modes_of_delivery');
      expect(state).toHaveProperty('searchQuery');
    });

    it('should support all registered filter types in Redux', () => {
      const allFilters = FilterRegistry.getAll();
      const store = createMockStore();
      const state = store.getState().filters;

      allFilters.forEach(config => {
        // All filter types should exist in Redux state
        expect(state).toHaveProperty(config.type);
      });
    });
  });

  describe('Performance', () => {
    it('should lookup filter config in < 1ms', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        FilterRegistry.get('subjects');
      }

      const duration = performance.now() - start;
      const avgDuration = duration / iterations;

      expect(avgDuration).toBeLessThan(1);
    });

    it('should lookup by URL param in < 1ms', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        FilterRegistry.getByUrlParam('subject_code');
      }

      const duration = performance.now() - start;
      const avgDuration = duration / iterations;

      expect(avgDuration).toBeLessThan(1);
    });

    it('should handle concurrent lookups efficiently', async () => {
      const start = performance.now();

      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve(FilterRegistry.get('subjects'))
      );

      await Promise.all(promises);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined type gracefully', () => {
      expect(() => {
        FilterRegistry.get(null);
      }).not.toThrow();

      expect(() => {
        FilterRegistry.get(undefined);
      }).not.toThrow();
    });

    it('should handle empty string type', () => {
      const config = FilterRegistry.get('');
      expect(config).toBeUndefined();
    });

    it('should handle null/undefined URL parameter', () => {
      expect(() => {
        FilterRegistry.getByUrlParam(null);
      }).not.toThrow();

      expect(() => {
        FilterRegistry.getByUrlParam(undefined);
      }).not.toThrow();
    });

    it('should handle case-sensitive filter types', () => {
      const lowercase = FilterRegistry.get('subjects');
      const uppercase = FilterRegistry.get('SUBJECTS');

      expect(lowercase).toBeDefined();
      expect(uppercase).toBeUndefined();
    });
  });

  describe('Data Type Validation', () => {
    it('should specify array dataType for multi-select filters', () => {
      expect(FilterRegistry.get('subjects').dataType).toBe('array');
      expect(FilterRegistry.get('categories').dataType).toBe('array');
      expect(FilterRegistry.get('product_types').dataType).toBe('array');
    });

    it('should specify string dataType for search query', () => {
      expect(FilterRegistry.get('searchQuery').dataType).toBe('string');
    });

    it('should align dataType with multiple flag', () => {
      const allFilters = FilterRegistry.getAll();

      allFilters.forEach(config => {
        if (config.multiple) {
          expect(config.dataType).toBe('array');
        } else if (config.dataType === 'string') {
          expect(config.multiple).toBe(false);
        }
      });
    });
  });

  describe('Label Configuration', () => {
    it('should provide singular labels', () => {
      expect(FilterRegistry.get('subjects').label).toBe('Subject');
      expect(FilterRegistry.get('categories').label).toBe('Category');
      expect(FilterRegistry.get('product_types').label).toBe('Product Type');
    });

    it('should provide plural labels', () => {
      expect(FilterRegistry.get('subjects').pluralLabel).toBe('Subjects');
      expect(FilterRegistry.get('categories').pluralLabel).toBe('Categories');
      expect(FilterRegistry.get('product_types').pluralLabel).toBe('Product Types');
    });

    it('should use plural label when multiple values selected', () => {
      const store = createMockStore();
      store.dispatch(setSubjects(['CM2', 'SA1']));

      const config = FilterRegistry.get('subjects');
      const state = store.getState().filters;

      // Should use pluralLabel when multiple values
      if (state.subjects.length > 1) {
        expect(config.pluralLabel).toBe('Subjects');
      } else {
        expect(config.label).toBe('Subject');
      }
    });
  });

  describe('Extensibility', () => {
    it('should allow reading all filters for dynamic UI generation', () => {
      const allFilters = FilterRegistry.getAll();

      // Should be able to generate UI from registry
      expect(allFilters.length).toBeGreaterThan(0);
      allFilters.forEach(config => {
        expect(config.type).toBeDefined();
        expect(config.label).toBeDefined();
        expect(config.urlParam).toBeDefined();
      });
    });

    it('should provide configuration for ActiveFilters rendering', () => {
      const store = createMockStore();
      store.dispatch(setSubjects(['CM2']));
      store.dispatch(setCategories(['Bundle']));

      const state = store.getState().filters;

      // Should be able to render active filters using registry
      Object.keys(state).forEach(filterType => {
        const config = FilterRegistry.get(filterType);
        if (config && Array.isArray(state[filterType]) && state[filterType].length > 0) {
          expect(config.label).toBeDefined();
          expect(config.color).toBeDefined();
          expect(config.getDisplayValue).toBeDefined();
        }
      });
    });
  });
});
