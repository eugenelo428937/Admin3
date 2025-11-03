#!/usr/bin/env python
"""
Manual test script for HK Address Lookup endpoint

Run this to verify the endpoint works correctly with mocked responses.
"""

import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.test import Client
from unittest.mock import patch, Mock
from utils.tests.fixtures.hk_als_responses import (
    HK_ALS_SUCCESS_2D,
    HK_ALS_SUCCESS_3D,
    CONTRACT_RESPONSE_2D,
)

def test_successful_search():
    """Test 1: Successful address search"""
    print("\n" + "="*70)
    print("TEST 1: Successful HK Address Search")
    print("="*70)

    client = Client()

    with patch('requests.get') as mock_get:
        # Mock HK ALS API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = HK_ALS_SUCCESS_2D
        mock_get.return_value = mock_response

        # Call our endpoint
        response = client.get('/api/utils/address-lookup-hk/', {'search_text': 'central'})

        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")

        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ SUCCESS")
            print(f"   - Found {data['total']} addresses")
            print(f"   - Search text: {data['search_text']}")
            if data['addresses']:
                print(f"   - First address: {data['addresses'][0]['formatted_address']}")
        else:
            print(f"\n❌ FAILED: Expected 200, got {response.status_code}")
            return False

    return True

def test_missing_parameter():
    """Test 2: Missing search_text parameter"""
    print("\n" + "="*70)
    print("TEST 2: Missing search_text Parameter")
    print("="*70)

    client = Client()
    response = client.get('/api/utils/address-lookup-hk/')

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    if response.status_code == 400:
        data = response.json()
        print(f"\n✅ SUCCESS")
        print(f"   - Error message: {data['error']}")
        print(f"   - Allow manual: {data['allow_manual']}")
    else:
        print(f"\n❌ FAILED: Expected 400, got {response.status_code}")
        return False

    return True

def test_service_unavailable():
    """Test 3: Service unavailable (timeout)"""
    print("\n" + "="*70)
    print("TEST 3: Service Unavailable (Timeout)")
    print("="*70)

    client = Client()

    with patch('requests.get') as mock_get:
        # Mock timeout exception
        import requests
        mock_get.side_effect = requests.exceptions.Timeout("Connection timeout")

        # Call our endpoint
        response = client.get('/api/utils/address-lookup-hk/', {'search_text': 'test'})

        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")

        if response.status_code == 500:
            data = response.json()
            print(f"\n✅ SUCCESS")
            print(f"   - Error message: {data['error']}")
            print(f"   - Allow manual: {data['allow_manual']}")
            print(f"   - Details: {data.get('details', 'N/A')}")
        else:
            print(f"\n❌ FAILED: Expected 500, got {response.status_code}")
            return False

    return True

def test_3d_address():
    """Test 4: 3D address (residential estate)"""
    print("\n" + "="*70)
    print("TEST 4: 3D Address (Residential Estate)")
    print("="*70)

    client = Client()

    with patch('requests.get') as mock_get:
        # Mock HK ALS API response with 3D address
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = HK_ALS_SUCCESS_3D
        mock_get.return_value = mock_response

        # Call our endpoint
        response = client.get('/api/utils/address-lookup-hk/', {'search_text': 'mei foo'})

        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")

        if response.status_code == 200:
            data = response.json()
            address = data['addresses'][0]
            print(f"\n✅ SUCCESS")
            print(f"   - Address is 3D: {address['is_3d']}")
            print(f"   - Building: {address['building']}")
            print(f"   - Formatted: {address['formatted_address']}")

            # Verify 3D address has flat/floor info
            if address['is_3d'] and ('flat' in address['building'].lower() or 'floor' in address['building'].lower()):
                print(f"   - Contains flat/floor information ✓")
            else:
                print(f"   - WARNING: 3D address missing flat/floor info")
        else:
            print(f"\n❌ FAILED: Expected 200, got {response.status_code}")
            return False

    return True

def test_validation():
    """Test 5: Search text validation"""
    print("\n" + "="*70)
    print("TEST 5: Search Text Validation")
    print("="*70)

    client = Client()

    # Test too short (< 2 chars)
    print("\nTest 5a: Search text too short (1 character)")
    response = client.get('/api/utils/address-lookup-hk/', {'search_text': 'a'})
    print(f"   Status: {response.status_code}, Error: {response.json().get('error')}")

    if response.status_code != 400:
        print(f"   ❌ FAILED: Expected 400")
        return False
    print(f"   ✅ PASS")

    # Test valid length (2 chars)
    print("\nTest 5b: Minimum valid search text (2 characters)")
    with patch('requests.get') as mock_get:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = HK_ALS_SUCCESS_2D
        mock_get.return_value = mock_response

        response = client.get('/api/utils/address-lookup-hk/', {'search_text': 'ab'})
        print(f"   Status: {response.status_code}")

        if response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200")
            return False
        print(f"   ✅ PASS")

    print(f"\n✅ All validation tests passed")
    return True

def main():
    """Run all tests"""
    print("\n" + "#"*70)
    print("# HK ADDRESS LOOKUP ENDPOINT - MANUAL TESTING")
    print("#"*70)

    tests = [
        test_successful_search,
        test_missing_parameter,
        test_service_unavailable,
        test_3d_address,
        test_validation,
    ]

    results = []
    for test_func in tests:
        try:
            result = test_func()
            results.append((test_func.__name__, result))
        except Exception as e:
            print(f"\n❌ EXCEPTION in {test_func.__name__}: {str(e)}")
            results.append((test_func.__name__, False))

    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")

    print(f"\n{passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())
