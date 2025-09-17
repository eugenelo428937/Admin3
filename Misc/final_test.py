#!/usr/bin/env python3
"""
Final test to verify the filtering system is working correctly
"""

import requests
import json

def test_filtering_fix():
    """Final comprehensive test"""
    
    base_url = "http://127.0.0.1:8888"
    
    print("FINAL FILTERING SYSTEM TEST")
    print("=" * 50)
    
    # Test the exact scenarios from the user's report
    tests = [
        {
            "name": "All products (no filter)",
            "url": f"{base_url}/api/products/current/list/",
            "expected": "Should return 394 mixed products"
        },
        {
            "name": "CS2 filter (problematic case)",
            "url": f"{base_url}/api/products/current/list/?subject=CS2",
            "expected": "Should return only CS2 products, not mixed"
        },
        {
            "name": "CS2 with page size (working case)",
            "url": f"{base_url}/api/products/current/list/?subject=CS2&page=1&page_size=20",
            "expected": "Should return 22 CS2 products"
        },
        {
            "name": "CB1 filter test",
            "url": f"{base_url}/api/products/current/list/?subject=CB1&page=1&page_size=20",
            "expected": "Should return only CB1 products"
        }
    ]
    
    results = []
    
    for test in tests:
        print(f"\n{test['name']}")
        print(f"   URL: {test['url']}")
        print(f"   Expected: {test['expected']}")
        
        try:
            response = requests.get(test['url'])
            if response.status_code == 200:
                data = response.json()
                total = data.get('count', 0)
                returned = len(data.get('results', []))
                
                # Analyze subjects
                subjects = {}
                for item in data.get('results', []):
                    subject = item.get('subject_code', 'Unknown')
                    subjects[subject] = subjects.get(subject, 0) + 1
                
                print(f"   Status: 200")
                print(f"   Total: {total}, Returned: {returned}")
                print(f"   Subjects: {subjects}")
                
                # Determine if filtering worked
                if '?subject=CS2' in test['url']:
                    if len(subjects) == 1 and 'CS2' in subjects:
                        print(f"   PASS: Only CS2 products returned")
                        results.append(True)
                    else:
                        print(f"   FAIL: Mixed subjects or no CS2")
                        results.append(False)
                elif '?subject=CB1' in test['url']:
                    if len(subjects) == 1 and 'CB1' in subjects:
                        print(f"   PASS: Only CB1 products returned")
                        results.append(True)
                    else:
                        print(f"   FAIL: Mixed subjects or no CB1")
                        results.append(False)
                else:
                    # No filter case
                    if total > 300 and len(subjects) > 5:
                        print(f"   PASS: Unfiltered results as expected")
                        results.append(True)
                    else:
                        print(f"   FAIL: Too few results for unfiltered call")
                        results.append(False)
            else:
                print(f"   FAIL: HTTP {response.status_code}")
                print(f"   Error: {response.text[:200]}")
                results.append(False)
                
        except Exception as e:
            print(f"   FAIL: Request error - {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 50)
    print("FINAL RESULTS")
    print("=" * 50)
    
    passed = sum(results)
    total_tests = len(results)
    
    print(f"Tests Passed: {passed}/{total_tests}")
    
    if passed == total_tests:
        print("SUCCESS: All filtering tests passed!")
        print("The navigation with product filtering is working correctly")
    else:
        print("ISSUES FOUND: Some filtering tests failed")
        print("The navigation filtering still needs attention")
    
    return passed == total_tests

if __name__ == "__main__":
    test_filtering_fix()