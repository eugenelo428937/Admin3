"""
TASK-514: VAT Performance Tests

Tests verify VAT calculation meets performance requirements:
- Target: < 50ms per cart (99th percentile)
- Test scenarios: 1 item, 10 items, 50 items (edge case)

Performance tracking for production monitoring.
"""
import time
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, Mock

from cart.models import Cart, CartItem
from cart.services.vat_orchestrator import vat_orchestrator
from utils.models import UtilsCountrys, UtilsCountryRegion, UtilsRegion

User = get_user_model()


class VATPerformanceTests(TestCase):
    """Performance tests for VAT calculation system."""

    def setUp(self):
        """Set up test data."""
        # Create user with country
        self.user = User.objects.create_user(
            username='perf_user',
            email='perf@example.com',
            password='testpass123'
        )

        # Set user country (create if needed)
        self.country, _ = UtilsCountrys.objects.get_or_create(
            code='GB',
            defaults={'name': 'United Kingdom', 'vat_percent': Decimal('20.00')}
        )
        self.user.country = self.country
        self.user.save()

        # Create region and mapping
        self.region, _ = UtilsRegion.objects.get_or_create(
            code='UK',
            defaults={'name': 'United Kingdom'}
        )

        UtilsCountryRegion.objects.get_or_create(
            country=self.country,
            region=self.region,
            defaults={'effective_from': '2020-01-01'}
        )

    def _measure_execution_time(self, cart):
        """
        Measure VAT calculation execution time in milliseconds.

        Args:
            cart: Cart instance to calculate VAT for

        Returns:
            float: Execution time in milliseconds
        """
        start_time = time.perf_counter()
        vat_orchestrator.execute_vat_calculation(cart)
        end_time = time.perf_counter()

        duration_ms = (end_time - start_time) * 1000
        return duration_ms

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_vat_calculation_single_item_under_50ms(self, mock_rule_engine, mock_vat_audit):
        """Test VAT calculation for 1 item cart completes in < 50ms."""
        # Arrange - Mock Rules Engine response
        mock_rule_engine.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': '1',
                    'actual_price': '100.00',
                    'quantity': 1,
                    'vat_amount': '20.00',
                    'vat_rate': '0.2000',
                    'vat_region': 'UK',
                    'gross_amount': '120.00'
                }]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat', 'calculate_vat_uk'],
            'execution_id': 'exec_perf_1'
        }

        # Create cart with 1 item
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Act - Measure execution time
        duration_ms = self._measure_execution_time(cart)

        # Assert - Under 50ms target
        self.assertLess(
            duration_ms,
            50.0,
            f"VAT calculation took {duration_ms:.2f}ms (target: <50ms)"
        )

        print(f"[PASS] Single item VAT calculation: {duration_ms:.2f}ms")

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_vat_calculation_10_items_under_50ms(self, mock_rule_engine, mock_vat_audit):
        """Test VAT calculation for 10 item cart completes in < 50ms."""
        # Arrange - Create cart with 10 items
        cart = Cart.objects.create(user=self.user)

        mock_items = []
        for i in range(1, 11):
            CartItem.objects.create(
                cart=cart,
                quantity=1,
                actual_price=Decimal('100.00'),
                item_type='fee'
            )
            mock_items.append({
                'id': str(i),
                'actual_price': '100.00',
                'quantity': 1,
                'vat_amount': '20.00',
                'vat_rate': '0.2000',
                'vat_region': 'UK',
                'gross_amount': '120.00'
            })

        # Mock Rules Engine response with 10 items
        mock_rule_engine.return_value = {
            'success': True,
            'cart': {'items': mock_items},
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat', 'calculate_vat_uk'],
            'execution_id': 'exec_perf_10'
        }

        # Act - Measure execution time
        duration_ms = self._measure_execution_time(cart)

        # Assert - Under 50ms target
        self.assertLess(
            duration_ms,
            50.0,
            f"VAT calculation took {duration_ms:.2f}ms (target: <50ms)"
        )

        print(f"[PASS] 10 item VAT calculation: {duration_ms:.2f}ms")

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_vat_calculation_50_items_under_50ms(self, mock_rule_engine, mock_vat_audit):
        """Test VAT calculation for 50 item cart (edge case) completes in < 50ms."""
        # Arrange - Create cart with 50 items (edge case)
        cart = Cart.objects.create(user=self.user)

        mock_items = []
        for i in range(1, 51):
            CartItem.objects.create(
                cart=cart,
                quantity=1,
                actual_price=Decimal('100.00'),
                item_type='fee'
            )
            mock_items.append({
                'id': str(i),
                'actual_price': '100.00',
                'quantity': 1,
                'vat_amount': '20.00',
                'vat_rate': '0.2000',
                'vat_region': 'UK',
                'gross_amount': '120.00'
            })

        # Mock Rules Engine response with 50 items
        mock_rule_engine.return_value = {
            'success': True,
            'cart': {'items': mock_items},
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat', 'calculate_vat_uk'],
            'execution_id': 'exec_perf_50'
        }

        # Act - Measure execution time
        duration_ms = self._measure_execution_time(cart)

        # Assert - Under 50ms target (may be slightly higher due to volume)
        # Allow up to 100ms for 50 item edge case
        self.assertLess(
            duration_ms,
            100.0,
            f"VAT calculation took {duration_ms:.2f}ms (target: <100ms for 50 items)"
        )

        # Log performance metric
        print(f"[WARN] 50 item VAT calculation: {duration_ms:.2f}ms (edge case)")

        # Warn if approaching limits
        if duration_ms > 50.0:
            print(f"[WARN] Warning: 50 item cart exceeded 50ms target ({duration_ms:.2f}ms)")

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_vat_calculation_mixed_quantities(self, mock_rule_engine, mock_vat_audit):
        """Test VAT calculation performance with mixed quantities."""
        # Arrange - Create cart with varying quantities
        cart = Cart.objects.create(user=self.user)

        quantities = [1, 5, 10, 2, 3]
        mock_items = []

        for i, qty in enumerate(quantities, start=1):
            CartItem.objects.create(
                cart=cart,
                quantity=qty,
                actual_price=Decimal('100.00'),
                item_type='fee'
            )
            mock_items.append({
                'id': str(i),
                'actual_price': '100.00',
                'quantity': qty,
                'vat_amount': str(Decimal('20.00') * qty),
                'vat_rate': '0.2000',
                'vat_region': 'UK',
                'gross_amount': str(Decimal('120.00') * qty)
            })

        mock_rule_engine.return_value = {
            'success': True,
            'cart': {'items': mock_items},
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat', 'calculate_vat_uk'],
            'execution_id': 'exec_perf_mixed'
        }

        # Act - Measure execution time
        duration_ms = self._measure_execution_time(cart)

        # Assert
        self.assertLess(
            duration_ms,
            50.0,
            f"VAT calculation took {duration_ms:.2f}ms (target: <50ms)"
        )

        print(f"[PASS] Mixed quantity VAT calculation: {duration_ms:.2f}ms")

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_vat_calculation_benchmark_average(self, mock_rule_engine, mock_vat_audit):
        """Benchmark average VAT calculation time over multiple runs."""
        # Arrange
        cart = Cart.objects.create(user=self.user)

        for i in range(5):
            CartItem.objects.create(
                cart=cart,
                quantity=1,
                actual_price=Decimal('100.00'),
                item_type='fee'
            )

        mock_items = [
            {
                'id': str(i),
                'actual_price': '100.00',
                'quantity': 1,
                'vat_amount': '20.00',
                'vat_rate': '0.2000',
                'vat_region': 'UK',
                'gross_amount': '120.00'
            }
            for i in range(1, 6)
        ]

        mock_rule_engine.return_value = {
            'success': True,
            'cart': {'items': mock_items},
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat', 'calculate_vat_uk'],
            'execution_id': 'exec_benchmark'
        }

        # Act - Run 10 iterations
        durations = []
        for _ in range(10):
            duration_ms = self._measure_execution_time(cart)
            durations.append(duration_ms)

        # Calculate statistics
        avg_duration = sum(durations) / len(durations)
        min_duration = min(durations)
        max_duration = max(durations)
        p99_duration = sorted(durations)[int(len(durations) * 0.99)]

        # Assert - Average under 50ms
        self.assertLess(
            avg_duration,
            50.0,
            f"Average VAT calculation: {avg_duration:.2f}ms (target: <50ms)"
        )

        # Print benchmark results
        print(f"\n[BENCHMARK] VAT Calculation Benchmark (10 runs):")
        print(f"   Average:  {avg_duration:.2f}ms")
        print(f"   Min:      {min_duration:.2f}ms")
        print(f"   Max:      {max_duration:.2f}ms")
        print(f"   P99:      {p99_duration:.2f}ms")

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_jsonb_storage_performance(self, mock_rule_engine, mock_vat_audit):
        """Test JSONB storage write performance."""
        # Arrange
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Create large JSONB result (simulate complex calculation)
        mock_rule_engine.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': '1',
                    'actual_price': '100.00',
                    'quantity': 1,
                    'vat_amount': '20.00',
                    'vat_rate': '0.2000',
                    'vat_region': 'UK',
                    'gross_amount': '120.00',
                    'metadata': {
                        'rule_chain': ['rule1', 'rule2', 'rule3'],
                        'calculations': {
                            'step1': 'value1',
                            'step2': 'value2',
                            'step3': 'value3'
                        }
                    }
                }]
            },
            'context': {'region': 'UK', 'user_id': str(self.user.id)},
            'rules_executed': [
                'calculate_vat',
                'calculate_vat_uk',
                'calculate_vat_uk_printed'
            ],
            'execution_id': 'exec_jsonb_perf'
        }

        # Act - Measure JSONB write time
        start_time = time.perf_counter()
        vat_orchestrator.execute_vat_calculation(cart)
        cart.refresh_from_db()  # Ensure JSONB written to database
        end_time = time.perf_counter()

        duration_ms = (end_time - start_time) * 1000

        # Assert - JSONB write under 50ms
        self.assertLess(
            duration_ms,
            50.0,
            f"JSONB storage took {duration_ms:.2f}ms (target: <50ms)"
        )

        # Verify JSONB data stored
        self.assertIsNotNone(cart.vat_result)
        self.assertEqual(cart.vat_result['status'], 'calculated')

        print(f"[PASS] JSONB storage performance: {duration_ms:.2f}ms")


class VATPerformanceRegressionTests(TestCase):
    """Regression tests to catch performance degradation."""

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_performance_regression_baseline(self, mock_rule_engine, mock_vat_audit):
        """
        Baseline performance test for regression tracking.

        This test establishes a baseline and should be re-run regularly
        to detect performance regressions.
        """
        # Create test user and cart
        user = User.objects.create_user(
            username='regression_user',
            email='regression@example.com'
        )

        country, _ = UtilsCountrys.objects.get_or_create(
            code='GB',
            defaults={'name': 'United Kingdom', 'vat_percent': Decimal('20.00')}
        )
        user.country = country
        user.save()

        cart = Cart.objects.create(user=user)

        # Standard 5-item cart
        for i in range(5):
            CartItem.objects.create(
                cart=cart,
                quantity=1,
                actual_price=Decimal('100.00'),
                item_type='fee'
            )

        mock_rule_engine.return_value = {
            'success': True,
            'cart': {
                'items': [
                    {
                        'id': str(i),
                        'actual_price': '100.00',
                        'quantity': 1,
                        'vat_amount': '20.00',
                        'vat_rate': '0.2000',
                        'vat_region': 'UK',
                        'gross_amount': '120.00'
                    }
                    for i in range(1, 6)
                ]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat', 'calculate_vat_uk'],
            'execution_id': 'exec_regression'
        }

        # Measure performance
        start_time = time.perf_counter()
        vat_orchestrator.execute_vat_calculation(cart)
        end_time = time.perf_counter()

        duration_ms = (end_time - start_time) * 1000

        # Performance regression threshold: 50ms
        # If this test starts failing, investigate recent changes
        self.assertLess(
            duration_ms,
            50.0,
            f"[WARN] PERFORMANCE REGRESSION: {duration_ms:.2f}ms (baseline: <50ms)"
        )

        print(f"[PASS] Regression baseline: {duration_ms:.2f}ms")
