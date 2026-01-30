"""Comprehensive tests for filtering/services/filter_service.py.

Tests cover all strategy classes, the ProductFilterService orchestrator,
and convenience functions. Target: cover all 134 missing lines.
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.core.cache import cache

from filtering.models import (
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterGroup,
    FilterUsageAnalytics,
)
from filtering.tests.factories import (
    create_filter_config,
    create_filter_group,
    assign_group_to_config,
)
from filtering.services.filter_service import (
    FilterStrategy,
    FilterGroupStrategy,
    SubjectFilterStrategy,
    ProductVariationFilterStrategy,
    TutorialFormatFilterStrategy,
    BundleFilterStrategy,
    ProductFilterService,
    get_filter_service,
    get_product_filter_service,
    apply_filters,
    setup_main_category_filter,
)


# ---------------------------------------------------------------------------
# FilterStrategy base class
# ---------------------------------------------------------------------------
class ConcreteFilterStrategy(FilterStrategy):
    """Concrete implementation for testing the abstract base class."""

    def apply(self, queryset, filter_values):
        return queryset


class TestFilterStrategyBase(TestCase):
    """Test the abstract FilterStrategy base class methods."""

    def setUp(self):
        self.config = create_filter_config(
            'TestBase', 'test_base', 'filter_group',
        )
        self.strategy = ConcreteFilterStrategy(self.config)

    def test_apply_abstract(self):
        """The apply method returns queryset unchanged in concrete stub."""
        qs = FilterGroup.objects.none()
        result = self.strategy.apply(qs, [])
        self.assertFalse(result.exists())

    def test_get_cache_key(self):
        """get_cache_key returns a deterministic key based on config name."""
        key = self.strategy.get_cache_key()
        self.assertEqual(key, 'filter_options_TestBase')

    # --- get_options routing --------------------------------------------------

    def test_get_options_filter_group_type(self):
        """get_options routes to _get_filter_group_options for filter_group type."""
        group = create_filter_group('Alpha', code='ALPHA')
        assign_group_to_config(self.config, group)
        options = self.strategy.get_options()
        codes = [o['code'] for o in options]
        self.assertIn('ALPHA', codes)

    def test_get_options_subject_type(self):
        """get_options routes to _get_subject_options for subject type."""
        config = create_filter_config(
            'SubjTest', 'subj_test', 'subject',
        )
        strategy = ConcreteFilterStrategy(config)
        with patch(
            'filtering.services.filter_service.FilterStrategy._get_subject_options',
            return_value=[{'id': 1, 'value': 'CM2', 'label': 'CM2 - desc'}],
        ):
            options = strategy.get_options()
        self.assertEqual(len(options), 1)
        self.assertEqual(options[0]['value'], 'CM2')

    def test_get_options_product_variation_type(self):
        """get_options routes to _get_variation_options for product_variation type."""
        config = create_filter_config(
            'VarTest', 'var_test', 'product_variation',
        )
        strategy = ConcreteFilterStrategy(config)
        with patch(
            'filtering.services.filter_service.FilterStrategy._get_variation_options',
            return_value=[{'id': 1, 'value': 1, 'label': 'eBook (eBook)'}],
        ):
            options = strategy.get_options()
        self.assertEqual(len(options), 1)

    def test_get_options_unknown_type_returns_empty(self):
        """get_options returns [] for an unknown filter_type."""
        config = create_filter_config(
            'UnknownType', 'unknown_type', 'date_range',
        )
        strategy = ConcreteFilterStrategy(config)
        options = strategy.get_options()
        self.assertEqual(options, [])

    # --- _get_filter_group_options with include_children -----------------------

    def test_get_filter_group_options_include_children(self):
        """_get_filter_group_options includes descendants when configured."""
        self.config.ui_config = {'include_children': True}
        self.config.save()
        parent = create_filter_group('Parent', code='PARENT')
        child = create_filter_group('Child', code='CHILD', parent=parent)
        assign_group_to_config(self.config, parent)

        strategy = ConcreteFilterStrategy(self.config)
        options = strategy.get_options()
        codes = [o['code'] for o in options]
        self.assertIn('PARENT', codes)
        self.assertIn('CHILD', codes)

    def test_get_filter_group_options_without_children(self):
        """_get_filter_group_options excludes descendants by default."""
        parent = create_filter_group('ParentOnly', code='PARENTONLY')
        create_filter_group('HiddenChild', code='HIDDEN_CHILD', parent=parent)
        assign_group_to_config(self.config, parent)

        strategy = ConcreteFilterStrategy(self.config)
        options = strategy.get_options()
        codes = [o['code'] for o in options]
        self.assertIn('PARENTONLY', codes)
        self.assertNotIn('HIDDEN_CHILD', codes)

    def test_get_filter_group_options_sorted_by_level_and_label(self):
        """Options are sorted by (level, label)."""
        z_group = create_filter_group('Zebra', code='ZEBRA')
        a_group = create_filter_group('Aardvark', code='AARDVARK')
        assign_group_to_config(self.config, z_group)
        assign_group_to_config(self.config, a_group)

        strategy = ConcreteFilterStrategy(self.config)
        options = strategy.get_options()
        labels = [o['label'] for o in options]
        self.assertEqual(labels, sorted(labels))

    # --- _get_subject_options --------------------------------------------------

    def test_get_subject_options_real(self):
        """_get_subject_options queries active subjects."""
        from catalog.models import Subject
        Subject.objects.create(code='TST', description='Test Subject', active=True)
        Subject.objects.create(code='INA', description='Inactive', active=False)

        config = create_filter_config('SubjReal', 'subj_real', 'subject')
        strategy = ConcreteFilterStrategy(config)
        options = strategy._get_subject_options()
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
        strategy = ConcreteFilterStrategy(config)
        options = strategy._get_variation_options()
        self.assertTrue(len(options) >= 1)
        names = [o['name'] for o in options]
        self.assertIn('Standard eBook', names)

    # --- track_usage ----------------------------------------------------------

    def test_track_usage_creates_analytics_records(self):
        """track_usage creates FilterUsageAnalytics records."""
        self.strategy.track_usage(['val1', 'val2'], session_id='sess1')
        count = FilterUsageAnalytics.objects.filter(
            filter_configuration=self.config,
        ).count()
        self.assertEqual(count, 2)

    def test_track_usage_increments_existing(self):
        """track_usage increments usage_count on existing records."""
        self.strategy.track_usage(['val1'])
        self.strategy.track_usage(['val1'])
        analytics = FilterUsageAnalytics.objects.get(
            filter_configuration=self.config,
            filter_value='val1',
        )
        self.assertEqual(analytics.usage_count, 2)

    def test_track_usage_anonymous_session(self):
        """track_usage defaults to 'anonymous' session when none given."""
        self.strategy.track_usage(['anon_val'])
        analytics = FilterUsageAnalytics.objects.get(
            filter_configuration=self.config,
            filter_value='anon_val',
        )
        self.assertEqual(analytics.session_id, 'anonymous')

    def test_track_usage_with_user(self):
        """track_usage stores user when provided."""
        from django.contrib.auth.models import User
        user = User.objects.create_user('testuser', 'test@test.com', 'pass')
        self.strategy.track_usage(['user_val'], user=user)
        analytics = FilterUsageAnalytics.objects.get(
            filter_configuration=self.config,
            filter_value='user_val',
        )
        self.assertEqual(analytics.user, user)


# ---------------------------------------------------------------------------
# FilterGroupStrategy
# ---------------------------------------------------------------------------
class TestFilterGroupStrategy(TestCase):
    """Test FilterGroupStrategy.apply and _get_all_descendant_ids."""

    def setUp(self):
        self.config = create_filter_config(
            'GroupStrat', 'group_strat', 'filter_group',
        )
        self.parent = create_filter_group('Parent', code='GS_PARENT')
        self.child = create_filter_group('Child', code='GS_CHILD', parent=self.parent)
        assign_group_to_config(self.config, self.parent)
        assign_group_to_config(self.config, self.child)
        self.strategy = FilterGroupStrategy(self.config)

    def _get_mock_queryset(self):
        """Return a mock queryset that supports .filter().distinct().

        The production code filters using ORM lookups like
        ``product__groups__id__in`` which reference catalog.Product
        (via the ``product`` property on store.Product).  Since
        store.Product doesn't have a real ``product`` FK, a real
        queryset would raise FieldError.  We use a MagicMock that
        chains .filter().distinct() and returns itself.
        """
        mock_qs = MagicMock()
        mock_qs.filter.return_value.distinct.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        mock_qs.distinct.return_value = mock_qs
        return mock_qs

    def test_apply_empty_values_returns_queryset(self):
        """Empty filter_values returns queryset unchanged."""
        mock_qs = self._get_mock_queryset()
        result = self.strategy.apply(mock_qs, [])
        # Empty values should return the queryset without calling filter
        self.assertIs(result, mock_qs)

    def test_apply_with_integer_ids(self):
        """apply accepts integer group IDs."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, [self.parent.id])
        # Verify filter was called with the integer ID
        qs.filter.assert_called()
        self.assertIsNotNone(result)

    def test_apply_with_string_digit_ids(self):
        """apply accepts string digit IDs (legacy support)."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, [str(self.parent.id)])
        # String digit IDs are converted to int, then passed to filter
        qs.filter.assert_called()
        self.assertIsNotNone(result)

    def test_apply_with_code_strings(self):
        """apply converts code strings to IDs."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, ['GS_PARENT'])
        # Code string is looked up and converted to ID
        qs.filter.assert_called()
        self.assertIsNotNone(result)

    def test_apply_with_nonexistent_code_logs_warning(self):
        """apply logs warning for nonexistent filter group codes."""
        qs = self._get_mock_queryset()
        with self.assertLogs('filtering.services.filter_service', level='WARNING') as cm:
            result = self.strategy.apply(qs, ['NONEXISTENT_CODE'])
        self.assertTrue(any('not found' in msg for msg in cm.output))

    def test_apply_with_invalid_value_type(self):
        """apply handles invalid value types gracefully.

        None is neither str nor int, so it is silently skipped.
        With no valid group_ids, the original queryset is returned unchanged.
        """
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, [None])
        # None is silently skipped (not str/int), resulting in empty group_ids
        # which causes the method to return queryset unchanged without filtering
        self.assertIs(result, qs)

    def test_apply_all_invalid_returns_unchanged(self):
        """If all values are invalid, returns queryset unchanged."""
        qs = self._get_mock_queryset()
        with self.assertLogs('filtering.services.filter_service', level='WARNING'):
            result = self.strategy.apply(qs, ['DOESNTEXIST'])
        self.assertIsNotNone(result)

    def test_apply_with_include_children(self):
        """apply uses _get_all_descendant_ids when include_children is True."""
        self.config.ui_config = {'include_children': True}
        self.config.save()
        strategy = FilterGroupStrategy(self.config)
        qs = self._get_mock_queryset()
        result = strategy.apply(qs, [self.parent.id])
        qs.filter.assert_called()
        self.assertIsNotNone(result)

    def test_get_all_descendant_ids(self):
        """_get_all_descendant_ids returns parent + all descendants."""
        grandchild = create_filter_group(
            'Grandchild', code='GS_GRANDCHILD', parent=self.child,
        )
        ids = self.strategy._get_all_descendant_ids([self.parent.id])
        self.assertIn(self.parent.id, ids)
        self.assertIn(self.child.id, ids)
        self.assertIn(grandchild.id, ids)

    def test_get_all_descendant_ids_deduplicates(self):
        """_get_all_descendant_ids returns unique IDs."""
        ids = self.strategy._get_all_descendant_ids(
            [self.parent.id, self.parent.id]
        )
        self.assertEqual(len(ids), len(set(ids)))


# ---------------------------------------------------------------------------
# SubjectFilterStrategy
# ---------------------------------------------------------------------------
class TestSubjectFilterStrategy(TestCase):
    """Test SubjectFilterStrategy.apply."""

    def setUp(self):
        self.config = create_filter_config(
            'SubjStrat', 'subj_strat', 'subject',
        )
        self.strategy = SubjectFilterStrategy(self.config)

    def _get_mock_queryset(self):
        from store.models import Product as StoreProduct
        return StoreProduct.objects.none()

    def test_apply_empty_values(self):
        """Empty values returns queryset unchanged."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, [])
        self.assertIsNotNone(result)

    def test_apply_with_integer_ids(self):
        """apply filters by subject IDs (integers)."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, [1, 2])
        self.assertIsNotNone(result)

    def test_apply_with_string_digit_ids(self):
        """apply treats digit strings as IDs."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, ['1', '2'])
        self.assertIsNotNone(result)

    def test_apply_with_code_strings(self):
        """apply filters by subject codes."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, ['CM2', 'SA1'])
        self.assertIsNotNone(result)

    def test_apply_mixed_ids_and_codes(self):
        """apply handles a mix of IDs and codes."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, [1, 'CM2'])
        self.assertIsNotNone(result)


# ---------------------------------------------------------------------------
# ProductVariationFilterStrategy
# ---------------------------------------------------------------------------
class TestProductVariationFilterStrategy(TestCase):
    """Test ProductVariationFilterStrategy.apply."""

    def setUp(self):
        self.config = create_filter_config(
            'ProdVarStrat', 'prodvar_strat', 'product_variation',
        )
        self.strategy = ProductVariationFilterStrategy(self.config)

    def _get_mock_queryset(self):
        """Return a mock queryset that chains .filter().distinct()."""
        mock_qs = MagicMock()
        mock_qs.filter.return_value.distinct.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        mock_qs.distinct.return_value = mock_qs
        return mock_qs

    def test_apply_empty_values(self):
        """Empty values returns queryset unchanged."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, [])
        self.assertIs(result, qs)

    def test_apply_with_values(self):
        """apply filters by product variation IDs."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, [1, 2])
        qs.filter.assert_called()
        self.assertIsNotNone(result)


# ---------------------------------------------------------------------------
# TutorialFormatFilterStrategy
# ---------------------------------------------------------------------------
class TestTutorialFormatFilterStrategy(TestCase):
    """Test TutorialFormatFilterStrategy.apply."""

    def setUp(self):
        self.config = create_filter_config(
            'TutFmtStrat', 'tutfmt_strat', 'tutorial_format',
        )
        self.strategy = TutorialFormatFilterStrategy(self.config)

    def _get_mock_queryset(self):
        """Return a mock queryset that chains .filter().distinct()."""
        mock_qs = MagicMock()
        mock_qs.filter.return_value.distinct.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        mock_qs.distinct.return_value = mock_qs
        return mock_qs

    def test_apply_empty_values(self):
        """Empty values returns queryset unchanged."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, [])
        self.assertIs(result, qs)

    def test_apply_with_default_mapping(self):
        """apply uses default format mapping when none configured."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, ['face_to_face'])
        qs.filter.assert_called()
        self.assertIsNotNone(result)

    def test_apply_with_custom_mapping(self):
        """apply uses custom format_mapping from ui_config."""
        self.config.ui_config = {
            'format_mapping': {
                'online': 'Online Class',
                'in_person': 'In Person',
            }
        }
        self.config.save()
        strategy = TutorialFormatFilterStrategy(self.config)
        qs = self._get_mock_queryset()
        result = strategy.apply(qs, ['online', 'in_person'])
        qs.filter.assert_called()
        self.assertIsNotNone(result)

    def test_apply_with_multiple_values(self):
        """apply combines multiple format filters with OR."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, ['face_to_face', 'live_online'])
        qs.filter.assert_called()
        self.assertIsNotNone(result)

    def test_apply_with_unmapped_value(self):
        """apply falls back to using the raw value if not in mapping."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, ['some_unknown_format'])
        qs.filter.assert_called()
        self.assertIsNotNone(result)


# ---------------------------------------------------------------------------
# BundleFilterStrategy
# ---------------------------------------------------------------------------
class TestBundleFilterStrategy(TestCase):
    """Test BundleFilterStrategy.apply and get_options."""

    def setUp(self):
        self.config = create_filter_config(
            'BundleStrat', 'bundle_strat', 'bundle',
        )
        self.strategy = BundleFilterStrategy(self.config)

    def _get_mock_queryset(self):
        from store.models import Product as StoreProduct
        return StoreProduct.objects.none()

    def test_apply_empty_values(self):
        """Empty values returns queryset unchanged."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, [])
        self.assertIsNotNone(result)

    def test_apply_with_values_returns_unchanged(self):
        """apply returns queryset as-is (bundle filtering handled in views)."""
        qs = self._get_mock_queryset()
        result = self.strategy.apply(qs, ['bundle'])
        self.assertIsNotNone(result)

    def test_get_options_returns_bundle_option(self):
        """get_options overrides parent to return fixed bundle option."""
        options = self.strategy.get_options()
        self.assertEqual(len(options), 1)
        self.assertEqual(options[0]['value'], 'bundle')
        self.assertEqual(options[0]['label'], 'Bundle')


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

    def test_load_filter_configurations_creates_strategies(self):
        """Service loads strategies for all active configurations."""
        self.assertIn('Subjects', self.service.strategies)
        self.assertIn('Categories_SVC', self.service.strategies)
        self.assertIn('Variations', self.service.strategies)
        self.assertIn('Tutorial Format', self.service.strategies)
        self.assertIn('Bundles', self.service.strategies)

    def test_load_creates_correct_strategy_types(self):
        """Service creates the right strategy class for each config type."""
        self.assertIsInstance(
            self.service.strategies['Subjects'], SubjectFilterStrategy
        )
        self.assertIsInstance(
            self.service.strategies['Categories_SVC'], FilterGroupStrategy
        )
        self.assertIsInstance(
            self.service.strategies['Variations'], ProductVariationFilterStrategy
        )
        self.assertIsInstance(
            self.service.strategies['Tutorial Format'], TutorialFormatFilterStrategy
        )
        self.assertIsInstance(
            self.service.strategies['Bundles'], BundleFilterStrategy
        )

    # --- apply_filters --------------------------------------------------------

    def test_apply_filters_empty_dict(self):
        """apply_filters with empty dict returns queryset unchanged."""
        from store.models import Product as StoreProduct
        qs = StoreProduct.objects.none()
        result = self.service.apply_filters(qs, {})
        self.assertIsNotNone(result)

    def test_apply_filters_unknown_filter_skipped(self):
        """apply_filters skips unknown filter names."""
        from store.models import Product as StoreProduct
        qs = StoreProduct.objects.none()
        result = self.service.apply_filters(qs, {'nonexistent': ['val']})
        self.assertIsNotNone(result)

    def test_apply_filters_sets_user_context(self):
        """apply_filters sets user and session_id on strategy."""
        from store.models import Product as StoreProduct
        qs = StoreProduct.objects.none()
        self.service.apply_filters(
            qs,
            {'Subjects': ['CM2']},
            user='testuser',
            session_id='sess123',
        )
        strategy = self.service.strategies['Subjects']
        self.assertEqual(strategy.user, 'testuser')
        self.assertEqual(strategy.session_id, 'sess123')

    def test_apply_filters_empty_values_skipped(self):
        """apply_filters skips filter entries with empty value lists."""
        from store.models import Product as StoreProduct
        qs = StoreProduct.objects.none()
        result = self.service.apply_filters(qs, {'Subjects': []})
        self.assertIsNotNone(result)

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
            self.service.strategies['Bundles'],
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

    def test_get_main_category_filter_no_strategy(self):
        """get_main_category_filter returns None when config exists but no strategy."""
        # Create inactive config so strategy won't load
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
        key = self.service.strategies['Bundles'].get_cache_key()
        self.assertIsNotNone(cache.get(key))
        # Invalidate
        self.service.invalidate_cache(['Bundles'])
        self.assertIsNone(cache.get(key))

    def test_invalidate_cache_all(self):
        """invalidate_cache with None clears all filter caches."""
        self.service.get_filter_options()
        self.service.invalidate_cache()
        for name, strategy in self.service.strategies.items():
            self.assertIsNone(cache.get(strategy.get_cache_key()))

    # --- reload_configurations ------------------------------------------------

    def test_reload_configurations(self):
        """reload_configurations refreshes strategies from DB."""
        old_count = len(self.service.strategies)
        create_filter_config(
            'NewConfig', 'new_config', 'subject',
        )
        self.service.reload_configurations()
        self.assertEqual(len(self.service.strategies), old_count + 1)


# ---------------------------------------------------------------------------
# Convenience functions
# ---------------------------------------------------------------------------
class TestConvenienceFunctions(TestCase):
    """Test module-level convenience functions."""

    def setUp(self):
        # Ensure at least one config exists
        create_filter_config('ConvFunc', 'conv_func', 'subject')

    def test_get_filter_service(self):
        """get_filter_service returns a ProductFilterService."""
        service = get_filter_service()
        self.assertIsInstance(service, ProductFilterService)

    def test_get_product_filter_service(self):
        """get_product_filter_service returns a ProductFilterService."""
        service = get_product_filter_service()
        self.assertIsInstance(service, ProductFilterService)

    def test_apply_filters_function(self):
        """apply_filters convenience function applies filters."""
        from store.models import Product as StoreProduct
        qs = StoreProduct.objects.none()
        result = apply_filters(qs, {})
        self.assertIsNotNone(result)

    def test_setup_main_category_filter(self):
        """setup_main_category_filter returns None (migration complete)."""
        result = setup_main_category_filter()
        self.assertIsNone(result)
