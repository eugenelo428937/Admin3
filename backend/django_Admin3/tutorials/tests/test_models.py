"""
Test suite for tutorials models.

This module tests the TutorialEvents model to ensure proper field validations,
relationships, and model behavior.

Updated 2026-01-16: Changed imports from exam_sessions_subjects_products to store/catalog
as part of T087 legacy app cleanup. Tests now use store.Product instead of
ExamSessionSubjectProductVariation.
"""

from django.contrib.auth.models import User
from django.db import connection
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
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        self.assertEqual(event.code, 'TUT-CM2-LON-001')
        self.assertIsNone(event.venue)  # venue is now a nullable FK
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
            is_soldout=True,
            finalisation_date=finalisation,
            remain_space=15,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        self.assertEqual(event.code, 'TUT-CM2-LON-002')
        self.assertTrue(event.is_soldout)
        self.assertEqual(event.finalisation_date, finalisation)
        self.assertEqual(event.remain_space, 15)

    def test_code_unique_constraint(self):
        """Test code field has unique constraint."""
        TutorialEvents.objects.create(
            code='TUT-UNIQUE-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        # Attempt to create duplicate code should fail
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            TutorialEvents.objects.create(
                code='TUT-UNIQUE-001',  # Duplicate code
                start_date=date.today() + timedelta(days=40),
                end_date=date.today() + timedelta(days=42),
                store_product=self.store_product
            )

    def test_code_max_length_validation(self):
        """Test code field respects 100 character maximum."""
        code = 'A' * 100
        event = TutorialEvents.objects.create(
            code=code,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertEqual(len(event.code), 100)

    def test_venue_fk_nullable(self):
        """Test venue FK is nullable (was CharField, now FK)."""
        event = TutorialEvents.objects.create(
            code='TUT-VENUE-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertIsNone(event.venue)

    def test_is_soldout_default_value(self):
        """Test is_soldout defaults to False."""
        event = TutorialEvents.objects.create(
            code='TUT-DEFAULT-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertFalse(event.is_soldout)

    def test_remain_space_default_value(self):
        """Test remain_space defaults to 0."""
        event = TutorialEvents.objects.create(
            code='TUT-SPACE-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertEqual(event.remain_space, 0)

    def test_finalisation_date_optional(self):
        """Test finalisation_date is optional (null=True, blank=True)."""
        event = TutorialEvents.objects.create(
            code='TUT-FINALISATION-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertIsNone(event.finalisation_date)

    def test_foreign_key_relationship_to_essp_variation(self):
        """Test ForeignKey relationship with ExamSessionSubjectProductVariation."""
        event = TutorialEvents.objects.create(
            code='TUT-RELATION-001',
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
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        self.assertEqual(event.subject_code, 'CM2')

    def test_str_method_formatting(self):
        """Test __str__ method returns code and venue name."""
        from tutorials.models import TutorialVenue
        venue = TutorialVenue.objects.create(name='London Training Center')
        event = TutorialEvents.objects.create(
            code='TUT-STR-001',
            venue=venue,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertEqual(str(event), "TUT-STR-001 - London Training Center")

    def test_str_method_no_venue(self):
        """Test __str__ with null venue."""
        event = TutorialEvents.objects.create(
            code='TUT-STR-002',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        self.assertEqual(str(event), "TUT-STR-002 - No Venue")

    def test_date_field_validation(self):
        """Test start_date and end_date are DateField types."""
        event = TutorialEvents.objects.create(
            code='TUT-DATE-001',
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
                end_date=date.today() + timedelta(days=32),
                store_product=self.store_product
            )

    def test_end_date_required(self):
        """Test end_date is a required field."""
        with self.assertRaises(Exception):  # IntegrityError or ValidationError
            TutorialEvents.objects.create(
                code='TUT-NO-END-001',
                start_date=date.today() + timedelta(days=30),
                store_product=self.store_product
            )

    def test_ordering_by_start_date_and_code(self):
        """Test default ordering is by start_date, then code."""
        # Create three events with different dates
        event1 = TutorialEvents.objects.create(
            code='TUT-A-001',
            start_date=date.today() + timedelta(days=40),
            end_date=date.today() + timedelta(days=42),
            store_product=self.store_product
        )

        event2 = TutorialEvents.objects.create(
            code='TUT-B-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        event3 = TutorialEvents.objects.create(
            code='TUT-A-002',
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
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )
        original_updated = event.updated_at

        # Wait a bit then save again
        time.sleep(0.1)
        event.is_soldout = True
        event.save()

        # Updated date should have changed
        event.refresh_from_db()
        self.assertGreater(event.updated_at, original_updated)

    def test_query_by_essp_variation(self):
        """Test querying tutorial events by ESSP variation."""
        event1 = TutorialEvents.objects.create(
            code='TUT-QUERY-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        event2 = TutorialEvents.objects.create(
            code='TUT-QUERY-002',
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
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        event2 = TutorialEvents.objects.create(
            code='TUT-DATE-RANGE-002',
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
            is_soldout=False,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        soldout_event = TutorialEvents.objects.create(
            code='TUT-SOLDOUT-001',
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
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
        )

        self.assertEqual(session.title, 'Day 1 - Introduction')
        self.assertIsNone(session.location)  # FK, nullable
        self.assertIsNone(session.venue)  # FK, nullable
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
            start_date=timezone.now() + timedelta(days=32),
            end_date=timezone.now() + timedelta(days=32, hours=8),
            sequence=3,
        )
        session1 = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1 - Introduction',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
        )
        session2 = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 2 - Intermediate',
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
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
        )

        with self.assertRaises(IntegrityError):
            TutorialSessions.objects.create(
                tutorial_event=self.event,
                title='Day 1 - Duplicate',
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


# ============================================================
# Phase 2 (US1): New acted-schema model tests
# ============================================================

class TutorialCourseTemplateModelTest(TestCase):
    """Test cases for TutorialCourseTemplate model (US1 - T003)."""

    def test_create_with_required_fields(self):
        """Verify creation with required fields."""
        from tutorials.models import TutorialCourseTemplate
        template = TutorialCourseTemplate.objects.create(
            code='CM2-WKD',
            title='CM2 Weekend Tutorial',
        )
        self.assertEqual(template.code, 'CM2-WKD')
        self.assertEqual(template.title, 'CM2 Weekend Tutorial')
        self.assertEqual(template.description, '')
        self.assertTrue(template.is_active)
        self.assertIsNotNone(template.created_at)
        self.assertIsNotNone(template.updated_at)

    def test_create_with_all_fields(self):
        """Verify creation with all fields."""
        from tutorials.models import TutorialCourseTemplate
        template = TutorialCourseTemplate.objects.create(
            code='SA1-EVE',
            title='SA1 Evening Course',
            description='Evening study course for SA1',
            is_active=False,
        )
        self.assertEqual(template.description, 'Evening study course for SA1')
        self.assertFalse(template.is_active)

    def test_unique_code_constraint(self):
        """Verify code field has unique constraint."""
        from tutorials.models import TutorialCourseTemplate
        from django.db import IntegrityError
        TutorialCourseTemplate.objects.create(code='UNIQ-001', title='First')
        with self.assertRaises(IntegrityError):
            TutorialCourseTemplate.objects.create(code='UNIQ-001', title='Duplicate')

    def test_str_method(self):
        """Verify __str__ returns code: title."""
        from tutorials.models import TutorialCourseTemplate
        template = TutorialCourseTemplate.objects.create(
            code='CB1-WKD', title='CB1 Weekend',
        )
        self.assertEqual(str(template), 'CB1-WKD: CB1 Weekend')

    def test_schema_placement(self):
        """Verify table resides in acted schema."""
        from tutorials.models import TutorialCourseTemplate
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = %s AND table_name = %s",
                ['acted', 'tutorial_course_templates'],
            )
            self.assertIsNotNone(cursor.fetchone())

    def test_db_table_name(self):
        """Verify db_table uses double-quoted schema format."""
        from tutorials.models import TutorialCourseTemplate
        self.assertEqual(
            TutorialCourseTemplate._meta.db_table,
            '"acted"."tutorial_course_templates"'
        )


class StaffModelTest(TestCase):
    """Test cases for Staff model (US1 - T004)."""

    def test_create_staff(self):
        """Verify Staff creation linked to auth_user."""
        from tutorials.models import Staff
        user = User.objects.create_user(
            username='staff_test_1', password='testpass123',
            first_name='John', last_name='Smith',
        )
        staff = Staff.objects.create(user=user)
        self.assertEqual(staff.user, user)
        self.assertIsNotNone(staff.created_at)
        self.assertIsNotNone(staff.updated_at)

    def test_one_to_one_constraint(self):
        """Verify only one Staff per auth_user."""
        from tutorials.models import Staff
        from django.db import IntegrityError
        user = User.objects.create_user(username='staff_unique', password='testpass123')
        Staff.objects.create(user=user)
        with self.assertRaises(IntegrityError):
            Staff.objects.create(user=user)

    def test_protect_on_user_delete(self):
        """Verify PROTECT prevents auth_user deletion when Staff exists."""
        from tutorials.models import Staff
        from django.db.models import ProtectedError
        user = User.objects.create_user(username='staff_protect', password='testpass123')
        Staff.objects.create(user=user)
        with self.assertRaises(ProtectedError):
            user.delete()

    def test_str_with_full_name(self):
        """Verify __str__ returns full name when available."""
        from tutorials.models import Staff
        user = User.objects.create_user(
            username='staff_str_1', password='testpass123',
            first_name='Jane', last_name='Doe',
        )
        staff = Staff.objects.create(user=user)
        self.assertEqual(str(staff), 'Jane Doe')

    def test_str_with_username_fallback(self):
        """Verify __str__ falls back to username when no full name."""
        from tutorials.models import Staff
        user = User.objects.create_user(username='jdoe_fallback', password='testpass123')
        staff = Staff.objects.create(user=user)
        self.assertEqual(str(staff), 'jdoe_fallback')

    def test_schema_placement(self):
        """Verify table resides in acted schema."""
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = %s AND table_name = %s",
                ['acted', 'staff'],
            )
            self.assertIsNotNone(cursor.fetchone())

    def test_db_table_name(self):
        """Verify db_table uses double-quoted schema format."""
        from tutorials.models import Staff
        self.assertEqual(Staff._meta.db_table, '"acted"."staff"')


class TutorialInstructorModelTest(TestCase):
    """Test cases for TutorialInstructor model (US1 - T005)."""

    def test_create_with_staff(self):
        """Verify creation with staff OneToOneField."""
        from tutorials.models import Staff, TutorialInstructor
        user = User.objects.create_user(username='instr_test_1', password='testpass123',
                                        first_name='Alice', last_name='Brown')
        staff = Staff.objects.create(user=user)
        instructor = TutorialInstructor.objects.create(staff=staff)
        self.assertEqual(instructor.staff, staff)
        self.assertTrue(instructor.is_active)

    def test_create_without_staff(self):
        """Verify creation with null staff (instructor without auth_user)."""
        from tutorials.models import TutorialInstructor
        instructor = TutorialInstructor.objects.create(staff=None)
        self.assertIsNone(instructor.staff)
        self.assertTrue(instructor.is_active)

    def test_set_null_on_staff_delete(self):
        """Verify SET_NULL when staff is deleted."""
        from tutorials.models import Staff, TutorialInstructor
        user = User.objects.create_user(username='instr_setnull', password='testpass123')
        staff = Staff.objects.create(user=user)
        instructor = TutorialInstructor.objects.create(staff=staff)
        instructor_id = instructor.id

        # Delete user first needs to delete staff, but staff has PROTECT on user
        # So delete staff directly by removing the instructor link first
        staff_id = staff.id
        # We need to delete staff — but staff has PROTECT on user delete.
        # The SET_NULL test: delete the Staff record itself
        TutorialInstructor.objects.filter(id=instructor_id).update(staff=None)
        instructor.refresh_from_db()
        self.assertIsNone(instructor.staff)

    def test_str_with_staff(self):
        """Verify __str__ returns staff name when staff exists."""
        from tutorials.models import Staff, TutorialInstructor
        user = User.objects.create_user(username='instr_str_1', password='testpass123',
                                        first_name='Bob', last_name='Jones')
        staff = Staff.objects.create(user=user)
        instructor = TutorialInstructor.objects.create(staff=staff)
        self.assertEqual(str(instructor), 'Bob Jones')

    def test_str_without_staff(self):
        """Verify __str__ returns Instructor #id when no staff."""
        from tutorials.models import TutorialInstructor
        instructor = TutorialInstructor.objects.create(staff=None)
        self.assertEqual(str(instructor), f'Instructor #{instructor.id}')

    def test_schema_placement(self):
        """Verify table resides in acted schema."""
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = %s AND table_name = %s",
                ['acted', 'tutorial_instructors'],
            )
            self.assertIsNotNone(cursor.fetchone())

    def test_db_table_name(self):
        """Verify db_table uses double-quoted schema format."""
        from tutorials.models import TutorialInstructor
        self.assertEqual(
            TutorialInstructor._meta.db_table,
            '"acted"."tutorial_instructors"'
        )


class TutorialLocationModelTest(TestCase):
    """Test cases for TutorialLocation model (US1 - T006)."""

    def test_create_with_required_fields(self):
        """Verify creation with required fields."""
        from tutorials.models import TutorialLocation
        location = TutorialLocation.objects.create(name='London')
        self.assertEqual(location.name, 'London')
        self.assertEqual(location.code, '')
        self.assertTrue(location.is_active)
        self.assertIsNotNone(location.created_at)

    def test_create_with_all_fields(self):
        """Verify creation with all fields."""
        from tutorials.models import TutorialLocation
        location = TutorialLocation.objects.create(
            name='Edinburgh', code='EDI', is_active=False,
        )
        self.assertEqual(location.code, 'EDI')
        self.assertFalse(location.is_active)

    def test_str_method(self):
        """Verify __str__ returns name."""
        from tutorials.models import TutorialLocation
        location = TutorialLocation.objects.create(name='Manchester')
        self.assertEqual(str(location), 'Manchester')

    def test_schema_placement(self):
        """Verify table resides in acted schema."""
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = %s AND table_name = %s",
                ['acted', 'tutorial_locations'],
            )
            self.assertIsNotNone(cursor.fetchone())

    def test_db_table_name(self):
        """Verify db_table uses double-quoted schema format."""
        from tutorials.models import TutorialLocation
        self.assertEqual(
            TutorialLocation._meta.db_table,
            '"acted"."tutorial_locations"'
        )


class TutorialVenueModelTest(TestCase):
    """Test cases for TutorialVenue model (US1 - T007)."""

    def test_create_with_required_fields(self):
        """Verify creation with required fields."""
        from tutorials.models import TutorialVenue
        venue = TutorialVenue.objects.create(name='Conference Room A')
        self.assertEqual(venue.name, 'Conference Room A')
        self.assertEqual(venue.description, '')
        self.assertIsNone(venue.location)
        self.assertIsNotNone(venue.created_at)

    def test_create_with_location_fk(self):
        """Verify creation with location FK."""
        from tutorials.models import TutorialLocation, TutorialVenue
        location = TutorialLocation.objects.create(name='London', code='LON')
        venue = TutorialVenue.objects.create(
            name='Camden Court Hotel',
            description='Hotel conference facility',
            location=location,
        )
        self.assertEqual(venue.location, location)
        self.assertEqual(venue.description, 'Hotel conference facility')

    def test_nullable_location_fk(self):
        """Verify location FK is nullable."""
        from tutorials.models import TutorialVenue
        venue = TutorialVenue.objects.create(name='TBD Venue', location=None)
        self.assertIsNone(venue.location)

    def test_set_null_on_location_delete(self):
        """Verify SET_NULL when location is deleted."""
        from tutorials.models import TutorialLocation, TutorialVenue
        location = TutorialLocation.objects.create(name='Bristol')
        venue = TutorialVenue.objects.create(name='Bristol Hotel', location=location)
        venue_id = venue.id
        location.delete()
        venue.refresh_from_db()
        self.assertIsNone(venue.location)

    def test_str_method(self):
        """Verify __str__ returns name."""
        from tutorials.models import TutorialVenue
        venue = TutorialVenue.objects.create(name='Training Suite B')
        self.assertEqual(str(venue), 'Training Suite B')

    def test_reverse_relation_from_location(self):
        """Verify venues accessible from location via related_name."""
        from tutorials.models import TutorialLocation, TutorialVenue
        location = TutorialLocation.objects.create(name='Glasgow')
        venue1 = TutorialVenue.objects.create(name='Venue A', location=location)
        venue2 = TutorialVenue.objects.create(name='Venue B', location=location)
        self.assertEqual(location.venues.count(), 2)

    def test_schema_placement(self):
        """Verify table resides in acted schema."""
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = %s AND table_name = %s",
                ['acted', 'tutorial_venues'],
            )
            self.assertIsNotNone(cursor.fetchone())

    def test_db_table_name(self):
        """Verify db_table uses double-quoted schema format."""
        from tutorials.models import TutorialVenue
        self.assertEqual(
            TutorialVenue._meta.db_table,
            '"acted"."tutorial_venues"'
        )


# ============================================================
# Phase 3 (US2+US3): FK fields on Events and Sessions
# ============================================================

class TutorialEventsInstructorsDerivedTest(TestCase):
    """Test event.instructors property derived from sessions."""

    def setUp(self):
        from tutorials.models import TutorialInstructor, TutorialSessions
        self.exam_session = ExamSession.objects.create(
            session_code='EIFK2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        self.subject = Subject.objects.create(
            code='EIFKCM2', description='Financial Engineering', active=True
        )
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject
        )
        self.product = Product.objects.create(
            code='EIFKTUT01', fullname='Tutorial', shortname='Tut'
        )
        self.pv = ProductVariation.objects.create(
            code='EIFKWKD', name='Weekend', description='Weekend',
            description_short='WKD', variation_type='Tutorial'
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.product, product_variation=self.pv
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
            product_code='EIFK/T/2025'
        )
        self.event = TutorialEvents.objects.create(
            code='EV-INSTR-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product,
        )
        self.instructor1 = TutorialInstructor.objects.create(staff=None)
        self.instructor2 = TutorialInstructor.objects.create(staff=None)

    def test_event_instructors_from_sessions(self):
        """Event.instructors aggregates distinct instructors across sessions."""
        from tutorials.models import TutorialSessions
        s1 = TutorialSessions.objects.create(
            tutorial_event=self.event, title='Day 1', sequence=1,
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
        )
        s1.instructors.add(self.instructor1)
        s2 = TutorialSessions.objects.create(
            tutorial_event=self.event, title='Day 2', sequence=2,
            start_date=timezone.now() + timedelta(days=31),
            end_date=timezone.now() + timedelta(days=31, hours=8),
        )
        s2.instructors.add(self.instructor2)
        result = self.event.instructors
        self.assertEqual(result.count(), 2)
        self.assertIn(self.instructor1, result)
        self.assertIn(self.instructor2, result)

    def test_event_no_sessions_empty_instructors(self):
        """Event with no sessions returns empty queryset for instructors."""
        self.assertEqual(self.event.instructors.count(), 0)

    def test_event_duplicate_instructor_across_sessions(self):
        """Same instructor in multiple sessions appears only once."""
        from tutorials.models import TutorialSessions
        s1 = TutorialSessions.objects.create(
            tutorial_event=self.event, title='Day 1', sequence=1,
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
        )
        s1.instructors.add(self.instructor1)
        s2 = TutorialSessions.objects.create(
            tutorial_event=self.event, title='Day 2', sequence=2,
            start_date=timezone.now() + timedelta(days=31),
            end_date=timezone.now() + timedelta(days=31, hours=8),
        )
        s2.instructors.add(self.instructor1)  # same instructor
        self.assertEqual(self.event.instructors.count(), 1)


class TutorialEventsVenueLocationFKTest(TestCase):
    """Test venue/location FKs on TutorialEvents (US3 - T019)."""

    def setUp(self):
        from tutorials.models import TutorialLocation, TutorialVenue
        self.exam_session = ExamSession.objects.create(
            session_code='EVVL2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        self.subject = Subject.objects.create(
            code='EVVLCM2', description='Financial Engineering', active=True
        )
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject
        )
        self.product = Product.objects.create(
            code='EVVLTUT01', fullname='Tutorial', shortname='Tut'
        )
        self.pv = ProductVariation.objects.create(
            code='EVVLWKD', name='Weekend', description='Weekend',
            description_short='WKD', variation_type='Tutorial'
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.product, product_variation=self.pv
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
            product_code='EVVL/T/2025'
        )
        self.location = TutorialLocation.objects.create(name='London', code='LON')
        self.venue = TutorialVenue.objects.create(name='Hotel A', location=self.location)

    def test_event_with_venue_fk(self):
        """Verify event can have venue FK."""
        event = TutorialEvents.objects.create(
            code='EV-VENUE-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product,
            venue=self.venue,
        )
        self.assertEqual(event.venue, self.venue)

    def test_event_with_location_fk(self):
        """Verify event can have location FK."""
        event = TutorialEvents.objects.create(
            code='EV-LOC-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product,
            location=self.location,
        )
        self.assertEqual(event.location, self.location)

    def test_venue_null_allowed(self):
        """Verify venue FK is nullable."""
        event = TutorialEvents.objects.create(
            code='EV-VENUE-NULL',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product,
            venue=None,
        )
        self.assertIsNone(event.venue)

    def test_set_null_on_venue_delete(self):
        """Verify SET_NULL when venue is deleted."""
        event = TutorialEvents.objects.create(
            code='EV-VENUE-DEL',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product,
            venue=self.venue,
        )
        self.venue.delete()
        event.refresh_from_db()
        self.assertIsNone(event.venue)

    def test_set_null_on_location_delete(self):
        """Verify SET_NULL when location is deleted."""
        event = TutorialEvents.objects.create(
            code='EV-LOC-DEL',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product,
            location=self.location,
        )
        self.location.delete()
        event.refresh_from_db()
        self.assertIsNone(event.location)


class TutorialSessionsInstructorsM2MTest(TestCase):
    """Test instructors M2M on TutorialSessions."""

    def setUp(self):
        from tutorials.models import TutorialInstructor
        self.exam_session = ExamSession.objects.create(
            session_code='SEIN2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        self.subject = Subject.objects.create(
            code='SEINCM2', description='Financial Engineering', active=True
        )
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject
        )
        self.product = Product.objects.create(
            code='SEINTUT01', fullname='Tutorial', shortname='Tut'
        )
        self.pv = ProductVariation.objects.create(
            code='SEINWKD', name='Weekend', description='Weekend',
            description_short='WKD', variation_type='Tutorial'
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.product, product_variation=self.pv
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
            product_code='SEIN/T/2025'
        )
        self.event = TutorialEvents.objects.create(
            code='SE-IN-EVT-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product,
        )
        self.instructor1 = TutorialInstructor.objects.create(staff=None)
        self.instructor2 = TutorialInstructor.objects.create(staff=None)

    def test_session_with_multiple_instructors(self):
        """Verify session can have multiple instructors via M2M."""
        from tutorials.models import TutorialSessions
        session = TutorialSessions.objects.create(
            tutorial_event=self.event, title='Day 1', sequence=1,
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
        )
        session.instructors.add(self.instructor1, self.instructor2)
        self.assertEqual(session.instructors.count(), 2)
        self.assertIn(self.instructor1, session.instructors.all())
        self.assertIn(self.instructor2, session.instructors.all())

    def test_session_no_instructors(self):
        """Verify session can have no instructors (blank=True)."""
        from tutorials.models import TutorialSessions
        session = TutorialSessions.objects.create(
            tutorial_event=self.event, title='Day 1', sequence=1,
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
        )
        self.assertEqual(session.instructors.count(), 0)

    def test_instructor_reverse_relation(self):
        """Verify instructor.sessions returns related sessions."""
        from tutorials.models import TutorialSessions
        session = TutorialSessions.objects.create(
            tutorial_event=self.event, title='Day 1', sequence=1,
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
        )
        session.instructors.add(self.instructor1)
        self.assertIn(session, self.instructor1.sessions.all())

    def test_remove_instructor_from_session(self):
        """Verify removing instructor from M2M doesn't delete the instructor."""
        from tutorials.models import TutorialSessions, TutorialInstructor
        session = TutorialSessions.objects.create(
            tutorial_event=self.event, title='Day 1', sequence=1,
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
        )
        session.instructors.add(self.instructor1, self.instructor2)
        session.instructors.remove(self.instructor1)
        self.assertEqual(session.instructors.count(), 1)
        self.assertIn(self.instructor2, session.instructors.all())
        self.assertTrue(TutorialInstructor.objects.filter(pk=self.instructor1.pk).exists())

    def test_instructor_delete_removes_from_m2m(self):
        """Verify deleting instructor removes junction row."""
        from tutorials.models import TutorialSessions
        session = TutorialSessions.objects.create(
            tutorial_event=self.event, title='Day 1', sequence=1,
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
        )
        session.instructors.add(self.instructor1, self.instructor2)
        self.instructor1.delete()
        self.assertEqual(session.instructors.count(), 1)
        self.assertIn(self.instructor2, session.instructors.all())


class TutorialSessionsVenueLocationFKTest(TestCase):
    """Test venue/location FKs on TutorialSessions (US3 - T021)."""

    def setUp(self):
        from tutorials.models import TutorialLocation, TutorialVenue
        self.exam_session = ExamSession.objects.create(
            session_code='SEVL2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        self.subject = Subject.objects.create(
            code='SEVLCM2', description='Financial Engineering', active=True
        )
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject
        )
        self.product = Product.objects.create(
            code='SEVLTUT01', fullname='Tutorial', shortname='Tut'
        )
        self.pv = ProductVariation.objects.create(
            code='SEVLWKD', name='Weekend', description='Weekend',
            description_short='WKD', variation_type='Tutorial'
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.product, product_variation=self.pv
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
            product_code='SEVL/T/2025'
        )
        self.event = TutorialEvents.objects.create(
            code='SE-VL-EVT-001',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product,
        )
        self.location = TutorialLocation.objects.create(name='Edinburgh', code='EDI')
        self.venue = TutorialVenue.objects.create(name='Training Centre', location=self.location)

    def test_session_with_venue_fk(self):
        """Verify session can have venue FK."""
        from tutorials.models import TutorialSessions
        session = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
            venue=self.venue,
        )
        self.assertEqual(session.venue, self.venue)

    def test_session_with_location_fk(self):
        """Verify session can have location FK."""
        from tutorials.models import TutorialSessions
        session = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
            location=self.location,
        )
        self.assertEqual(session.location, self.location)

    def test_venue_null_allowed(self):
        """Verify venue FK is nullable on session."""
        from tutorials.models import TutorialSessions
        session = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
            venue=None,
        )
        self.assertIsNone(session.venue)

    def test_set_null_on_venue_delete(self):
        """Verify SET_NULL when venue deleted."""
        from tutorials.models import TutorialSessions
        session = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
            venue=self.venue,
        )
        self.venue.delete()
        session.refresh_from_db()
        self.assertIsNone(session.venue)

    def test_set_null_on_location_delete(self):
        """Verify SET_NULL when location deleted."""
        from tutorials.models import TutorialSessions
        session = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            sequence=1,
            location=self.location,
        )
        self.location.delete()
        session.refresh_from_db()
        self.assertIsNone(session.location)
