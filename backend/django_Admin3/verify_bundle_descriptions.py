"""
Verify bundle component descriptions are displaying correctly.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from products.serializers import ExamSessionSubjectBundleSerializer
from exam_sessions_subjects_products.models import ExamSessionSubjectBundle
import json

print('='*80)
print('BUNDLE COMPONENT DESCRIPTION VERIFICATION')
print('='*80)

# Get SP6 bundle (has Printed materials)
sp6_bundle = ExamSessionSubjectBundle.objects.filter(
    exam_session_subject__subject__code='SP6',
    is_active=True
).first()

if sp6_bundle:
    print('\n1. SP6 Bundle Components')
    print('-'*80)
    serializer = ExamSessionSubjectBundleSerializer(sp6_bundle)

    for component in serializer.data['components']:
        product_name = component['product']['fullname']
        variation = component['product_variation']
        print(f"\nProduct: {product_name}")
        print(f"  Variation Name: {variation['name']}")
        print(f"  Description Short: '{variation['description_short']}'")
        print(f"  Display Text: {variation['description_short'] or variation['name'] or ''}")

print('\n' + '='*80)
print('VERIFICATION COMPLETE')
print('='*80)
