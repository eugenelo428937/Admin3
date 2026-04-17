"""Comprehensive tests for filtering/services/filter_service.py.

Tests cover FilterOptionProvider, the ProductFilterService orchestrator,
and the get_filter_service convenience function.
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.core.cache import cache

from filtering.models import (
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterGroup,
)
from filtering.tests.factories import (
    create_filter_config,
    create_filter_group,
    assign_group_to_config,
)
from filtering.services.filter_service import (
    FilterOptionProvider,
    ProductFilterService,
    get_filter_service,
)


# ---------------------------------------------------------------------------
# FilterOptionProvider
# ---------------------------------------------------------------------------
class TestFilterOptionProvider(TestCase):
    """Test the FilterOptionProvider class methods."""

    def setUp(self):
        self.config = create_filter_config(
            'TestBase', 'test_base', 'filter_group',
        )
        self.provider = FilterOptionProvider(self.config)

    def test_get_cache_key(self):
        """get_cache_key returns a deterministic key based on config name."""
        key = self.provider.get_cache_key()
        self.assertEqual(key, 'filter_options_TestBase')

    # --- get_options routing --------------------------------------------------

    def test_get_options_filter_group_type(self):
        """get_options routes to _get_filter_group_options for filter_group type."""
        group = create_filter_group('Alpha', code='ALPHA')
        assign_group_to_config(self.config, group)
        options = self.provider.get_options()
        codes = [o['code'] for o in options]
        self.assertIn('ALPHA', codes)

    def test_get_options_subject_type(self):
        """get_options routes to _get_subject_options for subject type."""
        config = create_filter_config(
            'SubjTest', 'subj_test', 'subject',
        )
        provider = FilterOptionProvider(config)
        with patch(
            'filtering.services.filter_service.FilterOptionProvider._get_subject_options',
            return_value=[{'id': 1, 'value': 'CM2', 'label': 'CM2 - desc'}],
        ):
            options = provider.get_options()
        self.assertEqual(len(options), 1)
        self.assertEqual(options[0]['value'], 'CM2')

    def test_get_options_product_variation_type(self):
        """get_options routes to _get_variation_options for product_variation type."""
        config = create_filter_config(
            'VarTest', 'var_test', 'product_variation',
        )
        provider = FilterOptionProvider(config)
        with patch(
            'filtering.services.filter_service.FilterOptionProvider._get_variation_options',
            return_value=[{'id': 1, 'value': 1, 'label': 'eBook (eBook)'}],
        ):
            options = provider.get_options()
        self.assertEqual(len(options), 1)

    def test_get_options_bundle_type(self):
        """get_options routes to _get_bundle_options for bundle type."""
        config = create_filter_config(
            'BundleTest', 'bundle_test', 'bundle',
        )
        provider = FilterOptionProvider(config)
        options = provider.get_options()
        self.assertEqual(len(options), 1)
        self.assertEqual(options[0]['value'], 'bundle')

    def test_get_options_unknown_type_returns_empty(self):
        """get_options returns [] for an unknown filter_type."""
        config = create_filter_config(
            'UnknownType', 'unknown_type', 'date_range',
        )
        provider = FilterOptionProvider(config)
        options = provider.get_options()
        self.assertEqual(options, [])

    # --- _get_filter_group_options with include_children -----------------------

    def test_get_filter_group_options_include_children(self):
        """_get_filter_group_options includes descendants when configured."""
        self.config.ui_config = {'include_children': True}
        self.config.save()
        parent = create_filter_group('Parent', code='PARENT')
        child = create_filter_group('Child', code='CHILD', parent=parent)
        assign_group_to_config(self.config, parent)

        provider = FilterOptionProvider(self.config)
        options = provider.get_options()
        codes = [o['code'] for o in options]
        self.assertIn('PARENT', codes)
        self.assertIn('CHILD', codes)

    def test_get_filter_group_options_without_children(self):
        """_get_filter_group_options excludes descendants by default."""
        parent = create_filter_group('ParentOnly', code='PARENTONLY')
        create_filter_group('HiddenChild', code='HIDDEN_CHILD', parent=parent)
        assign_group_to_config(self.config, parent)

        provider = FilterOptionProvider(self.config)
        options = provider.get_options()
        codes = [o['code'] for o in options]
        self.assertIn('PARENTONLY', codes)
        self.assertNotIn('HIDDEN_CHILD', codes)

    def test_get_filter_group_options_sorted_by_level_and_label(self):
        """Options are sorted by (level, label)."""
        z_group = create_filter_group('Zebra', code='ZEBRA')
        a_group = create_filter_group('Aardvark', code='AARDVARK')
        assign_group_to_config(self.config, z_group)
        assign_group_to_config(self.config, a_group)

        provider = FilterOptionProvider(self.config)
        options = provider.get_options()
        labels = [o['label'] for o in options]
        self.assertEqual(labels, sorted(labels))

    # --- _get_subject_options --------------------------------------------------

    def test_get_subject_options_real(self):
        """_get_subject_options queries active subjects."""
        from catalog.models import Subject
        Subject.objects.create(code='TST', description='Test Subject', active=True)
        Subject.objects.create(code='INA', description='Inactive', active=False)

        config = create_filter_config('SubjReal', 'subj_real', 'subject')
        provider = FilterOptionProvider(config)
        options = provider._get_subject_options()
        codes = [o['code'] for o in options]
        self.assertIn('TST', codes)
        self.assertNotIn('INA', codes)

    # --- _get_variation_options ------------------------------------------------

    def test_get_variation_options_real(self):
        """_get_variation_options queries product variations."""
        from catalog.models import ProductVariation
        ProductVariation.objects.create(
            variation_type='eBook', name='Standard eBook',
            description='test', code='TSTVAR',
        )
        config = create_filter_config('VarReal', 'var_real', 'product_variation')
        provider = FilterOptionProvider(config)
        options = provider._get_variation_options()
        self.assertTrue(len(options) >= 1)
        names = [o['name'] for o in options]
        self.assertIn('Standard eBook', names)


# ---------------------------------------------------------------------------
# ProductFilterService
# ---------------------------------------------------------------------------
class TestProductFilterService(TestCase):
    """Test the ProductFilterService orchestrator."""

    def setUp(self):
        cache.clear()
        # Create configurations of various types
        self.subject_config = create_filter_config(
            'Subjects', 'subjects', 'subject', display_order=0,
        )
        self.category_config = create_filter_config(
            'Categories_SVC', 'categories_svc', 'filter_group', display_order=1,
        )
        self.variation_config = create_filter_config(
            'Variations', 'variations', 'product_variation', display_order=2,
        )
        self.tutorial_config = create_filter_config(
            'Tutorial Format', 'tutorial_format', 'tutorial_format', display_order=3,
        )
        self.bundle_config = create_filter_config(
            'Bundles', 'bundles', 'bundle', display_order=4,
        )
        # Add a filter group to category config
        self.material_group = create_filter_group('Material_SVC', code='MATERIAL_SVC')
        assign_group_to_config(self.category_config, self.material_group)

        self.service = ProductFilterService()

    def tearDown(self):
        cache.clear()

    def test_load_filter_configurations_creates_providers(self):
        """Service loads option providers for all active configurations."""
        self.assertIn('Subjects', self.service.option_providers)
        self.assertIn('Categories_SVC', self.service.option_providers)
        self.assertIn('Variations', self.service.option_providers)
        self.assertIn('Tutorial Format', self.service.option_providers)
        self.assertIn('Bundles', self.service.option_providers)

    def test_load_creates_option_providers(self):
        """Service creates FilterOptionProvider for each config type."""
        for name in ('Subjects', 'Categories_SVC', 'Variations',
                     'Tutorial Format', 'Bundles'):
            self.assertIsInstance(
                self.service.option_providers[name], FilterOptionProvider
            )

    # --- get_filter_options ---------------------------------------------------

    def test_get_filter_options_all(self):
        """get_filter_options returns options for all strategies."""
        options = self.service.get_filter_options()
        self.assertIn('Subjects', options)
        self.assertIn('Categories_SVC', options)

    def test_get_filter_options_specific(self):
        """get_filter_options returns options only for specified filters."""
        options = self.service.get_filter_options(['Bundles'])
        self.assertIn('Bundles', options)
        self.assertNotIn('Subjects', options)

    def test_get_filter_options_unknown_filter_skipped(self):
        """get_filter_options skips unknown filter names."""
        options = self.service.get_filter_options(['NONEXISTENT'])
        self.assertNotIn('NONEXISTENT', options)

    def test_get_filter_options_uses_cache(self):
        """get_filter_options caches and returns cached results."""
        # First call populates cache
        options1 = self.service.get_filter_options(['Bundles'])
        # Second call should use cache
        options2 = self.service.get_filter_options(['Bundles'])
        self.assertEqual(options1, options2)

    def test_get_filter_options_error_returns_empty_list(self):
        """get_filter_options returns [] when strategy.get_options() raises."""
        with patch.object(
            self.service.option_providers['Bundles'],
            'get_options',
            side_effect=Exception('test error'),
        ):
            cache.clear()
            options = self.service.get_filter_options(['Bundles'])
        self.assertEqual(options.get('Bundles'), [])

    # --- get_filter_configuration ---------------------------------------------

    def test_get_filter_configuration_returns_dict(self):
        """get_filter_configuration returns dict keyed by config name."""
        config = self.service.get_filter_configuration()
        self.assertIsInstance(config, dict)

    def test_get_filter_configuration_has_required_fields(self):
        """Each config entry has all required UI fields."""
        config = self.service.get_filter_configuration()
        required_fields = [
            'type', 'label', 'description', 'display_order', 'collapsible',
            'default_open', 'required', 'allow_multiple', 'filter_key',
            'ui_config', 'validation_rules', 'dependency_rules', 'options',
            'filter_groups', 'filter_type', 'group_count',
        ]
        for name, entry in config.items():
            for field in required_fields:
                self.assertIn(
                    field, entry,
                    f"Config '{name}' missing field '{field}'",
                )

    def test_get_filter_configuration_group_count(self):
        """group_count reflects actual filter groups for filter_group type."""
        config = self.service.get_filter_configuration()
        if 'Categories_SVC' in config:
            entry = config['Categories_SVC']
            self.assertEqual(entry['group_count'], 1)  # one assigned group

    def test_get_filter_configuration_non_group_count_zero(self):
        """group_count is 0 for non-filter_group types."""
        config = self.service.get_filter_configuration()
        if 'Subjects' in config:
            self.assertEqual(config['Subjects']['group_count'], 0)

    # --- get_main_category_filter ---------------------------------------------

    def test_get_main_category_filter_not_found(self):
        """get_main_category_filter returns None when no main_category config."""
        result = self.service.get_main_category_filter()
        self.assertIsNone(result)

    def test_get_main_category_filter_found(self):
        """get_main_category_filter returns dict when main_category exists."""
        config = create_filter_config(
            'main_category', 'main_category', 'filter_group',
        )
        group = create_filter_group('MainCat', code='MAINCAT')
        assign_group_to_config(config, group)
        # Reload service to pick up new config
        service = ProductFilterService()
        result = service.get_main_category_filter()
        self.assertIsNotNone(result)
        self.assertEqual(result['name'], 'main_category')
        self.assertIn('options', result)
        self.assertIn('ui_config', result)

    def test_get_main_category_filter_no_provider(self):
        """get_main_category_filter returns None when config exists but no provider."""
        # Create inactive config so provider won't load
        FilterConfiguration.objects.create(
            name='main_category_nostrat',
            display_label='Main Category NoStrat',
            filter_type='filter_group',
            filter_key='main_category',
            is_active=False,
        )
        result = self.service.get_main_category_filter()
        self.assertIsNone(result)

    # --- validate_filters -----------------------------------------------------

    def test_validate_filters_no_errors(self):
        """validate_filters returns empty dict for valid filters."""
        errors = self.service.validate_filters({'Subjects': ['CM2']})
        self.assertEqual(errors, {})

    def test_validate_filters_unknown_filter(self):
        """validate_filters reports unknown filter names."""
        errors = self.service.validate_filters({'NoSuch': ['val']})
        self.assertIn('NoSuch', errors)
        self.assertIn('Unknown filter', errors['NoSuch'][0])

    def test_validate_filters_required_missing(self):
        """validate_filters reports required filter with empty values."""
        self.subject_config.is_required = True
        self.subject_config.save()
        service = ProductFilterService()
        errors = service.validate_filters({'Subjects': []})
        self.assertIn('Subjects', errors)
        self.assertIn('required', errors['Subjects'][0])

    def test_validate_filters_multiple_not_allowed(self):
        """validate_filters reports multiple values when not allowed."""
        self.subject_config.allow_multiple = False
        self.subject_config.save()
        service = ProductFilterService()
        errors = service.validate_filters({'Subjects': ['CM2', 'SA1']})
        self.assertIn('Subjects', errors)
        self.assertIn('Multiple values', errors['Subjects'][0])

    # --- invalidate_cache -----------------------------------------------------

    def test_invalidate_cache_specific(self):
        """invalidate_cache clears cache for specified filters."""
        # Populate cache
        self.service.get_filter_options(['Bundles'])
        key = self.service.option_providers['Bundles'].get_cache_key()
        self.assertIsNotNone(cache.get(key))
        # Invalidate
        self.service.invalidate_cache(['Bundles'])
        self.assertIsNone(cache.get(key))

    def test_invalidate_cache_all(self):
        """invalidate_cache with None clears all filter caches."""
        self.service.get_filter_options()
        self.service.invalidate_cache()
        for name, strategy in self.service.option_providers.items():
            self.assertIsNone(cache.get(strategy.get_cache_key()))

    # --- reload_configurations ------------------------------------------------

    def test_reload_configurations(self):
        """reload_configurations refreshes strategies from DB."""
        old_count = len(self.service.option_providers)
        create_filter_config(
            'NewConfig', 'new_config', 'subject',
        )
        self.service.reload_configurations()
        self.assertEqual(len(self.service.option_providers), old_count + 1)


# ---------------------------------------------------------------------------
# Convenience functions
# ---------------------------------------------------------------------------
class TestConvenienceFunctions(TestCase):
    """Test module-level convenience functions."""

    def setUp(self):
        create_filter_config('ConvFunc', 'conv_func', 'subject')

    def test_get_filter_service(self):
        """get_filter_service returns a ProductFilterService."""
        service = get_filter_service()
        self.assertIsInstance(service, ProductFilterService)
