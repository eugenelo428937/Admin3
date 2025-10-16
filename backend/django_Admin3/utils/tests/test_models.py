"""
Test cases for utils models (VAT-related models).
Following TDD methodology: RED → GREEN → REFACTOR
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from decimal import Decimal
from datetime import date, timedelta
from utils.models import UtilsRegion, UtilsCountrys, UtilsCountryRegion


class UtilsRegionTestCase(TestCase):
    """Test cases for UtilsRegion model (RED Phase)."""

    def test_region_creation_with_required_fields(self):
        """Test region creation with code, name, description."""
        region = UtilsRegion.objects.create(
            code='TEST1',
            name='Test Region 1',
            description='Test VAT region'
        )
        self.assertEqual(region.code, 'TEST1')
        self.assertEqual(region.name, 'Test Region 1')
        self.assertEqual(region.description, 'Test VAT region')
        self.assertTrue(region.active)  # Default should be True

    def test_region_unique_constraint_on_code(self):
        """Test unique constraint on code field."""
        UtilsRegion.objects.create(
            code='TEST2',
            name='Test Region 2'
        )
        with self.assertRaises(IntegrityError):
            UtilsRegion.objects.create(
                code='TEST2',  # Duplicate code
                name='Test Region 2 Duplicate'
            )

    def test_region_active_inactive_status(self):
        """Test active/inactive status."""
        region = UtilsRegion.objects.create(
            code='TEST3',
            name='Test Region 3',
            active=False
        )
        self.assertFalse(region.active)

        # Test toggling active status
        region.active = True
        region.save()
        region.refresh_from_db()
        self.assertTrue(region.active)

    def test_region_string_representation(self):
        """Test string representation of region."""
        region = UtilsRegion.objects.create(
            code='TEST4',
            name='Test Region 4'
        )
        self.assertEqual(str(region), 'TEST4 - Test Region 4')


class UtilsCountrysTestCase(TestCase):
    """Test cases for UtilsCountrys model (RED Phase)."""

    def test_country_creation_with_vat_percent(self):
        """Test country creation with code, name, vat_percent."""
        country = UtilsCountrys.objects.create(
            code='GB',
            name='United Kingdom',
            vat_percent=Decimal('20.00')
        )
        self.assertEqual(country.code, 'GB')
        self.assertEqual(country.name, 'United Kingdom')
        self.assertEqual(country.vat_percent, Decimal('20.00'))
        self.assertTrue(country.active)

    def test_country_vat_percent_decimal_precision(self):
        """Test Decimal precision (2 decimal places)."""
        country = UtilsCountrys.objects.create(
            code='IE',
            name='Ireland',
            vat_percent=Decimal('23.50')
        )
        # Verify precision is maintained
        self.assertEqual(country.vat_percent, Decimal('23.50'))
        self.assertIsInstance(country.vat_percent, Decimal)

    def test_country_default_vat_percent(self):
        """Test default vat_percent = 0.00."""
        country = UtilsCountrys.objects.create(
            code='US',
            name='United States'
            # vat_percent not provided, should default to 0.00
        )
        self.assertEqual(country.vat_percent, Decimal('0.00'))

    def test_country_unique_constraint_on_code(self):
        """Test unique constraint on code."""
        UtilsCountrys.objects.create(
            code='GB',
            name='United Kingdom'
        )
        with self.assertRaises(IntegrityError):
            UtilsCountrys.objects.create(
                code='GB',  # Duplicate code
                name='Great Britain'
            )

    def test_country_vat_percent_validation_range(self):
        """Test vat_percent validation (0-100 range)."""
        # Test valid range
        country = UtilsCountrys.objects.create(
            code='ZA',
            name='South Africa',
            vat_percent=Decimal('15.00')
        )
        country.full_clean()  # Should not raise ValidationError

        # Test invalid range - negative
        with self.assertRaises(ValidationError):
            country_negative = UtilsCountrys(
                code='XX',
                name='Invalid Country',
                vat_percent=Decimal('-5.00')
            )
            country_negative.full_clean()

        # Test invalid range - over 100
        with self.assertRaises(ValidationError):
            country_over = UtilsCountrys(
                code='YY',
                name='Invalid Country 2',
                vat_percent=Decimal('150.00')
            )
            country_over.full_clean()


class UtilsCountryRegionTestCase(TestCase):
    """Test cases for UtilsCountryRegion model (RED Phase)."""

    def setUp(self):
        """Set up test data."""
        self.region_test = UtilsRegion.objects.create(
            code='TESTREG',
            name='Test Region'
        )
        self.country_test = UtilsCountrys.objects.create(
            code='TC',
            name='Test Country',
            vat_percent=Decimal('20.00')
        )

    def test_mapping_creation_with_effective_dates(self):
        """Test mapping creation with country, region, effective_from."""
        mapping = UtilsCountryRegion.objects.create(
            country=self.country_test,
            region=self.region_test,
            effective_from=date(2020, 1, 1)
        )
        self.assertEqual(mapping.country, self.country_test)
        self.assertEqual(mapping.region, self.region_test)
        self.assertEqual(mapping.effective_from, date(2020, 1, 1))
        self.assertIsNone(mapping.effective_to)

    def test_mapping_effective_to_optional_field(self):
        """Test effective_to optional field."""
        mapping = UtilsCountryRegion.objects.create(
            country=self.country_test,
            region=self.region_test,
            effective_from=date(2020, 1, 1),
            effective_to=date(2025, 12, 31)
        )
        self.assertEqual(mapping.effective_to, date(2025, 12, 31))

    def test_mapping_unique_together_constraint(self):
        """Test unique_together constraint (country, effective_from)."""
        UtilsCountryRegion.objects.create(
            country=self.country_test,
            region=self.region_test,
            effective_from=date(2020, 1, 1)
        )

        # Try to create duplicate mapping with same country and effective_from
        with self.assertRaises(IntegrityError):
            UtilsCountryRegion.objects.create(
                country=self.country_test,
                region=self.region_test,  # Same region is OK, but same date is not
                effective_from=date(2020, 1, 1)  # Duplicate date
            )

    def test_mapping_foreign_key_relationships(self):
        """Test foreign key relationships."""
        mapping = UtilsCountryRegion.objects.create(
            country=self.country_test,
            region=self.region_test,
            effective_from=date(2020, 1, 1)
        )

        # Test reverse relationship from country
        country_mappings = self.country_test.utilscountryregion_set.all()
        self.assertEqual(country_mappings.count(), 1)
        self.assertEqual(country_mappings.first(), mapping)

        # Test reverse relationship from region
        region_mappings = self.region_test.utilscountryregion_set.all()
        self.assertEqual(region_mappings.count(), 1)
        self.assertEqual(region_mappings.first(), mapping)

    def test_mapping_effective_date_validation(self):
        """Test effective date validation (effective_to > effective_from)."""
        # Test valid date range
        mapping = UtilsCountryRegion(
            country=self.country_test,
            region=self.region_test,
            effective_from=date(2020, 1, 1),
            effective_to=date(2025, 12, 31)
        )
        mapping.full_clean()  # Should not raise ValidationError
        mapping.save()

        # Test invalid date range (effective_to <= effective_from)
        with self.assertRaises(ValidationError):
            invalid_mapping = UtilsCountryRegion(
                country=self.country_test,
                region=self.region_test,
                effective_from=date(2025, 1, 1),
                effective_to=date(2020, 1, 1)  # Before effective_from
            )
            invalid_mapping.clean()

        # Test effective_to equal to effective_from
        with self.assertRaises(ValidationError):
            equal_dates_mapping = UtilsCountryRegion(
                country=self.country_test,
                region=self.region_test,
                effective_from=date(2025, 1, 1),
                effective_to=date(2025, 1, 1)  # Same date
            )
            equal_dates_mapping.clean()
