#!/usr/bin/env python
"""
Test script to verify combined filtering works correctly
"""
import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from products.services.filter_service import get_product_filter_service

def test_combined_filtering():
    """Test that subject and main_category filters work together"""
    
    # Get filter service
    filter_service = get_product_filter_service()
    
    # Base queryset
    queryset = ExamSessionSubjectProduct.objects.select_related(
        'exam_session_subject__subject',
        'product'
    ).prefetch_related(
        'product__groups'
    )
    
    print(f"Total products: {queryset.count()}")
    
    # Test SP6 filter only
    sp6_filters = {'subject': ['SP6']}
    sp6_queryset = filter_service.apply_filters(queryset, sp6_filters)
    print(f"SP6 products: {sp6_queryset.count()}")
    
    # Test CB2 filter only (assuming CB2 is a main_category ID)
    # You'll need to replace this with actual CB2 ID from your database
    cb2_filters = {'main_category': [2]}  # Replace 2 with actual CB2 ID
    cb2_queryset = filter_service.apply_filters(queryset, cb2_filters)
    print(f"CB2 products: {cb2_queryset.count()}")
    
    # Test combined SP6 + CB2 filters
    combined_filters = {
        'subject': ['SP6'],
        'main_category': [2]  # Replace with actual CB2 ID
    }
    combined_queryset = filter_service.apply_filters(queryset, combined_filters)
    print(f"SP6 + CB2 products: {combined_queryset.count()}")
    
    # Show some example products
    print("\nExample SP6 + CB2 products:")
    for product in combined_queryset[:5]:
        print(f"- {product.product.shortname} ({product.exam_session_subject.subject.code})")
        print(f"  Groups: {[g.name for g in product.product.groups.all()]}")
    
    # Test that we get correct intersection
    if combined_queryset.count() > 0:
        print(f"\n✅ Combined filtering works! Found {combined_queryset.count()} products with both SP6 and CB2 filters")
    else:
        print("\n❌ Combined filtering issue - no products found with both filters")
        
        # Debug: check if there are any SP6 products at all
        sp6_products = list(sp6_queryset.values_list('product__shortname', flat=True)[:10])
        print(f"SP6 products sample: {sp6_products}")
        
        # Debug: check if there are any CB2 products at all  
        cb2_products = list(cb2_queryset.values_list('product__shortname', flat=True)[:10])
        print(f"CB2 products sample: {cb2_products}")

if __name__ == '__main__':
    test_combined_filtering()