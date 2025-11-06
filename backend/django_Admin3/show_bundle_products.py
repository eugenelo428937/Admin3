"""
Show products for each bundle to verify no duplicates in the bundle composition.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from exam_sessions_subjects_products.models import ExamSessionSubjectBundle

print('=== Bundle Products Breakdown ===\n')

bundles = ExamSessionSubjectBundle.objects.filter(
    is_active=True
).select_related(
    'bundle',
    'exam_session_subject__subject'
).prefetch_related(
    'bundle_products__exam_session_subject_product_variation__exam_session_subject_product__product',
    'bundle_products__exam_session_subject_product_variation__product_product_variation__product_variation'
).order_by('exam_session_subject__subject__code')

for bundle in bundles[:5]:  # Show first 5 bundles
    print(f'\n{"="*80}')
    print(f'Bundle: {bundle.bundle.bundle_name}')
    print(f'Subject: {bundle.exam_session_subject.subject.code}')
    print(f'Components: {bundle.bundle_products.count()}')
    print('-'*80)

    products_seen = {}
    for bp in bundle.bundle_products.all():
        product_name = bp.exam_session_subject_product_variation.exam_session_subject_product.product.shortname
        variation = bp.product_variation.name

        # Track if we see the same product twice
        key = f"{product_name} ({variation})"
        if key in products_seen:
            products_seen[key] += 1
            print(f'  [DUPLICATE] {key} - seen {products_seen[key]} times')
        else:
            products_seen[key] = 1
            print(f'  - {key} (qty: {bp.quantity})')

    # Summary
    total_items = bundle.bundle_products.count()
    unique_items = len(products_seen)
    if total_items != unique_items:
        print(f'\n  [WARNING] Total items: {total_items}, Unique items: {unique_items}')
    else:
        print(f'\n  All {total_items} items are unique')

print(f'\n\nTotal bundles: {bundles.count()}')
