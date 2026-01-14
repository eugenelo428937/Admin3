"""
Test suite for exam_sessions models.

This module tests the ExamSession model to ensure proper field validations,
date constraints, and model behavior.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from exam_sessions.models import ExamSession


class ExamSessionTestCase(TestCase):
    """Test cases for ExamSession model."""

    def test_exam_session_creation_with_required_fields(self):
        """Test ExamSession creation with all required fields."""
        start = timezone.now() + timedelta(days=30)
        end = timezone.now() + timedelta(days=60)

        session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=start,
            end_date=end
        )

        self.assertEqual(session.session_code, 'JUNE2025')
        self.assertEqual(session.start_date, start)
        self.assertEqual(session.end_date, end)
        self.assertIsNotNone(session.create_date)
        self.assertIsNotNone(session.modified_date)

    def test_session_code_max_length_validation(self):
        """Test session_code field respects 50 character maximum."""
        code = 'A' * 50
        session = ExamSession.objects.create(
            session_code=code,
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        self.assertEqual(len(session.session_code), 50)

    def test_start_date_required(self):
        """Test start_date is a required field."""
        with self.assertRaises(Exception):
            # Missing start_date should raise error
            ExamSession.objects.create(
                session_code='TEST2025',
                end_date=timezone.now() + timedelta(days=60)
            )

    def test_end_date_required(self):
        """Test end_date is a required field."""
        with self.assertRaises(Exception):
            # Missing end_date should raise error
            ExamSession.objects.create(
                session_code='TEST2025',
                start_date=timezone.now() + timedelta(days=30)
            )

    def test_auto_timestamp_fields(self):
        """Test create_date and modified_date are automatically set."""
        session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        self.assertIsNotNone(session.create_date)
        self.assertIsNotNone(session.modified_date)

        # Created and modified dates should be approximately equal initially
        time_diff = session.modified_date - session.create_date
        self.assertLess(time_diff.total_seconds(), 1)

    def test_modified_date_updates_on_save(self):
        """Test modified_date updates when session is saved."""
        import time

        session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        original_modified = session.modified_date

        # Wait a bit then update
        time.sleep(0.1)
        session.session_code = 'JUNE2025_UPDATED'
        session.save()

        # Modified date should have changed
        session.refresh_from_db()
        self.assertGreater(session.modified_date, original_modified)

    def test_str_method_formatting(self):
        """Test __str__ method returns session_code and date range."""
        start = timezone.now() + timedelta(days=30)
        end = timezone.now() + timedelta(days=60)

        session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=start,
            end_date=end
        )

        str_representation = str(session)

        # Should contain session_code
        self.assertIn('JUNE2025', str_representation)

        # Should contain start and end dates (formatted)
        # Format from model: f"{self.session_code} ({self.start_date} - {self.end_date})"
        self.assertIn(str(start), str_representation)
        self.assertIn(str(end), str_representation)

    def test_verbose_name(self):
        """Test model verbose name is set correctly."""
        self.assertEqual(
            ExamSession._meta.verbose_name,
            'Exam Session'
        )

    def test_verbose_name_plural(self):
        """Test model verbose name plural is set correctly."""
        self.assertEqual(
            ExamSession._meta.verbose_name_plural,
            'Exam Sessions'
        )

    def test_db_table_name(self):
        """Test custom database table name (migrated to catalog app)."""
        self.assertEqual(
            ExamSession._meta.db_table,
            '"acted"."catalog_exam_sessions"'
        )

    def test_query_by_session_code(self):
        """Test querying exam sessions by session_code."""
        session1 = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        session2 = ExamSession.objects.create(
            session_code='DEC2025',
            start_date=timezone.now() + timedelta(days=180),
            end_date=timezone.now() + timedelta(days=210)
        )

        # Query by session_code
        june_sessions = ExamSession.objects.filter(session_code='JUNE2025')
        self.assertEqual(june_sessions.count(), 1)
        self.assertEqual(june_sessions.first(), session1)

    def test_query_by_date_range(self):
        """Test querying exam sessions by date range."""
        # Create sessions in different date ranges
        session1 = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        session2 = ExamSession.objects.create(
            session_code='DEC2025',
            start_date=timezone.now() + timedelta(days=180),
            end_date=timezone.now() + timedelta(days=210)
        )

        # Query sessions starting after a certain date
        future_threshold = timezone.now() + timedelta(days=100)
        future_sessions = ExamSession.objects.filter(start_date__gte=future_threshold)
        self.assertEqual(future_sessions.count(), 1)
        self.assertEqual(future_sessions.first(), session2)

    def test_date_range_logic(self):
        """Test sessions with valid start_date < end_date."""
        start = timezone.now() + timedelta(days=30)
        end = timezone.now() + timedelta(days=60)

        session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=start,
            end_date=end
        )

        # Verify start_date is before end_date
        self.assertLess(session.start_date, session.end_date)

    def test_date_range_validation_same_dates(self):
        """Test session with start_date == end_date is allowed (single-day exam)."""
        same_date = timezone.now() + timedelta(days=30)

        session = ExamSession.objects.create(
            session_code='SINGLEDAY2025',
            start_date=same_date,
            end_date=same_date
        )

        self.assertEqual(session.start_date, session.end_date)

    def test_date_range_warning_end_before_start(self):
        """Test session with end_date < start_date (should be prevented in validation)."""
        start = timezone.now() + timedelta(days=60)
        end = timezone.now() + timedelta(days=30)  # End before start

        # Model allows this at database level but should be validated at form/API level
        session = ExamSession.objects.create(
            session_code='INVALID2025',
            start_date=start,
            end_date=end
        )

        # Verify the illogical dates were stored (shows need for validation)
        self.assertGreater(session.start_date, session.end_date)

        # Note: This test documents that model-level validation is missing
        # API/form validation should prevent this

    def test_multiple_exam_sessions_creation(self):
        """Test creating multiple exam session records."""
        session1 = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        session2 = ExamSession.objects.create(
            session_code='DEC2025',
            start_date=timezone.now() + timedelta(days=180),
            end_date=timezone.now() + timedelta(days=210)
        )
        session3 = ExamSession.objects.create(
            session_code='JUNE2026',
            start_date=timezone.now() + timedelta(days=395),
            end_date=timezone.now() + timedelta(days=425)
        )

        self.assertEqual(ExamSession.objects.count(), 3)

    def test_session_code_not_unique_constraint(self):
        """Test session_code has no unique constraint (can have duplicates)."""
        # Create two sessions with same code (should be allowed)
        session1 = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        session2 = ExamSession.objects.create(
            session_code='JUNE2025',  # Duplicate code
            start_date=timezone.now() + timedelta(days=365),
            end_date=timezone.now() + timedelta(days=395)
        )

        # Both should exist
        self.assertEqual(ExamSession.objects.filter(session_code='JUNE2025').count(), 2)

    def test_date_timezone_awareness(self):
        """Test start_date and end_date are timezone-aware."""
        session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Dates should be timezone-aware
        self.assertIsNotNone(session.start_date.tzinfo)
        self.assertIsNotNone(session.end_date.tzinfo)

    def test_session_duration_calculation(self):
        """Test calculating session duration from start_date and end_date."""
        # Use a fixed base time to avoid microsecond differences
        base_time = timezone.now()
        start = base_time + timedelta(days=30)
        end = base_time + timedelta(days=60)

        session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=start,
            end_date=end
        )

        # Calculate duration
        duration = session.end_date - session.start_date
        expected_duration = timedelta(days=30)

        self.assertEqual(duration, expected_duration)

    def test_past_exam_session(self):
        """Test creating exam session with dates in the past."""
        past_start = timezone.now() - timedelta(days=60)
        past_end = timezone.now() - timedelta(days=30)

        session = ExamSession.objects.create(
            session_code='PAST2024',
            start_date=past_start,
            end_date=past_end
        )

        # Should be allowed (no validation prevents past dates)
        self.assertLess(session.end_date, timezone.now())

    def test_future_exam_session(self):
        """Test creating exam session with future dates."""
        future_start = timezone.now() + timedelta(days=365)
        future_end = timezone.now() + timedelta(days=395)

        session = ExamSession.objects.create(
            session_code='FUTURE2026',
            start_date=future_start,
            end_date=future_end
        )

        # Should be allowed
        self.assertGreater(session.start_date, timezone.now())
