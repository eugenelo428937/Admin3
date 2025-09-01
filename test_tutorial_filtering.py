#!/usr/bin/env python3
"""
Test Script: Tutorial Format Filtering Verification
==================================================
This script tests the tutorial filtering functionality after the recent location fix.

CRITICAL BUG IDENTIFIED:
- ProductViewSet handles group filtering by ID: groups__id__in=group_ids  
- Frontend sends group names: /products?group=Face-to-face Tutorial
- ExamSessionSubjectsProductsViewSet correctly handles names: FilterGroup.objects.get(name=group_filter)

Test Cases:
1. Tutorial format filtering via navbar (Face-to-face Tutorial, Live Online Tutorial)
2. Tutorial location filtering (specific cities like Birmingham)
3. Independence of both mechanisms
4. Backend API endpoint testing
"""

import sys
import os
import django
import requests
from django.test import Client
from django.contrib.auth.models import User

# Setup Django environment
sys.path.insert(0, os.path.join(os.getcwd(), 'backend', 'django_Admin3'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

from products.models import Product, FilterGroup
from exam_sessions_subjects_products.models import ExamSessionSubjectsProducts

class TutorialFilteringTester:
    def __init__(self):
        self.client = Client()
        self.base_url = 'http://localhost:8888/api'
        
    def test_filter_groups_exist(self):
        """Test that required filter groups exist in database"""
        print("=== Testing Filter Groups Existence ===")
        
        required_groups = [
            'Face-to-face Tutorial',
            'Live Online Tutorial', 
            'Tutorial',
            'Online Classroom'
        ]
        
        for group_name in required_groups:
            try:
                group = FilterGroup.objects.get(name=group_name)
                print(f"✅ {group_name} (ID: {group.id})")
            except FilterGroup.DoesNotExist:
                print(f"❌ {group_name} - NOT FOUND")
                
        print()

    def test_products_viewset_bug(self):
        """Test the ProductViewSet group filtering bug"""
        print("=== Testing ProductViewSet Group Filtering Bug ===")
        
        # Test with group name (should fail with current implementation)
        response = self.client.get('/api/products/', {'group': 'Face-to-face Tutorial'})
        print(f"ProductViewSet with group name: Status {response.status_code}")
        if response.status_code == 200:
            print(f"Products returned: {len(response.json())}")
        
        # Test with group ID (should work with current implementation)
        try:
            group = FilterGroup.objects.get(name='Face-to-face Tutorial')
            response = self.client.get('/api/products/', {'group': str(group.id)})
            print(f"ProductViewSet with group ID ({group.id}): Status {response.status_code}")
            if response.status_code == 200:
                print(f"Products returned: {len(response.json())}")
        except FilterGroup.DoesNotExist:
            print("Face-to-face Tutorial group not found - cannot test ID filtering")
            
        print()

    def test_exam_session_products_viewset(self):
        """Test the ExamSessionSubjectsProductsViewSet group filtering (should work)"""
        print("=== Testing ExamSessionSubjectsProductsViewSet Group Filtering ===")
        
        # This should work correctly with group names
        response = self.client.get('/api/exam-session-subjects-products/', {'group': 'Face-to-face Tutorial'})
        print(f"ExamSessionSubjectsProductsViewSet with group name: Status {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Products returned: {data.get('count', 'Unknown count')}")
        
        print()

    def test_tutorial_locations(self):
        """Test tutorial location filtering (should work via product ID)"""
        print("=== Testing Tutorial Location Filtering ===")
        
        # Get a tutorial product to test with
        tutorial_products = Product.objects.filter(groups__name='Tutorial')[:5]
        
        for product in tutorial_products:
            response = self.client.get('/api/exam-session-subjects-products/', {'product': str(product.id)})
            print(f"Product '{product.shortname}' (ID: {product.id}): Status {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"  Products returned: {data.get('count', 'Unknown count')}")
        
        print()

    def recommend_fix(self):
        """Provide fix recommendation"""
        print("=== RECOMMENDED FIX ===")
        print("""
The ProductViewSet needs to be updated to handle group names like ExamSessionSubjectsProductsViewSet does.

Current ProductViewSet code (BROKEN):
    group_ids = self.request.query_params.getlist('group')
    if group_ids:
        queryset = queryset.filter(groups__id__in=group_ids).distinct()

Should be updated to (WORKING like ExamSessionSubjectsProductsViewSet):
    group_filter = self.request.query_params.get('group')
    if group_filter:
        try:
            group = FilterGroup.objects.get(name=group_filter)
            queryset = queryset.filter(groups=group).distinct()
        except FilterGroup.DoesNotExist:
            queryset = queryset.none()

OR support both ID and name:
    group_param = self.request.query_params.get('group')
    if group_param:
        try:
            # Try as ID first
            if group_param.isdigit():
                queryset = queryset.filter(groups__id=int(group_param)).distinct()
            else:
                # Try as name
                group = FilterGroup.objects.get(name=group_param)
                queryset = queryset.filter(groups=group).distinct()
        except (FilterGroup.DoesNotExist, ValueError):
            queryset = queryset.none()
        """)
        
    def run_all_tests(self):
        """Run all tests"""
        print("TUTORIAL FILTERING TEST SUITE")
        print("=" * 50)
        print()
        
        self.test_filter_groups_exist()
        self.test_products_viewset_bug()
        self.test_exam_session_products_viewset()
        self.test_tutorial_locations()
        self.recommend_fix()

if __name__ == '__main__':
    tester = TutorialFilteringTester()
    tester.run_all_tests()