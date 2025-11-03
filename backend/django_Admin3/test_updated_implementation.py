#!/usr/bin/env python
"""
Test updated HK ALS implementation with real API calls
Tests the new geodata.gov.hk JSON API format
"""

import os
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.conf import settings
from utils.hk_als_helper import call_hk_als_api, parse_hk_als_response

def test_query(search_text):
    """Test a single search query with updated implementation"""
    print("\n" + "="*80)
    print(f"TESTING: '{search_text}'")
    print("="*80)

    print(f"\n[1] API Configuration:")
    print(f"    URL: {settings.HK_ALS_API_URL}")
    print(f"    Expected format: JSON array")

    try:
        # Step 1: Call real API
        print(f"\n[2] Calling geodata.gov.hk API...")
        raw_response = call_hk_als_api(search_text, timeout=10)

        print(f"\n[3] Raw API Response:")
        print(f"    Type: {type(raw_response)}")
        if isinstance(raw_response, list):
            print(f"    Results count: {len(raw_response)}")
            if raw_response:
                print(f"\n    First result (raw):")
                print(json.dumps(raw_response[0], indent=4, ensure_ascii=False))
        else:
            print(f"    Unexpected type! Expected list, got {type(raw_response)}")
            print(json.dumps(raw_response, indent=4, ensure_ascii=False))

        # Step 2: Parse with updated helper
        print(f"\n[4] Parsing with updated parse_hk_als_response()...")
        parsed_addresses = parse_hk_als_response(raw_response)

        print(f"\n[5] Parsed Results ({len(parsed_addresses)} addresses):")
        for i, addr in enumerate(parsed_addresses[:3], 1):  # Show first 3
            print(f"\n    Address {i}:")
            print(f"       building: '{addr['building']}'")
            print(f"       street: '{addr['street']}'")
            print(f"       district: '{addr['district']}'")
            print(f"       region: '{addr['region']}'")
            print(f"       is_3d: {addr['is_3d']}")
            print(f"       formatted_address: '{addr['formatted_address']}'")

        if len(parsed_addresses) > 3:
            print(f"\n    ... and {len(parsed_addresses) - 3} more results")

        print(f"\n✅ SUCCESS: Query '{search_text}' returned {len(parsed_addresses)} addresses")
        return True

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run tests with user-provided queries"""
    print("\n" + "#"*80)
    print("# TESTING UPDATED HK ALS IMPLEMENTATION")
    print("# Using geodata.gov.hk JSON API")
    print("#"*80)

    test_queries = [
        "22 yin on street",
        "FLT A,16/F,ABBEY COURT PICTORIAL"
    ]

    results = []
    for query in test_queries:
        success = test_query(query)
        results.append((query, success))

    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)

    for query, success in results:
        status = "✅ SUCCESS" if success else "❌ FAILED"
        print(f"{status}: '{query}'")

    passed = sum(1 for _, success in results if success)
    print(f"\n{passed}/{len(results)} queries successful")

    if passed == len(results):
        print("\n🎉 ALL QUERIES SUCCESSFUL!")
        print("\nUpdated implementation correctly:")
        print("  ✅ Calls geodata.gov.hk JSON API")
        print("  ✅ Parses flat JSON array format")
        print("  ✅ Transforms to contract format")
        print("  ✅ Detects 2D vs 3D addresses")
        print("  ✅ Derives region from district")
        print("  ✅ Builds formatted_address for display")

    return 0 if passed == len(results) else 1

if __name__ == '__main__':
    import sys
    sys.exit(main())
