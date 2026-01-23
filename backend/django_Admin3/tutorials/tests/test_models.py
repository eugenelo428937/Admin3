"""
Test suite for tutorials models.

This module tests the TutorialEvent model to ensure proper field validations,
relationships, and model behavior.

Updated 2026-01-16: Changed imports from exam_sessions_subjects_products to store/catalog
as part of T087 legacy app cleanup. Tests now use store.Product instead of
ExamSessionSubjectProductVariation.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta, date
from decimal import Decimal

from tutorials.models import TutorialEvent
from store.models import Product as StoreProduct
from catalog.models import ExamSession, ExamSessionSubject, Subject, Product, ProductProductVariation, ProductVariation


class TutorialEventTestCase(TestCase):
    """Test cases for TutorialEvent model."""

    def setUp(self):
        """Set up test fixtures - create tutorial events."""
        # Create exam session
        self.exam_session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Create subject
        self.subject = Subject.objects.create(
            code='CM2',
            description='Financial Engineering',
            active=True
        )

        # Create exam session subject
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )

        # Create product (tutorial location product template)
        self.product = Product.objects.create(
            code='TUT001',
            fullname='Tutorial - London',
            shortname='Tutorial London'
        )

        # Create product variation (tutorial type - e.g., Weekend, Weekday)
        self.product_variation = ProductVariation.objects.create(
            code='WKD',
            name='Weekend Tutorial',
            description='Weekend intensive tutorial',
            description_short='Weekend',
            variation_type='Tutorial'
        )

        # Create ProductProductVariation (links Product to ProductVariation)
        self.product_product_variation = ProductProductVariation.objects.create(
            product=self.product,
            product_variation=self.product_variation
        )

        # Create store.Product (replaces old ESSP + ESSPV chain)
        # Links exam_session_subject directly to product_product_variation
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.product_product_variation,
            product_code='CM2/TWKDTUT001/JUNE2025'
        )

    def test_tutorial_event_creation_with_required_fields(self):
        """Test TutorialEvent creation with all required fields."""
        event = TutorialEvent.objects.create(
            code='TUT-CM2-LON-001',
            venue='London Convention Center',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        self.assertEqual(event.code, 'TUT-CM2-LON-001')
        self.assertEqual(event.venue, 'London Convention Center')
        self.assertFalse(event.is_soldout)  # Default value
        self.assertIsNone(event.finalisation_date)  # Optional
        self.assertEqual(event.remain_space, 0)  # Default value
        self.assertIsNotNone(event.created_at)
        self.assertIsNotNone(event.updated_at)

    def test_tutorial_event_creation_with_all_fields(self):
        """Test TutorialEvent creation with all fields."""
        finalisation = date.today() + timedelta(days=25)

        event = TutorialEvent.objects.create(
            code='TUT-CM2-LON-002',
            venue='Manchester Training Centre',
            is_soldout=True,
            finalisation_date=finalisation,
            remain_space=15,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        self.assertEqual(event.code, 'TUT-CM2-LON-002')
        self.assertEqual(event.venue, 'Manchester Training Centre')
        self.assertTrue(event.is_soldout)
        self.assertEqual(event.finalisation_date, finalisation)
        self.assertEqual(event.remain_space, 15)

    def test_code_unique_constraint(self):
        """Test code field has unique constraint."""
        TutorialEvent.objects.create(
            code='TUT-UNIQUE-001',
            venue='Venue 1',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        # Attempt to create duplicate code should fail
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            TutorialEvent.objects.create(
                code='TUT-UNIQUE-001',  # Duplicate code
                venue='Venue 2',
                start_date=date.today() + timedelta(days=40),
                end_date=date.today() + timedelta(days=42),
                store_product=self.store_product
            )

    def test_code_max_length_validation(self):
        """Test code field respects 100 character maximum."""
        code = 'A' * 100
        event = TutorialEvent.objects.create(
            code=code,
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertEqual(len(event.code), 100)

    def test_venue_max_length_validation(self):
        """Test venue field respects 255 character maximum."""
        venue = 'A' * 255
        event = TutorialEvent.objects.create(
            code='TUT-VENUE-001',
            venue=venue,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertEqual(len(event.venue), 255)

    def test_is_soldout_default_value(self):
        """Test is_soldout defaults to False."""
        event = TutorialEvent.objects.create(
            code='TUT-DEFAULT-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertFalse(event.is_soldout)

    def test_remain_space_default_value(self):
        """Test remain_space defaults to 0."""
        event = TutorialEvent.objects.create(
            code='TUT-SPACE-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertEqual(event.remain_space, 0)

    def test_finalisation_date_optional(self):
        """Test finalisation_date is optional (null=True, blank=True)."""
        event = TutorialEvent.objects.create(
            code='TUT-FINALISATION-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertIsNone(event.finalisation_date)

    def test_foreign_key_relationship_to_essp_variation(self):
        """Test ForeignKey relationship with ExamSessionSubjectProductVariation."""
        event = TutorialEvent.objects.create(
            code='TUT-RELATION-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        # Test forward relationship
        self.assertEqual(event.store_product.id, self.store_product.id)

        # Test reverse relationship
        self.assertIn(event, self.store_product.tutorial_events.all())

    def test_cascade_delete_essp_variation(self):
        """Test cascading delete - deleting ESSP variation deletes tutorial events."""
        event = TutorialEvent.objects.create(
            code='TUT-CASCADE-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        event_id = event.id

        # Delete ESSP variation
        self.store_product.delete()

        # Event should be deleted
        self.assertFalse(TutorialEvent.objects.filter(id=event_id).exists())

    def test_subject_code_property(self):
        """Test subject_code property returns correct subject code."""
        event = TutorialEvent.objects.create(
            code='TUT-PROPERTY-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        self.assertEqual(event.subject_code, 'CM2')

    def test_str_method_formatting(self):
        """Test __str__ method returns code and venue."""
        event = TutorialEvent.objects.create(
            code='TUT-STR-001',
            venue='London Training Center',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        expected = "TUT-STR-001 - London Training Center"
        self.assertEqual(str(event), expected)

    def test_date_field_validation(self):
        """Test start_date and end_date are DateField types."""
        event = TutorialEvent.objects.create(
            code='TUT-DATE-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        self.assertIsInstance(event.start_date, date)
        self.assertIsInstance(event.end_date, date)

    def test_start_date_required(self):
        """Test start_date is a required field."""
        with self.assertRaises(Exception):  # IntegrityError or ValidationError
            TutorialEvent.objects.create(
                code='TUT-NO-START-001',
                venue='Test Venue',
                end_date=date.today() + timedelta(days=32),
                store_product=self.store_product
            )

    def test_end_date_required(self):
        """Test end_date is a required field."""
        with self.assertRaises(Exception):  # IntegrityError or ValidationError
            TutorialEvent.objects.create(
                code='TUT-NO-END-001',
                venue='Test Venue',
                start_date=date.today() + timedelta(days=30),
                store_product=self.store_product
            )

    def test_ordering_by_start_date_and_code(self):
        """Test default ordering is by start_date, then code."""
        # Create three events with different dates
        event1 = TutorialEvent.objects.create(
            code='TUT-A-001',
            venue='Venue 1',
            start_date=date.today() + timedelta(days=40),
            end_date=date.today() + timedelta(days=42),
            store_product=self.store_product
        )

        event2 = TutorialEvent.objects.create(
            code='TUT-B-001',
            venue='Venue 2',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        event3 = TutorialEvent.objects.create(
            code='TUT-A-002',
            venue='Venue 3',
            start_date=date.today() + timedelta(days=30),  # Same date as event2
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        # Query all - should be ordered by start_date, then code
        events = list(TutorialEvent.objects.all())
        self.assertEqual(events[0].id, event3.id)  # Earliest date, code 'A'
        self.assertEqual(events[1].id, event2.id)  # Earliest date, code 'B'
        self.assertEqual(events[2].id, event1.id)  # Later date

    def test_db_table_name(self):
        """Test custom database table name."""
        self.assertEqual(
            TutorialEvent._meta.db_table,
            'acted_tutorial_events'
        )

    def test_verbose_name(self):
        """Test model verbose name is set correctly."""
        self.assertEqual(
            TutorialEvent._meta.verbose_name,
            'Tutorial Event'
        )

    def test_verbose_name_plural(self):
        """Test model verbose name plural is set correctly."""
        self.assertEqual(
            TutorialEvent._meta.verbose_name_plural,
            'Tutorial Events'
        )

    def test_auto_timestamp_fields(self):
        """Test created_at and updated_at are automatically set."""
        event = TutorialEvent.objects.create(
            code='TUT-TIMESTAMP-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        self.assertIsNotNone(event.created_at)
        self.assertIsNotNone(event.updated_at)

        # Created and updated dates should be approximately equal initially
        time_diff = event.updated_at - event.created_at
        self.assertLess(time_diff.total_seconds(), 1)

    def test_updated_at_changes_on_save(self):
        """Test updated_at changes when record is saved."""
        import time

        event = TutorialEvent.objects.create(
            code='TUT-UPDATE-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        original_updated = event.updated_at

        # Wait a bit then save again
        time.sleep(0.1)
        event.venue = 'Updated Venue'
        event.save()

        # Updated date should have changed
        event.refresh_from_db()
        self.assertGreater(event.updated_at, original_updated)

    def test_query_by_essp_variation(self):
        """Test querying tutorial events by ESSP variation."""
        event1 = TutorialEvent.objects.create(
            code='TUT-QUERY-001',
            venue='Venue 1',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        event2 = TutorialEvent.objects.create(
            code='TUT-QUERY-002',
            venue='Venue 2',
            start_date=date.today() + timedelta(days=35),
            end_date=date.today() + timedelta(days=37),
            store_product=self.store_product
        )

        # Query by ESSP variation
        events = TutorialEvent.objects.filter(
            store_product=self.store_product
        )

        self.assertEqual(events.count(), 2)
        self.assertIn(event1, events)
        self.assertIn(event2, events)

    def test_query_by_date_range(self):
        """Test querying tutorial events by date range."""
        event1 = TutorialEvent.objects.create(
            code='TUT-DATE-RANGE-001',
            venue='Venue 1',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        event2 = TutorialEvent.objects.create(
            code='TUT-DATE-RANGE-002',
            venue='Venue 2',
            start_date=date.today() + timedelta(days=60),
            end_date=date.today() + timedelta(days=62),
            store_product=self.store_product
        )

        # Query events starting within 45 days
        cutoff_date = date.today() + timedelta(days=45)
        events = TutorialEvent.objects.filter(start_date__lte=cutoff_date)

        self.assertIn(event1, events)
        self.assertNotIn(event2, events)

    def test_query_available_events(self):
        """Test querying available (not soldout) tutorial events."""
        available_event = TutorialEvent.objects.create(
            code='TUT-AVAILABLE-001',
            venue='Venue 1',
            is_soldout=False,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        soldout_event = TutorialEvent.objects.create(
            code='TUT-SOLDOUT-001',
            venue='Venue 2',
            is_soldout=True,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        # Query available events
        available_events = TutorialEvent.objects.filter(is_soldout=False)

        self.assertIn(available_event, available_events)
        self.assertNotIn(soldout_event, available_events)
