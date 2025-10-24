import { FilterRegistry } from '../filterRegistry';

describe('FilterRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    FilterRegistry.clear();
  });

  describe('register', () => {
    test('registers new filter type', () => {
      FilterRegistry.register({
        type: 'test_filter',
        label: 'Test Filter',
        urlParam: 'test',
      });

      expect(FilterRegistry.has('test_filter')).toBe(true);
    });

    test('throws error if type missing', () => {
      expect(() => {
        FilterRegistry.register({
          label: 'Test',
          urlParam: 'test',
        });
      }).toThrow('Filter config must have "type" field');
    });

    test('throws error if label missing', () => {
      expect(() => {
        FilterRegistry.register({
          type: 'test',
          urlParam: 'test',
        });
      }).toThrow('Filter config must have "label" field');
    });

    test('throws error if urlParam missing', () => {
      expect(() => {
        FilterRegistry.register({
          type: 'test',
          label: 'Test',
        });
      }).toThrow('Filter config must have "urlParam" field');
    });

    test('sets default values for optional fields', () => {
      FilterRegistry.register({
        type: 'test',
        label: 'Test',
        urlParam: 'test',
      });

      const config = FilterRegistry.get('test');
      expect(config.pluralLabel).toBe('Tests');
      expect(config.color).toBe('default');
      expect(config.multiple).toBe(true);
      expect(config.dataType).toBe('array');
      expect(config.urlFormat).toBe('comma-separated');
      expect(config.urlParamAliases).toEqual([]);
      expect(config.order).toBe(100);
      expect(config.icon).toBeNull();
    });

    test('allows overriding default values', () => {
      FilterRegistry.register({
        type: 'test',
        label: 'Test',
        urlParam: 'test',
        pluralLabel: 'Custom Tests',
        color: 'primary',
        multiple: false,
        dataType: 'string',
        urlFormat: 'single',
        urlParamAliases: ['t'],
        order: 5,
        icon: 'TestIcon',
      });

      const config = FilterRegistry.get('test');
      expect(config.pluralLabel).toBe('Custom Tests');
      expect(config.color).toBe('primary');
      expect(config.multiple).toBe(false);
      expect(config.dataType).toBe('string');
      expect(config.urlFormat).toBe('single');
      expect(config.urlParamAliases).toEqual(['t']);
      expect(config.order).toBe(5);
      expect(config.icon).toBe('TestIcon');
    });

    test('includes getDisplayValue function in config', () => {
      FilterRegistry.register({
        type: 'test',
        label: 'Test',
        urlParam: 'test',
        getDisplayValue: (value) => `Display: ${value}`,
      });

      const config = FilterRegistry.get('test');
      expect(config.getDisplayValue('test')).toBe('Display: test');
    });
  });

  describe('get', () => {
    test('retrieves registered filter by type', () => {
      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject_code',
        color: 'primary',
      });

      const config = FilterRegistry.get('subjects');
      expect(config).toBeDefined();
      expect(config.type).toBe('subjects');
      expect(config.label).toBe('Subject');
      expect(config.color).toBe('primary');
    });

    test('returns undefined for unregistered type', () => {
      expect(FilterRegistry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    test('returns empty array when no filters registered', () => {
      const all = FilterRegistry.getAll();
      expect(all).toEqual([]);
    });

    test('returns all registered filters', () => {
      FilterRegistry.register({
        type: 'filter1',
        label: 'Filter 1',
        urlParam: 'f1',
        order: 2,
      });

      FilterRegistry.register({
        type: 'filter2',
        label: 'Filter 2',
        urlParam: 'f2',
        order: 1,
      });

      const all = FilterRegistry.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].type).toBe('filter2'); // Lower order first
      expect(all[1].type).toBe('filter1');
    });

    test('sorts filters by order ascending', () => {
      FilterRegistry.register({
        type: 'filter1',
        label: 'Filter 1',
        urlParam: 'f1',
        order: 100,
      });

      FilterRegistry.register({
        type: 'filter2',
        label: 'Filter 2',
        urlParam: 'f2',
        order: 1,
      });

      FilterRegistry.register({
        type: 'filter3',
        label: 'Filter 3',
        urlParam: 'f3',
        order: 50,
      });

      const all = FilterRegistry.getAll();
      expect(all.map(f => f.type)).toEqual(['filter2', 'filter3', 'filter1']);
    });
  });

  describe('getByUrlParam', () => {
    test('finds filter by primary URL parameter', () => {
      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject_code',
      });

      const config = FilterRegistry.getByUrlParam('subject_code');
      expect(config).toBeDefined();
      expect(config.type).toBe('subjects');
    });

    test('finds filter by URL parameter alias', () => {
      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject_code',
        urlParamAliases: ['subject', 'subj'],
      });

      const config1 = FilterRegistry.getByUrlParam('subject');
      expect(config1).toBeDefined();
      expect(config1.type).toBe('subjects');

      const config2 = FilterRegistry.getByUrlParam('subj');
      expect(config2).toBeDefined();
      expect(config2.type).toBe('subjects');
    });

    test('returns undefined for unknown URL parameter', () => {
      expect(FilterRegistry.getByUrlParam('unknown')).toBeUndefined();
    });

    test('handles empty urlParamAliases array', () => {
      FilterRegistry.register({
        type: 'test',
        label: 'Test',
        urlParam: 'test',
        urlParamAliases: [],
      });

      expect(FilterRegistry.getByUrlParam('test')).toBeDefined();
      expect(FilterRegistry.getByUrlParam('unknown')).toBeUndefined();
    });
  });

  describe('getMultipleSelectFilters', () => {
    test('returns empty array when no filters registered', () => {
      expect(FilterRegistry.getMultipleSelectFilters()).toEqual([]);
    });

    test('returns only filters with multiple=true', () => {
      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject',
        multiple: true,
      });

      FilterRegistry.register({
        type: 'categories',
        label: 'Category',
        urlParam: 'category',
        multiple: true,
      });

      FilterRegistry.register({
        type: 'tutorial_format',
        label: 'Tutorial Format',
        urlParam: 'tutorial_format',
        multiple: false,
      });

      const multipleFilters = FilterRegistry.getMultipleSelectFilters();
      expect(multipleFilters).toHaveLength(2);
      expect(multipleFilters.map(f => f.type)).toEqual(['subjects', 'categories']);
    });

    test('maintains sort order by order field', () => {
      FilterRegistry.register({
        type: 'filter1',
        label: 'Filter 1',
        urlParam: 'f1',
        multiple: true,
        order: 2,
      });

      FilterRegistry.register({
        type: 'filter2',
        label: 'Filter 2',
        urlParam: 'f2',
        multiple: true,
        order: 1,
      });

      const multipleFilters = FilterRegistry.getMultipleSelectFilters();
      expect(multipleFilters[0].type).toBe('filter2');
      expect(multipleFilters[1].type).toBe('filter1');
    });
  });

  describe('getBooleanFilters', () => {
    test('returns empty array when no filters registered', () => {
      expect(FilterRegistry.getBooleanFilters()).toEqual([]);
    });

    test('returns only filters with dataType=boolean', () => {
      FilterRegistry.register({
        type: 'distance_learning',
        label: 'Distance Learning',
        urlParam: 'distance_learning',
        dataType: 'boolean',
      });

      FilterRegistry.register({
        type: 'tutorial',
        label: 'Tutorial',
        urlParam: 'tutorial',
        dataType: 'boolean',
      });

      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject',
        dataType: 'array',
      });

      const booleanFilters = FilterRegistry.getBooleanFilters();
      expect(booleanFilters).toHaveLength(2);
      expect(booleanFilters.map(f => f.type)).toEqual(['distance_learning', 'tutorial']);
    });
  });

  describe('getArrayFilters', () => {
    test('returns empty array when no filters registered', () => {
      expect(FilterRegistry.getArrayFilters()).toEqual([]);
    });

    test('returns only filters with dataType=array', () => {
      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject',
        dataType: 'array',
      });

      FilterRegistry.register({
        type: 'categories',
        label: 'Category',
        urlParam: 'category',
        dataType: 'array',
      });

      FilterRegistry.register({
        type: 'distance_learning',
        label: 'Distance Learning',
        urlParam: 'distance_learning',
        dataType: 'boolean',
      });

      const arrayFilters = FilterRegistry.getArrayFilters();
      expect(arrayFilters).toHaveLength(2);
      expect(arrayFilters.map(f => f.type)).toEqual(['subjects', 'categories']);
    });
  });

  describe('has', () => {
    test('returns true for registered filter type', () => {
      FilterRegistry.register({
        type: 'test',
        label: 'Test',
        urlParam: 'test',
      });

      expect(FilterRegistry.has('test')).toBe(true);
    });

    test('returns false for unregistered filter type', () => {
      expect(FilterRegistry.has('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    test('removes all registered filters', () => {
      FilterRegistry.register({
        type: 'filter1',
        label: 'Filter 1',
        urlParam: 'f1',
      });

      FilterRegistry.register({
        type: 'filter2',
        label: 'Filter 2',
        urlParam: 'f2',
      });

      expect(FilterRegistry.getAll()).toHaveLength(2);

      FilterRegistry.clear();

      expect(FilterRegistry.getAll()).toHaveLength(0);
      expect(FilterRegistry.has('filter1')).toBe(false);
      expect(FilterRegistry.has('filter2')).toBe(false);
    });
  });

  describe('real-world filter registrations', () => {
    test('registers subjects filter with correct configuration', () => {
      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        pluralLabel: 'Subjects',
        urlParam: 'subject_code',
        urlParamAliases: ['subject'],
        color: 'primary',
        multiple: true,
        dataType: 'array',
        urlFormat: 'indexed',
        order: 1,
      });

      const config = FilterRegistry.get('subjects');
      expect(config.type).toBe('subjects');
      expect(config.urlFormat).toBe('indexed');
      expect(config.urlParamAliases).toContain('subject');
    });

    test('registers boolean filter with correct configuration', () => {
      FilterRegistry.register({
        type: 'distance_learning',
        label: 'Distance Learning',
        pluralLabel: 'Distance Learning',
        urlParam: 'distance_learning',
        color: 'secondary',
        multiple: false,
        dataType: 'boolean',
        urlFormat: 'single',
        getDisplayValue: () => 'Active',
      });

      const config = FilterRegistry.get('distance_learning');
      expect(config.dataType).toBe('boolean');
      expect(config.multiple).toBe(false);
      expect(config.getDisplayValue()).toBe('Active');
    });
  });

  describe('module initialization (default registrations)', () => {
    // This test verifies that the module registers default filters on import
    // by re-importing in a fresh context
    test('auto-registers default filters on module load', () => {
      // Clear to start fresh
      FilterRegistry.clear();

      // Re-import the module to trigger registration code
      jest.resetModules();
      const { FilterRegistry: FreshRegistry } = require('../filterRegistry');

      // Verify all 6 default filters are registered
      expect(FreshRegistry.has('subjects')).toBe(true);
      expect(FreshRegistry.has('categories')).toBe(true);
      expect(FreshRegistry.has('product_types')).toBe(true);
      expect(FreshRegistry.has('products')).toBe(true);
      expect(FreshRegistry.has('modes_of_delivery')).toBe(true);
      expect(FreshRegistry.has('searchQuery')).toBe(true);

      // Verify deprecated filters are NOT registered
      expect(FreshRegistry.has('tutorial_format')).toBe(false);
      expect(FreshRegistry.has('distance_learning')).toBe(false);
      expect(FreshRegistry.has('tutorial')).toBe(false);

      // Verify all filters count
      expect(FreshRegistry.getAll()).toHaveLength(6);

      // Verify specific configurations
      const subjectsConfig = FreshRegistry.get('subjects');
      expect(subjectsConfig.urlFormat).toBe('indexed');
      expect(subjectsConfig.order).toBe(1);

      const searchConfig = FreshRegistry.get('searchQuery');
      expect(searchConfig.dataType).toBe('string');
      expect(searchConfig.order).toBe(0);
    });
  });
});
