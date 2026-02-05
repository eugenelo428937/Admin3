"""
Test suite for tutorials models.

This module tests the TutorialEvents model to ensure proper field validations,
relationships, and model behavior.

Updated 2026-01-16: Changed imports from exam_sessions_subjects_products to store/catalog
as part of T087 legacy app cleanup. Tests now use store.Product instead of
ExamSessionSubjectProductVariation.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta, date
from decimal import Decimal

from tutorials.models import TutorialEvents
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
        event = TutorialEvents.objects.create(
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

        event = TutorialEvents.objects.create(
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
        TutorialEvents.objects.create(
            code='TUT-UNIQUE-001',
            venue='Venue 1',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        # Attempt to create duplicate code should fail
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            TutorialEvents.objects.create(
                code='TUT-UNIQUE-001',  # Duplicate code
                venue='Venue 2',
                start_date=date.today() + timedelta(days=40),
                end_date=date.today() + timedelta(days=42),
                store_product=self.store_product
            )

    def test_code_max_length_validation(self):
        """Test code field respects 100 character maximum."""
        code = 'A' * 100
        event = TutorialEvents.objects.create(
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
        event = TutorialEvents.objects.create(
            code='TUT-VENUE-001',
            venue=venue,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertEqual(len(event.venue), 255)

    def test_is_soldout_default_value(self):
        """Test is_soldout defaults to False."""
        event = TutorialEvents.objects.create(
            code='TUT-DEFAULT-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertFalse(event.is_soldout)

    def test_remain_space_default_value(self):
        """Test remain_space defaults to 0."""
        event = TutorialEvents.objects.create(
            code='TUT-SPACE-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertEqual(event.remain_space, 0)

    def test_finalisation_date_optional(self):
        """Test finalisation_date is optional (null=True, blank=True)."""
        event = TutorialEvents.objects.create(
            code='TUT-FINALISATION-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertIsNone(event.finalisation_date)

    def test_foreign_key_relationship_to_essp_variation(self):
        """Test ForeignKey relationship with ExamSessionSubjectProductVariation."""
        event = TutorialEvents.objects.create(
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
        event = TutorialEvents.objects.create(
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
        self.assertFalse(TutorialEvents.objects.filter(id=event_id).exists())

    def test_subject_code_property(self):
        """Test subject_code property returns correct subject code."""
        event = TutorialEvents.objects.create(
            code='TUT-PROPERTY-001',
            venue='Test Venue',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        self.assertEqual(event.subject_code, 'CM2')

    def test_str_method_formatting(self):
        """Test __str__ method returns code and venue."""
        event = TutorialEvents.objects.create(
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
        event = TutorialEvents.objects.create(
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
            TutorialEvents.objects.create(
                code='TUT-NO-START-001',
                venue='Test Venue',
                end_date=date.today() + timedelta(days=32),
                store_product=self.store_product
            )

    def test_end_date_required(self):
        """Test end_date is a required field."""
        with self.assertRaises(Exception):  # IntegrityError or ValidationError
            TutorialEvents.objects.create(
                code='TUT-NO-END-001',
                venue='Test Venue',
                start_date=date.today() + timedelta(days=30),
                store_product=self.store_product
            )

    def test_ordering_by_start_date_and_code(self):
        """Test default ordering is by start_date, then code."""
        # Create three events with different dates
        event1 = TutorialEvents.objects.create(
            code='TUT-A-001',
            venue='Venue 1',
            start_date=date.today() + timedelta(days=40),
            end_date=date.today() + timedelta(days=42),
            store_product=self.store_product
        )

        event2 = TutorialEvents.objects.create(
            code='TUT-B-001',
            venue='Venue 2',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        event3 = TutorialEvents.objects.create(
            code='TUT-A-002',
            venue='Venue 3',
            start_date=date.today() + timedelta(days=30),  # Same date as event2
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        # Query all - should be ordered by start_date, then code
        events = list(TutorialEvents.objects.all())
        self.assertEqual(events[0].id, event3.id)  # Earliest date, code 'A'
        self.assertEqual(events[1].id, event2.id)  # Earliest date, code 'B'
        self.assertEqual(events[2].id, event1.id)  # Later date

    def test_db_table_name(self):
        """Test custom database table name."""
        self.assertEqual(
            TutorialEvents._meta.db_table,
            '"acted"."tutorial_events"'
        )

    def test_verbose_name(self):
        """Test model verbose name is set correctly."""
        self.assertEqual(
            TutorialEvents._meta.verbose_name,
            'Tutorial Event'
        )

    def test_verbose_name_plural(self):
        """Test model verbose name plural is set correctly."""
        self.assertEqual(
            TutorialEvents._meta.verbose_name_plural,
            'Tutorial Events'
        )

    def test_auto_timestamp_fields(self):
        """Test created_at and updated_at are automatically set."""
        event = TutorialEvents.objects.create(
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

        event = TutorialEvents.objects.create(
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
        event1 = TutorialEvents.objects.create(
            code='TUT-QUERY-001',
            venue='Venue 1',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        event2 = TutorialEvents.objects.create(
            code='TUT-QUERY-002',
            venue='Venue 2',
            start_date=date.today() + timedelta(days=35),
            end_date=date.today() + timedelta(days=37),
            store_product=self.store_product
        )

        # Query by ESSP variation
        events = TutorialEvents.objects.filter(
            store_product=self.store_product
        )

        self.assertEqual(events.count(), 2)
        self.assertIn(event1, events)
        self.assertIn(event2, events)

    def test_query_by_date_range(self):
        """Test querying tutorial events by date range."""
        event1 = TutorialEvents.objects.create(
            code='TUT-DATE-RANGE-001',
            venue='Venue 1',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        event2 = TutorialEvents.objects.create(
            code='TUT-DATE-RANGE-002',
            venue='Venue 2',
            start_date=date.today() + timedelta(days=60),
            end_date=date.today() + timedelta(days=62),
            store_product=self.store_product
        )

        # Query events starting within 45 days
        cutoff_date = date.today() + timedelta(days=45)
        events = TutorialEvents.objects.filter(start_date__lte=cutoff_date)

        self.assertIn(event1, events)
        self.assertNotIn(event2, events)

    def test_query_available_events(self):
        """Test querying available (not soldout) tutorial events."""
        available_event = TutorialEvents.objects.create(
            code='TUT-AVAILABLE-001',
            venue='Venue 1',
            is_soldout=False,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        soldout_event = TutorialEvents.objects.create(
            code='TUT-SOLDOUT-001',
            venue='Venue 2',
            is_soldout=True,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        # Query available events
        available_events = TutorialEvents.objects.filter(is_soldout=False)

        self.assertIn(available_event, available_events)
        self.assertNotIn(soldout_event, available_events)


class TutorialSessionsModelTest(TestCase):
    """Test cases for TutorialSessions model (US2)."""

    def setUp(self):
        """Set up test fixtures."""
        from tutorials.models import TutorialEvents, TutorialSessions
        from store.models import Product as StoreProduct
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product, ProductProductVariation, ProductVariation
        )

        self.exam_session = ExamSession.objects.create(
            session_code='TS_JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        self.subject = Subject.objects.create(
            code='TS_CM2',
            description='Financial Engineering',
            active=True
        )
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )
        self.product = Product.objects.create(
            code='TS_TUT001',
            fullname='Tutorial - London',
            shortname='Tutorial London'
        )
        self.product_variation = ProductVariation.objects.create(
            code='TS_WKD',
            name='Weekend Tutorial',
            description='Weekend intensive tutorial',
            description_short='Weekend',
            variation_type='Tutorial'
        )
        self.product_product_variation = ProductProductVariation.objects.create(
            product=self.product,
            product_variation=self.product_variation
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.product_product_variation,
            product_code='TS_CM2/TWKDTUT001/JUNE2025'
        )
        self.event = TutorialEvents.objects.create(
            code='TS-TUT-CM2-001',
            venue='London Convention Center',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

    def test_session_creation_with_all_required_fields(self):
        """T012: Verify TutorialSessions can be created with all required fields."""
        from tutorials.models import TutorialSessions

        session = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1 - Introduction',
            location='London',
            venue='Camden Court Hotel',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
        )

        self.assertEqual(session.title, 'Day 1 - Introduction')
        self.assertEqual(session.location, 'London')
        self.assertEqual(session.venue, 'Camden Court Hotel')
        self.assertEqual(session.sequence, 1)
        self.assertIsNone(session.url)
        self.assertIsNotNone(session.created_at)
        self.assertIsNotNone(session.updated_at)

    def test_fk_relationship_sessions_ordered_by_sequence(self):
        """T013: Verify event.sessions.all() returns related sessions ordered by sequence."""
        from tutorials.models import TutorialSessions

        # Create sessions in reverse order
        session3 = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 3 - Advanced',
            location='London',
            venue='Camden Court Hotel',
            start_date=timezone.now() + timedelta(days=32),
            end_date=timezone.now() + timedelta(days=32, hours=8),
            sequence=3,
        )
        session1 = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1 - Introduction',
            location='London',
            venue='Camden Court Hotel',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
        )
        session2 = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 2 - Intermediate',
            location='London',
            venue='Camden Court Hotel',
            start_date=timezone.now() + timedelta(days=31),
            end_date=timezone.now() + timedelta(days=31, hours=8),
            sequence=2,
        )

        sessions = list(self.event.sessions.all())
        self.assertEqual(len(sessions), 3)
        self.assertEqual(sessions[0].sequence, 1)
        self.assertEqual(sessions[1].sequence, 2)
        self.assertEqual(sessions[2].sequence, 3)

    def test_cascade_delete_event_deletes_sessions(self):
        """T014: Verify deleting TutorialEvent deletes related sessions."""
        from tutorials.models import TutorialSessions

        session = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1',
            location='London',
            venue='Hotel',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
        )
        session_id = session.id

        self.event.delete()

        self.assertFalse(TutorialSessions.objects.filter(id=session_id).exists())

    def test_date_validation_start_after_end_raises_error(self):
        """T015: Verify start_date > end_date raises ValidationError."""
        from tutorials.models import TutorialSessions
        from django.core.exceptions import ValidationError

        session = TutorialSessions(
            tutorial_event=self.event,
            title='Invalid Session',
            location='London',
            venue='Hotel',
            start_date=timezone.now() + timedelta(days=31),  # start AFTER end
            end_date=timezone.now() + timedelta(days=30),
            sequence=1,
        )

        with self.assertRaises(ValidationError):
            session.full_clean()

    def test_unique_constraint_event_sequence(self):
        """T016: Verify duplicate (tutorial_event, sequence) raises IntegrityError."""
        from tutorials.models import TutorialSessions
        from django.db import IntegrityError

        TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1 - First',
            location='London',
            venue='Hotel',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
        )

        with self.assertRaises(IntegrityError):
            TutorialSessions.objects.create(
                tutorial_event=self.event,
                title='Day 1 - Duplicate',
                location='Dublin',
                venue='Other Hotel',
                start_date=timezone.now() + timedelta(days=30),
                end_date=timezone.now() + timedelta(days=30, hours=8),
                sequence=1,  # Same sequence!
            )

    def test_optional_field_url_none(self):
        """T017: Verify session creation succeeds with url=None."""
        from tutorials.models import TutorialSessions

        session = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1 - No URL',
            location='London',
            venue='Hotel',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
            url=None,
        )

        self.assertIsNone(session.url)
        self.assertEqual(session.title, 'Day 1 - No URL')

    def test_str_method(self):
        """Verify __str__ returns expected format."""
        from tutorials.models import TutorialSessions

        session = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1 - Introduction',
            location='London',
            venue='Hotel',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
        )

        self.assertEqual(str(session), 'Day 1 - Introduction (Seq 1)')

    def test_db_table_name(self):
        """Verify db_table references tutorial_sessions table.

        Note: The SQLite test runner strips schema prefixes at runtime,
        so we check that the table name contains 'tutorial_sessions'
        rather than checking the exact schema-qualified name.
        """
        from tutorials.models import TutorialSessions
        self.assertIn(
            'tutorial_sessions',
            TutorialSessions._meta.db_table,
        )

    def test_ordering_by_sequence(self):
        """Verify default ordering is by sequence."""
        from tutorials.models import TutorialSessions
        self.assertEqual(
            TutorialSessions._meta.ordering,
            ['sequence']
        )
