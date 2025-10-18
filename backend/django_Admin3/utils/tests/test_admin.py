"""
Tests for utils app Django admin interfaces.

Phase 7: Django Admin Interface
TDD Methodology: RED-GREEN-REFACTOR
"""
from django.test import TestCase
from django.contrib.admin.sites import site
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import date

from utils.models import UtilsCountrys, UtilsRegion, UtilsCountryRegion
from utils.admin import UtilsCountrysAdmin, UtilsRegionAdmin, UtilsCountryRegionAdmin

User = get_user_model()


class UtilsCountrysAdminTests(TestCase):
    """Test UtilsCountrys admin interface."""

    def setUp(self):
        """Set up test data."""
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin123'
        )

        self.country = UtilsCountrys.objects.create(
            code='GB',
            name='United Kingdom',
            vat_percent=Decimal('20.00'),
            active=True
        )

    def test_utils_countrys_registered(self):
        """Verify UtilsCountrys is registered in admin."""
        self.assertIn(UtilsCountrys, site._registry)

    def test_utils_countrys_admin_list_display(self):
        """Verify list_display fields."""
        admin = site._registry[UtilsCountrys]

        expected_fields = ['code', 'name', 'vat_percent', 'active']
        self.assertEqual(admin.list_display, expected_fields)

    def test_utils_countrys_admin_list_editable(self):
        """Verify list_editable fields (inline editing)."""
        admin = site._registry[UtilsCountrys]

        expected_editable = ['vat_percent', 'active']
        self.assertEqual(admin.list_editable, expected_editable)

    def test_utils_countrys_admin_search_fields(self):
        """Verify search fields."""
        admin = site._registry[UtilsCountrys]

        expected_search = ['code', 'name']
        self.assertEqual(admin.search_fields, expected_search)

    def test_utils_countrys_admin_list_filter(self):
        """Verify list filters."""
        admin = site._registry[UtilsCountrys]

        expected_filters = ['active']
        self.assertEqual(list(admin.list_filter), expected_filters)

    def test_utils_countrys_admin_ordering(self):
        """Verify default ordering."""
        admin = site._registry[UtilsCountrys]

        expected_ordering = ['name']
        self.assertEqual(admin.ordering, expected_ordering)

    def test_utils_countrys_admin_readonly_fields(self):
        """Verify readonly fields."""
        admin = site._registry[UtilsCountrys]

        expected_readonly = ['created_at', 'updated_at']
        self.assertEqual(admin.readonly_fields, expected_readonly)


class UtilsRegionAdminTests(TestCase):
    """Test UtilsRegion admin interface."""

    def setUp(self):
        """Set up test data."""
        self.admin_user = User.objects.create_superuser(
            username='admin_region',
            email='admin_region@example.com',
            password='admin123'
        )

        self.region = UtilsRegion.objects.create(
            code='TEST_UK',
            name='Test United Kingdom',
            description='United Kingdom VAT region',
            active=True
        )

    def test_utils_region_registered(self):
        """Verify UtilsRegion is registered in admin."""
        self.assertIn(UtilsRegion, site._registry)

    def test_utils_region_admin_list_display(self):
        """Verify list_display fields."""
        admin = site._registry[UtilsRegion]

        expected_fields = ['code', 'name', 'description', 'active']
        self.assertEqual(admin.list_display, expected_fields)

    def test_utils_region_admin_list_editable(self):
        """Verify list_editable fields."""
        admin = site._registry[UtilsRegion]

        expected_editable = ['active']
        self.assertEqual(admin.list_editable, expected_editable)

    def test_utils_region_admin_search_fields(self):
        """Verify search fields."""
        admin = site._registry[UtilsRegion]

        expected_search = ['code', 'name']
        self.assertEqual(admin.search_fields, expected_search)


class UtilsCountryRegionAdminTests(TestCase):
    """Test UtilsCountryRegion admin interface."""

    def setUp(self):
        """Set up test data."""
        self.admin_user = User.objects.create_superuser(
            username='admin_mapping',
            email='admin_mapping@example.com',
            password='admin123'
        )

        self.country = UtilsCountrys.objects.create(
            code='TS',
            name='Test Country',
            vat_percent=Decimal('20.00')
        )

        self.region = UtilsRegion.objects.create(
            code='TST_REG',
            name='Test Region'
        )

        self.mapping = UtilsCountryRegion.objects.create(
            country=self.country,
            region=self.region,
            effective_from=date(2020, 1, 1),
            effective_to=None
        )

    def test_utils_country_region_registered(self):
        """Verify UtilsCountryRegion is registered in admin."""
        self.assertIn(UtilsCountryRegion, site._registry)

    def test_utils_country_region_admin_list_display(self):
        """Verify list_display fields."""
        admin = site._registry[UtilsCountryRegion]

        expected_fields = [
            'country',
            'region',
            'effective_from',
            'effective_to',
            'is_current'
        ]
        self.assertEqual(admin.list_display, expected_fields)

    def test_utils_country_region_admin_list_filter(self):
        """Verify list filters."""
        admin = site._registry[UtilsCountryRegion]

        self.assertIn('region', admin.list_filter)
        self.assertIn('effective_from', admin.list_filter)

    def test_utils_country_region_admin_date_hierarchy(self):
        """Verify date hierarchy."""
        admin = site._registry[UtilsCountryRegion]

        self.assertEqual(admin.date_hierarchy, 'effective_from')

    def test_is_current_property(self):
        """Test is_current computed property."""
        # Current mapping (no end date)
        self.assertTrue(self.mapping.is_current())

        # Expired mapping
        self.mapping.effective_to = date(2020, 12, 31)
        self.mapping.save()
        self.assertFalse(self.mapping.is_current())

        # Future mapping
        future_mapping = UtilsCountryRegion.objects.create(
            country=self.country,
            region=self.region,
            effective_from=date(2030, 1, 1),
            effective_to=None
        )
        self.assertFalse(future_mapping.is_current())
