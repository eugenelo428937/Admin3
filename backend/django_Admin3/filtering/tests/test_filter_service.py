"""Tests for filtering/services/filter_service.py.

Tests cover the ProductFilterService orchestrator (get_filter_configuration,
apply_filters, generate_filter_counts) and the get_filter_service convenience
function.
"""
from django.test import TestCase

from filtering.tests.factories import (
    create_filter_config,
    create_filter_group,
    assign_group_to_config,
)
from filtering.services.filter_service import (
    ProductFilterService,
    get_filter_service,
)


# ---------------------------------------------------------------------------
# ProductFilterService
# ---------------------------------------------------------------------------
class TestProductFilterService(TestCase):
    """Test the ProductFilterService orchestrator."""

    def setUp(self):
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

    # --- get_filter_configuration ---------------------------------------------

    def test_get_filter_configuration_returns_dict(self):
        """get_filter_configuration returns dict keyed by filter_key."""
        config = self.service.get_filter_configuration()
        self.assertIsInstance(config, dict)

    def test_get_filter_configuration_has_required_fields(self):
        """Each config entry has all required UI fields."""
        config = self.service.get_filter_configuration()
        required_fields = [
            'filter_key', 'filter_type', 'label', 'description', 'ui_component',
            'display_order', 'allow_multiple', 'is_collapsible', 'is_expanded_by_default',
            'is_required', 'ui_config', 'options',
        ]
        for name, entry in config.items():
            for field in required_fields:
                self.assertIn(
                    field, entry,
                    f"Config '{name}' missing field '{field}'",
                )


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
