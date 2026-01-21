"""
Test cases for Cart VAT integration.
Following TDD methodology: RED → GREEN → REFACTOR

Test Coverage:
- Calculate VAT for cart with items
- Store VAT result in cart.vat_result
- Retrieve VAT calculations from cart
- Update VAT when items change
- Handle different billing countries
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import date
from cart.models import Cart, CartItem
from utils.models import UtilsRegion, UtilsCountrys, UtilsCountryRegion

User = get_user_model()


class CartVATIntegrationTestCase(TestCase):
    """Test cases for Cart VAT integration (TDD RED Phase)."""

    def setUp(self):
        """Set up test data."""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # Get or create VAT regions and countries
        self.region_uk, _ = UtilsRegion.objects.get_or_create(
            code='UK',
            defaults={'name': 'United Kingdom'}
        )
        self.region_row, _ = UtilsRegion.objects.get_or_create(
            code='ROW',
            defaults={'name': 'Rest of World'}
        )

        self.country_gb, _ = UtilsCountrys.objects.get_or_create(
            code='GB',
            defaults={
                'name': 'United Kingdom',
                'vat_percent': Decimal('20.00')
            }
        )
        self.country_us, _ = UtilsCountrys.objects.get_or_create(
            code='US',
            defaults={
                'name': 'United States',
                'vat_percent': Decimal('0.00')
            }
        )

        UtilsCountryRegion.objects.get_or_create(
            country=self.country_gb,
            effective_from=date(2020, 1, 1),
            defaults={'region': self.region_uk}
        )
        UtilsCountryRegion.objects.get_or_create(
            country=self.country_us,
            effective_from=date(2020, 1, 1),
            defaults={'region': self.region_row}
        )

        # Create cart (we'll mock cart items without full product hierarchy)
        self.cart = Cart.objects.create(user=self.user)

    def test_cart_has_vat_result_field(self):
        """Test that Cart model has vat_result JSONField."""
        self.assertTrue(hasattr(self.cart, 'vat_result'))
        self.assertIsNone(self.cart.vat_result)

    def test_calculate_vat_for_cart_method_exists(self):
        """Test that Cart has calculate_vat method."""
        self.assertTrue(hasattr(self.cart, 'calculate_vat'))
        self.assertTrue(callable(getattr(self.cart, 'calculate_vat')))

    def test_calculate_vat_for_empty_cart(self):
        """Test VAT calculation for empty cart."""
        result = self.cart.calculate_vat(country_code='GB')

        self.assertIsNotNone(result)
        self.assertEqual(result['country_code'], 'GB')
        self.assertEqual(Decimal(str(result['total_net_amount'])), Decimal('0.00'))
        self.assertEqual(Decimal(str(result['total_vat_amount'])), Decimal('0.00'))

    def test_calculate_vat_for_cart_with_items(self):
        """Test VAT calculation for cart with items."""
        # Add items to cart using fee type (no product FK required)
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=2,
            actual_price=Decimal('50.00')
        )

        result = self.cart.calculate_vat(country_code='GB')

        self.assertEqual(result['country_code'], 'GB')
        # VAT rate is stored as decimal (0.20), not percentage (20.00)
        self.assertEqual(Decimal(str(result['vat_rate'])), Decimal('0.20'))
        self.assertEqual(Decimal(str(result['total_net_amount'])), Decimal('100.00'))
        self.assertEqual(Decimal(str(result['total_vat_amount'])), Decimal('20.00'))
        self.assertEqual(Decimal(str(result['total_gross_amount'])), Decimal('120.00'))

    def test_calculate_and_save_vat_stores_result(self):
        """Test that calculate_and_save_vat stores result in vat_result field."""
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        self.cart.calculate_and_save_vat(country_code='GB')
        self.cart.refresh_from_db()

        self.assertIsNotNone(self.cart.vat_result)
        self.assertIn('country_code', self.cart.vat_result)
        self.assertEqual(self.cart.vat_result['country_code'], 'GB')
        self.assertIn('total_vat_amount', self.cart.vat_result)

    def test_vat_calculation_updates_when_items_change(self):
        """Test that VAT updates when cart items change."""
        item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        self.cart.calculate_and_save_vat(country_code='GB')
        self.cart.refresh_from_db()

        initial_vat = Decimal(str(self.cart.vat_result['total_vat_amount']))
        self.assertEqual(initial_vat, Decimal('10.00'))

        # Update quantity
        item.quantity = 2
        item.save()

        self.cart.calculate_and_save_vat(country_code='GB')
        self.cart.refresh_from_db()

        updated_vat = Decimal(str(self.cart.vat_result['total_vat_amount']))
        self.assertEqual(updated_vat, Decimal('20.00'))

    def test_vat_calculation_for_different_countries(self):
        """Test VAT calculation for different countries."""
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )

        # UK VAT (20%)
        self.cart.calculate_and_save_vat(country_code='GB')
        self.cart.refresh_from_db()
        gb_vat = Decimal(str(self.cart.vat_result['total_vat_amount']))
        self.assertEqual(gb_vat, Decimal('20.00'))

        # US VAT (0%)
        self.cart.calculate_and_save_vat(country_code='US')
        self.cart.refresh_from_db()
        us_vat = Decimal(str(self.cart.vat_result['total_vat_amount']))
        self.assertEqual(us_vat, Decimal('0.00'))

    def test_get_vat_calculation_returns_stored_result(self):
        """Test get_vat_calculation returns stored result."""
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        self.cart.calculate_and_save_vat(country_code='GB')

        result = self.cart.get_vat_calculation()
        self.assertIsNotNone(result)
        self.assertEqual(result['country_code'], 'GB')

    def test_get_vat_calculation_returns_none_if_not_calculated(self):
        """Test get_vat_calculation returns None if VAT not calculated."""
        result = self.cart.get_vat_calculation()
        self.assertIsNone(result)

    def test_calculate_vat_with_multiple_items(self):
        """Test VAT calculation with multiple different items."""
        # Add multiple fee items (no product hierarchy required)
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=2,
            actual_price=Decimal('50.00')
        )
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('30.00')
        )

        result = self.cart.calculate_vat(country_code='GB')

        # Total: (50*2) + (30*1) = 130
        # VAT: 130 * 0.20 = 26
        self.assertEqual(Decimal(str(result['total_net_amount'])), Decimal('130.00'))
        self.assertEqual(Decimal(str(result['total_vat_amount'])), Decimal('26.00'))
        self.assertEqual(Decimal(str(result['total_gross_amount'])), Decimal('156.00'))

    def test_vat_calculation_error_handling(self):
        """Test VAT calculation with invalid country code falls back gracefully."""
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Invalid country code falls back to 0% VAT (ROW) gracefully
        result = self.cart.calculate_vat(country_code='XX')
        # Should return valid result structure (not error)
        self.assertIn('country_code', result.keys())
        self.assertEqual(result['country_code'], 'XX')
        # Falls back to 0% VAT rate
        self.assertEqual(Decimal(str(result['vat_rate'])), Decimal('0.00'))
        self.assertEqual(Decimal(str(result['total_vat_amount'])), Decimal('0.00'))


class CartVATPhase4IntegrationTestCase(TestCase):
    """
    Phase 4 Cart VAT Integration Tests (T027-T032)
    Following 6 scenarios from quickstart.md
    TDD RED Phase: These tests use Phase 4 methods and should pass
    """

    def setUp(self):
        """Set up test data for Phase 4 integration tests."""
        # Create test user
        self.user = User.objects.create_user(
            username='phase4_test_user',
            email='phase4@test.com',
            password='testpass123'
        )

        # Create cart
        self.cart = Cart.objects.create(user=self.user)

    # T027: Scenario 1 - UK customer single digital product
    def test_uk_customer_single_digital_product(self):
        """
        T027: UK customer adds single digital product (£50)
        Expected: net=£50, VAT(20%)=£10, gross=£60
        """
        from unittest.mock import patch
        from decimal import Decimal

        # Mock rules engine to return UK VAT for digital product
        with patch('rules_engine.services.rule_engine.rule_engine') as mock_re:
            mock_re.execute.return_value = {
                'cart_item': {
                    'vat_amount': Decimal('10.00'),
                    'gross_amount': Decimal('60.00')
                },
                'vat': {
                    'region': 'UK',
                    'rate': Decimal('0.2000')
                }
            }

            # Add digital product (£50)
            CartItem.objects.create(
                cart=self.cart,
                item_type='fee',  # Using fee type for simplicity
                quantity=1,
                actual_price=Decimal('50.00')
            )

            # Calculate VAT for all items (Phase 4 method)
            result = self.cart.calculate_vat_for_all_items(
                country_code='GB',
                update_items=True
            )

            # Verify result structure
            self.assertTrue(result.get('success'))
            self.assertEqual(len(result.get('items')), 1)

            # Verify item VAT calculation
            item_result = result['items'][0]
            self.assertEqual(Decimal(item_result['net_amount']), Decimal('50.00'))
            self.assertEqual(Decimal(item_result['vat_amount']), Decimal('10.00'))
            self.assertEqual(Decimal(item_result['gross_amount']), Decimal('60.00'))
            self.assertEqual(item_result['vat_region'], 'UK')
            self.assertEqual(Decimal(item_result['vat_rate']), Decimal('0.2000'))

            # Verify totals
            self.assertEqual(Decimal(result['total_net_amount']), Decimal('50.00'))
            self.assertEqual(Decimal(result['total_vat_amount']), Decimal('10.00'))
            self.assertEqual(Decimal(result['total_gross_amount']), Decimal('60.00'))

            # Verify VAT breakdown
            vat_breakdown = result.get('vat_breakdown', [])
            self.assertEqual(len(vat_breakdown), 1)
            uk_breakdown = vat_breakdown[0]
            self.assertEqual(uk_breakdown['region'], 'UK')
            self.assertEqual(Decimal(uk_breakdown['amount']), Decimal('10.00'))

    # T028: Scenario 2 - SA customer multiple mixed products
    def test_sa_customer_multiple_mixed_products(self):
        """
        T028: SA customer adds Printed (R500) + Digital (R300 × 2)
        Expected: net=R1100, VAT(15%)=R165, gross=R1265
        """
        from unittest.mock import patch
        from decimal import Decimal

        with patch('rules_engine.services.rule_engine.rule_engine') as mock_re:
            # Mock returns SA VAT (15%) for both products
            mock_re.execute.side_effect = [
                {
                    'cart_item': {
                        'vat_amount': Decimal('75.00'),
                        'gross_amount': Decimal('575.00')
                    },
                    'vat': {
                        'region': 'SA',
                        'rate': Decimal('0.1500')
                    }
                },
                {
                    'cart_item': {
                        'vat_amount': Decimal('90.00'),
                        'gross_amount': Decimal('690.00')
                    },
                    'vat': {
                        'region': 'SA',
                        'rate': Decimal('0.1500')
                    }
                }
            ]

            # Add Printed product (R500)
            CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('500.00')
            )

            # Add Digital product (R300 × 2 = R600)
            CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=2,
                actual_price=Decimal('300.00')
            )

            # Calculate VAT
            result = self.cart.calculate_vat_for_all_items(
                country_code='ZA',
                update_items=True
            )

            # Verify success
            self.assertTrue(result.get('success'))
            self.assertEqual(len(result.get('items')), 2)

            # Verify totals
            self.assertEqual(Decimal(result['total_net_amount']), Decimal('1100.00'))
            self.assertEqual(Decimal(result['total_vat_amount']), Decimal('165.00'))
            self.assertEqual(Decimal(result['total_gross_amount']), Decimal('1265.00'))

            # Verify VAT breakdown aggregation (both items same region)
            vat_breakdown = result.get('vat_breakdown', [])
            self.assertEqual(len(vat_breakdown), 1)
            sa_breakdown = vat_breakdown[0]
            self.assertEqual(sa_breakdown['region'], 'SA')
            self.assertEqual(Decimal(sa_breakdown['amount']), Decimal('165.00'))
            self.assertEqual(sa_breakdown['item_count'], 2)

    # T029: Scenario 3 - ROW customer zero VAT
    def test_row_customer_zero_vat(self):
        """
        T029: ROW customer (US) adds product (£100)
        Expected: region=ROW, rate=0.0000, VAT=£0, gross=£100
        """
        from unittest.mock import patch
        from decimal import Decimal

        with patch('rules_engine.services.rule_engine.rule_engine') as mock_re:
            # Mock returns ROW with 0% VAT
            mock_re.execute.return_value = {
                'cart_item': {
                    'vat_amount': Decimal('0.00'),
                    'gross_amount': Decimal('100.00')
                },
                'vat': {
                    'region': 'ROW',
                    'rate': Decimal('0.0000')
                }
            }

            # Add product (£100)
            CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('100.00')
            )

            # Calculate VAT
            result = self.cart.calculate_vat_for_all_items(
                country_code='US',
                update_items=True
            )

            # Verify success
            self.assertTrue(result.get('success'))

            # Verify item VAT
            item_result = result['items'][0]
            self.assertEqual(item_result['vat_region'], 'ROW')
            self.assertEqual(Decimal(item_result['vat_rate']), Decimal('0.0000'))
            self.assertEqual(Decimal(item_result['vat_amount']), Decimal('0.00'))
            self.assertEqual(Decimal(item_result['gross_amount']), Decimal('100.00'))

            # Verify totals (no VAT added)
            self.assertEqual(Decimal(result['total_net_amount']), Decimal('100.00'))
            self.assertEqual(Decimal(result['total_vat_amount']), Decimal('0.00'))
            self.assertEqual(Decimal(result['total_gross_amount']), Decimal('100.00'))

    # T030: Scenario 4 - Quantity change recalculation
    def test_quantity_change_recalculation(self):
        """
        T030: UK customer adds product (£50, qty 1), then updates to qty 3
        Expected: VAT scales from £10 to £30
        """
        from unittest.mock import patch
        from decimal import Decimal

        with patch('rules_engine.services.rule_engine.rule_engine') as mock_re:
            # First calculation: qty 1
            mock_re.execute.return_value = {
                'cart_item': {
                    'vat_amount': Decimal('10.00'),
                    'gross_amount': Decimal('60.00')
                },
                'vat': {
                    'region': 'UK',
                    'rate': Decimal('0.2000')
                }
            }

            # Add product (qty 1, £50)
            item = CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('50.00')
            )

            # Calculate initial VAT
            result1 = self.cart.calculate_vat_for_all_items(
                country_code='GB',
                update_items=True
            )

            # Verify initial calculation
            self.assertEqual(Decimal(result1['total_net_amount']), Decimal('50.00'))
            self.assertEqual(Decimal(result1['total_vat_amount']), Decimal('10.00'))

            # Update quantity to 3
            mock_re.execute.return_value = {
                'cart_item': {
                    'vat_amount': Decimal('30.00'),
                    'gross_amount': Decimal('180.00')
                },
                'vat': {
                    'region': 'UK',
                    'rate': Decimal('0.2000')
                }
            }

            item.quantity = 3
            item.save()

            # Recalculate VAT
            result2 = self.cart.calculate_vat_for_all_items(
                country_code='GB',
                update_items=True
            )

            # Verify updated calculation
            self.assertEqual(Decimal(result2['total_net_amount']), Decimal('150.00'))
            self.assertEqual(Decimal(result2['total_vat_amount']), Decimal('30.00'))
            self.assertEqual(Decimal(result2['total_gross_amount']), Decimal('180.00'))

            # Verify vat_calculated_at was updated
            item.refresh_from_db()
            self.assertIsNotNone(item.vat_calculated_at)

    # T031: Scenario 5 - Item removal recalculation
    def test_item_removal_recalculation(self):
        """
        T031: UK customer adds 2 products (£50 + £100), then removes first
        Expected: VAT updates from £30 to £20
        """
        from unittest.mock import patch
        from decimal import Decimal

        with patch('rules_engine.services.rule_engine.rule_engine') as mock_re:
            # Mock returns for 2 items
            mock_re.execute.side_effect = [
                {
                    'cart_item': {
                        'vat_amount': Decimal('10.00'),
                        'gross_amount': Decimal('60.00')
                    },
                    'vat': {
                        'region': 'UK',
                        'rate': Decimal('0.2000')
                    }
                },
                {
                    'cart_item': {
                        'vat_amount': Decimal('20.00'),
                        'gross_amount': Decimal('120.00')
                    },
                    'vat': {
                        'region': 'UK',
                        'rate': Decimal('0.2000')
                    }
                }
            ]

            # Add 2 products
            item1 = CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('50.00')
            )
            item2 = CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('100.00')
            )

            # Calculate initial VAT
            result1 = self.cart.calculate_vat_for_all_items(
                country_code='GB',
                update_items=True
            )

            # Verify initial total VAT (£10 + £20 = £30)
            self.assertEqual(Decimal(result1['total_vat_amount']), Decimal('30.00'))
            self.assertEqual(len(result1['items']), 2)

            # Remove first item
            item1.delete()

            # Reset mock and set return value for remaining item
            # Must reset side_effect to None, otherwise it takes precedence over return_value
            mock_re.execute.side_effect = None
            mock_re.execute.return_value = {
                'cart_item': {
                    'vat_amount': Decimal('20.00'),
                    'gross_amount': Decimal('120.00')
                },
                'vat': {
                    'region': 'UK',
                    'rate': Decimal('0.2000')
                }
            }

            # Recalculate VAT
            result2 = self.cart.calculate_vat_for_all_items(
                country_code='GB',
                update_items=True
            )

            # Verify updated totals (only item2 remains)
            self.assertEqual(len(result2['items']), 1)
            self.assertEqual(Decimal(result2['total_vat_amount']), Decimal('20.00'))
            self.assertEqual(Decimal(result2['total_gross_amount']), Decimal('120.00'))

    # T032: Scenario 6 - Error handling and manual recalculation
    def test_error_handling_manual_recalculation(self):
        """
        T032: Simulate rules engine error → fallback to 0% VAT → retry → success
        Expected: Error flags set, then cleared on successful retry
        """
        from unittest.mock import patch
        from decimal import Decimal

        # Add product
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Simulate rules engine error
        with patch('rules_engine.services.rule_engine.rule_engine') as mock_re:
            mock_re.execute.side_effect = Exception("Rules engine connection failed")

            # Calculate VAT with error
            result1 = self.cart.calculate_vat_for_all_items(
                country_code='GB',
                update_items=True
            )

            # Verify error result
            self.assertFalse(result1.get('success'))
            self.assertIn('error', result1)

            # Verify error flags set on cart
            self.cart.refresh_from_db()
            self.assertTrue(self.cart.vat_calculation_error)
            self.assertIsNotNone(self.cart.vat_calculation_error_message)

            # Verify fallback to 0% VAT (ROW)
            item = self.cart.items.first()
            self.assertEqual(item.vat_region, 'ROW')
            self.assertEqual(item.vat_rate, Decimal('0.0000'))
            self.assertEqual(item.vat_amount, Decimal('0.00'))

        # Simulate successful retry
        with patch('rules_engine.services.rule_engine.rule_engine') as mock_re:
            mock_re.execute.return_value = {
                'cart_item': {
                    'vat_amount': Decimal('10.00'),
                    'gross_amount': Decimal('60.00')
                },
                'vat': {
                    'region': 'UK',
                    'rate': Decimal('0.2000')
                }
            }

            # Retry calculation
            result2 = self.cart.calculate_vat_for_all_items(
                country_code='GB',
                update_items=True
            )

            # Verify success
            self.assertTrue(result2.get('success'))

            # Verify error flags cleared
            self.cart.refresh_from_db()
            self.assertFalse(self.cart.vat_calculation_error)
            self.assertIsNone(self.cart.vat_calculation_error_message)

            # Verify correct VAT applied
            item.refresh_from_db()
            self.assertEqual(item.vat_region, 'UK')
            self.assertEqual(item.vat_rate, Decimal('0.2000'))
            self.assertEqual(item.vat_amount, Decimal('10.00'))
