"""
Test suite for exam_sessions_subjects models.

This module tests the ExamSessionSubject model to ensure proper relationships,
unique constraints, and model behavior.
"""

from django.test import TestCase
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta

from exam_sessions.models import ExamSession
from subjects.models import Subject
from exam_sessions_subjects.models import ExamSessionSubject


class ExamSessionSubjectTestCase(TestCase):
    """Test cases for ExamSessionSubject model."""

    def setUp(self):
        """Set up test fixtures - create exam sessions and subjects."""
        # Create exam sessions
        self.session_june_2025 = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        self.session_dec_2025 = ExamSession.objects.create(
            session_code='DEC2025',
            start_date=timezone.now() + timedelta(days=180),
            end_date=timezone.now() + timedelta(days=210)
        )

        # Create subjects
        self.subject_cm2 = Subject.objects.create(
            code='CM2',
            description='Financial Engineering and Loss Reserving',
            active=True
        )

        self.subject_sa1 = Subject.objects.create(
            code='SA1',
            description='Actuarial Statistics',
            active=True
        )

    def test_exam_session_subject_creation_with_required_fields(self):
        """Test ExamSessionSubject creation with required fields."""
        exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )

        self.assertEqual(exam_session_subject.exam_session, self.session_june_2025)
        self.assertEqual(exam_session_subject.subject, self.subject_cm2)
        self.assertIsNotNone(exam_session_subject.created_at)
        self.assertIsNotNone(exam_session_subject.updated_at)

    def test_exam_session_foreign_key_relationship(self):
        """Test ForeignKey relationship with ExamSession."""
        exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )

        # Access exam session from exam_session_subject
        self.assertEqual(exam_session_subject.exam_session.session_code, 'JUNE2025')

        # Access exam_session_subjects from exam session (reverse relationship)
        session_subjects = self.session_june_2025.examsessionsubject_set.all()
        self.assertEqual(session_subjects.count(), 1)
        self.assertEqual(session_subjects.first(), exam_session_subject)

    def test_subject_foreign_key_relationship(self):
        """Test ForeignKey relationship with Subject."""
        exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )

        # Access subject from exam_session_subject
        self.assertEqual(exam_session_subject.subject.code, 'CM2')

        # Access exam_session_subjects from subject (reverse relationship)
        subject_sessions = self.subject_cm2.examsessionsubject_set.all()
        self.assertEqual(subject_sessions.count(), 1)
        self.assertEqual(subject_sessions.first(), exam_session_subject)

    def test_unique_together_constraint(self):
        """Test unique_together constraint on (exam_session, subject)."""
        # Create first exam_session_subject
        ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )

        # Attempt to create duplicate should fail
        with self.assertRaises(IntegrityError):
            ExamSessionSubject.objects.create(
                exam_session=self.session_june_2025,
                subject=self.subject_cm2
            )

    def test_same_subject_different_sessions_allowed(self):
        """Test same subject can be linked to different exam sessions."""
        # Link CM2 to June 2025
        ess1 = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )

        # Link CM2 to Dec 2025 (should be allowed)
        ess2 = ExamSessionSubject.objects.create(
            exam_session=self.session_dec_2025,
            subject=self.subject_cm2
        )

        self.assertEqual(ExamSessionSubject.objects.filter(subject=self.subject_cm2).count(), 2)

    def test_same_session_different_subjects_allowed(self):
        """Test same exam session can have multiple subjects."""
        # Link CM2 to June 2025
        ess1 = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )

        # Link SA1 to June 2025 (should be allowed)
        ess2 = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_sa1
        )

        self.assertEqual(ExamSessionSubject.objects.filter(exam_session=self.session_june_2025).count(), 2)

    def test_cascade_delete_exam_session(self):
        """Test cascading delete - deleting exam_session deletes exam_session_subjects."""
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )
        ess_id = ess.id

        # Delete the exam session
        self.session_june_2025.delete()

        # ExamSessionSubject should also be deleted
        with self.assertRaises(ExamSessionSubject.DoesNotExist):
            ExamSessionSubject.objects.get(id=ess_id)

    def test_cascade_delete_subject(self):
        """Test cascading delete - deleting subject deletes exam_session_subjects."""
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )
        ess_id = ess.id

        # Delete the subject
        self.subject_cm2.delete()

        # ExamSessionSubject should also be deleted
        with self.assertRaises(ExamSessionSubject.DoesNotExist):
            ExamSessionSubject.objects.get(id=ess_id)

    def test_auto_timestamp_fields(self):
        """Test created_at and updated_at are automatically set."""
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )

        self.assertIsNotNone(ess.created_at)
        self.assertIsNotNone(ess.updated_at)

        # Created and updated dates should be approximately equal initially
        time_diff = ess.updated_at - ess.created_at
        self.assertLess(time_diff.total_seconds(), 1)

    def test_updated_at_changes_on_save(self):
        """Test updated_at changes when record is saved."""
        import time

        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )
        original_updated = ess.updated_at

        # Wait a bit then save again
        time.sleep(0.1)
        ess.save()

        # Updated date should have changed
        ess.refresh_from_db()
        self.assertGreater(ess.updated_at, original_updated)

    def test_str_method_formatting(self):
        """Test __str__ method returns session_code and subject code."""
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )

        expected = "JUNE2025 - CM2"
        self.assertEqual(str(ess), expected)

    def test_verbose_name(self):
        """Test model verbose name is set correctly."""
        self.assertEqual(
            ExamSessionSubject._meta.verbose_name,
            'Exam Session Subject'
        )

    def test_verbose_name_plural(self):
        """Test model verbose name plural is set correctly."""
        self.assertEqual(
            ExamSessionSubject._meta.verbose_name_plural,
            'Exam Session Subjects'
        )

    def test_db_table_name(self):
        """Test custom database table name."""
        self.assertEqual(
            ExamSessionSubject._meta.db_table,
            'acted_exam_session_subjects'
        )

    def test_query_exam_session_subjects_by_session(self):
        """Test querying exam_session_subjects by exam session."""
        # Create multiple exam_session_subjects for June 2025
        ess1 = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )
        ess2 = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_sa1
        )

        # Create one for Dec 2025
        ess3 = ExamSessionSubject.objects.create(
            exam_session=self.session_dec_2025,
            subject=self.subject_cm2
        )

        # Query by session
        june_subjects = ExamSessionSubject.objects.filter(exam_session=self.session_june_2025)
        self.assertEqual(june_subjects.count(), 2)

        dec_subjects = ExamSessionSubject.objects.filter(exam_session=self.session_dec_2025)
        self.assertEqual(dec_subjects.count(), 1)

    def test_query_exam_session_subjects_by_subject(self):
        """Test querying exam_session_subjects by subject."""
        # Link CM2 to multiple sessions
        ess1 = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )
        ess2 = ExamSessionSubject.objects.create(
            exam_session=self.session_dec_2025,
            subject=self.subject_cm2
        )

        # Link SA1 to one session
        ess3 = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_sa1
        )

        # Query by subject
        cm2_sessions = ExamSessionSubject.objects.filter(subject=self.subject_cm2)
        self.assertEqual(cm2_sessions.count(), 2)

        sa1_sessions = ExamSessionSubject.objects.filter(subject=self.subject_sa1)
        self.assertEqual(sa1_sessions.count(), 1)

    def test_products_many_to_many_field_exists(self):
        """Test products ManyToMany field is defined."""
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )

        # products field should exist (via through table)
        self.assertTrue(hasattr(ess, 'products'))

        # Should return a ManyRelatedManager
        self.assertTrue(hasattr(ess.products, 'all'))

    def test_multiple_exam_session_subjects_creation(self):
        """Test creating multiple exam_session_subject records."""
        ess1 = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_cm2
        )
        ess2 = ExamSessionSubject.objects.create(
            exam_session=self.session_june_2025,
            subject=self.subject_sa1
        )
        ess3 = ExamSessionSubject.objects.create(
            exam_session=self.session_dec_2025,
            subject=self.subject_cm2
        )

        self.assertEqual(ExamSessionSubject.objects.count(), 3)
