"""
Tests for administrate schema migration.

These tests verify that administrate tables physically reside in the adm
PostgreSQL schema (not as literal dot-named tables in the public schema).
"""
from django.test import TestCase
from django.db import connection


class AdministrateSchemaMigrationTest(TestCase):
    """Test administrate models are in the adm PostgreSQL schema."""

    EXPECTED_ADM_TABLES = [
        'course_templates',
        'custom_fields',
        'instructors',
        'locations',
        'pricelevels',
        'venues',
        'course_template_price_levels',
    ]

    def test_all_tables_in_adm_schema(self):
        """Verify all administrate tables physically reside in the adm schema."""
        with connection.cursor() as cursor:
            for table in self.EXPECTED_ADM_TABLES:
                cursor.execute(
                    "SELECT 1 FROM information_schema.tables "
                    "WHERE table_schema = 'adm' AND table_name = %s",
                    [table],
                )
                result = cursor.fetchone()
                self.assertIsNotNone(
                    result,
                    f"Table '{table}' not found in adm schema. "
                    f"Check migration 0003 and db_table format.",
                )

    def test_no_literal_dot_tables_in_public(self):
        """Verify no 'adm.xxx' literal-named tables remain in public schema."""
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name LIKE 'adm.%%'"
            )
            leftover = [row[0] for row in cursor.fetchall()]
            self.assertEqual(
                leftover, [],
                f"Literal dot-name tables still in public schema: {leftover}",
            )

    def test_venue_location_foreign_key_integrity(self):
        """Verify Venue->Location FK works after schema migration."""
        from administrate.models import Location, Venue

        location = Location.objects.create(
            external_id='LOC-FK-TEST',
            name='FK Test Location',
            code='FKT',
            active=True,
        )
        venue = Venue.objects.create(
            external_id='VEN-FK-TEST',
            name='FK Test Venue',
            location=location,
        )
        self.assertEqual(venue.location.external_id, 'LOC-FK-TEST')
        self.assertIn(venue, location.venues.all())

    def test_crud_operations_all_models(self):
        """Verify CRUD works for all six core tables after migration."""
        from administrate.models import (
            CourseTemplate, CustomField, Instructor,
            Location, PriceLevel, Venue,
        )

        Location.objects.create(external_id='L1', name='London', code='LON')
        Venue.objects.create(
            external_id='V1', name='Room A',
            location=Location.objects.get(external_id='L1'),
        )
        Instructor.objects.create(
            external_id='I1', first_name='Jane', last_name='Doe',
        )
        CourseTemplate.objects.create(
            external_id='CT1', code='CT001', title='Course 1',
        )
        CustomField.objects.create(
            external_id='CF1', label='Field 1',
            field_type='text', entity_type='event',
        )
        PriceLevel.objects.create(external_id='PL1', name='Standard')

        self.assertEqual(Location.objects.count(), 1)
        self.assertEqual(Venue.objects.count(), 1)
        self.assertEqual(Instructor.objects.count(), 1)
        self.assertEqual(CourseTemplate.objects.count(), 1)
        self.assertEqual(CustomField.objects.count(), 1)
        self.assertEqual(PriceLevel.objects.count(), 1)
