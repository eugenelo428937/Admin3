#!/usr/bin/env python3
"""
Comprehensive test suite for the Product Filtering System
Tests each step from frontend API call to backend response

Run this test: python test_filtering_system.py
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Add the Django project root to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend', 'django_Admin3'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.base')
django.setup()

from django.test import TestCase, Client
from django.urls import reverse
from products.services.filter_service import ProductFilterService
from products.models.filter_system import FilterConfiguration
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from subjects.models import Subject

class ProductFilteringSystemTest:
    """Comprehensive test suite for product filtering system"""
    
    def __init__(self):
        self.client = Client()
        self.filter_service = ProductFilterService()
        self.test_results = []
        
    def log_test(self, test_name, passed, details=""):
        """Log test results"""
        status = "PASS" if passed else "FAIL"
        result = {
            'test': test_name,
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"    Details: {details}")
        print()
    
    def test_1_filter_configuration_exists(self):
        """Test 1: Verify SUBJECT_FILTER configuration exists in database"""
        try:
            config = FilterConfiguration.objects.get(name='SUBJECT_FILTER', is_active=True)
            self.log_test(
                "Filter Configuration Exists",
                True,
                f"Found SUBJECT_FILTER config: type={config.filter_type}, key={config.filter_key}"
            )
            return True
        except FilterConfiguration.DoesNotExist:
            self.log_test(
                "Filter Configuration Exists",
                False,
                "SUBJECT_FILTER configuration not found or inactive"
            )
            return False
    
    def test_2_filter_service_loads_strategy(self):
        """Test 2: Verify filter service loads SUBJECT_FILTER strategy"""
        try:
            strategy = self.filter_service.strategies.get('SUBJECT_FILTER')
            if strategy:
                self.log_test(
                    "Filter Service Loads Strategy",
                    True,
                    f"SUBJECT_FILTER strategy loaded: {type(strategy).__name__}"
                )
                return True
            else:
                self.log_test(
                    "Filter Service Loads Strategy",
                    False,
                    "SUBJECT_FILTER strategy not found in filter service"
                )
                return False
        except Exception as e:
            self.log_test(
                "Filter Service Loads Strategy",
                False,
                f"Error loading strategy: {str(e)}"
            )
            return False
    
    def test_3_database_relationships(self):
        """Test 3: Verify database relationships work for subject filtering"""
        try:
            # Test the exact query path used by the filter
            cs2_products = ExamSessionSubjectProduct.objects.filter(
                exam_session_subject__subject__code='CS2'
            )
            cb1_products = ExamSessionSubjectProduct.objects.filter(
                exam_session_subject__subject__code='CB1'
            )
            
            total_products = ExamSessionSubjectProduct.objects.count()
            
            self.log_test(
                "Database Relationships",
                True,
                f"Total products: {total_products}, CS2: {cs2_products.count()}, CB1: {cb1_products.count()}"
            )
            return cs2_products.count(), cb1_products.count(), total_products
        except Exception as e:
            self.log_test(
                "Database Relationships",
                False,
                f"Database query failed: {str(e)}"
            )
            return 0, 0, 0
    
    def test_4_filter_service_direct(self):
        """Test 4: Test filter service directly with CS2 filter"""
        try:
            # Get base queryset
            base_queryset = ExamSessionSubjectProduct.objects.all()
            base_count = base_queryset.count()
            
            # Apply CS2 filter using filter service
            filters = {'SUBJECT_FILTER': ['CS2']}
            filtered_queryset = self.filter_service.apply_filters(base_queryset, filters)
            filtered_count = filtered_queryset.count()
            
            # Verify filtering worked
            if filtered_count < base_count and filtered_count > 0:
                # Check that all results are CS2
                all_cs2 = all(
                    item.exam_session_subject.subject.code == 'CS2' 
                    for item in filtered_queryset[:5]  # Check first 5 for performance
                )
                
                self.log_test(
                    "Filter Service Direct Test",
                    all_cs2,
                    f"Base: {base_count} → Filtered: {filtered_count}, All CS2: {all_cs2}"
                )
                return filtered_count
            else:
                self.log_test(
                    "Filter Service Direct Test",
                    False,
                    f"Filter didn't work: Base: {base_count} → Filtered: {filtered_count}"
                )
                return 0
        except Exception as e:
            self.log_test(
                "Filter Service Direct Test",
                False,
                f"Filter service error: {str(e)}"
            )
            return 0
    
    def test_5_api_endpoint_without_filter(self):
        """Test 5: Test API endpoint without filter (baseline)"""
        try:
            response = self.client.get('/api/products/current/list/')
            
            if response.status_code == 200:
                data = response.json()
                total_count = data.get('count', 0)
                results_count = len(data.get('results', []))
                
                self.log_test(
                    "API Endpoint (No Filter)",
                    True,
                    f"Status: 200, Total: {total_count}, Results: {results_count}"
                )
                return total_count, results_count
            else:
                self.log_test(
                    "API Endpoint (No Filter)",
                    False,
                    f"API returned status {response.status_code}"
                )
                return 0, 0
        except Exception as e:
            self.log_test(
                "API Endpoint (No Filter)",
                False,
                f"API call failed: {str(e)}"
            )
            return 0, 0
    
    def test_6_api_endpoint_with_cs2_filter(self):
        """Test 6: Test API endpoint with CS2 subject filter"""
        try:
            response = self.client.get('/api/products/current/list/?subject=CS2')
            
            if response.status_code == 200:
                data = response.json()
                total_count = data.get('count', 0)
                results = data.get('results', [])
                results_count = len(results)
                
                # Check if all results are CS2
                subject_codes = set()
                for item in results[:10]:  # Check first 10 items
                    if 'subject_code' in item:
                        subject_codes.add(item['subject_code'])
                    elif 'components' in item:  # Bundle
                        # For bundles, check the subject code in the bundle itself
                        if 'subject_code' in item:
                            subject_codes.add(item['subject_code'])
                
                all_cs2 = len(subject_codes) == 1 and 'CS2' in subject_codes
                
                self.log_test(
                    "API Endpoint (CS2 Filter)",
                    all_cs2,
                    f"Status: 200, Total: {total_count}, Results: {results_count}, Subjects: {list(subject_codes)}"
                )
                return total_count, results_count, list(subject_codes)
            else:
                self.log_test(
                    "API Endpoint (CS2 Filter)",
                    False,
                    f"API returned status {response.status_code}"
                )
                return 0, 0, []
        except Exception as e:
            self.log_test(
                "API Endpoint (CS2 Filter)",
                False,
                f"API call failed: {str(e)}"
            )
            return 0, 0, []
    
    def test_7_frontend_simulation(self):
        """Test 7: Simulate exact frontend API call pattern"""
        try:
            # Simulate the exact call made by frontend
            response = self.client.get('/api/products/current/list/?subject=CS2&page=1&page_size=20')
            
            if response.status_code == 200:
                data = response.json()
                total_count = data.get('count', 0)
                page_size = data.get('page_size', 0)
                results = data.get('results', [])
                results_count = len(results)
                
                # Analyze subject distribution in results
                subject_counts = {}
                for item in results:
                    subject_code = item.get('subject_code', 'Unknown')
                    subject_counts[subject_code] = subject_counts.get(subject_code, 0) + 1
                
                # Check if filtering worked
                filtering_worked = total_count < 100 and 'CS2' in subject_counts
                
                self.log_test(
                    "Frontend Simulation",
                    filtering_worked,
                    f"Total: {total_count}, Page size: {page_size}, Results: {results_count}, Subject distribution: {subject_counts}"
                )
                return subject_counts
            else:
                self.log_test(
                    "Frontend Simulation",
                    False,
                    f"API returned status {response.status_code}"
                )
                return {}
        except Exception as e:
            self.log_test(
                "Frontend Simulation",
                False,
                f"Frontend simulation failed: {str(e)}"
            )
            return {}
    
    def test_8_verify_subjects_exist(self):
        """Test 8: Verify CS2 and CB1 subjects exist in database"""
        try:
            cs2_exists = Subject.objects.filter(code='CS2', active=True).exists()
            cb1_exists = Subject.objects.filter(code='CB1', active=True).exists()
            total_subjects = Subject.objects.filter(active=True).count()
            
            both_exist = cs2_exists and cb1_exists
            
            self.log_test(
                "Subjects Exist in Database",
                both_exist,
                f"CS2 exists: {cs2_exists}, CB1 exists: {cb1_exists}, Total active subjects: {total_subjects}"
            )
            return cs2_exists, cb1_exists
        except Exception as e:
            self.log_test(
                "Subjects Exist in Database",
                False,
                f"Subject verification failed: {str(e)}"
            )
            return False, False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("Starting Comprehensive Product Filtering System Tests")
        print("=" * 60)
        print()
        
        # Test sequence
        self.test_1_filter_configuration_exists()
        self.test_2_filter_service_loads_strategy()
        cs2_count, cb1_count, total_count = self.test_3_database_relationships()
        filtered_count = self.test_4_filter_service_direct()
        baseline_total, baseline_results = self.test_5_api_endpoint_without_filter()
        filtered_total, filtered_results, subject_codes = self.test_6_api_endpoint_with_cs2_filter()
        frontend_subjects = self.test_7_frontend_simulation()
        cs2_exists, cb1_exists = self.test_8_verify_subjects_exist()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum(1 for result in self.test_results if "PASS" in result['status'])
        total_tests = len(self.test_results)
        
        print(f"Tests Passed: {passed_tests}/{total_tests}")
        print()
        
        # Key Metrics
        print("KEY METRICS:")
        print(f"  Database - Total Products: {total_count}")
        print(f"  Database - CS2 Products: {cs2_count}")
        print(f"  Database - CB1 Products: {cb1_count}")
        print(f"  API (No Filter) - Returns: {baseline_total} products")
        print(f"  API (CS2 Filter) - Returns: {filtered_total} products")
        print(f"  Subject Codes in Filtered Results: {subject_codes}")
        print(f"  Frontend Simulation Subject Distribution: {frontend_subjects}")
        print()
        
        # Diagnosis
        print("DIAGNOSIS:")
        if filtered_total > 0 and filtered_total < baseline_total:
            if 'CS2' in subject_codes and len(subject_codes) == 1:
                print("  SUCCESS: Subject filtering is working correctly!")
                print("  SUCCESS: API correctly returns only CS2 products when filtered")
            elif len(subject_codes) > 1:
                print("  WARNING: Subject filtering partially working - mixed subjects returned")
                print(f"     Expected: ['CS2'], Got: {subject_codes}")
            else:
                print("  ERROR: Subject filtering not working - no CS2 products returned")
        else:
            print("  ERROR: Subject filtering not working - same results with/without filter")
        
        if filtered_total == 0:
            print("  ERROR: No CS2 products found - possible data issue")
        
        # Generate test report
        self.generate_test_report()
        
        return passed_tests == total_tests
    
    def generate_test_report(self):
        """Generate detailed test report"""
        report_path = "product_filtering_test_report.json"
        with open(report_path, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'summary': {
                    'total_tests': len(self.test_results),
                    'passed_tests': sum(1 for r in self.test_results if "PASS" in r['status']),
                    'failed_tests': sum(1 for r in self.test_results if "FAIL" in r['status'])
                },
                'test_results': self.test_results
            }, f, indent=2)
        
        print(f"Detailed test report saved to: {report_path}")

if __name__ == "__main__":
    # Run the comprehensive test suite
    tester = ProductFilteringSystemTest()
    success = tester.run_all_tests()
    
    if success:
        print("\nAll tests passed! The filtering system is working correctly.")
        sys.exit(0)
    else:
        print("\nSome tests failed. Check the results above for details.")
        sys.exit(1)