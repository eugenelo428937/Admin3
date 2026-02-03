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

    def test_str_method_exact_format(self):
        """Test __str__ returns exact format: '{name} ({store_product})'."""
        paper = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        expected = f"Paper1 ({self.store_product})"
        self.assertEqual(str(paper), expected)

    def test_str_method_includes_store_product_code(self):
        """Test __str__ includes the store product's product_code."""
        paper = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        str_representation = str(paper)
        # store.Product.__str__ returns product_code
        self.assertIn(self.store_product.product_code, str_representation)
        self.assertIn('(', str_representation)
        self.assertIn(')', str_representation)

    def test_str_method_with_none_store_product(self):
        """Test __str__ handles None store_product (nullable FK)."""
        paper = MarkingPaper.objects.create(
            store_product=None,
            name='OrphanP',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        str_representation = str(paper)
        self.assertEqual(str_representation, "OrphanP (None)")

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


class MarkingPaperBackwardCompatTestCase(TestCase):
    """Test cases for MarkingPaper backward-compatible properties."""

    def setUp(self):
        """Set up test fixtures including ESSP for backward compat property test."""
        from catalog.models import ExamSessionSubjectProduct

        # Create exam session
        self.exam_session = ExamSession.objects.create(
            session_code='DEC2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Create subject
        self.subject = Subject.objects.create(
            code='CS2',
            description='Risk Modelling',
            active=True
        )

        # Create exam session subject
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )

        # Create catalog product + variation chain
        self.cat_product = CatalogProduct.objects.create(
            code='BC01',
            fullname='Compat Product Full',
            shortname='Compat Product'
        )
        self.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Compat Marking'
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.cat_product, product_variation=self.variation
        )

        # Create store product
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.ppv
        )

        # Create ESSP that matches the store product's ESS + catalog product
        self.essp = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.cat_product
        )

        # Create marking paper
        self.paper = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='CompatP1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

    def test_exam_session_subject_product_property_returns_essp(self):
        """Test backward-compatible property returns matching ESSP record."""
        result = self.paper.exam_session_subject_product

        self.assertIsNotNone(result)
        self.assertEqual(result.id, self.essp.id)
        self.assertEqual(result.exam_session_subject, self.exam_session_subject)
        self.assertEqual(result.product, self.cat_product)

    def test_exam_session_subject_product_property_returns_none_when_no_essp(self):
        """Test backward-compatible property returns None when no ESSP exists."""
        # Create a different catalog product with no ESSP record
        cat_product2 = CatalogProduct.objects.create(
            code='BC02',
            fullname='No ESSP Product Full',
            shortname='No ESSP Product'
        )
        ppv2 = ProductProductVariation.objects.create(
            product=cat_product2, product_variation=self.variation
        )
        store_product2 = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=ppv2
        )
        paper2 = MarkingPaper.objects.create(
            store_product=store_product2,
            name='NoEsspP',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        result = paper2.exam_session_subject_product
        self.assertIsNone(result)


class MarkingModelsModuleTestCase(TestCase):
    """Test that the marking.models package is properly structured."""

    def test_models_package_exports_marking_paper(self):
        """Test that marking.models package exports MarkingPaper."""
        import marking.models as models_pkg
        self.assertTrue(hasattr(models_pkg, 'MarkingPaper'))
        self.assertIs(models_pkg.MarkingPaper, MarkingPaper)

    def test_models_package_resolves_to_package_init(self):
        """Test that marking.models resolves to the models/ package, not models.py."""
        import marking.models as models_pkg
        # The models/ package __init__.py should be what's loaded,
        # not the dead top-level models.py file
        self.assertTrue(models_pkg.__file__.endswith('__init__.py'))
