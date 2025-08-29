#!/usr/bin/env python3
"""
Comprehensive test script for the unified search endpoint
Tests all scenarios including validation, error handling, and response structure
"""
import requests
import json
import time

# Server configuration
BASE_URL = "http://localhost:8888"
ENDPOINT = f"{BASE_URL}/api/products/unified-search/"

def test_basic_request():
    """Test basic unified search request works"""
    print("\n[TEST] Testing basic unified search request...")
    
    data = {
        "filters": {
            "subjects": ["CM2"]
        },
        "pagination": {
            "page": 1,
            "page_size": 20
        }
    }
    
    try:
        response = requests.post(ENDPOINT, json=data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("[PASS] Basic request successful")
            print(f"[INFO] Response structure: {list(result.keys())}")
            
            # Validate response structure
            required_keys = ['products', 'filter_counts', 'pagination']
            for key in required_keys:
                if key in result:
                    print(f"[PASS] {key} present in response")
                else:
                    print(f"[FAIL] {key} missing from response")
            
            # Check pagination structure
            if 'pagination' in result:
                pagination = result['pagination']
                pagination_keys = ['page', 'page_size', 'total_count', 'has_next', 'has_previous']
                for key in pagination_keys:
                    if key in pagination:
                        print(f"[PASS] pagination.{key} = {pagination[key]}")
                    else:
                        print(f"[FAIL] pagination.{key} missing")
            
            # Check filter_counts structure
            if 'filter_counts' in result:
                filter_counts = result['filter_counts']
                filter_types = ['subjects', 'categories', 'product_types', 'products', 'modes_of_delivery']
                for filter_type in filter_types:
                    if filter_type in filter_counts:
                        count = len(filter_counts[filter_type]) if isinstance(filter_counts[filter_type], dict) else 0
                        print(f"[PASS] filter_counts.{filter_type} has {count} options")
                    else:
                        print(f"[FAIL] filter_counts.{filter_type} missing")
            
            return True
        else:
            print(f"[FAIL] Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"[FAIL] Request failed with error: {str(e)}")
        return False

def test_empty_request():
    """Test unified search with empty filters"""
    print("\n[TEST] Testing empty request...")
    
    data = {}
    
    try:
        response = requests.post(ENDPOINT, json=data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("[PASS] Empty request handled successfully")
            print(f"[INFO] Found {len(result.get('products', []))} products")
            return True
        else:
            print(f"[FAIL] Empty request failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"[FAIL] Empty request failed with error: {str(e)}")
        return False

def test_invalid_pagination():
    """Test unified search with invalid pagination parameters"""
    print("\n[TEST] Testing invalid pagination...")
    
    data = {
        "pagination": {
            "page": -1,  # Invalid page
            "page_size": 200  # Too large
        }
    }
    
    try:
        response = requests.post(ENDPOINT, json=data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            result = response.json()
            print("[PASS] Invalid pagination correctly rejected")
            print(f"[INFO] Error message: {result.get('error', 'No error message')}")
            return True
        else:
            print(f"[FAIL] Invalid pagination should have returned 400, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"[FAIL] Invalid pagination test failed with error: {str(e)}")
        return False

def test_complex_filters():
    """Test unified search with multiple filter types"""
    print("\n[TEST] Testing complex filters...")
    
    data = {
        "filters": {
            "subjects": ["CM2", "SA1"],
            "categories": ["Materials", "Bundle"],
            "product_types": ["Core Study Material"],
            "modes_of_delivery": ["Ebook", "Printed"]
        },
        "pagination": {
            "page": 1,
            "page_size": 10
        },
        "options": {
            "include_bundles": True,
            "include_analytics": False
        }
    }
    
    try:
        response = requests.post(ENDPOINT, json=data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("[PASS] Complex filters handled successfully")
            print(f"[INFO] Found {len(result.get('products', []))} products")
            print(f"[INFO] Pagination: {result.get('pagination', {})}")
            return True
        else:
            print(f"[FAIL] Complex filters failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"[FAIL] Complex filters test failed with error: {str(e)}")
        return False

def run_all_tests():
    """Run all test scenarios"""
    print("[TEST] Starting comprehensive unified search endpoint tests...")
    print("=" * 60)
    
    tests = [
        ("Basic Request", test_basic_request),
        ("Empty Request", test_empty_request), 
        ("Invalid Pagination", test_invalid_pagination),
        ("Complex Filters", test_complex_filters),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n{'=' * 60}")
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"[FAIL] Test '{test_name}' failed with unexpected error: {str(e)}")
            results[test_name] = False
    
    # Summary
    print(f"\n{'=' * 60}")
    print("[SUMMARY] TEST RESULTS")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results.items():
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\n[INFO] Total: {len(results)} tests")
    print(f"[INFO] Passed: {passed}")
    print(f"[INFO] Failed: {failed}")
    
    if failed == 0:
        print("\n[SUCCESS] ALL TESTS PASSED! Unified search endpoint is working correctly.")
    else:
        print(f"\n[ERROR] {failed} test(s) failed. Please review the implementation.")
    
    return failed == 0

if __name__ == "__main__":
    try:
        success = run_all_tests()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n[WARN] Tests interrupted by user")
        exit(1)