"""Tests for store models.

TDD RED Phase: These tests are written FIRST and MUST FAIL initially
until models are implemented in the GREEN phase.

Tests cover:
- T015: store.Product model structure and FKs
- T016: store.Price model with price types
- T017: store.Bundle model
- T018: store.BundleProduct model
- T019: Product code generation
- T020: Unique constraints (ESS+PPV combination)
"""
from decimal import Decimal
from django.test import TestCase
from django.db import IntegrityError
from django.utils import timezone


class TestStoreModelImports(TestCase):
    """Test that all store models can be imported from store.models."""

    def test_import_product(self):
        """T015: Test Product model can be imported from store.models."""
        from store.models import Product
        self.assertTrue(hasattr(Product, '_meta'))
        self.assertEqual(Product._meta.db_table, '"acted"."products"')

    def test_import_price(self):
        """T016: Test Price model can be imported from store.models."""
        from store.models import Price
        self.assertTrue(hasattr(Price, '_meta'))
        self.assertEqual(Price._meta.db_table, '"acted"."prices"')

    def test_import_bundle(self):
        """T017: Test Bundle model can be imported from store.models."""
        from store.models import Bundle
        self.assertTrue(hasattr(Bundle, '_meta'))
        self.assertEqual(Bundle._meta.db_table, '"acted"."bundles"')

    def test_import_bundle_product(self):
        """T018: Test BundleProduct model can be imported from store.models."""
        from store.models import BundleProduct
        self.assertTrue(hasattr(BundleProduct, '_meta'))
        self.assertEqual(BundleProduct._meta.db_table, '"acted"."bundle_products"')

    def test_single_import_all_models(self):
        """Test all 4 store models can be imported in a single statement."""
        from store.models import Product, Price, Bundle, BundleProduct
        self.assertEqual(len([Product, Price, Bundle, BundleProduct]), 4)


class TestProductModel(TestCase):
    """T015: Test store.Product model fields and constraints."""

    def test_product_fields(self):
        """Test Product model has required fields."""
        from store.models import Product
        field_names = [f.name for f in Product._meta.get_fields()]
        self.assertIn('exam_session_subject', field_names)
        self.assertIn('product_product_variation', field_names)
        self.assertIn('product_code', field_names)
        self.assertIn('is_active', field_names)
        self.assertIn('created_at', field_names)
        self.assertIn('updated_at', field_names)

    def test_product_exam_session_subject_fk(self):
        """Test Product has FK to catalog.ExamSessionSubject."""
        from store.models import Product
        from catalog.models import ExamSessionSubject
        ess_field = Product._meta.get_field('exam_session_subject')
        self.assertEqual(ess_field.related_model, ExamSessionSubject)

    def test_product_ppv_fk(self):
        """Test Product has FK to catalog.ProductProductVariation."""
        from store.models import Product
        from catalog.models import ProductProductVariation
        ppv_field = Product._meta.get_field('product_product_variation')
        self.assertEqual(ppv_field.related_model, ProductProductVariation)

    def test_product_code_unique(self):
        """Test Product product_code field has unique constraint."""
        from store.models import Product
        code_field = Product._meta.get_field('product_code')
        self.assertTrue(code_field.unique)

    def test_product_unique_together(self):
        """T020: Test Product has unique_together (ESS+PPV) constraint."""
        from store.models import Product
        constraints = Product._meta.unique_together
        self.assertIn(('exam_session_subject', 'product_product_variation'), constraints)


class TestProductModelCreation(TestCase):
    """Test store.Product model instance creation and behavior."""

    @classmethod
    def setUpTestData(cls):
        """Create test data for product tests."""
        from catalog.models import Subject, ExamSession, ExamSessionSubject
        from catalog.models import Product as CatalogProduct, ProductVariation, ProductProductVariation

        # Create subject
        cls.subject = Subject.objects.create(
            code='CM2',
            description='Actuarial Mathematics',
            active=True
        )

        # Create exam session
        cls.exam_session = ExamSession.objects.create(
            session_code='2025-04',
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=90)
        )

        # Create exam session subject
        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.exam_session,
            subject=cls.subject,
            is_active=True
        )

        # Create catalog product template
        cls.catalog_product = CatalogProduct.objects.create(
            fullname='Core Study Material CM2',
            shortname='CSM CM2',
            code='CSM01',
            is_active=True
        )

        # Create product variation
        cls.variation = ProductVariation.objects.create(
            variation_type='Printed',
            name='Printed',
            code='P'
        )

        # Create PPV (junction between Product and ProductVariation)
        cls.ppv = ProductProductVariation.objects.create(
            product=cls.catalog_product,
            product_variation=cls.variation
        )

    def test_create_product(self):
        """Test creating a store Product."""
        from store.models import Product

        product = Product.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
            product_code='CM2/PCSM01P/2025-04',
            is_active=True
        )

        self.assertEqual(product.exam_session_subject, self.ess)
        self.assertEqual(product.product_product_variation, self.ppv)
        self.assertEqual(product.product_code, 'CM2/PCSM01P/2025-04')
        self.assertTrue(product.is_active)

    def test_product_str_method(self):
        """Test Product __str__ method returns product_code."""
        from store.models import Product

        product = Product.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
            product_code='CM2/PCSM01P/2025-04',
            is_active=True
        )

        self.assertEqual(str(product), 'CM2/PCSM01P/2025-04')

    def test_product_unique_constraint_violation(self):
        """T020: Test that duplicate ESS+PPV combination raises IntegrityError."""
        from store.models import Product

        # Create first product
        Product.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
            product_code='CM2/PCSM01P/2025-04',
            is_active=True
        )

        # Attempt to create duplicate should raise IntegrityError
        with self.assertRaises(IntegrityError):
            Product.objects.create(
                exam_session_subject=self.ess,
                product_product_variation=self.ppv,
                product_code='CM2/PCSM01P/2025-04-DUPE',  # Different code
                is_active=True
            )


class TestPriceModel(TestCase):
    """T016: Test store.Price model fields and constraints."""

    def test_price_fields(self):
        """Test Price model has required fields."""
        from store.models import Price
        field_names = [f.name for f in Price._meta.get_fields()]
        self.assertIn('product', field_names)
        self.assertIn('price_type', field_names)
        self.assertIn('amount', field_names)
        self.assertIn('currency', field_names)
        self.assertIn('created_at', field_names)
        self.assertIn('updated_at', field_names)

    def test_price_product_fk(self):
        """Test Price has FK to store.Product."""
        from store.models import Price, Product
        product_field = Price._meta.get_field('product')
        self.assertEqual(product_field.related_model, Product)

    def test_price_type_choices(self):
        """Test Price price_type has correct choices."""
        from store.models import Price
        price_type_field = Price._meta.get_field('price_type')
        choices = [c[0] for c in price_type_field.choices]
        self.assertIn('standard', choices)
        self.assertIn('retaker', choices)
        self.assertIn('reduced', choices)
        self.assertIn('additional', choices)

    def test_price_unique_together(self):
        """Test Price has unique_together (product+price_type) constraint."""
        from store.models import Price
        constraints = Price._meta.unique_together
        self.assertIn(('product', 'price_type'), constraints)


class TestBundleModel(TestCase):
    """T017: Test store.Bundle model fields and constraints."""

    def test_bundle_fields(self):
        """Test Bundle model has required fields."""
        from store.models import Bundle
        field_names = [f.name for f in Bundle._meta.get_fields()]
        self.assertIn('bundle_template', field_names)
        self.assertIn('exam_session_subject', field_names)
        self.assertIn('is_active', field_names)
        self.assertIn('override_name', field_names)
        self.assertIn('override_description', field_names)
        self.assertIn('display_order', field_names)
        self.assertIn('created_at', field_names)
        self.assertIn('updated_at', field_names)

    def test_bundle_bundle_template_fk(self):
        """Test Bundle has FK to catalog.ProductBundle."""
        from store.models import Bundle
        from catalog.models import ProductBundle
        template_field = Bundle._meta.get_field('bundle_template')
        self.assertEqual(template_field.related_model, ProductBundle)

    def test_bundle_ess_fk(self):
        """Test Bundle has FK to catalog.ExamSessionSubject."""
        from store.models import Bundle
        from catalog.models import ExamSessionSubject
        ess_field = Bundle._meta.get_field('exam_session_subject')
        self.assertEqual(ess_field.related_model, ExamSessionSubject)

    def test_bundle_unique_together(self):
        """Test Bundle has unique_together (template+ESS) constraint."""
        from store.models import Bundle
        constraints = Bundle._meta.unique_together
        self.assertIn(('bundle_template', 'exam_session_subject'), constraints)


class TestBundleProductModel(TestCase):
    """T018: Test store.BundleProduct model fields and constraints."""

    def test_bundle_product_fields(self):
        """Test BundleProduct model has required fields."""
        from store.models import BundleProduct
        field_names = [f.name for f in BundleProduct._meta.get_fields()]
        self.assertIn('bundle', field_names)
        self.assertIn('product', field_names)
        self.assertIn('default_price_type', field_names)
        self.assertIn('quantity', field_names)
        self.assertIn('sort_order', field_names)
        self.assertIn('is_active', field_names)
        self.assertIn('created_at', field_names)
        self.assertIn('updated_at', field_names)

    def test_bundle_product_bundle_fk(self):
        """Test BundleProduct has FK to store.Bundle."""
        from store.models import BundleProduct, Bundle
        bundle_field = BundleProduct._meta.get_field('bundle')
        self.assertEqual(bundle_field.related_model, Bundle)

    def test_bundle_product_product_fk(self):
        """Test BundleProduct has FK to store.Product."""
        from store.models import BundleProduct, Product
        product_field = BundleProduct._meta.get_field('product')
        self.assertEqual(product_field.related_model, Product)

    def test_bundle_product_unique_together(self):
        """Test BundleProduct has unique_together (bundle+product) constraint."""
        from store.models import BundleProduct
        constraints = BundleProduct._meta.unique_together
        self.assertIn(('bundle', 'product'), constraints)


class TestProductCodeGeneration(TestCase):
    """T019: Test product code generation."""

    @classmethod
    def setUpTestData(cls):
        """Create test data for product code tests."""
        from catalog.models import Subject, ExamSession, ExamSessionSubject
        from catalog.models import Product as CatalogProduct, ProductVariation, ProductProductVariation

        cls.subject = Subject.objects.create(
            code='SA1',
            description='Specialist Applications 1',
            active=True
        )

        cls.exam_session = ExamSession.objects.create(
            session_code='2025S1',
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=90)
        )

        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.exam_session,
            subject=cls.subject,
            is_active=True
        )

        cls.catalog_product = CatalogProduct.objects.create(
            fullname='Core Study Material SA1',
            shortname='CSM SA1',
            code='CSM01',
            is_active=True
        )

        cls.variation = ProductVariation.objects.create(
            variation_type='Printed',
            name='Printed Material',
            code='P'
        )

        cls.ppv = ProductProductVariation.objects.create(
            product=cls.catalog_product,
            product_variation=cls.variation
        )

    def test_product_code_format(self):
        """T019: Test product code follows format: {subject_code}/{prefix}{product_code}{variation_code}/{exam_session_code}."""
        from store.models import Product

        # Create product without explicit product_code to test generation
        product = Product.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
            is_active=True
        )

        # Expected format: SA1/PCSM01P/2025S1
        # Note: Exact format depends on implementation
        self.assertIsNotNone(product.product_code)
        self.assertIn(self.subject.code, product.product_code)
