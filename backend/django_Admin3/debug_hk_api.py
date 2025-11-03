#!/usr/bin/env python
"""
Debug script to see what HK ALS API actually returns
"""

import requests

def test_api_endpoint(search_text):
    """Make direct API call and show raw response"""
    print(f"\n{'='*80}")
    print(f"Testing: '{search_text}'")
    print('='*80)

    # Try the URL from research documentation
    urls_to_try = [
        ('https://www.als.gov.hk/lookup', 'q'),
        ('https://www.als.ogcio.gov.hk/lookup', 'q'),
        ('https://geodata.gov.hk/gs/api/v1.0.0/locationSearch', 'q'),
    ]

    for url, param_name in urls_to_try:
        print(f"\nTrying: {url}")
        try:
            response = requests.get(url, params={param_name: search_text}, timeout=10)

            print(f"Status Code: {response.status_code}")
            print(f"Content-Type: {response.headers.get('Content-Type')}")
            print(f"Content Length: {len(response.content)} bytes")

            # Show first 500 chars of response
            print(f"\nFirst 500 characters of response:")
            print("-" * 80)
            print(response.text[:500])
            print("-" * 80)

            # Try to parse as JSON
            try:
                json_data = response.json()
                print(f"\n✅ Response is valid JSON")
                print(f"Keys: {list(json_data.keys()) if isinstance(json_data, dict) else 'N/A'}")
                return True
            except Exception as e:
                print(f"\n❌ Not JSON: {str(e)}")

        except Exception as e:
            print(f"❌ Error: {str(e)}")

    return False

if __name__ == '__main__':
    queries = [
        "22 yin on street",
        "central government"
    ]

    for query in queries:
        test_api_endpoint(query)
