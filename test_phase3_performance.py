#!/usr/bin/env python3
"""
Phase 3 Database Performance Test Script
Tests the performance improvements implemented in Phase 3.
"""

import os
import sys
import django
import time
import requests
import json
from datetime import datetime

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
sys.path.append('backend/django_Admin3')
django.setup()

from django.db import connection
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from exam_sessions_subjects_products.serializers import ProductListSerializer
from products.services.filter_service import get_filter_service


class Phase3PerformanceTester:
    def __init__(self, api_base_url="http://localhost:8888"):
        self.api_base_url = api_base_url
        self.results = []
    
    def test_database_query_performance(self):
        """Test raw database query performance."""
        print("=== Testing Database Query Performance ===\n")
        
        test_cases = [
            {
                'name': 'Basic product listing (100 items)',
                'operation': lambda: self._test_basic_listing(100)
            },
            {
                'name': 'Subject filtering (CM2)',
                'operation': lambda: self._test_subject_filtering(['CM2'])
            },
            {
                'name': 'Multi-subject filtering',
                'operation': lambda: self._test_subject_filtering(['CM2', 'SA1', 'CA1'])
            },
            {
                'name': 'Complex filtering (Subject + Category)',
                'operation': lambda: self._test_complex_filtering()
            },
            {
                'name': 'Serialization performance (50 items)',
                'operation': lambda: self._test_serialization(50)
            }
        ]
        
        for test_case in test_cases:
            start_time = time.time()
            initial_queries = len(connection.queries)
            
            try:
                result = test_case['operation']()
                duration = time.time() - start_time
                query_count = len(connection.queries) - initial_queries
                
                status = "✓ PASS" if duration < 0.2 else ("△ WARN" if duration < 0.5 else "✗ FAIL")
                print(f"{status} {test_case['name']:35} {duration:6.3f}s ({query_count:2d} queries)")
                
                self.results.append({
                    'test': test_case['name'],
                    'duration': duration,
                    'queries': query_count,
                    'status': 'pass' if duration < 0.2 else 'warning' if duration < 0.5 else 'fail'
                })
                
            except Exception as e:
                print(f"✗ ERROR {test_case['name']:35} {str(e)}")
                self.results.append({
                    'test': test_case['name'],
                    'duration': 999,
                    'queries': 0,
                    'status': 'error',
                    'error': str(e)
                })
    
    def test_api_performance(self):
        """Test API endpoint performance."""
        print("\n=== Testing API Endpoint Performance ===\n")
        
        test_cases = [
            {
                'name': 'Unified Search - Subject Filter',
                'payload': {
                    'filters': {'subjects': ['CM2']},
                    'pagination': {'page': 1, 'page_size': 20}
                }
            },
            {
                'name': 'Unified Search - Multi Filter',
                'payload': {
                    'filters': {
                        'subjects': ['CM2', 'SA1'],
                        'categories': ['Materials']
                    },
                    'pagination': {'page': 1, 'page_size': 20}
                }
            },
            {
                'name': 'Unified Search - Complex',
                'payload': {
                    'filters': {
                        'subjects': ['CM2'],
                        'categories': ['Materials'],
                        'product_types': ['Core Study Material']
                    },
                    'pagination': {'page': 1, 'page_size': 50}
                }
            }
        ]
        
        for test_case in test_cases:
            try:
                start_time = time.time()
                
                response = requests.post(
                    f"{self.api_base_url}/api/products/unified-search/",
                    json=test_case['payload'],
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                duration = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    result_count = len(data.get('products', []))
                    
                    status = "✓ PASS" if duration < 0.5 else ("△ WARN" if duration < 1.0 else "✗ FAIL")
                    print(f"{status} {test_case['name']:35} {duration:6.3f}s ({result_count:3d} results)")
                    
                    self.results.append({
                        'test': test_case['name'],
                        'duration': duration,
                        'results': result_count,
                        'status': 'pass' if duration < 0.5 else 'warning' if duration < 1.0 else 'fail'
                    })
                else:
                    print(f"✗ ERROR {test_case['name']:35} HTTP {response.status_code}")
                    self.results.append({
                        'test': test_case['name'],
                        'duration': duration,
                        'status': 'error',
                        'error': f"HTTP {response.status_code}"
                    })
                    
            except requests.exceptions.RequestException as e:
                print(f"✗ ERROR {test_case['name']:35} {str(e)}")
                self.results.append({
                    'test': test_case['name'],
                    'duration': 999,
                    'status': 'error',
                    'error': str(e)
                })
    
    def test_index_usage(self):
        """Test if database indexes are being used."""
        print("\n=== Testing Database Index Usage ===\n")
        
        with connection.cursor() as cursor:
            # Check if our Phase 3 indexes exist
            cursor.execute("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE indexname LIKE 'idx_%essp%' 
                   OR indexname LIKE 'idx_%products%'
                   OR indexname LIKE 'idx_%subjects%'
                ORDER BY indexname
            """)
            
            indexes = [row[0] for row in cursor.fetchall()]
            
            if indexes:
                print(f"✓ Found {len(indexes)} performance indexes:")
                for index in indexes:
                    print(f"  - {index}")
            else:
                print("✗ No performance indexes found")
            
            # Test if an index is used in a typical query
            cursor.execute("""
                EXPLAIN (FORMAT JSON) 
                SELECT COUNT(*) FROM acted_exam_session_subject_products essp
                JOIN acted_exam_session_subjects ess ON essp.exam_session_subject_id = ess.id
                JOIN acted_subjects s ON ess.subject_id = s.id
                WHERE s.code = 'CM2'
            """)
            
            plan = cursor.fetchone()[0][0]['Plan']
            plan_str = json.dumps(plan, indent=2)
            
            if 'Index Scan' in plan_str:
                print("✓ Query uses index scan")
            elif 'Seq Scan' in plan_str and 'acted_subjects' in plan_str:
                print("△ Query uses sequential scan on subjects table")
            else:
                print("? Could not determine scan type")
    
    def print_summary(self):
        """Print test summary."""
        print("\n" + "="*60)
        print("PHASE 3 PERFORMANCE TEST SUMMARY")
        print("="*60)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r['status'] == 'pass'])
        warning_tests = len([r for r in self.results if r['status'] == 'warning'])
        failed_tests = len([r for r in self.results if r['status'] in ['fail', 'error']])
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed:      {passed_tests}")
        print(f"Warnings:    {warning_tests}")
        print(f"Failed:      {failed_tests}")
        
        if failed_tests == 0 and warning_tests == 0:
            print("\n✓ ALL TESTS PASSED - Performance is excellent!")
        elif failed_tests == 0:
            print("\n△ TESTS PASSED WITH WARNINGS - Performance is acceptable")
        else:
            print("\n✗ SOME TESTS FAILED - Performance needs improvement")
        
        # Show slowest operations
        if self.results:
            sorted_results = sorted(self.results, key=lambda x: x.get('duration', 0), reverse=True)
            print(f"\nSlowest operations:")
            for result in sorted_results[:3]:
                if result.get('duration', 0) < 999:  # Skip error cases
                    print(f"  {result['test']}: {result['duration']:.3f}s")
    
    def _test_basic_listing(self, count):
        """Test basic product listing performance."""
        queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        )[:count]
        return list(queryset)
    
    def _test_subject_filtering(self, subjects):
        """Test subject filtering performance."""
        filter_service = get_filter_service()
        base_queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        )
        filtered = filter_service.apply_filters(base_queryset, {'SUBJECT_FILTER': subjects})
        return filtered.count()
    
    def _test_complex_filtering(self):
        """Test complex filtering performance."""
        filter_service = get_filter_service()
        base_queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        )
        filters = {
            'SUBJECT_FILTER': ['CM2', 'SA1'],
            'category': ['Materials']
        }
        filtered = filter_service.apply_filters(base_queryset, filters)
        return filtered.count()
    
    def _test_serialization(self, count):
        """Test serialization performance."""
        queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        ).prefetch_related(
            'variations__product_product_variation__product_variation',
            'variations__prices'
        )[:count]
        
        serializer = ProductListSerializer(queryset, many=True)
        return serializer.data


def main():
    print("Phase 3: Database Performance Optimization Tests")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    tester = Phase3PerformanceTester()
    
    # Run database tests
    tester.test_database_query_performance()
    
    # Test index usage
    tester.test_index_usage()
    
    # Run API tests (only if server is running)
    try:
        response = requests.get("http://localhost:8888/api/products/list/?page_size=1", timeout=5)
        if response.status_code == 200:
            tester.test_api_performance()
        else:
            print(f"\n⚠ API server not responding (HTTP {response.status_code}), skipping API tests")
    except requests.exceptions.RequestException:
        print("\n⚠ API server not running, skipping API tests")
    
    # Print summary
    tester.print_summary()


if __name__ == "__main__":
    main()