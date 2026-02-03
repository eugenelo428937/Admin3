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
        """T010: Each config entry includes a filter_groups array.

        The API should return filter_groups with at minimum: id, name, code.
        This allows the frontend to know which groups belong to each filter
        configuration, enabling correct partitioning in the UI.
        """
        response = self.client.get('/api/products/filter-configuration/')
        self.assertEqual(response.status_code, 200)

        data = response.data

        # The response should contain our configurations
        # The format may be a dict keyed by config name/key or a list
        # We need to find the categories config and check its filter_groups
        found_categories = False
        found_product_types = False

        # Handle both dict and list response formats
        if isinstance(data, dict):
            configs = list(data.values()) if data else []
        elif isinstance(data, list):
            configs = data
        else:
            self.fail(f"Unexpected response format: {type(data)}")

        for config in configs:
            if not isinstance(config, dict):
                continue

            config_key = config.get('filter_key') or config.get('key') or config.get('name', '')

            if config_key in ('categories', 'Categories'):
                found_categories = True
                self.assertIn(
                    'filter_groups', config,
                    "Categories config must include 'filter_groups' array"
                )
                groups = config['filter_groups']
                self.assertIsInstance(groups, list)
                group_names = {g['name'] for g in groups}
                self.assertIn('Material', group_names)
                self.assertIn('Tutorial', group_names)

                # Each group should have at least id, name
                for group in groups:
                    self.assertIn('id', group)
                    self.assertIn('name', group)

            if config_key in ('product_types', 'Product Types'):
                found_product_types = True
                self.assertIn(
                    'filter_groups', config,
                    "Product Types config must include 'filter_groups' array"
                )
                groups = config['filter_groups']
                group_names = {g['name'] for g in groups}
                self.assertIn('Core Study Materials', group_names)

        self.assertTrue(found_categories, "Response should include categories config")
        self.assertTrue(found_product_types, "Response should include product_types config")

    def test_full_config_response(self):
        """T049: Full configuration response includes all UI fields.

        The API must return enough information for the frontend to
        dynamically render filter sections without hardcoded config.

        Required fields per config entry:
        - filter_key: Redux state key (e.g., 'categories')
        - label: Human-readable display label
        - display_order: Numeric sort order
        - type: UI component type (e.g., 'checkbox', 'filter_group')
        - allow_multiple: Whether multiple selections allowed
        - filter_groups: Array of assigned groups (for filter_group type)
        - collapsible: Whether the section can be collapsed
        - default_open: Whether collapsed by default
        """
        response = self.client.get('/api/products/filter-configuration/')
        self.assertEqual(response.status_code, 200)

        data = response.data
        # Response is a dict keyed by config name
        self.assertIsInstance(data, dict)
        self.assertTrue(len(data) >= 2, "Should have at least 2 configurations")

        # Required UI fields every config must have
        required_fields = [
            'filter_key', 'label', 'display_order', 'type',
            'allow_multiple', 'filter_groups', 'collapsible', 'default_open',
        ]

        for config_name, config in data.items():
            for field in required_fields:
                self.assertIn(
                    field, config,
                    f"Config '{config_name}' missing required field '{field}'"
                )

            # Validate types
            self.assertIsInstance(config['filter_key'], str)
            self.assertIsInstance(config['display_order'], int)
            self.assertIsInstance(config['allow_multiple'], bool)
            self.assertIsInstance(config['filter_groups'], list)
            self.assertIsInstance(config['collapsible'], bool)
            self.assertIsInstance(config['default_open'], bool)

        # Verify correct filter_key values
        all_filter_keys = {v['filter_key'] for v in data.values()}
        self.assertIn('categories', all_filter_keys)
        self.assertIn('product_types', all_filter_keys)

        # Verify order: categories (1) before product_types (2)
        configs_by_key = {v['filter_key']: v for v in data.values()}
        self.assertLess(
            configs_by_key['categories']['display_order'],
            configs_by_key['product_types']['display_order']
        )
