import { FilterRegistry } from '../filterRegistry';

describe('FilterRegistry', () => {
  beforeEach(async () => {
    // Clear registry before each test
    FilterRegistry.clear();
  });

  describe('register', () => {
    test('registers new filter type', async () => {
      FilterRegistry.register({
        type: 'test_filter',
        label: 'Test Filter',
        urlParam: 'test',
      });

      expect(FilterRegistry.has('test_filter')).toBe(true);
    });

    test('throws error if type missing', async () => {
      expect(() => {
        FilterRegistry.register({
          label: 'Test',
          urlParam: 'test',
        });
      }).toThrow('Filter config must have "type" field');
    });

    test('throws error if label missing', async () => {
      expect(() => {
        FilterRegistry.register({
          type: 'test',
          urlParam: 'test',
        });
      }).toThrow('Filter config must have "label" field');
    });

    test('throws error if urlParam missing', async () => {
      expect(() => {
        FilterRegistry.register({
          type: 'test',
          label: 'Test',
        });
      }).toThrow('Filter config must have "urlParam" field');
    });

    test('sets default values for optional fields', async () => {
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

    test('allows overriding default values', async () => {
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

    test('includes getDisplayValue function in config', async () => {
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
    test('retrieves registered filter by type', async () => {
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

    test('returns undefined for unregistered type', async () => {
      expect(FilterRegistry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    test('returns empty array when no filters registered', async () => {
      const all = FilterRegistry.getAll();
      expect(all).toEqual([]);
    });

    test('returns all registered filters', async () => {
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

    test('sorts filters by order ascending', async () => {
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
    test('finds filter by primary URL parameter', async () => {
      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject_code',
      });

      const config = FilterRegistry.getByUrlParam('subject_code');
      expect(config).toBeDefined();
      expect(config.type).toBe('subjects');
    });

    test('finds filter by URL parameter alias', async () => {
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

    test('returns undefined for unknown URL parameter', async () => {
      expect(FilterRegistry.getByUrlParam('unknown')).toBeUndefined();
    });

    test('handles empty urlParamAliases array', async () => {
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
    test('returns empty array when no filters registered', async () => {
      expect(FilterRegistry.getMultipleSelectFilters()).toEqual([]);
    });

    test('returns only filters with multiple=true', async () => {
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

    test('maintains sort order by order field', async () => {
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
    test('returns empty array when no filters registered', async () => {
      expect(FilterRegistry.getBooleanFilters()).toEqual([]);
    });

    test('returns only filters with dataType=boolean', async () => {
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
    test('returns empty array when no filters registered', async () => {
      expect(FilterRegistry.getArrayFilters()).toEqual([]);
    });

    test('returns only filters with dataType=array', async () => {
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
    test('returns true for registered filter type', async () => {
      FilterRegistry.register({
        type: 'test',
        label: 'Test',
        urlParam: 'test',
      });

      expect(FilterRegistry.has('test')).toBe(true);
    });

    test('returns false for unregistered filter type', async () => {
      expect(FilterRegistry.has('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    test('removes all registered filters', async () => {
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
    test('registers subjects filter with correct configuration', async () => {
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

    test('registers boolean filter with correct configuration', async () => {
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

  describe('registerFromBackend (T045)', () => {
    test('populates registry from backend config array', async () => {
      // Simulate backend response: dict with config name keys
      const backendConfigs = {
        'Categories': {
          filter_key: 'categories',
          label: 'Category',
          display_order: 1,
          type: 'filter_group',
          allow_multiple: true,
          collapsible: true,
          default_open: false,
          filter_groups: [
            { id: 1, name: 'Material', code: 'MATERIAL' },
            { id: 2, name: 'Tutorial', code: 'TUTORIAL' },
          ],
        },
        'Product Types': {
          filter_key: 'product_types',
          label: 'Product Type',
          display_order: 2,
          type: 'filter_group',
          allow_multiple: true,
          collapsible: true,
          default_open: false,
          filter_groups: [
            { id: 3, name: 'Core Study Materials', code: 'CORE' },
          ],
        },
      };

      FilterRegistry.registerFromBackend(backendConfigs);

      // Should have registered both filter types
      expect(FilterRegistry.has('categories')).toBe(true);
      expect(FilterRegistry.has('product_types')).toBe(true);

      // Verify config properties are mapped correctly
      const catConfig = FilterRegistry.get('categories');
      expect(catConfig.label).toBe('Category');
      expect(catConfig.pluralLabel).toBe('Categories');
      expect(catConfig.order).toBe(1);
      expect(catConfig.multiple).toBe(true);

      const ptConfig = FilterRegistry.get('product_types');
      expect(ptConfig.label).toBe('Product Type');
      expect(ptConfig.order).toBe(2);
    });

    test('clears existing registrations before re-registering', async () => {
      // Register a custom filter first
      FilterRegistry.register({
        type: 'custom_filter',
        label: 'Custom',
        urlParam: 'custom',
      });
      expect(FilterRegistry.has('custom_filter')).toBe(true);

      // Now register from backend — should clear custom_filter
      FilterRegistry.registerFromBackend({
        'Categories': {
          filter_key: 'categories',
          label: 'Category',
          display_order: 1,
          type: 'filter_group',
          allow_multiple: true,
          collapsible: true,
          default_open: false,
          filter_groups: [],
        },
      });

      // Custom filter should be gone
      expect(FilterRegistry.has('custom_filter')).toBe(false);
      // Backend filter should be present
      expect(FilterRegistry.has('categories')).toBe(true);
    });

    test('preserves searchQuery registration after backend load', async () => {
      // searchQuery is special — not rendered in panel, should survive
      FilterRegistry.registerFromBackend({
        'Categories': {
          filter_key: 'categories',
          label: 'Category',
          display_order: 1,
          type: 'filter_group',
          allow_multiple: true,
          collapsible: true,
          default_open: false,
          filter_groups: [],
        },
      });

      // searchQuery should be re-registered automatically
      expect(FilterRegistry.has('searchQuery')).toBe(true);
    });
  });

  describe('registerFromBackend preserves Redux state keys (T048)', () => {
    test('maps to standard Redux state keys', async () => {
      // 'products' is intentionally NOT in this list — see filter-registry-debt
      // doc. The DB has no PRODUCTS FilterConfiguration; the only place it was
      // ever registered was a stale hardcoded entry that kept being re-added.
      const backendConfigs = {
        'Programme Type': {
          filter_key: 'programme_type',
          label: 'Programme',
          display_order: 1,
          type: 'filter_group',
          allow_multiple: true,
          collapsible: true,
          default_open: false,
          filter_groups: [],
        },
        'Subjects': {
          filter_key: 'subjects',
          label: 'Subject',
          display_order: 2,
          type: 'subject',
          allow_multiple: true,
          collapsible: true,
          default_open: true,
          filter_groups: [],
        },
        'Categories': {
          filter_key: 'categories',
          label: 'Category',
          display_order: 3,
          type: 'filter_group',
          allow_multiple: true,
          collapsible: true,
          default_open: false,
          filter_groups: [],
        },
        'Product Types': {
          filter_key: 'product_types',
          label: 'Product Type',
          display_order: 4,
          type: 'filter_group',
          allow_multiple: true,
          collapsible: true,
          default_open: false,
          filter_groups: [],
        },
        'Modes of Delivery': {
          filter_key: 'modes_of_delivery',
          label: 'Mode of Delivery',
          display_order: 5,
          type: 'variation_type',
          allow_multiple: true,
          collapsible: true,
          default_open: false,
          filter_groups: [],
        },
      };

      FilterRegistry.registerFromBackend(backendConfigs);

      // All standard Redux state keys must be preserved
      const expectedKeys = ['programme_type', 'subjects', 'categories', 'product_types', 'modes_of_delivery'];
      for (const key of expectedKeys) {
        expect(FilterRegistry.has(key)).toBe(true);
        const config = FilterRegistry.get(key);
        expect(config.type).toBe(key);
      }
      // 'products' must NOT be registered — it has no FilterConfiguration row.
      expect(FilterRegistry.has('products')).toBe(false);
    });

    test('programme_type gets explicit URL_PARAM_MAP defaults (color, urlFormat)', async () => {
      FilterRegistry.registerFromBackend({
        'Programme Type': {
          filter_key: 'programme_type',
          label: 'Programme',
          display_order: 1,
          type: 'filter_group',
          allow_multiple: true,
          collapsible: true,
          default_open: false,
          filter_groups: [],
        },
      });

      const cfg = FilterRegistry.get('programme_type');
      expect(cfg).toBeDefined();
      expect(cfg.urlParam).toBe('programme_type');
      expect(cfg.urlFormat).toBe('comma-separated');
      expect(cfg.color).toBe('secondary');
      expect(cfg.dataType).toBe('array');
      expect(cfg.multiple).toBe(true);
      expect(cfg.order).toBe(1);
    });
  });

  describe('module initialization (no static registrations)', () => {
    // The registry no longer self-registers at module load. Production
    // populates it via FilterRegistry.registerFromBackend(...) on App
    // mount (see App.js boot effect); tests do the equivalent in
    // setupTests.js via bootstrapFilterRegistryForTests().
    //
    // This test verifies the contract: a fresh import yields an EMPTY
    // registry. Removing this guarantee would re-introduce the
    // 6-hardcoded-layer problem documented in
    // docs/to-dos/filter-registry-architecture-debt.md.
    test('fresh module import yields empty registry', async () => {
      // Re-import the module — no top-level register() calls means
      // the fresh module starts empty.
      vi.resetModules();
      const _mod = await import('../filterRegistry');
      const { FilterRegistry: FreshRegistry } = _mod;

      expect(FreshRegistry.getAll()).toHaveLength(0);
      expect(FreshRegistry.has('subjects')).toBe(false);
      expect(FreshRegistry.has('searchQuery')).toBe(false);
    });

    test('registerFromBackend populates the expected six filters', async () => {
      vi.resetModules();
      const _mod = await import('../filterRegistry');
      const { FilterRegistry: FreshRegistry } = _mod;
      const { FILTER_CONFIGURATION_FIXTURE } = await import(
        '../../../test-utils/filterRegistryBootstrap'
      );

      FreshRegistry.registerFromBackend(FILTER_CONFIGURATION_FIXTURE);

      // Filters that ARE registered (mirror DB rows)
      expect(FreshRegistry.has('programme_type')).toBe(true);
      expect(FreshRegistry.has('subjects')).toBe(true);
      expect(FreshRegistry.has('categories')).toBe(true);
      expect(FreshRegistry.has('product_types')).toBe(true);
      expect(FreshRegistry.has('modes_of_delivery')).toBe(true);
      // searchQuery is always re-registered by registerFromBackend
      expect(FreshRegistry.has('searchQuery')).toBe(true);

      // Filters that must NOT be registered (no DB config exists)
      expect(FreshRegistry.has('products')).toBe(false);

      // Total count: programme_type + subjects + categories + product_types + modes_of_delivery + searchQuery
      expect(FreshRegistry.getAll()).toHaveLength(6);

      const subjectsConfig = FreshRegistry.get('subjects');
      expect(subjectsConfig.urlFormat).toBe('indexed');

      const programmeConfig = FreshRegistry.get('programme_type');
      expect(programmeConfig.urlFormat).toBe('comma-separated');
      expect(programmeConfig.color).toBe('secondary');

      const searchConfig = FreshRegistry.get('searchQuery');
      expect(searchConfig.dataType).toBe('string');
      expect(searchConfig.order).toBe(0);
    });
  });
});
