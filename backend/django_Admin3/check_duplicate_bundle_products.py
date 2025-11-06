"""
Check for duplicate bundle products in acted_exam_session_subject_bundle_products.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from exam_sessions_subjects_products.models import ExamSessionSubjectBundleProduct
from django.db.models import Count

print('=== Checking for Duplicate Bundle Products ===\n')

# Find duplicates based on unique_together constraint
duplicates = ExamSessionSubjectBundleProduct.objects.values(
    'bundle_id',
    'exam_session_subject_product_variation_id'
).annotate(
    count=Count('id')
).filter(
    count__gt=1
).order_by('-count')

print(f'Total duplicate groups: {duplicates.count()}\n')

if duplicates.count() > 0:
    print('Duplicate Details:')
    print('='*80)

    for dup in duplicates:
        bundle_id = dup['bundle_id']
        espv_id = dup['exam_session_subject_product_variation_id']
        count = dup['count']

        # Get the actual records
        records = ExamSessionSubjectBundleProduct.objects.filter(
            bundle_id=bundle_id,
            exam_session_subject_product_variation_id=espv_id
        ).select_related(
            'bundle__bundle',
            'exam_session_subject_product_variation__exam_session_subject_product__product'
        )

        print(f'\nBundle: {records[0].bundle.bundle.bundle_name}')
        print(f'Product: {records[0].exam_session_subject_product_variation.exam_session_subject_product.product.shortname}')
        print(f'Duplicate count: {count}')
        print(f'Record IDs: {[r.id for r in records]}')

    # Show total count
    total_records = ExamSessionSubjectBundleProduct.objects.count()
    print(f'\n\nTotal bundle product records: {total_records}')
    print(f'Expected records (after deduplication): {total_records - sum(d["count"] - 1 for d in duplicates)}')
else:
    print('No duplicates found!')
    print(f'\nTotal bundle product records: {ExamSessionSubjectBundleProduct.objects.count()}')
