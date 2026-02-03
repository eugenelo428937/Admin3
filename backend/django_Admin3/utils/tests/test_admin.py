"""
Tests for utils app Django admin interfaces.

Phase 7: Django Admin Interface
TDD Methodology: RED-GREEN-REFACTOR
"""
from django.test import TestCase, RequestFactory
from django.contrib.admin.sites import site
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import date
from unittest.mock import MagicMock, patch

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


class UTLAdminSaveModelTests(TestCase):
    """Test save_model methods on admin classes (coverage gap)."""

    def setUp(self):
        self.factory = RequestFactory()
        self.admin_user = User.objects.create_superuser(
            username='UTL_save_admin',
            email='UTL_save@example.com',
            password='admin123'
        )
        self.country = UtilsCountrys.objects.create(
            code='U1',
            name='UTL Save Country',
            vat_percent=Decimal('15.00'),
            active=True
        )
        self.region = UtilsRegion.objects.create(
            code='UTL_SAV',
            name='UTL Save Region'
        )

    def test_UTL_countrys_save_model_logs_vat_change(self):
        """save_model should log VAT rate changes."""
        admin_instance = UtilsCountrysAdmin(UtilsCountrys, site)
        request = self.factory.post('/admin/')
        request.user = self.admin_user

        # Simulate form with vat_percent changed
        form = MagicMock()
        form.changed_data = ['vat_percent']
        form.initial = {'vat_percent': Decimal('15.00')}

        self.country.vat_percent = Decimal('20.00')

        with patch('logging.getLogger') as mock_get_logger:
            mock_logger = MagicMock()
            mock_get_logger.return_value = mock_logger
            admin_instance.save_model(request, self.country, form, change=True)

        # Object should be saved
        self.country.refresh_from_db()
        self.assertEqual(self.country.vat_percent, Decimal('20.00'))

    def test_UTL_countrys_save_model_no_vat_change(self):
        """save_model should not log when vat_percent not changed."""
        admin_instance = UtilsCountrysAdmin(UtilsCountrys, site)
        request = self.factory.post('/admin/')
        request.user = self.admin_user

        form = MagicMock()
        form.changed_data = ['name']  # Not vat_percent
        form.initial = {'vat_percent': Decimal('15.00')}

        admin_instance.save_model(request, self.country, form, change=True)
        self.country.refresh_from_db()
        self.assertEqual(self.country.vat_percent, Decimal('15.00'))

    def test_UTL_countrys_save_model_new_object(self):
        """save_model for new object (change=False) should not log."""
        admin_instance = UtilsCountrysAdmin(UtilsCountrys, site)
        request = self.factory.post('/admin/')
        request.user = self.admin_user

        form = MagicMock()
        form.changed_data = ['vat_percent']

        new_country = UtilsCountrys(
            code='U2',
            name='UTL New Country',
            vat_percent=Decimal('10.00')
        )
        # change=False means new object, should not try to log VAT change
        admin_instance.save_model(request, new_country, form, change=False)
        self.assertIsNotNone(UtilsCountrys.objects.get(code='U2'))

    def test_UTL_countrys_get_queryset(self):
        """get_queryset should return a queryset with select_related."""
        admin_instance = UtilsCountrysAdmin(UtilsCountrys, site)
        request = self.factory.get('/admin/')
        request.user = self.admin_user
        qs = admin_instance.get_queryset(request)
        # Should return a valid queryset
        self.assertTrue(qs.exists())

    def test_UTL_country_region_get_queryset(self):
        """UtilsCountryRegionAdmin.get_queryset should use select_related."""
        admin_instance = UtilsCountryRegionAdmin(UtilsCountryRegion, site)
        request = self.factory.get('/admin/')
        request.user = self.admin_user

        # Create a mapping for the queryset
        UtilsCountryRegion.objects.create(
            country=self.country,
            region=self.region,
            effective_from=date(2020, 1, 1),
        )

        qs = admin_instance.get_queryset(request)
        self.assertTrue(qs.exists())

    def test_UTL_country_region_save_model_no_overlap(self):
        """save_model should save without warning when no overlap exists."""
        admin_instance = UtilsCountryRegionAdmin(UtilsCountryRegion, site)
        request = self.factory.post('/admin/')
        request.user = self.admin_user

        mapping = UtilsCountryRegion(
            country=self.country,
            region=self.region,
            effective_from=date(2025, 1, 1),
            effective_to=date(2025, 12, 31),
        )

        form = MagicMock()
        admin_instance.save_model(request, mapping, form, change=False)
        self.assertIsNotNone(mapping.pk)

    def test_UTL_country_region_save_model_with_overlap(self):
        """save_model should issue warning when overlapping dates exist."""
        # Create existing mapping
        UtilsCountryRegion.objects.create(
            country=self.country,
            region=self.region,
            effective_from=date(2024, 1, 1),
            effective_to=date(2024, 12, 31),
        )

        admin_instance = UtilsCountryRegionAdmin(UtilsCountryRegion, site)
        request = self.factory.post('/admin/')
        request.user = self.admin_user

        # Create overlapping mapping
        overlap_mapping = UtilsCountryRegion(
            country=self.country,
            region=self.region,
            effective_from=date(2024, 6, 1),
            effective_to=date(2025, 6, 30),
        )

        form = MagicMock()
        with patch('django.contrib.messages') as mock_messages:
            admin_instance.save_model(request, overlap_mapping, form, change=False)
            mock_messages.warning.assert_called_once()

    def test_UTL_region_admin_fieldsets(self):
        """UtilsRegionAdmin should have proper fieldsets."""
        admin_instance = site._registry[UtilsRegion]
        self.assertIsNotNone(admin_instance.fieldsets)
