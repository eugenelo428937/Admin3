"""
Test suite for marking models.

This module tests the MarkingPaper model to ensure proper field validations,
relationships, and model behavior.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from marking.models import MarkingPaper
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from catalog.models import ExamSession, ExamSessionSubject
from subjects.models import Subject
from products.models.products import Product


class MarkingPaperTestCase(TestCase):
    """Test cases for MarkingPaper model."""

    def setUp(self):
        """Set up test fixtures - create exam session, subject, product, and ESSP."""
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

        # Create product (using correct field names)
        self.product = Product.objects.create(
            code='PROD001',
            fullname='Test Product Full Name',
            shortname='Test Product'
        )

        # Create ExamSessionSubjectProduct
        self.essp = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.product
        )

    def test_marking_paper_creation_with_required_fields(self):
        """Test MarkingPaper creation with all required fields."""
        deadline = timezone.now() + timedelta(days=45)
        recommended_date = timezone.now() + timedelta(days=40)

        paper = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=deadline,
            recommended_submit_date=recommended_date
        )

        self.assertEqual(paper.exam_session_subject_product, self.essp)
        self.assertEqual(paper.name, 'Paper1')
        self.assertEqual(paper.deadline, deadline)
        self.assertEqual(paper.recommended_submit_date, recommended_date)

    def test_name_max_length_validation(self):
        """Test name field respects 10 character maximum."""
        deadline = timezone.now() + timedelta(days=45)
        recommended_date = timezone.now() + timedelta(days=40)

        name = 'A' * 10
        paper = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name=name,
            deadline=deadline,
            recommended_submit_date=recommended_date
        )
        self.assertEqual(len(paper.name), 10)

    def test_foreign_key_relationship_to_essp(self):
        """Test ForeignKey relationship with ExamSessionSubjectProduct."""
        deadline = timezone.now() + timedelta(days=45)
        recommended_date = timezone.now() + timedelta(days=40)

        paper = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=deadline,
            recommended_submit_date=recommended_date
        )

        # Access ESSP from paper
        self.assertEqual(paper.exam_session_subject_product, self.essp)

        # Access papers from ESSP (reverse relationship)
        papers = self.essp.marking_papers.all()
        self.assertEqual(papers.count(), 1)
        self.assertEqual(papers.first(), paper)

    def test_cascade_delete_essp(self):
        """Test cascading delete - deleting ESSP deletes marking papers."""
        paper = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )
        paper_id = paper.id

        # Delete the ESSP
        self.essp.delete()

        # MarkingPaper should also be deleted
        with self.assertRaises(MarkingPaper.DoesNotExist):
            MarkingPaper.objects.get(id=paper_id)

    def test_deadline_required(self):
        """Test deadline is a required field."""
        with self.assertRaises(Exception):
            # Missing deadline should raise error
            MarkingPaper.objects.create(
                exam_session_subject_product=self.essp,
                name='Paper1',
                recommended_submit_date=timezone.now() + timedelta(days=40)
            )

    def test_recommended_submit_date_required(self):
        """Test recommended_submit_date is a required field."""
        with self.assertRaises(Exception):
            # Missing recommended_submit_date should raise error
            MarkingPaper.objects.create(
                exam_session_subject_product=self.essp,
                name='Paper1',
                deadline=timezone.now() + timedelta(days=45)
            )

    def test_str_method_formatting(self):
        """Test __str__ method returns name and ESSP."""
        paper = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        str_representation = str(paper)

        # Should contain paper name
        self.assertIn('Paper1', str_representation)

        # Should contain ESSP string representation
        # (format depends on ExamSessionSubjectProduct __str__)

    def test_db_table_name(self):
        """Test custom database table name."""
        self.assertEqual(
            MarkingPaper._meta.db_table,
            'acted_marking_paper'
        )

    def test_multiple_papers_for_same_essp(self):
        """Test creating multiple marking papers for same ESSP."""
        paper1 = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        paper2 = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper2',
            deadline=timezone.now() + timedelta(days=50),
            recommended_submit_date=timezone.now() + timedelta(days=45)
        )

        # Both papers should exist
        papers = MarkingPaper.objects.filter(exam_session_subject_product=self.essp)
        self.assertEqual(papers.count(), 2)

    def test_deadline_date_validation(self):
        """Test deadline date can be set to future dates."""
        future_deadline = timezone.now() + timedelta(days=90)

        paper = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=future_deadline,
            recommended_submit_date=timezone.now() + timedelta(days=80)
        )

        self.assertGreater(paper.deadline, timezone.now())

    def test_recommended_date_before_deadline(self):
        """Test recommended_submit_date can be before deadline."""
        deadline = timezone.now() + timedelta(days=45)
        recommended_date = timezone.now() + timedelta(days=40)

        paper = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=deadline,
            recommended_submit_date=recommended_date
        )

        # Recommended date should be before deadline (logical)
        self.assertLess(paper.recommended_submit_date, paper.deadline)

    def test_recommended_date_after_deadline_warning(self):
        """Test recommended_submit_date can be after deadline (illogical but allowed)."""
        deadline = timezone.now() + timedelta(days=40)
        recommended_date = timezone.now() + timedelta(days=45)  # After deadline

        # Model allows this but should ideally have validation
        paper = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=deadline,
            recommended_submit_date=recommended_date
        )

        # Verify the illogical dates were stored
        self.assertGreater(paper.recommended_submit_date, paper.deadline)
        # Note: This documents that model-level validation is missing

    def test_query_by_essp(self):
        """Test querying marking papers by ESSP."""
        paper1 = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        # Query by ESSP
        papers = MarkingPaper.objects.filter(exam_session_subject_product=self.essp)
        self.assertEqual(papers.count(), 1)
        self.assertEqual(papers.first(), paper1)

    def test_query_by_deadline_range(self):
        """Test querying marking papers by deadline range."""
        paper1 = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        paper2 = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper2',
            deadline=timezone.now() + timedelta(days=90),
            recommended_submit_date=timezone.now() + timedelta(days=85)
        )

        # Query papers with deadline within next 60 days
        threshold = timezone.now() + timedelta(days=60)
        near_deadline_papers = MarkingPaper.objects.filter(deadline__lt=threshold)

        self.assertEqual(near_deadline_papers.count(), 1)
        self.assertEqual(near_deadline_papers.first(), paper1)

    def test_date_timezone_awareness(self):
        """Test deadline and recommended_submit_date are timezone-aware."""
        paper = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        # Dates should be timezone-aware
        self.assertIsNotNone(paper.deadline.tzinfo)
        self.assertIsNotNone(paper.recommended_submit_date.tzinfo)

    def test_name_field_uniqueness_not_enforced(self):
        """Test name field has no unique constraint (duplicates allowed)."""
        # Create two papers with same name
        paper1 = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        paper2 = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp,
            name='Paper1',  # Duplicate name
            deadline=timezone.now() + timedelta(days=50),
            recommended_submit_date=timezone.now() + timedelta(days=45)
        )

        # Both should exist
        self.assertEqual(MarkingPaper.objects.filter(name='Paper1').count(), 2)
