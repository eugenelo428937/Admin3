"""
Test fixtures for catalog API tests.

Provides factory functions to create consistent test data across all test files.
Uses Django ORM to create model instances in the test database.

Usage:
    from catalog.tests.fixtures import create_subject, create_product, CatalogTestDataMixin

    class MyTestCase(CatalogTestDataMixin, TestCase):
        def setUp(self):
            super().setUp()
            self.setup_catalog_test_data()
"""
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model

from catalog.models import (
    Subject,
    ExamSession,
    Product,
    ProductVariation,
    ProductProductVariation,
    ProductBundle,
    ProductBundleProduct,
)


# =============================================================================
# Factory Functions
# =============================================================================

def create_subject(code='CM2', description='Financial Mathematics', active=True, **kwargs):
    """Create a test Subject instance."""
    return Subject.objects.create(
        code=code,
        description=description,
        active=active,
        **kwargs
    )


def create_exam_session(session_code='2026-04', start_date=None, end_date=None, **kwargs):
    """Create a test ExamSession instance."""
    if start_date is None:
        start_date = timezone.now() + timedelta(days=30)
    if end_date is None:
        end_date = start_date + timedelta(days=14)

    return ExamSession.objects.create(
        session_code=session_code,
        start_date=start_date,
        end_date=end_date,
        **kwargs
    )


def create_product_variation(
    variation_type='eBook',
    name='Standard eBook',
    description='Digital eBook format for all devices',
    description_short='Digital format',
    code=None,
    **kwargs
):
    """Create a test ProductVariation instance."""
    if code is None:
        code = f'{variation_type}-{name}'.replace(' ', '-').upper()

    return ProductVariation.objects.create(
        variation_type=variation_type,
        name=name,
        description=description,
        description_short=description_short,
        code=code,
        **kwargs
    )


def create_product(
    fullname='CM2 Core Study Materials',
    shortname='CM2 Core',
    description='Comprehensive study materials for CM2',
    code='CM2-CSM',
    is_active=True,
    buy_both=False,
    **kwargs
):
    """Create a test Product instance."""
    return Product.objects.create(
        fullname=fullname,
        shortname=shortname,
        description=description,
        code=code,
        is_active=is_active,
        buy_both=buy_both,
        **kwargs
    )


def create_product_product_variation(product, product_variation, **kwargs):
    """Create a ProductProductVariation junction record.

    Note: ProductProductVariation does not have an is_active field.
    Active status is determined by the Product's is_active field.
    """
    return ProductProductVariation.objects.create(
        product=product,
        product_variation=product_variation,
        **kwargs
    )


def create_product_bundle(
    subject,
    bundle_name='Complete Materials Bundle',
    bundle_description='All materials for exam preparation',
    is_featured=False,
    is_active=True,
    display_order=0,
    **kwargs
):
    """Create a test ProductBundle instance."""
    return ProductBundle.objects.create(
        subject=subject,
        bundle_name=bundle_name,
        bundle_description=bundle_description,
        is_featured=is_featured,
        is_active=is_active,
        display_order=display_order,
        **kwargs
    )


def create_product_bundle_product(
    bundle,
    product_product_variation,
    default_price_type='standard',
    quantity=1,
    sort_order=1,
    is_active=True,
    **kwargs
):
    """Create a ProductBundleProduct junction record."""
    return ProductBundleProduct.objects.create(
        bundle=bundle,
        product_product_variation=product_product_variation,
        default_price_type=default_price_type,
        quantity=quantity,
        sort_order=sort_order,
        is_active=is_active,
        **kwargs
    )


def create_superuser(username='admin', email='admin@test.com', password='testpass123'):
    """Create a superuser for permission testing."""
    User = get_user_model()
    return User.objects.create_superuser(
        username=username,
        email=email,
        password=password
    )


def create_regular_user(username='user', email='user@test.com', password='testpass123'):
    """Create a regular (non-superuser) user for permission testing."""
    User = get_user_model()
    return User.objects.create_user(
        username=username,
        email=email,
        password=password
    )


# =============================================================================
# Test Data Mixin
# =============================================================================

class CatalogTestDataMixin:
    """
    Mixin that provides consistent test data setup for catalog tests.

    Provides:
    - 3 subjects (CM2, SA1, CB1)
    - 2 exam sessions (2026-04, 2026-09)
    - 3 product variations (eBook, Printed, Hub)
    - 3 products (Core Materials, Marking, Tutorial)
    - 1 product bundle with 2 products

    Usage:
        class MyTestCase(CatalogTestDataMixin, TestCase):
            def setUp(self):
                super().setUp()
                self.setup_catalog_test_data()

            def test_something(self):
                self.assertEqual(self.subject_cm2.code, 'CM2')
    """

    def setup_catalog_test_data(self):
        """Create standard test data for catalog tests."""
        # Subjects
        self.subject_cm2 = create_subject(
            code='CM2',
            description='Financial Mathematics'
        )
        self.subject_sa1 = create_subject(
            code='SA1',
            description='Health and Care'
        )
        self.subject_cb1 = create_subject(
            code='CB1',
            description='Business Finance',
            active=False  # Inactive subject for filtering tests
        )

        # Exam Sessions
        self.session_april = create_exam_session(
            session_code='2026-04',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=44)
        )
        self.session_sept = create_exam_session(
            session_code='2026-09',
            start_date=timezone.now() + timedelta(days=180),
            end_date=timezone.now() + timedelta(days=194)
        )

        # Product Variations
        self.variation_ebook = create_product_variation(
            variation_type='eBook',
            name='Standard eBook',
            code='VAR-EBOOK'
        )
        self.variation_printed = create_product_variation(
            variation_type='Printed',
            name='Printed Book',
            code='VAR-PRINTED'
        )
        self.variation_hub = create_product_variation(
            variation_type='Hub',
            name='Online Hub',
            code='VAR-HUB'
        )

        # Products
        self.product_core = create_product(
            fullname='CM2 Core Study Materials',
            shortname='CM2 Core',
            code='CM2-CSM',
            buy_both=True
        )
        self.product_marking = create_product(
            fullname='CM2 Marking Service',
            shortname='CM2 Marking',
            code='CM2-MARK'
        )
        self.product_tutorial = create_product(
            fullname='CM2 Tutorial Package',
            shortname='CM2 Tutorial',
            code='CM2-TUT'
        )
        self.product_inactive = create_product(
            fullname='Inactive Product',
            shortname='Inactive',
            code='INACT-001',
            is_active=False
        )

        # Product-Variation associations
        self.ppv_core_ebook = create_product_product_variation(
            self.product_core, self.variation_ebook
        )
        self.ppv_core_printed = create_product_product_variation(
            self.product_core, self.variation_printed
        )
        self.ppv_marking_hub = create_product_product_variation(
            self.product_marking, self.variation_hub
        )

        # Product Bundle
        self.bundle_cm2 = create_product_bundle(
            subject=self.subject_cm2,
            bundle_name='CM2 Complete Bundle',
            bundle_description='All materials for CM2 exam preparation',
            is_featured=True
        )

        # Bundle Products
        self.bundle_product_1 = create_product_bundle_product(
            bundle=self.bundle_cm2,
            product_product_variation=self.ppv_core_ebook,
            sort_order=1
        )
        self.bundle_product_2 = create_product_bundle_product(
            bundle=self.bundle_cm2,
            product_product_variation=self.ppv_marking_hub,
            sort_order=2
        )

    def setup_auth_users(self):
        """Create authentication users for permission testing."""
        self.superuser = create_superuser()
        self.regular_user = create_regular_user()
