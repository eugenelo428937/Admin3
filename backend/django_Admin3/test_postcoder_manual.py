"""
Manual testing script for Postcoder.com address lookup integration.

Run this script to test the postcoder endpoint with various postcodes.
"""

import requests
import json
import time

BASE_URL = "http://localhost:8888"
ENDPOINT = "/api/utils/postcoder-address-lookup/"


def test_lookup(postcode, description):
    """Test address lookup for a given postcode"""
    print(f"\n{'='*60}")
    print(f"TEST: {description}")
    print(f"Postcode: {postcode}")
    print('='*60)

    start_time = time.time()

    try:
        response = requests.get(
            f"{BASE_URL}{ENDPOINT}",
            params={'postcode': postcode}
        )

        elapsed_ms = (time.time() - start_time) * 1000

        print(f"Status Code: {response.status_code}")
        print(f"Client-side Time: {elapsed_ms:.2f}ms")

        if response.status_code == 200:
            data = response.json()
            print(f"\nCache Hit: {data.get('cache_hit')}")
            print(f"Server Response Time: {data.get('response_time_ms')}ms")
            print(f"Addresses Found: {len(data.get('addresses', []))}")

            if data.get('addresses'):
                print("\nFirst Address:")
                first = data['addresses'][0]
                print(f"  Line 1: {first.get('line_1')}")
                print(f"  Line 2: {first.get('line_2', '')}")
                print(f"  Town/City: {first.get('town_or_city')}")
                print(f"  County: {first.get('county', '')}")
                print(f"  Postcode: {first.get('postcode')}")
        else:
            print(f"\nError Response:")
            print(json.dumps(response.json(), indent=2))

    except requests.exceptions.RequestException as e:
        print(f"ERROR: {e}")

    return response if 'response' in locals() else None


def main():
    """Run all manual tests"""
    print("\n" + "="*60)
    print("POSTCODER.COM ADDRESS LOOKUP - MANUAL TESTING")
    print("="*60)

    # Test 1: Valid postcode (cache miss)
    test_lookup('SW1A1AA', 'Valid UK Postcode - First Request (Cache Miss)')

    # Small delay to see separate log entries
    time.sleep(0.5)

    # Test 2: Same postcode (should be cache hit)
    test_lookup('SW1A1AA', 'Same Postcode - Second Request (Cache Hit)')

    time.sleep(0.5)

    # Test 3: Another valid postcode
    test_lookup('OX49EL', 'Different Valid Postcode (Oxford)')

    time.sleep(0.5)

    # Test 4: London postcode
    test_lookup('EC1A1BB', 'London Postcode (Bank of England)')

    time.sleep(0.5)

    # Test 5: Manchester postcode
    test_lookup('M13NQ', 'Manchester Postcode')

    time.sleep(0.5)

    # Test 6: Lowercase postcode (should work - auto cleaned)
    test_lookup('sw1a 1aa', 'Lowercase with Space (Should Auto-Clean)')

    time.sleep(0.5)

    # Test 7: Invalid postcode format
    test_lookup('INVALID', 'Invalid Postcode Format')

    time.sleep(0.5)

    # Test 8: Short postcode (< 5 chars, should fail validation)
    test_lookup('SW1', 'Too Short Postcode (Validation Error)')

    print("\n" + "="*60)
    print("TESTING COMPLETE")
    print("="*60)
    print("\nCheck Django logs for detailed information about:")
    print("  - Cache hits/misses")
    print("  - API calls")
    print("  - Response times")
    print("  - Database entries (CachedAddress, AddressLookupLog)")


if __name__ == "__main__":
    main()
