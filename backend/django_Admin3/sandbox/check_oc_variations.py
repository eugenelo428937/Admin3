#!/usr/bin/env python3
"""Check Online Classroom product variations."""
import os
import sys
import django

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from exam_sessions_subjects_products.models import ExamSessionSubjectProduct, ExamSessionSubjectProductVariation

# Check OC products
oc_products = ExamSessionSubjectProduct.objects.filter(product__code='OC')
print(f"OC products found: {oc_products.count()}")

for product in oc_products[:5]:  # Check first 5
    print(f"\nProduct ID: {product.id}")
    variations = ExamSessionSubjectProductVariation.objects.filter(exam_session_subject_product=product)
    print(f"  Variations: {variations.count()}")
    for variation in variations:
        print(f"    ID: {variation.id}, Product Code: {variation.product_code}")