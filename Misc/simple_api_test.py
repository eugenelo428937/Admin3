#!/usr/bin/env python3
"""
Simple API test using requests to verify the actual issue
"""

import requests
import json
from datetime import datetime

def test_api_endpoints():
    """Test the API endpoints directly using HTTP requests"""
    
    base_url = "http://127.0.0.1:8888"  # Django dev server
    
    print("Testing API Endpoints")
    print("=" * 50)
    
    # Test 1: No filter
    print("1. Testing /api/products/current/list/ (no filter)")
    try:
        response = requests.get(f"{base_url}/api/products/current/list/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Total items: {data.get('count', 0)}")
            print(f"   Results returned: {len(data.get('results', []))}")
            
            # Check subject distribution
            subjects = {}
            for item in data.get('results', [])[:10]:  # First 10 items
                subject = item.get('subject_code', 'Unknown')
                subjects[subject] = subjects.get(subject, 0) + 1
            print(f"   Subject distribution (first 10): {subjects}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Request failed: {e}")
    
    print()
    
    # Test 2: CS2 filter
    print("2. Testing /api/products/current/list/?subject=CS2")
    try:
        response = requests.get(f"{base_url}/api/products/current/list/?subject=CS2")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Total items: {data.get('count', 0)}")
            print(f"   Results returned: {len(data.get('results', []))}")
            
            # Check if all results are CS2
            subjects = {}
            for item in data.get('results', []):
                subject = item.get('subject_code', 'Unknown')
                subjects[subject] = subjects.get(subject, 0) + 1
            print(f"   Subject distribution: {subjects}")
            
            # Check if filtering worked
            if data.get('count', 0) < 100 and 'CS2' in subjects:
                print("   ✓ Filtering appears to be working!")
            else:
                print("   ✗ Filtering not working - too many results or no CS2 products")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Request failed: {e}")
    
    print()
    
    # Test 3: Frontend simulation with page size
    print("3. Testing /api/products/current/list/?subject=CS2&page=1&page_size=20")
    try:
        response = requests.get(f"{base_url}/api/products/current/list/?subject=CS2&page=1&page_size=20")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Total items: {data.get('count', 0)}")
            print(f"   Page size: {data.get('page_size', 0)}")
            print(f"   Results returned: {len(data.get('results', []))}")
            
            # Detailed analysis
            subjects = {}
            for item in data.get('results', []):
                subject = item.get('subject_code', 'Unknown')
                subjects[subject] = subjects.get(subject, 0) + 1
            print(f"   Subject distribution: {subjects}")
            
            # Save first few results for inspection
            if data.get('results'):
                print(f"   First result subject: {data['results'][0].get('subject_code', 'N/A')}")
                print(f"   First result name: {data['results'][0].get('product_name', 'N/A')}")
            
            # This is the exact call that should work
            if len(subjects) == 1 and 'CS2' in subjects:
                print("   ✓ Perfect! Only CS2 products returned")
            elif 'CS2' in subjects and len(subjects) > 1:
                print(f"   ⚠ Partial filtering - CS2 found but mixed with: {list(subjects.keys())}")
            else:
                print("   ✗ Filtering failed - no CS2 products or wrong subjects")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Request failed: {e}")

if __name__ == "__main__":
    print("Make sure Django server is running on http://127.0.0.1:8888")
    print("Starting API tests...\n")
    test_api_endpoints()