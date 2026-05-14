"""Tests for US1: Filter Configuration API with filter_groups.

Verifies that the GET /api/products/filter-configuration/ endpoint
returns a filter_groups array in each configuration entry, listing
the FilterGroup records assigned via FilterConfigurationGroup.

T010, T049: These tests cover both the basic filter_groups inclusion (US1)
and the full configuration response (US5).
"""
from django.test import TestCase
from rest_framework.test import APIClient

from filtering.tests.factories import (
    create_filter_config,
    create_filter_group,
    assign_group_to_config,
)


class TestFilterConfigurationAPI(TestCase):
    """Test /api/products/filter-configuration/ endpoint."""

    def setUp(self):
        """Create filter configs with assigned groups."""
        self.client = APIClient()

        # Create configs
        self.categories_config = create_filter_config(
            'Categories', 'categories', 'filter_group', display_order=1
        )
        self.product_types_config = create_filter_config(
            'Product Types', 'product_types', 'filter_group', display_order=2
        )

        # Create and assign groups
        self.material = create_filter_group('Material', code='MATERIAL')
        self.tutorial = create_filter_group('Tutorial', code='TUTORIAL')
        assign_group_to_config(self.categories_config, self.material, display_order=0)
        assign_group_to_config(self.categories_config, self.tutorial, display_order=1)

        self.core = create_filter_group('Core Study Materials', code='CORE')
        assign_group_to_config(self.product_types_config, self.core, display_order=0)

    def test_response_includes_filter_groups(self):
        """T010: Each filter_group config entry includes assigned groups via options[].

        In the new dispatcher shape, filter groups are surfaced as options
        (value/label/code dicts) rather than a separate filter_groups array.
        """
        response = self.client.get('/api/products/filter-configuration/')
        self.assertEqual(response.status_code, 200)

        data = response.data

        # Handle both dict and list response formats
        if isinstance(data, dict):
            configs = list(data.values()) if data else []
        elif isinstance(data, list):
            configs = data
        else:
            self.fail(f"Unexpected response format: {type(data)}")

        found_categories = False
        found_product_types = False

        for config in configs:
            if not isinstance(config, dict):
                continue

            config_key = config.get('filter_key') or config.get('key') or config.get('name', '')

            if config_key in ('categories', 'Categories'):
                found_categories = True
                options = config.get('options', [])
                self.assertIsInstance(options, list)
                option_labels = {o['label'] for o in options}
                self.assertIn('Material', option_labels)
                self.assertIn('Tutorial', option_labels)

            if config_key in ('product_types', 'Product Types'):
                found_product_types = True
                options = config.get('options', [])
                option_labels = {o['label'] for o in options}
                self.assertIn('Core Study Materials', option_labels)

        self.assertTrue(found_categories, "Response should include categories config")
        self.assertTrue(found_product_types, "Response should include product_types config")

    def test_full_config_response(self):
        """T049: Full configuration response includes all UI fields.

        The API must return enough information for the frontend to
        dynamically render filter sections without hardcoded config.

        Required fields per config entry (new dispatcher shape):
        - filter_key: Redux state key (e.g., 'categories')
        - filter_type: Handler discriminator (e.g., 'filter_group')
        - label: Human-readable display label
        - display_order: Numeric sort order
        - ui_component: UI component type (e.g., 'multi_select')
        - allow_multiple: Whether multiple selections allowed
        - options: Array of available filter options
        - is_collapsible: Whether the section can be collapsed
        - is_expanded_by_default: Whether expanded by default
        """
        response = self.client.get('/api/products/filter-configuration/')
        self.assertEqual(response.status_code, 200)

        data = response.data
        # Response is a dict keyed by filter_key
        self.assertIsInstance(data, dict)
        self.assertTrue(len(data) >= 2, "Should have at least 2 configurations")

        # Required UI fields every config must have
        required_fields = [
            'filter_key', 'filter_type', 'label', 'display_order',
            'ui_component', 'allow_multiple', 'options',
            'is_collapsible', 'is_expanded_by_default',
        ]

        for config_name, config in data.items():
            for field in required_fields:
                self.assertIn(
                    field, config,
                    f"Config '{config_name}' missing required field '{field}'"
                )

            # Validate types
            self.assertIsInstance(config['filter_key'], str)
            self.assertIsInstance(config['filter_type'], str)
            self.assertIsInstance(config['display_order'], int)
            self.assertIsInstance(config['allow_multiple'], bool)
            self.assertIsInstance(config['options'], list)
            self.assertIsInstance(config['is_collapsible'], bool)
            self.assertIsInstance(config['is_expanded_by_default'], bool)

        # Verify correct filter_key values (response is now keyed by filter_key)
        self.assertIn('categories', data)
        self.assertIn('product_types', data)

        # Verify order: categories (1) before product_types (2)
        self.assertLess(
            data['categories']['display_order'],
            data['product_types']['display_order']
        )
