"""
Investigate why bundles appear to have duplicate products.
Check if there are multiple ESPV records for the same product+variation.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from exam_sessions_subjects_products.models import ExamSessionSubjectBundle

print('=== Investigating Bundle Product Duplicates ===\n')

# Get CB2 bundle (which showed 8 items but only 4 unique)
cb2_bundle = ExamSessionSubjectBundle.objects.filter(
    exam_session_subject__subject__code='CB2',
    is_active=True
).select_related(
    'bundle',
    'exam_session_subject__subject'
).prefetch_related(
    'bundle_products__exam_session_subject_product_variation__exam_session_subject_product__product',
    'bundle_products__exam_session_subject_product_variation__product_product_variation__product_variation'
).first()

if cb2_bundle:
    print(f'Bundle: {cb2_bundle.bundle.bundle_name}')
    print(f'Subject: {cb2_bundle.exam_session_subject.subject.code}')
    print(f'Total bundle products: {cb2_bundle.bundle_products.count()}\n')
    print('='*100)

    for bp in cb2_bundle.bundle_products.all():
        espv = bp.exam_session_subject_product_variation
        product = espv.exam_session_subject_product.product
        variation = espv.product_product_variation.product_variation

        print(f'\nBundle Product ID: {bp.id}')
        print(f'  Product: {product.shortname} (ID: {product.id})')
        print(f'  Variation: {variation.name} (ID: {variation.id})')
        print(f'  ESPV ID: {espv.id}')
        print(f'  ESSP ID: {espv.exam_session_subject_product.id}')
        print(f'  Quantity: {bp.quantity}')
        print(f'  Sort Order: {bp.sort_order}')
