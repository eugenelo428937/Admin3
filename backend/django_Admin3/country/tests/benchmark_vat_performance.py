"""
Performance benchmarks for VAT calculation functions.

Target: < 50ms per VAT calculation operation
"""
import sys
import os
import time
from decimal import Decimal, ROUND_HALF_UP

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from country.vat_rates import map_country_to_region, get_vat_rate


def calculate_vat_amount(net_amount, vat_rate):
    """Calculate VAT amount with proper rounding."""
    amount = Decimal(str(net_amount)) * Decimal(str(vat_rate))
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def benchmark_function(func, *args, iterations=10000):
    """Run function multiple times and measure average execution time."""
    start = time.perf_counter()
    for _ in range(iterations):
        func(*args)
    end = time.perf_counter()

    total_time = (end - start) * 1000  # Convert to milliseconds
    avg_time = total_time / iterations
    return avg_time, total_time


def run_benchmarks():
    """Run all VAT function performance benchmarks."""
    print("=" * 70)
    print("VAT FUNCTION PERFORMANCE BENCHMARKS")
    print("=" * 70)
    print(f"Target: < 50ms per operation")
    print(f"Iterations per test: 10,000")
    print()

    results = []

    # Benchmark 1: map_country_to_region
    print("1. map_country_to_region('GB')")
    avg, total = benchmark_function(map_country_to_region, 'GB')
    print(f"   Average: {avg:.6f}ms per call")
    print(f"   Total: {total:.2f}ms for 10,000 calls")
    print(f"   Status: {'PASS' if avg < 50 else 'FAIL'}")
    results.append(('map_country_to_region', avg, avg < 50))
    print()

    # Benchmark 2: map_country_to_region (unknown country)
    print("2. map_country_to_region('US') [ROW fallback]")
    avg, total = benchmark_function(map_country_to_region, 'US')
    print(f"   Average: {avg:.6f}ms per call")
    print(f"   Total: {total:.2f}ms for 10,000 calls")
    print(f"   Status: {'PASS' if avg < 50 else 'FAIL'}")
    results.append(('map_country_to_region (ROW)', avg, avg < 50))
    print()

    # Benchmark 3: get_vat_rate (standard)
    print("3. get_vat_rate('UK', {})")
    avg, total = benchmark_function(get_vat_rate, 'UK', {})
    print(f"   Average: {avg:.6f}ms per call")
    print(f"   Total: {total:.2f}ms for 10,000 calls")
    print(f"   Status: {'PASS' if avg < 50 else 'FAIL'}")
    results.append(('get_vat_rate (standard)', avg, avg < 50))
    print()

    # Benchmark 4: get_vat_rate (with classification)
    print("4. get_vat_rate('UK', {'is_ebook': True})")
    avg, total = benchmark_function(get_vat_rate, 'UK', {'is_ebook': True})
    print(f"   Average: {avg:.6f}ms per call")
    print(f"   Total: {total:.2f}ms for 10,000 calls")
    print(f"   Status: {'PASS' if avg < 50 else 'FAIL'}")
    results.append(('get_vat_rate (classification)', avg, avg < 50))
    print()

    # Benchmark 5: calculate_vat_amount
    print("5. calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))")
    avg, total = benchmark_function(
        calculate_vat_amount,
        Decimal('100.00'),
        Decimal('0.20')
    )
    print(f"   Average: {avg:.6f}ms per call")
    print(f"   Total: {total:.2f}ms for 10,000 calls")
    print(f"   Status: {'PASS' if avg < 50 else 'FAIL'}")
    results.append(('calculate_vat_amount', avg, avg < 50))
    print()

    # Benchmark 6: Full VAT calculation flow
    print("6. Full flow: map_country + get_vat_rate + calculate_vat_amount")
    def full_vat_flow():
        region = map_country_to_region('GB')
        rate = get_vat_rate(region, {'is_ebook': False})
        amount = calculate_vat_amount(Decimal('100.00'), rate)
        return amount

    avg, total = benchmark_function(full_vat_flow)
    print(f"   Average: {avg:.6f}ms per call")
    print(f"   Total: {total:.2f}ms for 10,000 calls")
    print(f"   Status: {'PASS' if avg < 50 else 'FAIL'}")
    results.append(('Full VAT flow', avg, avg < 50))
    print()

    # Summary
    print("=" * 70)
    print("PERFORMANCE SUMMARY")
    print("=" * 70)

    passed = sum(1 for _, _, status in results if status)
    total_tests = len(results)

    for name, avg_time, status in results:
        status_str = 'PASS' if status else 'FAIL'
        print(f"{status_str:4s} | {name:35s} | {avg_time:.6f}ms")

    print("=" * 70)
    print(f"Results: {passed}/{total_tests} benchmarks passed")
    print(f"All functions well under 50ms target: {'YES' if passed == total_tests else 'NO'}")
    print()

    return passed == total_tests


if __name__ == '__main__':
    success = run_benchmarks()
    exit(0 if success else 1)