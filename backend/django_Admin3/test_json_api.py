#!/usr/bin/env python
"""
Test HK address lookup with the correct JSON API endpoint
"""

import requests
import json

def test_query(search_text):
    """Test with JSON API"""
    print(f"\n{'='*80}")
    print(f"Query: '{search_text}'")
    print('='*80)

    # Use the JSON API endpoint
    url = 'https://geodata.gov.hk/gs/api/v1.0.0/locationSearch'

    try:
        response = requests.get(url, params={'q': search_text}, timeout=10)

        print(f"\nStatus: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")

        if response.status_code == 200:
            data = response.json()
            print(f"\nTotal Results: {len(data)}")

            # Show first 3 results
            for i, addr in enumerate(data[:3], 1):
                print(f"\n--- Result {i} ---")
                print(f"Address EN: {addr.get('addressEN', 'N/A')}")
                print(f"Name EN: {addr.get('nameEN', 'N/A')}")
                print(f"District EN: {addr.get('districtEN', 'N/A')}")
                print(f"Address ZH: {addr.get('addressZH', 'N/A')}")
                print(f"Name ZH: {addr.get('nameZH', 'N/A')}")

                # Check if it's a 3D address (has specific format)
                address_en = addr.get('addressEN', '')
                name_en = addr.get('nameEN', '')

                # Detect 3D format (flat/floor indicators)
                is_3d = any(keyword in address_en.upper() for keyword in ['FLAT', 'FLOOR', 'BLK', 'BLOCK'])

                print(f"3D Address: {is_3d}")

            # Show full JSON for first result
            if data:
                print(f"\n--- Full JSON (First Result) ---")
                print(json.dumps(data[0], indent=2, ensure_ascii=False))

        else:
            print(f"Error: {response.status_code}")
            print(response.text[:500])

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

if __name__ == '__main__':
    print("#" * 80)
    print("# TESTING HK ADDRESS LOOKUP - JSON API")
    print("#" * 80)
    print("\nAPI: https://geodata.gov.hk/gs/api/v1.0.0/locationSearch")

    queries = [
        "22 yin on street",
        "FLT A,16/F,ABBEY COURT PICTORIAL"
    ]

    for query in queries:
        test_query(query)

    print("\n" + "="*80)
    print("TESTING COMPLETE")
    print("="*80)
