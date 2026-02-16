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
        'events',
        'sessions',
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
        )
        venue = Venue.objects.create(
            external_id='VEN-FK-TEST',
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

        Location.objects.create(external_id='L1')
        Venue.objects.create(
            external_id='V1',
            location=Location.objects.get(external_id='L1'),
        )
        Instructor.objects.create(external_id='I1')
        CourseTemplate.objects.create(external_id='CT1')
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

    def test_event_tutorial_event_fk_exists(self):
        """Verify Event model has tutorial_event FK field."""
        from administrate.models import Event
        field = Event._meta.get_field('tutorial_event')
        self.assertTrue(field.null)
        self.assertTrue(field.blank)
        self.assertEqual(field.remote_field.on_delete.__name__, 'SET_NULL')
        self.assertEqual(field.remote_field.related_name, 'adm_events')

    def test_event_session_crud(self):
        """Verify CRUD works for Event and Session models in adm schema."""
        from administrate.models import (
            Event, Session, CourseTemplate, Location,
            Venue, Instructor,
        )
        from datetime import date, time

        ct = CourseTemplate.objects.create(external_id='CT-EVT')
        loc = Location.objects.create(external_id='LOC-EVT')
        venue = Venue.objects.create(external_id='VEN-EVT', location=loc)
        instr = Instructor.objects.create(external_id='INSTR-EVT')

        event = Event.objects.create(
            external_id='EVT-1',
            course_template=ct,
            title='Test Event',
            location=loc,
            venue=venue,
            primary_instructor=instr,
        )
        self.assertEqual(event.external_id, 'EVT-1')
        self.assertIsNone(event.tutorial_event)

        session = Session.objects.create(
            event=event,
            title='Day 1',
            day_number=1,
            classroom_start_date=date(2026, 3, 1),
            classroom_start_time=time(9, 0),
            classroom_end_date=date(2026, 3, 1),
            classroom_end_time=time(17, 0),
            session_instructor=instr,
        )
        self.assertEqual(session.event, event)
        self.assertEqual(event.sessions.count(), 1)
