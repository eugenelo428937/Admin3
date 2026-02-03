"""Test factories for search-related models.

Provides reusable factory functions for creating store.Product,
store.Bundle, store.BundleProduct, and their catalog dependencies
in tests.

Usage::

    from search.tests.factories import (
        create_store_product,
        create_bundle_with_products,
        create_catalog_dependencies,
    )

    # Create catalog prerequisites
    deps = create_catalog_dependencies('CM2', '2025-04')

    # Create a store product
    product = create_store_product(
        deps['exam_session_subject'],
        deps['product'],
        deps['printed_variation'],
    )

    # Create a bundle with products
    bundle = create_bundle_with_products(
        deps['exam_session_subject'],
        [product],
    )
"""
from catalog.subject.models import Subject
from catalog.exam_session.models import ExamSession
from catalog.models import ExamSessionSubject
from catalog.products.models import Product as CatalogProduct
from catalog.products.models import ProductVariation, ProductProductVariation
from catalog.products.bundle.models import ProductBundle
from store.models import Product as StoreProduct, Bundle, BundleProduct
from filtering.models import FilterGroup
from filtering.tests.factories import create_filter_group


def create_subject(code='CM2', **kwargs):
    """Create a catalog Subject."""
    defaults = {
        'code': code,
        'description': f'Subject {code}',
        'active': True,
    }
    defaults.update(kwargs)
    return Subject.objects.create(**defaults)


def create_exam_session(session_code='2025-04', **kwargs):
    """Create a catalog ExamSession."""
    from django.utils import timezone
    now = timezone.now()
    defaults = {
        'session_code': session_code,
        'start_date': now,
        'end_date': now + timezone.timedelta(days=90),
    }
    defaults.update(kwargs)
    return ExamSession.objects.create(**defaults)


def create_exam_session_subject(exam_session, subject, **kwargs):
    """Create a catalog ExamSessionSubject."""
    defaults = {
        'exam_session': exam_session,
        'subject': subject,
        'is_active': True,
    }
    defaults.update(kwargs)
    return ExamSessionSubject.objects.create(**defaults)


def create_catalog_product(fullname, shortname, code, **kwargs):
    """Create a catalog Product (master template)."""
    defaults = {
        'fullname': fullname,
        'shortname': shortname,
        'code': code,
        'is_active': True,
    }
    defaults.update(kwargs)
    return CatalogProduct.objects.create(**defaults)


def create_product_variation(variation_type='Printed', name='Standard Printed', **kwargs):
    """Create a catalog ProductVariation."""
    defaults = {
        'variation_type': variation_type,
        'name': name,
        'code': kwargs.pop('code', None),
    }
    defaults.update(kwargs)
    return ProductVariation.objects.create(**defaults)


def create_product_product_variation(product, variation, **kwargs):
    """Create a catalog ProductProductVariation (template + variation combo)."""
    return ProductProductVariation.objects.create(
        product=product,
        product_variation=variation,
        **kwargs,
    )


def create_store_product(exam_session_subject, catalog_product, variation, product_code=None, **kwargs):
    """Create a store Product (purchasable item).

    Automatically creates the ProductProductVariation if needed.

    Args:
        exam_session_subject: ExamSessionSubject instance.
        catalog_product: catalog.Product template.
        variation: ProductVariation instance.
        product_code: Optional explicit product code.
        **kwargs: Additional fields.

    Returns:
        store.Product instance.
    """
    ppv, _ = ProductProductVariation.objects.get_or_create(
        product=catalog_product,
        product_variation=variation,
    )

    if product_code is None:
        subject_code = exam_session_subject.subject.code
        session_code = exam_session_subject.exam_session.session_code
        v_code = variation.code or variation.variation_type[:2].upper()
        product_code = f"{subject_code}/{v_code}{catalog_product.code}/{session_code}"

    defaults = {
        'exam_session_subject': exam_session_subject,
        'product_product_variation': ppv,
        'product_code': product_code,
        'is_active': True,
    }
    defaults.update(kwargs)
    return StoreProduct.objects.create(**defaults)


def create_bundle_template(subject, bundle_name='Study Bundle', **kwargs):
    """Create a catalog ProductBundle template."""
    defaults = {
        'subject': subject,
        'bundle_name': bundle_name,
        'is_active': True,
    }
    defaults.update(kwargs)
    return ProductBundle.objects.create(**defaults)


def create_store_bundle(bundle_template, exam_session_subject, **kwargs):
    """Create a store Bundle."""
    defaults = {
        'bundle_template': bundle_template,
        'exam_session_subject': exam_session_subject,
        'is_active': True,
    }
    defaults.update(kwargs)
    return Bundle.objects.create(**defaults)


def create_bundle_product(bundle, store_product, **kwargs):
    """Create a BundleProduct linking product to bundle."""
    defaults = {
        'bundle': bundle,
        'product': store_product,
        'quantity': 1,
        'sort_order': kwargs.pop('sort_order', 0),
        'is_active': True,
    }
    defaults.update(kwargs)
    return BundleProduct.objects.create(**defaults)


def create_bundle_with_products(exam_session_subject, store_products, bundle_name='Study Bundle'):
    """Create a complete bundle with products in one call.

    Args:
        exam_session_subject: ExamSessionSubject instance.
        store_products: List of store.Product instances to include.
        bundle_name: Name for the bundle template.

    Returns:
        Tuple of (store.Bundle, list of BundleProduct).
    """
    subject = exam_session_subject.subject
    template = create_bundle_template(subject, bundle_name)
    bundle = create_store_bundle(template, exam_session_subject)
    bundle_products = []
    for i, sp in enumerate(store_products):
        bp = create_bundle_product(bundle, sp, sort_order=i)
        bundle_products.append(bp)
    return bundle, bundle_products


def create_catalog_dependencies(subject_code='CM2', session_code='2025-04'):
    """Create a full set of catalog dependencies for testing.

    Returns a dict with all created objects for easy access.

    Returns:
        dict with keys: subject, exam_session, exam_session_subject,
        product, printed_variation, ebook_variation.
    """
    subject = create_subject(subject_code)
    exam_session = create_exam_session(session_code)
    ess = create_exam_session_subject(exam_session, subject)
    catalog_product = create_catalog_product(
        fullname=f'{subject_code} Combined Materials',
        shortname=f'{subject_code} Materials',
        code=f'P{subject_code}',
    )
    printed = create_product_variation('Printed', 'Standard Printed', code='P')
    ebook = create_product_variation('eBook', 'Standard eBook', code='E')

    return {
        'subject': subject,
        'exam_session': exam_session,
        'exam_session_subject': ess,
        'product': catalog_product,
        'printed_variation': printed,
        'ebook_variation': ebook,
    }


def assign_product_to_group(catalog_product, filter_group):
    """Assign a catalog product to a filter group via the junction table.

    Args:
        catalog_product: catalog.Product instance.
        filter_group: FilterGroup instance.

    Returns:
        ProductProductGroup instance.
    """
    from filtering.models import ProductProductGroup
    return ProductProductGroup.objects.create(
        product=catalog_product,
        product_group=filter_group,
    )
