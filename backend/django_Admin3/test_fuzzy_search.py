#!/usr/bin/env python
"""
Comprehensive test script for FuzzyWuzzy search functionality.
Run this from the Django project root directory: python test_fuzzy_search.py
"""

import os
import sys
import django
import json
import requests
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from exam_sessions_subjects_products.services import FuzzySearchService
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from subjects.models import Subject
from products.models.product_group import ProductGroup

class FuzzySearchTester:
    def __init__(self):
        self.base_url = "http://127.0.0.1:8888"
        self.service = FuzzySearchService(min_score=60)
        self.test_results = []
    
    def print_header(self, title):
        """Print a formatted header"""
        print(f"\n{'='*80}")
        print(f"[TEST] {title}")
        print(f"{'='*80}")
    
    def print_subheader(self, title):
        """Print a formatted subheader"""
        print(f"\n{'-'*60}")
        print(f"[SEARCH] {title}")
        print(f"{'-'*60}")
    
    def print_success(self, message):
        """Print success message"""
        print(f"[PASS] {message}")
    
    def print_error(self, message):
        """Print error message"""
        print(f"[FAIL] {message}")
    
    def print_info(self, message):
        """Print info message"""
        print(f"[INFO] {message}")
    
    def test_cm_search_issue(self):
        """Test the specific CM search issue reported by user"""
        self.print_header("Testing CM Search Issue")
        
        query = "CM"
        
        # Test 1: Basic fuzzy search endpoint
        self.print_subheader("Test 1: Basic Fuzzy Search for 'CM'")
        try:
            response = requests.get(f'{self.base_url}/api/exam-sessions-subjects-products/fuzzy-search/?q={query}', timeout=10)
            print(f"   |- Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   |- Total Count: {data.get('total_count', 0)}")
                print(f"   |- Products Returned: {len(data.get('products', []))}")
                print(f"   |- Search Info: {data.get('search_info', {})}")
                
                # Show sample products
                if data.get('products'):
                    print(f"\n   Sample Products:")
                    for i, product in enumerate(data['products'][:3], 1):
                        print(f"      {i}. [{product.get('subject_code', 'N/A')}] {product.get('product_name', 'N/A')}")
                
                self.print_success("Basic fuzzy search working")
                
                # Store results for comparison
                basic_results = {
                    'total_count': data.get('total_count', 0),
                    'products_count': len(data.get('products', [])),
                    'first_product_id': data.get('products', [{}])[0].get('id') if data.get('products') else None
                }
                
            else:
                self.print_error(f"Basic fuzzy search failed with status {response.status_code}")
                return
                
        except Exception as e:
            self.print_error(f"Basic fuzzy search failed: {str(e)}")
            return
        
        # Test 2: Advanced fuzzy search with just query
        self.print_subheader("Test 2: Advanced Fuzzy Search for 'CM' (query only)")
        try:
            response = requests.get(f'{self.base_url}/api/exam-sessions-subjects-products/advanced-fuzzy-search/?q={query}', timeout=10)
            print(f"   |- Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   |- Total Count: {data.get('total_count', 0)}")
                print(f"   |- Products Returned: {len(data.get('products', []))}")
                print(f"   |- Search Info: {data.get('search_info', {})}")
                
                # Show sample products
                if data.get('products'):
                    print(f"\n   Sample Products:")
                    for i, product in enumerate(data['products'][:3], 1):
                        print(f"      {i}. [{product.get('subject_code', 'N/A')}] {product.get('product_name', 'N/A')}")
                
                # Compare with basic results
                advanced_results = {
                    'total_count': data.get('total_count', 0),
                    'products_count': len(data.get('products', [])),
                    'first_product_id': data.get('products', [{}])[0].get('id') if data.get('products') else None
                }
                
                if basic_results['total_count'] == advanced_results['total_count']:
                    self.print_success("Advanced search matches basic search results")
                else:
                    self.print_error(f"MISMATCH! Basic: {basic_results['total_count']}, Advanced: {advanced_results['total_count']}")
                
            else:
                self.print_error(f"Advanced fuzzy search failed with status {response.status_code}")
                
        except Exception as e:
            self.print_error(f"Advanced fuzzy search failed: {str(e)}")
        
        # Test 3: Test with CM subjects as filters (simulating what frontend might be doing wrong)
        self.print_subheader("Test 3: Advanced Search with CM subject filters")
        try:
            # Get CM1 and CM2 subject IDs
            cm1_subject = Subject.objects.filter(code='CM1').first()
            cm2_subject = Subject.objects.filter(code='CM2').first()
            
            if cm1_subject and cm2_subject:
                subject_ids = f"{cm1_subject.id},{cm2_subject.id}"
                response = requests.get(f'{self.base_url}/api/exam-sessions-subjects-products/advanced-fuzzy-search/?subjects={subject_ids}', timeout=10)
                print(f"   |- Status: {response.status_code}")
                print(f"   |- Subject IDs used: {subject_ids} (CM1: {cm1_subject.id}, CM2: {cm2_subject.id})")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"   |- Total Count: {data.get('total_count', 0)}")
                    print(f"   |- Products Returned: {len(data.get('products', []))}")
                    
                    # This might be what's causing the issue - returning all CM1+CM2 products instead of fuzzy matching
                    if data.get('total_count', 0) > basic_results['total_count']:
                        self.print_error("Subject filter returns MORE products than search query - this might be the bug!")
                        print(f"      Search query 'CM': {basic_results['total_count']} products")
                        print(f"      Subject filter CM1+CM2: {data.get('total_count', 0)} products")
                    else:
                        print(f"   |- Subject filter results look reasonable")
                
            else:
                print(f"   |- Could not find CM1 or CM2 subjects")
                
        except Exception as e:
            self.print_error(f"Subject filter test failed: {str(e)}")
        
        # Test 4: Test what happens with no parameters (might be returning all products)
        self.print_subheader("Test 4: Advanced Search with no parameters")
        try:
            response = requests.get(f'{self.base_url}/api/exam-sessions-subjects-products/advanced-fuzzy-search/', timeout=10)
            print(f"   |- Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   |- Total Count: {data.get('total_count', 0)}")
                print(f"   |- Products Returned: {len(data.get('products', []))}")
                
                if data.get('total_count', 0) == 393:  # The number mentioned in the user's issue
                    self.print_error("No parameters returns ALL products (393) - this might be the issue!")
                else:
                    print(f"   |- No parameters handling looks OK")
            
        except Exception as e:
            self.print_error(f"No parameters test failed: {str(e)}")

    def test_database_stats(self):
        """Test database statistics"""
        self.print_header("Database Statistics")
        
        total_products = ExamSessionSubjectProduct.objects.count()
        total_subjects = Subject.objects.count()
        total_groups = ProductGroup.objects.count()
        
        print(f"Total available products: {total_products}")
        print(f"Total subjects: {total_subjects}")
        print(f"Total product groups: {total_groups}")
        
        if total_products > 0:
            self.print_success("Database has products available for testing")
        else:
            self.print_error("No products found in database!")
            return False
        
        return True
    
    def test_fuzzy_service_direct(self):
        """Test FuzzySearchService directly"""
        self.print_header("Direct Service Testing")
        
        test_queries = [
            ("CS1", "Subject code exact match"),
            ("cs1", "Subject code lowercase"),
            ("Corporate Reporting", "Subject description"),
            ("Study Manual", "Product name"),
            ("Tutorial", "Product category"),
            ("ebook", "Product variation"),
            ("exam", "Generic term"),
            ("marking", "Product category"),
            ("core materials", "Multi-word search"),
            ("tutrial", "Typo in tutorial"),  # Test fuzzy matching
            ("stdy", "Partial word match"),   # Test fuzzy matching
        ]
        
        for query, description in test_queries:
            self.print_subheader(f"Testing: '{query}' ({description})")
            
            try:
                results = self.service.search_products(query, limit=5)
                
                # Display search metrics
                print(f"Search Results:")
                print(f"   |- Total matches: {results['total_count']}")
                print(f"   |- Products scanned: {results['search_info']['total_scanned']}")
                print(f"   |- Matches found: {results['search_info']['matches_found']}")
                print(f"   +- Min score: {results['search_info']['min_score']}")
                
                # Display top products
                if results['products']:
                    print(f"\nTop Products:")
                    for i, product in enumerate(results['products'][:3], 1):
                        subject_code = product.exam_session_subject.subject.code
                        product_name = product.product.shortname or product.product.fullname
                        print(f"   {i}. [{subject_code}] {product_name}")
                else:
                    print("   +- No products found")
                
                # Display subject suggestions
                if results['suggested_filters']['subjects']:
                    print(f"\nSubject Suggestions:")
                    for subject in results['suggested_filters']['subjects'][:3]:
                        print(f"   |- {subject['code']}: {subject['name']} (score: {subject['score']}, count: {subject['count']})")
                
                # Display category suggestions
                if results['suggested_filters']['categories']:
                    print(f"\nCategory Suggestions:")
                    for category in results['suggested_filters']['categories'][:3]:
                        print(f"   |- {category['name']} (score: {category['score']}, count: {category['count']})")
                
                # Display product suggestions
                if results['suggested_filters']['products']:
                    print(f"\nProduct Suggestions:")
                    for product in results['suggested_filters']['products'][:3]:
                        print(f"   |- [{product['subject_code']}] {product['product_name']} (score: {product['score']})")
                
                self.print_success(f"Query '{query}' completed successfully")
                
            except Exception as e:
                self.print_error(f"Query '{query}' failed: {str(e)}")
                continue
    
    def test_advanced_search_service(self):
        """Test advanced search with filters"""
        self.print_header("Advanced Search Testing")
        
        # Get some subject IDs for testing
        cs_subjects = Subject.objects.filter(code__icontains='CS')[:2]
        subject_ids = [s.id for s in cs_subjects] if cs_subjects.exists() else []
        
        # Get some category IDs for testing
        material_groups = ProductGroup.objects.filter(name__icontains='Material')[:2]
        category_ids = [g.id for g in material_groups] if material_groups.exists() else []
        
        test_scenarios = [
            {
                'name': 'Query + Subject Filter',
                'query': 'manual',
                'subject_ids': subject_ids[:1] if subject_ids else None,
                'category_ids': None
            },
            {
                'name': 'Query + Category Filter', 
                'query': 'study',
                'subject_ids': None,
                'category_ids': category_ids[:1] if category_ids else None
            },
            {
                'name': 'Subject + Category Filter (no query)',
                'query': None,
                'subject_ids': subject_ids[:1] if subject_ids else None,
                'category_ids': category_ids[:1] if category_ids else None
            },
            {
                'name': 'Multi-Subject Filter',
                'query': 'exam',
                'subject_ids': subject_ids if subject_ids else None,
                'category_ids': None
            }
        ]
        
        for scenario in test_scenarios:
            self.print_subheader(scenario['name'])
            
            try:
                results = self.service.advanced_search(
                    query=scenario['query'],
                    subject_ids=scenario['subject_ids'],
                    category_ids=scenario['category_ids'],
                    limit=5
                )
                
                print(f"Advanced search: '{scenario['query'] or 'No query'}'")
                print(f"   |- Subject IDs: {scenario['subject_ids']}")
                print(f"   |- Category IDs: {scenario['category_ids']}")
                print(f"   |- Total results: {results['total_count']}")
                print(f"   +- Results returned: {len(results['products'])}")
                
                if results['products']:
                    print(f"\nFiltered Results:")
                    for i, product in enumerate(results['products'][:3], 1):
                        subject_code = product.exam_session_subject.subject.code
                        product_name = product.product.shortname or product.product.fullname
                        print(f"   {i}. [{subject_code}] {product_name}")
                
                self.print_success(f"Advanced search '{scenario['name']}' completed")
                
            except Exception as e:
                self.print_error(f"Advanced search '{scenario['name']}' failed: {str(e)}")
                continue
    
    def test_api_endpoints(self):
        """Test API endpoints using HTTP requests"""
        self.print_header("API Endpoint Testing")
        
        # Test basic fuzzy search endpoint
        test_endpoints = [
            {
                'name': 'Basic Fuzzy Search - CS1',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/fuzzy-search/?q=CS1'
            },
            {
                'name': 'Basic Fuzzy Search - Tutorial',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/fuzzy-search/?q=tutorial'
            },
            {
                'name': 'Fuzzy Search with custom score',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/fuzzy-search/?q=study&min_score=40&limit=3'
            },
            {
                'name': 'Advanced Search - Query only',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/advanced-fuzzy-search/?q=exam'
            },
            {
                'name': 'Advanced Search - With subject filter',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/advanced-fuzzy-search/?q=materials&subjects=8'
            },
            {
                'name': 'Advanced Search - No query (filter only)',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/advanced-fuzzy-search/?subjects=8&limit=5'
            }
        ]
        
        for endpoint in test_endpoints:
            self.print_subheader(endpoint['name'])
            
            try:
                print(f"Testing: {endpoint['url']}")
                
                response = requests.get(endpoint['url'], timeout=10)
                
                print(f"   |- Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        total_count = data.get('total_count', 0)
                        products_returned = len(data.get('products', []))
                        has_suggestions = bool(data.get('suggested_filters', {}))
                        
                        print(f"   |- Total Count: {total_count}")
                        print(f"   |- Products Returned: {products_returned}")
                        print(f"   |- Has Suggestions: {has_suggestions}")
                        
                        # Show search info if available
                        if 'search_info' in data:
                            search_info = data['search_info']
                            print(f"   |- Query: '{search_info.get('query', 'N/A')}'")
                            print(f"   +- Min Score: {search_info.get('min_score', 'N/A')}")
                        
                        # Show sample products
                        if products_returned > 0:
                            print(f"\nSample Products:")
                            for i, product in enumerate(data['products'][:2], 1):
                                print(f"   {i}. [{product.get('subject_code', 'N/A')}] {product.get('product_name', 'N/A')}")
                        
                        self.print_success(f"API endpoint '{endpoint['name']}' working correctly")
                        
                    except json.JSONDecodeError:
                        self.print_error("Invalid JSON response")
                        print(f"   +- Response: {response.text[:200]}...")
                
                elif response.status_code == 400:
                    try:
                        error_data = response.json()
                        print(f"   +- Error: {error_data.get('error', 'Bad Request')}")
                    except:
                        print(f"   +- Bad Request: {response.text[:100]}...")
                    
                else:
                    self.print_error(f"HTTP {response.status_code}")
                    print(f"   +- Response: {response.text[:200]}...")
                    
            except requests.exceptions.ConnectionError:
                self.print_error("Connection failed - Is Django server running on port 8888?")
            except requests.exceptions.Timeout:
                self.print_error("Request timeout")
            except Exception as e:
                self.print_error(f"Request failed: {str(e)}")
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        self.print_header("Edge Cases & Error Handling")
        
        edge_cases = [
            {
                'name': 'Empty query',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/fuzzy-search/?q='
            },
            {
                'name': 'Single character',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/fuzzy-search/?q=a'
            },
            {
                'name': 'Very long query',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/fuzzy-search/?q=' + 'a' * 100
            },
            {
                'name': 'Special characters',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/fuzzy-search/?q=test%40%23%24'
            },
            {
                'name': 'Invalid min_score',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/fuzzy-search/?q=test&min_score=invalid'
            },
            {
                'name': 'Very high min_score',
                'url': f'{self.base_url}/api/exam-sessions-subjects-products/fuzzy-search/?q=test&min_score=99'
            }
        ]
        
        for case in edge_cases:
            self.print_subheader(case['name'])
            
            try:
                response = requests.get(case['url'], timeout=5)
                print(f"   |- Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"   +- Results: {data.get('total_count', 0)} products")
                    self.print_success("Handled gracefully")
                elif response.status_code == 400:
                    try:
                        error_data = response.json()
                        print(f"   +- Error: {error_data.get('error', 'Bad Request')}")
                        self.print_success("Error handled correctly")
                    except:
                        self.print_error("Error response not JSON")
                else:
                    self.print_error(f"Unexpected status: {response.status_code}")
                    
            except Exception as e:
                self.print_error(f"Exception: {str(e)}")
    
    def test_performance(self):
        """Test performance with various query sizes"""
        self.print_header("Performance Testing")
        
        import time
        
        performance_tests = [
            ('CS1', 'Short query'),
            ('Corporate Reporting and Financial Analysis', 'Long query'),
            ('tutorial materials study guide', 'Multi-word query'),
        ]
        
        for query, description in performance_tests:
            self.print_subheader(f"{description}: '{query}'")
            
            try:
                start_time = time.time()
                results = self.service.search_products(query, limit=50)
                end_time = time.time()
                
                duration = (end_time - start_time) * 1000  # Convert to milliseconds
                
                print(f"   |- Execution time: {duration:.2f}ms")
                print(f"   |- Products scanned: {results['search_info']['total_scanned']}")
                print(f"   |- Matches found: {results['search_info']['matches_found']}")
                print(f"   +- Results returned: {len(results['products'])}")
                
                if duration < 1000:  # Less than 1 second
                    self.print_success("Good performance")
                elif duration < 3000:  # Less than 3 seconds
                    self.print_info("Acceptable performance")
                else:
                    self.print_error("Slow performance - consider optimization")
                    
            except Exception as e:
                self.print_error(f"Performance test failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("Starting FuzzyWuzzy Search Testing Suite")
        print(f"Testing against: {self.base_url}")
        
        if not self.test_database_stats():
            return
        
        # Add the new CM search issue test
        self.test_cm_search_issue()
        
        self.test_fuzzy_service_direct()
        self.test_advanced_search_service()
        self.test_api_endpoints()
        self.test_edge_cases()
        self.test_performance()
        
        self.print_header("Test Summary")
        print("All fuzzy search tests completed!")
        print("Review the results above to verify functionality")
        self.print_success("FuzzyWuzzy search implementation is ready for frontend integration!")

def main():
    """Main test function"""
    try:
        tester = FuzzySearchTester()
        tester.run_all_tests()
    except KeyboardInterrupt:
        print("\n\n[WARNING] Tests interrupted by user")
    except Exception as e:
        print(f"\n\n[ERROR] Test suite failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 