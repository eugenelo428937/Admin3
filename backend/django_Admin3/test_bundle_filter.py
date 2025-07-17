#!/usr/bin/env python
"""
Test script for Bundle filter functionality
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.test import RequestFactory
from exam_sessions_subjects_products.views import ExamSessionSubjectProductViewSet
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct, ExamSessionSubjectBundle
from products.models.filter_system import FilterConfiguration

def test_bundle_filter():
    """Test the Bundle filter functionality"""
    
    print("=== Testing Bundle Filter Functionality ===\n")
    
    # Check if bundle filter configuration exists
    try:
        bundle_config = FilterConfiguration.objects.get(name='bundle')
        print(f"✓ Bundle filter configuration found:")
        print(f"  - Name: {bundle_config.name}")
        print(f"  - Display Label: {bundle_config.display_label}")
        print(f"  - Filter Type: {bundle_config.filter_type}")
        print(f"  - Is Active: {bundle_config.is_active}")
        print()
    except FilterConfiguration.DoesNotExist:
        print("✗ Bundle filter configuration not found")
        return False
    
    # Get data counts
    total_products = ExamSessionSubjectProduct.objects.count()
    total_bundles = ExamSessionSubjectBundle.objects.filter(is_active=True).count()
    
    print(f"Data Overview:")
    print(f"  - Total Products: {total_products}")
    print(f"  - Total Bundles: {total_bundles}")
    print()
    
    # Test 1: Bundle filter active (should return only bundles)
    print("Test 1: Bundle filter active")
    factory = RequestFactory()
    request = factory.get('/api/exam-sessions-subjects-products/list/?bundle=bundle')
    
    view = ExamSessionSubjectProductViewSet()
    view.request = request
    
    try:
        response = view.list_products(request)
        data = response.data
        
        print(f"  - Response status: {response.status_code}")
        print(f"  - Total results: {data.get('count', 0)}")
        print(f"  - Products count: {data.get('products_count', 0)}")
        print(f"  - Bundles count: {data.get('bundles_count', 0)}")
        
        if data.get('products_count', 0) == 0 and data.get('bundles_count', 0) > 0:
            print("  ✓ Bundle filter working correctly - only bundles returned")
        else:
            print("  ✗ Bundle filter not working correctly - products still returned")
        
    except Exception as e:
        print(f"  ✗ Error testing bundle filter: {e}")
    
    print()
    
    # Test 2: Normal filtering (should include related bundles)
    print("Test 2: Normal filtering with subject filter")
    
    # Get a subject to filter by
    if total_products > 0:
        first_product = ExamSessionSubjectProduct.objects.first()
        if first_product and first_product.exam_session_subject.subject:
            subject_code = first_product.exam_session_subject.subject.code
            
            request = factory.get(f'/api/exam-sessions-subjects-products/list/?subject={subject_code}')
            
            try:
                response = view.list_products(request)
                data = response.data
                
                print(f"  - Subject filter: {subject_code}")
                print(f"  - Response status: {response.status_code}")
                print(f"  - Total results: {data.get('count', 0)}")
                print(f"  - Products count: {data.get('products_count', 0)}")
                print(f"  - Bundles count: {data.get('bundles_count', 0)}")
                
                if data.get('bundles_count', 0) > 0:
                    print("  ✓ Related bundles included in results")
                else:
                    print("  ⚠ No related bundles found (may be normal if no bundles exist for this subject)")
                    
            except Exception as e:
                print(f"  ✗ Error testing subject filter: {e}")
    
    print()
    
    # Test 3: Combined filters
    print("Test 3: Combined filtering")
    
    # Test bundle=bundle + subject filter (should return only bundles for that subject)
    if total_products > 0:
        first_product = ExamSessionSubjectProduct.objects.first()
        if first_product and first_product.exam_session_subject.subject:
            subject_code = first_product.exam_session_subject.subject.code
            
            request = factory.get(f'/api/exam-sessions-subjects-products/list/?bundle=bundle&subject={subject_code}')
            
            try:
                response = view.list_products(request)
                data = response.data
                
                print(f"  - Filters: bundle=bundle, subject={subject_code}")
                print(f"  - Response status: {response.status_code}")
                print(f"  - Total results: {data.get('count', 0)}")
                print(f"  - Products count: {data.get('products_count', 0)}")
                print(f"  - Bundles count: {data.get('bundles_count', 0)}")
                
                if data.get('products_count', 0) == 0:
                    print("  ✓ Bundle filter overrides other filters - only bundles returned")
                else:
                    print("  ✗ Bundle filter not working correctly with combined filters")
                    
            except Exception as e:
                print(f"  ✗ Error testing combined filters: {e}")
    
    print()
    print("=== Bundle Filter Test Complete ===")
    
    return True

if __name__ == '__main__':
    test_bundle_filter()