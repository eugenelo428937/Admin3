#!/usr/bin/env python
"""
Master Test Runner: All Phase 4 Tests

Runs all Phase 4 integration test scripts (T027-T032) in sequence
and provides a comprehensive summary.
"""
import os
import sys
import subprocess
from datetime import datetime

TESTS = [
    {
        'id': 'T027',
        'name': 'UK Customer Single Digital Product',
        'script': 'test_phase4_t027_uk_single_product.py'
    },
    {
        'id': 'T028',
        'name': 'SA Customer Multiple Mixed Products',
        'script': 'test_phase4_t028_sa_multiple_products.py'
    },
    {
        'id': 'T029',
        'name': 'ROW Customer Zero VAT',
        'script': 'test_phase4_t029_row_zero_vat.py'
    },
    {
        'id': 'T030',
        'name': 'Quantity Change Recalculation',
        'script': 'test_phase4_t030_quantity_change.py'
    },
    {
        'id': 'T031',
        'name': 'Item Removal Recalculation',
        'script': 'test_phase4_t031_item_removal.py'
    },
    {
        'id': 'T032',
        'name': 'Error Handling and Retry',
        'script': 'test_phase4_t032_error_handling.py'
    }
]

def run_test(test_info):
    """Run a single test script and return the result."""
    script_path = os.path.join(os.path.dirname(__file__), test_info['script'])

    if not os.path.exists(script_path):
        print(f"   Script not found: {test_info['script']}")
        return False

    try:
        # Run the test script
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=60
        )

        # Check if test passed (exit code 0)
        passed = result.returncode == 0

        return passed, result.stdout, result.stderr

    except subprocess.TimeoutExpired:
        print(f"   Test timed out after 60 seconds")
        return False, "", "Test timeout"

    except Exception as e:
        print(f"   Exception running test: {str(e)}")
        return False, "", str(e)

def main():
    print("=" * 80)
    print("PHASE 4 INTEGRATION TEST SUITE")
    print("=" * 80)
    print(f"\nStarted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total Tests: {len(TESTS)}")
    print()

    results = []

    for i, test_info in enumerate(TESTS, 1):
        print(f"\n[{i}/{len(TESTS)}] Running {test_info['id']}: {test_info['name']}")
        print("-" * 80)

        passed, stdout, stderr = run_test(test_info)

        results.append({
            'test_id': test_info['id'],
            'name': test_info['name'],
            'passed': passed,
            'stdout': stdout,
            'stderr': stderr
        })

        if passed:
            print(f"   PASSED")
        else:
            print(f"   FAILED")
            if stderr:
                print(f"\n   Error Output:")
                for line in stderr.split('\n')[:10]:  # Show first 10 lines
                    print(f"   {line}")

    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    passed_count = sum(1 for r in results if r['passed'])
    failed_count = len(results) - passed_count

    print(f"\nTotal Tests: {len(results)}")
    print(f"Passed: {passed_count}")
    print(f"Failed: {failed_count}")
    print(f"Success Rate: {(passed_count/len(results)*100):.1f}%")

    print("\nDetailed Results:")
    for result in results:
        status = "PASS" if result['passed'] else "FAIL"
        print(f"  {status} - {result['test_id']}: {result['name']}")

    print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

    # Verbose output option
    if '--verbose' in sys.argv or '-v' in sys.argv:
        print("\n" + "=" * 80)
        print("VERBOSE OUTPUT")
        print("=" * 80)

        for result in results:
            if not result['passed']:
                print(f"\n{result['test_id']} - {result['name']}")
                print("-" * 80)
                print(result['stdout'])
                if result['stderr']:
                    print("\nErrors:")
                    print(result['stderr'])

    # Exit with appropriate code
    sys.exit(0 if failed_count == 0 else 1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest suite interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nFatal error running test suite: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
