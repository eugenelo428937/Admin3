"""
Tests for migration 0007: Populate venue_id/location_id FKs on tutorial_events
and rename exam_session_subject_product_variation_id to product_id.

Two test strategies:
1. ServiceFunctionTests: Temporarily restore old columns to test populate logic
2. ColumnRenameTest: Verify post-migration schema state
"""

from datetime import date, timedelta

from django.db import connection
from django.test import TestCase
from django.utils import timezone

from catalog.models import (
    ExamSession,
    ExamSessionSubject,
    Product,
    ProductProductVariation,
    ProductVariation,
    Subject,
)
from store.models import Product as StoreProduct
from tutorials.models import TutorialEvents, TutorialLocation, TutorialVenue


class EventFkPopulationTestBase(TestCase):
    """Base class that sets up fixtures and restores old columns for testing populate functions."""

    def setUp(self):
        """Create fixtures simulating the pre-migration state."""
        # -- Reference tables --
        self.loc_london = TutorialLocation.objects.create(name='London', code='Lon')
        self.loc_live = TutorialLocation.objects.create(name='Live Online', code='Live')
        self.loc_bham = TutorialLocation.objects.create(name='Birmingham', code='Bir')

        self.venue_kings_cross = TutorialVenue.objects.create(
            name='BPP London North (King\'s Cross)', location=self.loc_london
        )
        self.venue_holborn = TutorialVenue.objects.create(
            name='BPP London Central (Holborn)', location=self.loc_london
        )
        self.venue_live = TutorialVenue.objects.create(
            name='Live Online', location=self.loc_live
        )
        self.venue_bham = TutorialVenue.objects.create(
            name='BPP Birmingham', location=self.loc_bham
        )

        # -- Catalog / Store chain --
        self.exam_session = ExamSession.objects.create(
            session_code='APR2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        self.subject = Subject.objects.create(
            code='CM2', description='Financial Engineering', active=True
        )
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject
        )

        # Product shortname = location name (the mapping key)
        self.cat_product_london = Product.objects.create(
            code='LON', fullname='Tutorial - London', shortname='London'
        )
        self.cat_product_live = Product.objects.create(
            code='LIVE', fullname='Tutorial - Live Online', shortname='Live Online'
        )
        self.cat_product_bham = Product.objects.create(
            code='BIR', fullname='Tutorial - Birmingham', shortname='Birmingham'
        )

        self.pv = ProductVariation.objects.create(
            code='WKD', name='Weekend', description='Weekend tutorial',
            description_short='Weekend', variation_type='Tutorial'
        )

        self.ppv_london = ProductProductVariation.objects.create(
            product=self.cat_product_london, product_variation=self.pv
        )
        self.ppv_live = ProductProductVariation.objects.create(
            product=self.cat_product_live, product_variation=self.pv
        )
        self.ppv_bham = ProductProductVariation.objects.create(
            product=self.cat_product_bham, product_variation=self.pv
        )

        self.sp_london = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv_london,
            product_code='CM2/TWKDLON/APR2025',
        )
        self.sp_live = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv_live,
            product_code='CM2/TWKDLIVE/APR2025',
        )
        self.sp_bham = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv_bham,
            product_code='CM2/TWKDBIR/APR2025',
        )

        # Restore old venue VARCHAR column BEFORE any DML on this table
        # (PostgreSQL forbids ALTER TABLE after pending trigger events)
        with connection.cursor() as cursor:
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'acted'
                          AND table_name = 'tutorial_events'
                          AND column_name = 'venue'
                    ) THEN
                        ALTER TABLE acted.tutorial_events ADD COLUMN venue VARCHAR(255);
                    END IF;
                END $$;
            """)

        # Create events with NULL venue_id and location_id
        self.event_london = TutorialEvents.objects.create(
            code='CM2-LON-01', start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32), store_product=self.sp_london,
        )
        self.event_live = TutorialEvents.objects.create(
            code='CM2-LIVE-01', start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32), store_product=self.sp_live,
        )
        self.event_bham = TutorialEvents.objects.create(
            code='CM2-BIR-01', start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32), store_product=self.sp_bham,
        )

        # Set old venue text values so populate_venue_ids can match
        with connection.cursor() as cursor:
            cursor.execute(
                'UPDATE acted.tutorial_events SET venue = %s WHERE id = %s',
                ["BPP London North (King's Cross)", self.event_london.id],
            )
            cursor.execute(
                'UPDATE acted.tutorial_events SET venue = %s WHERE id = %s',
                ['Live Online', self.event_live.id],
            )
            cursor.execute(
                'UPDATE acted.tutorial_events SET venue = %s WHERE id = %s',
                ['BPP Birmingham', self.event_bham.id],
            )


class EventVenuePopulationTest(EventFkPopulationTestBase):
    """Verify venue_id is populated by matching old venue VARCHAR to tutorial_venues.name."""

    def test_events_start_with_null_venue_fk(self):
        """Pre-condition: events have venue text but NULL venue_id before populate."""
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM acted.tutorial_events "
                "WHERE venue IS NOT NULL AND venue != '' AND venue_id IS NULL"
            )
            count = cursor.fetchone()[0]
        self.assertEqual(count, 3, "Expected 3 events with venue text and NULL venue_id")

    def test_venue_fk_populated(self):
        """After populate, all events should have venue_id set."""
        from tutorials.services.populate_event_fks import populate_venue_ids

        count = populate_venue_ids()

        self.assertEqual(count, 3)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM acted.tutorial_events "
                "WHERE venue IS NOT NULL AND venue != '' AND venue_id IS NULL"
            )
            orphaned = cursor.fetchone()[0]
        self.assertEqual(orphaned, 0, f"{orphaned} events still have NULL venue_id")

    def test_venue_fk_correct_mapping(self):
        """Each event's venue_id should resolve to the matching venue name."""
        from tutorials.services.populate_event_fks import populate_venue_ids

        populate_venue_ids()

        self.event_london.refresh_from_db()
        self.event_live.refresh_from_db()
        self.event_bham.refresh_from_db()

        self.assertEqual(self.event_london.venue_id, self.venue_kings_cross.id)
        self.assertEqual(self.event_live.venue_id, self.venue_live.id)
        self.assertEqual(self.event_bham.venue_id, self.venue_bham.id)

    def test_idempotent(self):
        """Running twice should produce the same result."""
        from tutorials.services.populate_event_fks import populate_venue_ids

        populate_venue_ids()
        populate_venue_ids()

        self.event_london.refresh_from_db()
        self.assertEqual(self.event_london.venue_id, self.venue_kings_cross.id)


class EventLocationPopulationTest(EventFkPopulationTestBase):
    """Verify location_id populated by matching catalog_products.shortname to tutorial_locations.name."""

    def test_events_start_with_null_location_fk(self):
        """Pre-condition: events have NULL location_id before populate."""
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM acted.tutorial_events WHERE location_id IS NULL"
            )
            count = cursor.fetchone()[0]
        self.assertEqual(count, 3, "Expected 3 events with NULL location_id")

    def test_location_fk_populated(self):
        """After populate, all events should have location_id set."""
        from tutorials.services.populate_event_fks import populate_location_ids

        count = populate_location_ids()

        self.assertEqual(count, 3)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM acted.tutorial_events WHERE location_id IS NULL"
            )
            null_count = cursor.fetchone()[0]
        self.assertEqual(null_count, 0, f"{null_count} events still have NULL location_id")

    def test_location_fk_correct_mapping(self):
        """Each event's location_id should match the catalog product's shortname."""
        from tutorials.services.populate_event_fks import populate_location_ids

        populate_location_ids()

        self.event_london.refresh_from_db()
        self.event_live.refresh_from_db()
        self.event_bham.refresh_from_db()

        self.assertEqual(self.event_london.location_id, self.loc_london.id)
        self.assertEqual(self.event_live.location_id, self.loc_live.id)
        self.assertEqual(self.event_bham.location_id, self.loc_bham.id)

    def test_idempotent(self):
        """Running twice should produce the same result."""
        from tutorials.services.populate_event_fks import populate_location_ids

        populate_location_ids()
        populate_location_ids()

        self.event_london.refresh_from_db()
        self.assertEqual(self.event_london.location_id, self.loc_london.id)


class ColumnRenameTest(TestCase):
    """Verify exam_session_subject_product_variation_id renamed to product_id."""

    def test_product_id_column_exists(self):
        """The product_id column should exist on tutorial_events."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'acted'
                  AND table_name = 'tutorial_events'
                  AND column_name = 'product_id'
            """)
            self.assertIsNotNone(
                cursor.fetchone(),
                "Column 'product_id' does not exist on acted.tutorial_events"
            )

    def test_old_column_name_gone(self):
        """The old exam_session_subject_product_variation_id column should no longer exist."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'acted'
                  AND table_name = 'tutorial_events'
                  AND column_name = 'exam_session_subject_product_variation_id'
            """)
            self.assertIsNone(
                cursor.fetchone(),
                "Old column 'exam_session_subject_product_variation_id' still exists"
            )

    def test_product_id_has_fk_constraint(self):
        """The product_id column should have a foreign key to acted.products."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema = 'acted'
                  AND tc.table_name = 'tutorial_events'
                  AND kcu.column_name = 'product_id'
                  AND tc.constraint_type = 'FOREIGN KEY'
            """)
            self.assertIsNotNone(
                cursor.fetchone(),
                "No FK constraint found on product_id column"
            )

    def test_old_venue_varchar_column_dropped(self):
        """The old venue VARCHAR column should no longer exist (superseded by venue_id FK)."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'acted'
                  AND table_name = 'tutorial_events'
                  AND column_name = 'venue'
                  AND data_type = 'character varying'
            """)
            self.assertIsNone(
                cursor.fetchone(),
                "Old venue VARCHAR column still exists"
            )
