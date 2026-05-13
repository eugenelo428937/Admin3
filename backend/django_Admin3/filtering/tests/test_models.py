"""Tests for filtering app models."""
from django.test import TestCase


class FilterGroupModelTest(TestCase):
    """Test FilterGroup model."""

    def test_filter_group_importable(self):
        """Verify FilterGroup can be imported from filtering.models."""
        from filtering.models import FilterGroup
        self.assertIsNotNone(FilterGroup)

    def test_filter_group_table_name(self):
        """Verify FilterGroup uses acted schema."""
        from filtering.models import FilterGroup
        self.assertEqual(FilterGroup._meta.db_table, '"acted"."filter_groups"')

    def test_no_parent_field_after_migration_0012(self):
        """FilterGroup is flat — parent_id was removed in migration 0012."""
        from filtering.models import FilterGroup
        fg = FilterGroup(name='Test', code='test')
        fg.save()
        self.assertFalse(
            hasattr(fg, 'parent'),
            "FilterGroup should no longer have a 'parent' field after migration 0012",
        )
        self.assertNotIn(
            'parent_id',
            [f.name for f in fg._meta.get_fields()],
        )


class FilterConfigurationModelTest(TestCase):
    """Test FilterConfiguration model."""

    def test_filter_configuration_importable(self):
        """Verify FilterConfiguration can be imported from filtering.models."""
        from filtering.models import FilterConfiguration
        self.assertIsNotNone(FilterConfiguration)

    def test_filter_configuration_table_name(self):
        """Verify FilterConfiguration uses acted schema."""
        from filtering.models import FilterConfiguration
        self.assertEqual(FilterConfiguration._meta.db_table, '"acted"."filter_configurations"')


class FilterConfigurationGroupModelTest(TestCase):
    """Test FilterConfigurationGroup model."""

    def test_filter_configuration_group_importable(self):
        """Verify FilterConfigurationGroup can be imported from filtering.models."""
        from filtering.models import FilterConfigurationGroup
        self.assertIsNotNone(FilterConfigurationGroup)

    def test_filter_configuration_group_table_name(self):
        """Verify FilterConfigurationGroup uses acted schema."""
        from filtering.models import FilterConfigurationGroup
        self.assertEqual(FilterConfigurationGroup._meta.db_table, '"acted"."filter_configuration_groups"')


class FilterPresetModelTest(TestCase):
    """Test FilterPreset model."""

    def test_filter_preset_importable(self):
        """Verify FilterPreset can be imported from filtering.models."""
        from filtering.models import FilterPreset
        self.assertIsNotNone(FilterPreset)

    def test_filter_preset_table_name(self):
        """Verify FilterPreset uses acted schema."""
        from filtering.models import FilterPreset
        self.assertEqual(FilterPreset._meta.db_table, '"acted"."filter_presets"')


class FilterUsageAnalyticsModelTest(TestCase):
    """Test FilterUsageAnalytics model."""

    def test_filter_usage_analytics_importable(self):
        """Verify FilterUsageAnalytics can be imported from filtering.models."""
        from filtering.models import FilterUsageAnalytics
        self.assertIsNotNone(FilterUsageAnalytics)

    def test_filter_usage_analytics_table_name(self):
        """Verify FilterUsageAnalytics uses acted schema."""
        from filtering.models import FilterUsageAnalytics
        self.assertEqual(FilterUsageAnalytics._meta.db_table, '"acted"."filter_usage_analytics"')


class FilterAdminTest(TestCase):
    """Test filter admin registration."""

    def test_filter_group_registered_in_admin(self):
        """Verify FilterGroup is registered in Django admin."""
        from django.contrib import admin
        from filtering.models import FilterGroup
        self.assertIn(FilterGroup, admin.site._registry)

    def test_filter_configuration_registered_in_admin(self):
        """Verify FilterConfiguration is registered in Django admin."""
        from django.contrib import admin
        from filtering.models import FilterConfiguration
        self.assertIn(FilterConfiguration, admin.site._registry)


class FilterConfigurationMigration0013Test(TestCase):
    """Regression tests for migration 0013 changes."""

    def test_no_dead_jsonfields(self):
        """validation_rules + dependency_rules dropped in migration 0013."""
        from filtering.models import FilterConfiguration
        fc = FilterConfiguration(
            name='TEST_FILTER', filter_key='test', filter_type='subject',
            display_label='Test',
        )
        self.assertFalse(hasattr(fc, 'dependency_rules'))
        self.assertFalse(hasattr(fc, 'validation_rules'))
        self.assertFalse(hasattr(fc, 'is_dependent_on'))

    def test_subject_type_choice_allowed(self):
        """'subject_type' added to FILTER_TYPE_CHOICES in migration 0013."""
        from filtering.models import FilterConfiguration
        choices = dict(FilterConfiguration._meta.get_field('filter_type').choices)
        self.assertIn('subject_type', choices)


