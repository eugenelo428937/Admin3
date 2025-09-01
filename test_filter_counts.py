#!/usr/bin/env python
"""
Test script to verify filter counts structure
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.insert(0, 'backend/django_Admin3')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

from exam_sessions_subjects_products.views import ExamSessionSubjectProductViewSet
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser

# Create a mock request
factory = RequestFactory()
request = factory.get('/api/exam-sessions-subjects-products/unified_search/')
request.user = AnonymousUser()

# Create viewset instance
viewset = ExamSessionSubjectProductViewSet()
viewset.request = request

# Get some products for testing
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from products.models import ProductBundle

base_products = ExamSessionSubjectProduct.objects.all()[:10]
base_bundles = ProductBundle.objects.all()[:5]

# Generate filter counts
filter_counts = viewset._generate_filter_counts({}, base_products, base_bundles)

# Print the structure
print("Filter Counts Structure:")
print("-" * 50)

for filter_type, items in filter_counts.items():
    print(f"\n{filter_type.upper()}:")
    if items:
        # Show first few items
        count = 0
        for key, value in list(items.items())[:3]:
            print(f"  '{key}': {value}")
            count += 1
            if count >= 3:
                if len(items) > 3:
                    print(f"  ... and {len(items) - 3} more")
                break
    else:
        print("  (empty)")

print("\n" + "-" * 50)
print("✅ Structure verification:")

# Check if values are objects with metadata
sample_product_type = None
sample_product = None

if filter_counts.get('product_types'):
    key = list(filter_counts['product_types'].keys())[0]
    sample_product_type = filter_counts['product_types'][key]
    
if filter_counts.get('products'):
    key = list(filter_counts['products'].keys())[0]
    sample_product = filter_counts['products'][key]

if sample_product_type:
    print(f"\nProduct Type structure: {sample_product_type}")
    if isinstance(sample_product_type, dict):
        print("  ✅ Is a dictionary with metadata")
        if 'count' in sample_product_type and 'name' in sample_product_type:
            print("  ✅ Has 'count' and 'name' fields")
    else:
        print(f"  ❌ Is not a dict, it's a {type(sample_product_type)}")

if sample_product:
    print(f"\nProduct structure: {sample_product}")
    if isinstance(sample_product, dict):
        print("  ✅ Is a dictionary with metadata")
        if 'count' in sample_product and 'name' in sample_product:
            print("  ✅ Has 'count' and 'name' fields")
    else:
        print(f"  ❌ Is not a dict, it's a {type(sample_product)}")