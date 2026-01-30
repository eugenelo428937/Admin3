"""Tests for US6: Format Filtering via Modes of Delivery.

Format-level groups (eBook, Printed, Hub) must NOT appear in
category or product_type filter configurations. Modes of delivery
are determined by product_variation.variation_type exclusively.

T059: Data migration removes format groups from category/product_type
T060: modes_of_delivery counts use variation_type, not filter groups
T061: Format groups absent from category/product_type after cleanup
"""
from django.test import TestCase

from filtering.models import FilterConfigurationGroup
from filtering.tests.factories import (
    create_filter_config,
    create_filter_group,
    assign_group_to_config,
)


FORMAT_GROUP_NAMES = ['eBook', 'Printed', 'Hub']


class TestFormatCleanup(TestCase):
    """Test format group cleanup from category/product_type configs."""

    def setUp(self):
        """Create configs with both legitimate and format-level groups."""
        # Category config
        self.categories_config = create_filter_config(
            'Categories', 'categories', 'filter_group', display_order=1
        )
        # Product types config
        self.product_types_config = create_filter_config(
            'Product Types', 'product_types', 'filter_group', display_order=2
        )
        # Modes of delivery config (format groups belong here conceptually,
        # but modes_of_delivery uses variation_type, not groups)
        self.modes_config = create_filter_config(
            'Modes of Delivery', 'modes_of_delivery', 'product_variation',
            display_order=3
        )

        # Legitimate groups
        self.material = create_filter_group('Material', code='MATERIAL')
        self.core = create_filter_group(
            'Core Study Materials', code='CORE'
        )
        self.revision = create_filter_group(
            'Revision Materials', code='REVISION'
        )

        # Format groups (should NOT be in categories/product_types)
        self.ebook = create_filter_group('eBook', code='EBOOK')
        self.printed = create_filter_group('Printed', code='PRINTED')
        self.hub = create_filter_group('Hub', code='HUB')

        # Assign legitimate groups
        assign_group_to_config(self.categories_config, self.material, display_order=0)
        assign_group_to_config(self.product_types_config, self.core, display_order=0)
        assign_group_to_config(self.product_types_config, self.revision, display_order=1)

        # Assign format groups (these should be removed by migration)
        assign_group_to_config(self.categories_config, self.ebook, display_order=10)
        assign_group_to_config(self.categories_config, self.printed, display_order=11)
        assign_group_to_config(self.product_types_config, self.hub, display_order=10)

    def test_migration_removes_format_groups(self):
        """T059: Data migration removes eBook/Printed/Hub from category
        and product_type configurations.

        Before migration: categories has [Material, eBook, Printed],
                         product_types has [Core, Revision, Hub].
        After migration:  categories has [Material],
                         product_types has [Core, Revision].

        The migration should only remove FilterConfigurationGroup records
        where the config's filter_key is 'categories' or 'product_types'
        AND the group name is in FORMAT_GROUP_NAMES.
        """
        from filtering.services.format_cleanup import remove_format_groups_from_configs

        # Before cleanup: verify format groups are present
        cat_groups_before = set(
            FilterConfigurationGroup.objects.filter(
                filter_configuration=self.categories_config
            ).values_list('filter_group__name', flat=True)
        )
        self.assertIn('eBook', cat_groups_before)
        self.assertIn('Printed', cat_groups_before)

        pt_groups_before = set(
            FilterConfigurationGroup.objects.filter(
                filter_configuration=self.product_types_config
            ).values_list('filter_group__name', flat=True)
        )
        self.assertIn('Hub', pt_groups_before)

        # Run cleanup
        removed_count = remove_format_groups_from_configs()

        # After cleanup: format groups removed
        cat_groups_after = set(
            FilterConfigurationGroup.objects.filter(
                filter_configuration=self.categories_config
            ).values_list('filter_group__name', flat=True)
        )
        self.assertNotIn('eBook', cat_groups_after)
        self.assertNotIn('Printed', cat_groups_after)
        self.assertIn('Material', cat_groups_after,
                       "Legitimate group Material must be preserved")

        pt_groups_after = set(
            FilterConfigurationGroup.objects.filter(
                filter_configuration=self.product_types_config
            ).values_list('filter_group__name', flat=True)
        )
        self.assertNotIn('Hub', pt_groups_after)
        self.assertIn('Core Study Materials', pt_groups_after,
                       "Legitimate group Core must be preserved")
        self.assertIn('Revision Materials', pt_groups_after,
                       "Legitimate group Revision must be preserved")

        # Verify correct count removed
        self.assertEqual(removed_count, 3,
                         "Should remove exactly 3 format group assignments")

    def test_modes_uses_variation_type(self):
        """T060: modes_of_delivery counts use variation_type, not filter groups.

        The SearchService._generate_filter_counts() for modes_of_delivery
        must query product_product_variation__product_variation__variation_type,
        NOT filter groups. This test verifies the count generation path.
        """
        from search.tests.factories import (
            create_subject,
            create_exam_session,
            create_exam_session_subject,
            create_catalog_product,
            create_product_variation,
            create_store_product,
        )
        from search.services.search_service import SearchService
        from store.models import Product as StoreProduct

        # Create products with different variation types
        session = create_exam_session('2025-04')
        cm2 = create_subject('CM2')
        ess = create_exam_session_subject(session, cm2)

        printed_var = create_product_variation('Printed', 'Standard Printed', code='P')
        ebook_var = create_product_variation('eBook', 'Standard eBook', code='E')

        cat_product = create_catalog_product('CM2 Core', 'CM2 Core', 'PCM2C')

        create_store_product(ess, cat_product, printed_var, product_code='CM2/PCM2C/P/2025-04')
        create_store_product(ess, cat_product, ebook_var, product_code='CM2/PCM2C/E/2025-04')

        service = SearchService()
        base_qs = StoreProduct.objects.filter(is_active=True)
        counts = service._generate_filter_counts(base_qs, filters={})

        # modes_of_delivery should have entries keyed by variation_type
        modes = counts.get('modes_of_delivery', {})
        self.assertIn('Printed', modes,
                       "modes_of_delivery should include 'Printed' from variation_type")
        self.assertIn('eBook', modes,
                       "modes_of_delivery should include 'eBook' from variation_type")

        # Verify counts are correct
        self.assertEqual(modes['Printed']['count'], 1)
        self.assertEqual(modes['eBook']['count'], 1)

    def test_no_format_groups_in_category_options(self):
        """T061: Format groups do not appear in category or product_type
        filter options after cleanup.

        After running cleanup, the filter configuration API should NOT
        return eBook/Printed/Hub as groups under categories or product_types.
        """
        from filtering.services.format_cleanup import remove_format_groups_from_configs

        # Run cleanup
        remove_format_groups_from_configs()

        # Check via the filter configuration API
        from filtering.services.filter_service import get_filter_service
        service = get_filter_service()
        config = service.get_filter_configuration()

        # Find categories and product_types configs
        for config_name, config_data in config.items():
            filter_key = config_data.get('filter_key')
            if filter_key in ('categories', 'product_types'):
                group_names = {
                    g['name'] for g in config_data.get('filter_groups', [])
                }
                for fmt in FORMAT_GROUP_NAMES:
                    self.assertNotIn(
                        fmt, group_names,
                        f"Format group '{fmt}' must not appear in "
                        f"'{filter_key}' filter configuration"
                    )
