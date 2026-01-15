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
