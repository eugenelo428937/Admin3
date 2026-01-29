"""
Test suite for marking models.

This module tests the MarkingPaper model to ensure proper field validations,
relationships, and model behavior.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from marking.models import MarkingPaper
from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatalogProduct, ProductVariation, ProductProductVariation
)
from store.models import Product as StoreProduct


class MarkingPaperTestCase(TestCase):
    """Test cases for MarkingPaper model."""

    def setUp(self):
        """Set up test fixtures - create store product."""
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

        # Create catalog product + variation chain for store.Product
        self.cat_product = CatalogProduct.objects.create(
            code='PROD001',
            fullname='Test Product Full Name',
            shortname='Test Product'
        )
        self.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Standard Marking'
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.cat_product, product_variation=self.variation
        )

        # Create store product (replaces old ESSP)
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.ppv
        )

    def test_marking_paper_creation_with_required_fields(self):
        """Test MarkingPaper creation with all required fields."""
        deadline = timezone.now() + timedelta(days=45)
        recommended_date = timezone.now() + timedelta(days=40)

        paper = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=deadline,
            recommended_submit_date=recommended_date
        )

        self.assertEqual(paper.store_product, self.store_product)
        self.assertEqual(paper.name, 'Paper1')
        self.assertEqual(paper.deadline, deadline)
        self.assertEqual(paper.recommended_submit_date, recommended_date)

    def test_name_max_length_validation(self):
        """Test name field respects 10 character maximum."""
        deadline = timezone.now() + timedelta(days=45)
        recommended_date = timezone.now() + timedelta(days=40)

        name = 'A' * 10
        paper = MarkingPaper.objects.create(
            store_product=self.store_product,
            name=name,
            deadline=deadline,
            recommended_submit_date=recommended_date
        )
        self.assertEqual(len(paper.name), 10)

    def test_foreign_key_relationship_to_store_product(self):
        """Test ForeignKey relationship with store.Product."""
        deadline = timezone.now() + timedelta(days=45)
        recommended_date = timezone.now() + timedelta(days=40)

        paper = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=deadline,
            recommended_submit_date=recommended_date
        )

        # Access store product from paper
        self.assertEqual(paper.store_product, self.store_product)

        # Access papers from store product (reverse relationship)
        papers = self.store_product.marking_papers.all()
        self.assertEqual(papers.count(), 1)
        self.assertEqual(papers.first(), paper)

    def test_cascade_delete_store_product(self):
        """Test cascading delete - deleting store product deletes marking papers."""
        paper = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )
        paper_id = paper.id

        # Delete the store product
        self.store_product.delete()

        # MarkingPaper should also be deleted
        with self.assertRaises(MarkingPaper.DoesNotExist):
            MarkingPaper.objects.get(id=paper_id)

    def test_deadline_required(self):
        """Test deadline is a required field."""
        with self.assertRaises(Exception):
            MarkingPaper.objects.create(
                store_product=self.store_product,
                name='Paper1',
                recommended_submit_date=timezone.now() + timedelta(days=40)
            )

    def test_recommended_submit_date_required(self):
        """Test recommended_submit_date is a required field."""
        with self.assertRaises(Exception):
            MarkingPaper.objects.create(
                store_product=self.store_product,
                name='Paper1',
                deadline=timezone.now() + timedelta(days=45)
            )

    def test_str_method_formatting(self):
        """Test __str__ method returns name and store product."""
        paper = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        str_representation = str(paper)
        self.assertIn('Paper1', str_representation)

    def test_db_table_name(self):
        """Test custom database table name."""
        self.assertEqual(
            MarkingPaper._meta.db_table,
            '"acted"."marking_paper"'
        )

    def test_multiple_papers_for_same_store_product(self):
        """Test creating multiple marking papers for same store product."""
        paper1 = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        paper2 = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper2',
            deadline=timezone.now() + timedelta(days=50),
            recommended_submit_date=timezone.now() + timedelta(days=45)
        )

        papers = MarkingPaper.objects.filter(store_product=self.store_product)
        self.assertEqual(papers.count(), 2)

    def test_deadline_date_validation(self):
        """Test deadline date can be set to future dates."""
        future_deadline = timezone.now() + timedelta(days=90)

        paper = MarkingPaper.objects.create(
            store_product=self.store_product,
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
            store_product=self.store_product,
            name='Paper1',
            deadline=deadline,
            recommended_submit_date=recommended_date
        )

        self.assertLess(paper.recommended_submit_date, paper.deadline)

    def test_recommended_date_after_deadline_warning(self):
        """Test recommended_submit_date can be after deadline (illogical but allowed)."""
        deadline = timezone.now() + timedelta(days=40)
        recommended_date = timezone.now() + timedelta(days=45)

        paper = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=deadline,
            recommended_submit_date=recommended_date
        )

        self.assertGreater(paper.recommended_submit_date, paper.deadline)

    def test_query_by_store_product(self):
        """Test querying marking papers by store product."""
        paper1 = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        papers = MarkingPaper.objects.filter(store_product=self.store_product)
        self.assertEqual(papers.count(), 1)
        self.assertEqual(papers.first(), paper1)

    def test_query_by_deadline_range(self):
        """Test querying marking papers by deadline range."""
        paper1 = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        paper2 = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper2',
            deadline=timezone.now() + timedelta(days=90),
            recommended_submit_date=timezone.now() + timedelta(days=85)
        )

        threshold = timezone.now() + timedelta(days=60)
        near_deadline_papers = MarkingPaper.objects.filter(deadline__lt=threshold)

        self.assertEqual(near_deadline_papers.count(), 1)
        self.assertEqual(near_deadline_papers.first(), paper1)

    def test_date_timezone_awareness(self):
        """Test deadline and recommended_submit_date are timezone-aware."""
        paper = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        self.assertIsNotNone(paper.deadline.tzinfo)
        self.assertIsNotNone(paper.recommended_submit_date.tzinfo)

    def test_name_field_uniqueness_not_enforced(self):
        """Test name field has no unique constraint (duplicates allowed)."""
        paper1 = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        paper2 = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=50),
            recommended_submit_date=timezone.now() + timedelta(days=45)
        )

        self.assertEqual(MarkingPaper.objects.filter(name='Paper1').count(), 2)
