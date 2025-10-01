"""
VAT Service Tests - Epic 3 Phase 4
TDD RED/GREEN Phases: Tests for VAT calculation service

Tests the VAT calculation service that orchestrates:
- Per-item VAT calculation
- Cart-level VAT aggregation
- Result persistence to cart.vat_result
- Audit trail creation
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from products.models import Product
from country.models import Country
from userprofile.models import UserProfile
from vat.service import (
    calculate_vat_for_item,
    calculate_vat_for_cart,
    save_vat_result_to_cart,
    create_vat_audit_record
)

User = get_user_model()


class TestCalculateVATForItemFunction(TestCase):
    """Test calculate_vat_for_item function exists."""

    def test_function_exists(self):
        """Test calculate_vat_for_item function is importable."""
        from vat.service import calculate_vat_for_item
        self.assertTrue(callable(calculate_vat_for_item))

    def test_function_callable(self):
        """Test function can be called."""
        self.assertTrue(callable(calculate_vat_for_item))


class TestCalculateVATForItemUK(TestCase):
    """Test VAT calculation for UK region."""

    def test_uk_material_vat_20_percent(self):
        """Test UK material has 20% VAT."""
        item_context = {
            'user': {'region': 'UK'},
            'item': {
                'item_id': 1,
                'product_code': 'MAT-PRINT-CS2',
                'net_amount': Decimal('100.00'),
                'classification': {
                    'is_material': True,
                    'is_ebook': False,
                    'is_digital': False,
                    'product_type': 'material'
                }
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertEqual(result['vat_rate'], Decimal('0.20'))
        self.assertEqual(result['vat_amount'], Decimal('20.00'))
        self.assertEqual(result['item_id'], 1)
        self.assertEqual(result['net_amount'], Decimal('100.00'))

    def test_uk_ebook_vat_zero_percent(self):
        """Test UK eBook has 0% VAT (post-2020 rule)."""
        item_context = {
            'user': {'region': 'UK'},
            'item': {
                'item_id': 2,
                'product_code': 'MAT-EBOOK-CS2',
                'net_amount': Decimal('80.00'),
                'classification': {
                    'is_material': False,
                    'is_ebook': True,
                    'is_digital': True,
                    'product_type': 'ebook'
                }
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertEqual(result['vat_rate'], Decimal('0.00'))
        self.assertEqual(result['vat_amount'], Decimal('0.00'))
        self.assertIn('exemption_reason', result)

    def test_uk_marking_vat_20_percent(self):
        """Test UK marking product has 20% VAT."""
        item_context = {
            'user': {'region': 'UK'},
            'item': {
                'item_id': 3,
                'product_code': 'MARK-CS2',
                'net_amount': Decimal('50.00'),
                'classification': {
                    'is_marking': True,
                    'is_ebook': False,
                    'product_type': 'marking'
                }
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertEqual(result['vat_rate'], Decimal('0.20'))
        self.assertEqual(result['vat_amount'], Decimal('10.00'))


class TestCalculateVATForItemEU(TestCase):
    """Test VAT calculation for EU region."""

    def test_eu_material_vat_zero_percent(self):
        """Test EU material has 0% VAT (ROW treatment)."""
        item_context = {
            'user': {'region': 'EU'},
            'item': {
                'item_id': 4,
                'product_code': 'MAT-PRINT-CS2',
                'net_amount': Decimal('100.00'),
                'classification': {
                    'is_material': True,
                    'is_ebook': False,
                    'product_type': 'material'
                }
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertEqual(result['vat_rate'], Decimal('0.00'))
        self.assertEqual(result['vat_amount'], Decimal('0.00'))

    def test_eu_ebook_vat_zero_percent(self):
        """Test EU eBook has 0% VAT."""
        item_context = {
            'user': {'region': 'EU'},
            'item': {
                'item_id': 5,
                'product_code': 'MAT-EBOOK-CS2',
                'net_amount': Decimal('80.00'),
                'classification': {
                    'is_ebook': True,
                    'is_digital': True,
                    'product_type': 'ebook'
                }
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertEqual(result['vat_rate'], Decimal('0.00'))
        self.assertEqual(result['vat_amount'], Decimal('0.00'))


class TestCalculateVATForItemROW(TestCase):
    """Test VAT calculation for ROW (Rest of World) region."""

    def test_row_material_vat_zero_percent(self):
        """Test ROW material has 0% VAT."""
        item_context = {
            'user': {'region': 'ROW'},
            'item': {
                'item_id': 6,
                'product_code': 'MAT-PRINT-CS2',
                'net_amount': Decimal('100.00'),
                'classification': {
                    'is_material': True,
                    'product_type': 'material'
                }
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertEqual(result['vat_rate'], Decimal('0.00'))
        self.assertEqual(result['vat_amount'], Decimal('0.00'))

    def test_row_digital_vat_zero_percent(self):
        """Test ROW digital products have 0% VAT."""
        item_context = {
            'user': {'region': 'ROW'},
            'item': {
                'item_id': 7,
                'product_code': 'MAT-DIGITAL-CS2',
                'net_amount': Decimal('75.00'),
                'classification': {
                    'is_digital': True,
                    'product_type': 'digital'
                }
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertEqual(result['vat_rate'], Decimal('0.00'))
        self.assertEqual(result['vat_amount'], Decimal('0.00'))


class TestCalculateVATForItemSA(TestCase):
    """Test VAT calculation for South Africa region."""

    def test_sa_material_vat_15_percent(self):
        """Test SA material has 15% VAT."""
        item_context = {
            'user': {'region': 'SA'},
            'item': {
                'item_id': 8,
                'product_code': 'MAT-PRINT-CS2',
                'net_amount': Decimal('100.00'),
                'classification': {
                    'is_material': True,
                    'product_type': 'material'
                }
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertEqual(result['vat_rate'], Decimal('0.15'))
        self.assertEqual(result['vat_amount'], Decimal('15.00'))


class TestCalculateVATForItemReturnStructure(TestCase):
    """Test return structure of calculate_vat_for_item."""

    def test_return_has_required_fields(self):
        """Test result has all required fields."""
        item_context = {
            'user': {'region': 'UK'},
            'item': {
                'item_id': 1,
                'product_code': 'MAT-PRINT-CS2',
                'net_amount': Decimal('100.00'),
                'classification': {'is_material': True, 'product_type': 'material'}
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertIn('item_id', result)
        self.assertIn('net_amount', result)
        self.assertIn('vat_amount', result)
        self.assertIn('vat_rate', result)
        self.assertIn('vat_rule_applied', result)

    def test_vat_rule_applied_format(self):
        """Test vat_rule_applied follows expected format."""
        item_context = {
            'user': {'region': 'UK'},
            'item': {
                'item_id': 1,
                'product_code': 'MAT-EBOOK-CS2',
                'net_amount': Decimal('80.00'),
                'classification': {'is_ebook': True, 'is_digital': True, 'product_type': 'ebook'}
            }
        }

        result = calculate_vat_for_item(item_context)

        # Should be format: "rule_name:version"
        self.assertIn(':', result['vat_rule_applied'])


class TestCalculateVATForItemDecimalPrecision(TestCase):
    """Test decimal precision in VAT calculations."""

    def test_decimal_types_used(self):
        """Test all monetary values use Decimal type."""
        item_context = {
            'user': {'region': 'UK'},
            'item': {
                'item_id': 1,
                'product_code': 'MAT-PRINT-CS2',
                'net_amount': Decimal('100.00'),
                'classification': {'is_material': True, 'product_type': 'material'}
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertIsInstance(result['net_amount'], Decimal)
        self.assertIsInstance(result['vat_amount'], Decimal)
        self.assertIsInstance(result['vat_rate'], Decimal)

    def test_vat_amount_two_decimal_places(self):
        """Test VAT amount is quantized to 2 decimal places."""
        item_context = {
            'user': {'region': 'UK'},
            'item': {
                'item_id': 1,
                'product_code': 'MAT-PRINT-CS2',
                'net_amount': Decimal('33.33'),
                'classification': {'is_material': True, 'product_type': 'material'}
            }
        }

        result = calculate_vat_for_item(item_context)

        # 33.33 * 0.20 = 6.666 → should round to 6.67
        self.assertEqual(result['vat_amount'].as_tuple().exponent, -2)
        self.assertEqual(result['vat_amount'], Decimal('6.67'))

    def test_rounding_half_up(self):
        """Test ROUND_HALF_UP rounding is used."""
        item_context = {
            'user': {'region': 'UK'},
            'item': {
                'item_id': 1,
                'product_code': 'MAT-PRINT-CS2',
                'net_amount': Decimal('10.025'),  # * 0.20 = 2.005 → should round to 2.01
                'classification': {'is_material': True, 'product_type': 'material'}
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertEqual(result['vat_amount'], Decimal('2.01'))


class TestCalculateVATForItemEdgeCases(TestCase):
    """Test edge cases for calculate_vat_for_item."""

    def test_none_region_defaults_to_row(self):
        """Test None region defaults to ROW (0% VAT)."""
        item_context = {
            'user': {'region': None},
            'item': {
                'item_id': 1,
                'product_code': 'MAT-PRINT-CS2',
                'net_amount': Decimal('100.00'),
                'classification': {'is_material': True, 'product_type': 'material'}
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertEqual(result['vat_rate'], Decimal('0.00'))
        self.assertEqual(result['vat_amount'], Decimal('0.00'))

    def test_zero_net_amount(self):
        """Test zero net amount returns zero VAT."""
        item_context = {
            'user': {'region': 'UK'},
            'item': {
                'item_id': 1,
                'product_code': 'MAT-PRINT-CS2',
                'net_amount': Decimal('0.00'),
                'classification': {'is_material': True, 'product_type': 'material'}
            }
        }

        result = calculate_vat_for_item(item_context)

        self.assertEqual(result['vat_amount'], Decimal('0.00'))


# Placeholder test classes for remaining functions (will fail until implemented)

class TestCalculateVATForCartFunction(TestCase):
    """Test calculate_vat_for_cart function exists."""

    def test_function_exists(self):
        """Test calculate_vat_for_cart function is importable."""
        from vat.service import calculate_vat_for_cart
        self.assertTrue(callable(calculate_vat_for_cart))


class TestCalculateVATForCartStructure(TestCase):
    """Test calculate_vat_for_cart return structure."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        self.uk = Country.objects.create(iso_code='GB', name='United Kingdom', phone_code='+44')
        from userprofile.models import UserProfileAddress
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        # Clear existing HOME addresses to avoid duplicates
        UserProfileAddress.objects.filter(user_profile=profile, address_type='HOME').delete()
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='GB',
            address_data={'postcode': 'SW1A 1AA'}
        )

        self.cart = Cart.objects.create(user_id=self.user.id)

    def test_empty_cart_structure(self):
        """Test empty cart returns correct structure."""
        result = calculate_vat_for_cart(self.user, self.cart)

        self.assertIn('status', result)
        self.assertIn('execution_id', result)
        self.assertIn('vat_calculations', result)
        self.assertIn('rules_executed', result)
        self.assertIn('execution_time_ms', result)
        self.assertIn('created_at', result)

    def test_vat_calculations_structure(self):
        """Test vat_calculations section has required structure."""
        result = calculate_vat_for_cart(self.user, self.cart)

        vat_calc = result['vat_calculations']
        self.assertIn('items', vat_calc)
        self.assertIn('totals', vat_calc)
        self.assertIn('region_info', vat_calc)

    def test_totals_structure(self):
        """Test totals section has required fields."""
        result = calculate_vat_for_cart(self.user, self.cart)

        totals = result['vat_calculations']['totals']
        self.assertIn('total_net', totals)
        self.assertIn('total_vat', totals)
        self.assertIn('total_gross', totals)

    def test_region_info_structure(self):
        """Test region_info section has required fields."""
        result = calculate_vat_for_cart(self.user, self.cart)

        region_info = result['vat_calculations']['region_info']
        self.assertIn('country', region_info)
        self.assertIn('region', region_info)


class TestCalculateVATForCartSingleItem(TestCase):
    """Test calculate_vat_for_cart with single item."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        self.uk = Country.objects.create(iso_code='GB', name='United Kingdom', phone_code='+44')
        from userprofile.models import UserProfileAddress
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        # Clear existing HOME addresses to avoid duplicates
        UserProfileAddress.objects.filter(user_profile=profile, address_type='HOME').delete()
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='GB',
            address_data={'postcode': 'SW1A 1AA'}
        )

        self.cart = Cart.objects.create(user_id=self.user.id)

    def test_single_uk_material(self):
        """Test cart with single UK material item."""
        CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-PRINT-CS2',
                'product_name': 'CS2 Material',
                'classification': {
                    'is_material': True,
                    'is_digital': False,
                    'is_ebook': False,
                    'product_type': 'material'
                }
            }
        )

        result = calculate_vat_for_cart(self.user, self.cart)

        # Verify items
        items = result['vat_calculations']['items']
        self.assertEqual(len(items), 1)
        self.assertEqual(Decimal(items[0]['net_amount']), Decimal('100.00'))
        self.assertEqual(Decimal(items[0]['vat_amount']), Decimal('20.00'))
        self.assertEqual(Decimal(items[0]['vat_rate']), Decimal('0.20'))

        # Verify totals
        totals = result['vat_calculations']['totals']
        self.assertEqual(Decimal(totals['total_net']), Decimal('100.00'))
        self.assertEqual(Decimal(totals['total_vat']), Decimal('20.00'))
        self.assertEqual(Decimal(totals['total_gross']), Decimal('120.00'))


class TestCalculateVATForCartMultipleItems(TestCase):
    """Test calculate_vat_for_cart with multiple items."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        self.uk = Country.objects.create(iso_code='GB', name='United Kingdom', phone_code='+44')
        from userprofile.models import UserProfileAddress
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        # Clear existing HOME addresses to avoid duplicates
        UserProfileAddress.objects.filter(user_profile=profile, address_type='HOME').delete()
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='GB',
            address_data={'postcode': 'SW1A 1AA'}
        )

        self.cart = Cart.objects.create(user_id=self.user.id)

    def test_mixed_product_types(self):
        """Test cart with mixed product types (material + ebook)."""
        CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-PRINT-CS2',
                'product_name': 'CS2 Material',
                'classification': {
                    'is_material': True,
                    'is_digital': False,
                    'is_ebook': False,
                    'product_type': 'material'
                }
            }
        )

        CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('80.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-EBOOK-CS2',
                'product_name': 'CS2 eBook',
                'classification': {
                    'is_material': False,
                    'is_digital': True,
                    'is_ebook': True,
                    'product_type': 'ebook'
                }
            }
        )

        result = calculate_vat_for_cart(self.user, self.cart)

        # Verify items
        items = result['vat_calculations']['items']
        self.assertEqual(len(items), 2)

        # Material: 100 * 0.20 = 20 VAT
        # eBook: 80 * 0.00 = 0 VAT
        # Total: 180 net, 20 VAT, 200 gross

        totals = result['vat_calculations']['totals']
        self.assertEqual(Decimal(totals['total_net']), Decimal('180.00'))
        self.assertEqual(Decimal(totals['total_vat']), Decimal('20.00'))
        self.assertEqual(Decimal(totals['total_gross']), Decimal('200.00'))

    def test_multiple_quantities(self):
        """Test cart items with multiple quantities."""
        CartItem.objects.create(
            cart=self.cart,
            quantity=3,
            actual_price=Decimal('50.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-PRINT-CS2',
                'product_name': 'CS2 Material',
                'classification': {
                    'is_material': True,
                    'is_digital': False,
                    'is_ebook': False,
                    'product_type': 'material'
                }
            }
        )

        result = calculate_vat_for_cart(self.user, self.cart)

        # 50 * 3 = 150 net
        # 150 * 0.20 = 30 VAT
        totals = result['vat_calculations']['totals']
        self.assertEqual(Decimal(totals['total_net']), Decimal('150.00'))
        self.assertEqual(Decimal(totals['total_vat']), Decimal('30.00'))
        self.assertEqual(Decimal(totals['total_gross']), Decimal('180.00'))


class TestCalculateVATForCartMetadata(TestCase):
    """Test calculate_vat_for_cart metadata."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        self.uk = Country.objects.create(iso_code='GB', name='United Kingdom', phone_code='+44')
        from userprofile.models import UserProfileAddress
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        # Clear existing HOME addresses to avoid duplicates
        UserProfileAddress.objects.filter(user_profile=profile, address_type='HOME').delete()
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='GB',
            address_data={'postcode': 'SW1A 1AA'}
        )

        self.cart = Cart.objects.create(user_id=self.user.id)

    def test_execution_id_generated(self):
        """Test execution_id is generated."""
        result = calculate_vat_for_cart(self.user, self.cart)

        self.assertIsNotNone(result['execution_id'])
        self.assertIsInstance(result['execution_id'], str)
        self.assertGreater(len(result['execution_id']), 0)

    def test_execution_time_tracked(self):
        """Test execution_time_ms is tracked."""
        result = calculate_vat_for_cart(self.user, self.cart)

        self.assertIn('execution_time_ms', result)
        self.assertIsInstance(result['execution_time_ms'], int)
        self.assertGreater(result['execution_time_ms'], 0)

    def test_created_at_timestamp(self):
        """Test created_at timestamp is ISO format."""
        result = calculate_vat_for_cart(self.user, self.cart)

        self.assertIn('created_at', result)
        # Should be ISO format: YYYY-MM-DDTHH:MM:SS
        self.assertRegex(result['created_at'], r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')

    def test_status_success(self):
        """Test status is 'success' for successful calculation."""
        result = calculate_vat_for_cart(self.user, self.cart)

        self.assertEqual(result['status'], 'success')


class TestCalculateVATForCartAnonymousUser(TestCase):
    """Test calculate_vat_for_cart with anonymous user."""

    def test_anonymous_user_row_treatment(self):
        """Test anonymous user gets ROW treatment (0% VAT)."""
        cart = Cart.objects.create(user=None)

        CartItem.objects.create(
            cart=cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-PRINT-CS2',
                'product_name': 'CS2 Material',
                'classification': {
                    'is_material': True,
                    'is_digital': False,
                    'is_ebook': False,
                    'product_type': 'material'
                }
            }
        )

        result = calculate_vat_for_cart(None, cart)

        # Anonymous users should get ROW treatment (0% VAT)
        totals = result['vat_calculations']['totals']
        self.assertEqual(Decimal(totals['total_vat']), Decimal('0.00'))

        # Verify region is None or ROW
        region_info = result['vat_calculations']['region_info']
        self.assertIn(region_info['region'], [None, 'ROW'])


class TestSaveVATResultToCartFunction(TestCase):
    """Test save_vat_result_to_cart function exists."""

    def test_function_exists(self):
        """Test save_vat_result_to_cart function is importable."""
        from vat.service import save_vat_result_to_cart
        self.assertTrue(callable(save_vat_result_to_cart))


class TestSaveVATResultToCart(TestCase):
    """Test save_vat_result_to_cart function."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user_id=self.user.id)

    def test_saves_vat_result_to_cart(self):
        """Test VAT result is saved to cart.vat_result field."""
        vat_result = {
            'status': 'success',
            'execution_id': 'exec_test_001',
            'vat_calculations': {
                'items': [],
                'totals': {
                    'total_net': Decimal('100.00'),
                    'total_vat': Decimal('20.00'),
                    'total_gross': Decimal('120.00')
                }
            }
        }

        result = save_vat_result_to_cart(self.cart, vat_result)

        self.assertTrue(result)

        # Verify saved to database
        saved_cart = Cart.objects.get(id=self.cart.id)
        self.assertIsNotNone(saved_cart.vat_result)
        self.assertEqual(saved_cart.vat_result['execution_id'], 'exec_test_001')

    def test_retrieves_saved_vat_result(self):
        """Test saved VAT result can be retrieved correctly."""
        vat_result = {
            'status': 'success',
            'execution_id': 'exec_test_002',
            'vat_calculations': {
                'totals': {
                    'total_vat': Decimal('15.00')
                }
            }
        }

        save_vat_result_to_cart(self.cart, vat_result)

        # Retrieve from database
        saved_cart = Cart.objects.get(id=self.cart.id)
        self.assertEqual(saved_cart.vat_result['execution_id'], 'exec_test_002')
        self.assertEqual(saved_cart.vat_result['vat_calculations']['totals']['total_vat'], '15.00')

    def test_overwrites_existing_vat_result(self):
        """Test new VAT result overwrites existing one."""
        # Save first result
        first_result = {'execution_id': 'exec_001'}
        save_vat_result_to_cart(self.cart, first_result)

        # Save second result
        second_result = {'execution_id': 'exec_002'}
        save_vat_result_to_cart(self.cart, second_result)

        # Verify second result is saved
        saved_cart = Cart.objects.get(id=self.cart.id)
        self.assertEqual(saved_cart.vat_result['execution_id'], 'exec_002')

    def test_creates_vat_result_when_none(self):
        """Test creates vat_result when cart has None."""
        # Verify cart has None vat_result
        self.assertIsNone(self.cart.vat_result)

        vat_result = {'execution_id': 'exec_new'}
        save_vat_result_to_cart(self.cart, vat_result)

        # Verify created
        saved_cart = Cart.objects.get(id=self.cart.id)
        self.assertIsNotNone(saved_cart.vat_result)
        self.assertEqual(saved_cart.vat_result['execution_id'], 'exec_new')

    def test_handles_none_cart(self):
        """Test handles None cart gracefully."""
        vat_result = {'execution_id': 'exec_test'}

        result = save_vat_result_to_cart(None, vat_result)

        self.assertFalse(result)

    def test_saved_data_matches_input(self):
        """Test saved data matches input structure exactly."""
        vat_result = {
            'status': 'success',
            'execution_id': 'exec_complex',
            'vat_calculations': {
                'items': [
                    {'item_id': 1, 'vat_amount': '20.00'},
                    {'item_id': 2, 'vat_amount': '15.00'}
                ],
                'totals': {
                    'total_net': '150.00',
                    'total_vat': '35.00',
                    'total_gross': '185.00'
                },
                'region_info': {'country': 'GB', 'region': 'UK'}
            },
            'rules_executed': ['vat_uk_standard:v1'],
            'execution_time_ms': 25
        }

        save_vat_result_to_cart(self.cart, vat_result)

        # Verify exact structure match
        saved_cart = Cart.objects.get(id=self.cart.id)
        self.assertEqual(saved_cart.vat_result['status'], 'success')
        self.assertEqual(len(saved_cart.vat_result['vat_calculations']['items']), 2)
        self.assertEqual(saved_cart.vat_result['vat_calculations']['totals']['total_vat'], '35.00')
        self.assertEqual(saved_cart.vat_result['rules_executed'][0], 'vat_uk_standard:v1')

    def test_return_true_on_success(self):
        """Test returns True on successful save."""
        vat_result = {'execution_id': 'exec_success'}

        result = save_vat_result_to_cart(self.cart, vat_result)

        self.assertTrue(result)


class TestCreateVATAuditRecordFunction(TestCase):
    """Test create_vat_audit_record function exists."""

    def test_function_exists(self):
        """Test create_vat_audit_record function is importable."""
        from vat.service import create_vat_audit_record
        self.assertTrue(callable(create_vat_audit_record))


class TestCreateVATAuditRecord(TestCase):
    """Test create_vat_audit_record function."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user_id=self.user.id)

    def test_creates_audit_record(self):
        """Test creates VATAudit record."""
        from vat.models import VATAudit

        vat_result = {
            'execution_id': 'exec_test_001',
            'vat_calculations': {'totals': {'total_vat': '20.00'}}
        }

        audit = create_vat_audit_record(
            execution_id='exec_test_001',
            cart=self.cart,
            vat_result=vat_result,
            duration_ms=25
        )

        self.assertIsNotNone(audit)
        self.assertIsInstance(audit, VATAudit)

    def test_stores_execution_id(self):
        """Test stores execution_id correctly."""
        from vat.models import VATAudit

        audit = create_vat_audit_record(
            execution_id='exec_unique_123',
            cart=self.cart,
            vat_result={'status': 'success'},
            duration_ms=10
        )

        self.assertEqual(audit.execution_id, 'exec_unique_123')

    def test_links_to_cart(self):
        """Test links to cart via foreign key."""
        audit = create_vat_audit_record(
            execution_id='exec_cart_link',
            cart=self.cart,
            vat_result={'status': 'success'},
            duration_ms=15
        )

        self.assertEqual(audit.cart.id, self.cart.id)

    def test_stores_rule_id(self):
        """Test stores rule_id."""
        audit = create_vat_audit_record(
            execution_id='exec_rule_test',
            cart=self.cart,
            vat_result={'status': 'success'},
            duration_ms=20
        )

        self.assertIsNotNone(audit.rule_id)
        self.assertIsInstance(audit.rule_id, str)

    def test_stores_rule_version(self):
        """Test stores rule_version."""
        audit = create_vat_audit_record(
            execution_id='exec_version_test',
            cart=self.cart,
            vat_result={'status': 'success'},
            duration_ms=20
        )

        self.assertIsNotNone(audit.rule_version)
        self.assertIsInstance(audit.rule_version, int)

    def test_stores_input_context_as_jsonb(self):
        """Test stores input_context as JSONB."""
        vat_result = {
            'execution_id': 'exec_context_test',
            'vat_calculations': {
                'items': [{'item_id': 1}],
                'totals': {'total_vat': '10.00'}
            }
        }

        audit = create_vat_audit_record(
            execution_id='exec_context_test',
            cart=self.cart,
            vat_result=vat_result,
            duration_ms=30
        )

        self.assertIsNotNone(audit.input_context)
        self.assertIsInstance(audit.input_context, dict)

    def test_stores_output_data_as_jsonb(self):
        """Test stores output_data as JSONB."""
        vat_result = {
            'status': 'success',
            'vat_calculations': {'totals': {'total_vat': '25.00'}}
        }

        audit = create_vat_audit_record(
            execution_id='exec_output_test',
            cart=self.cart,
            vat_result=vat_result,
            duration_ms=35
        )

        self.assertIsNotNone(audit.output_data)
        self.assertIsInstance(audit.output_data, dict)
        self.assertEqual(audit.output_data['status'], 'success')

    def test_stores_duration_ms(self):
        """Test stores duration_ms."""
        audit = create_vat_audit_record(
            execution_id='exec_duration_test',
            cart=self.cart,
            vat_result={'status': 'success'},
            duration_ms=42
        )

        self.assertEqual(audit.duration_ms, 42)

    def test_retrieves_by_execution_id(self):
        """Test can retrieve audit record by execution_id."""
        from vat.models import VATAudit

        create_vat_audit_record(
            execution_id='exec_retrieve_test',
            cart=self.cart,
            vat_result={'status': 'success'},
            duration_ms=50
        )

        # Retrieve from database
        audit = VATAudit.objects.get(execution_id='exec_retrieve_test')
        self.assertIsNotNone(audit)
        self.assertEqual(audit.duration_ms, 50)

    def test_handles_cart_none(self):
        """Test handles cart=None (anonymous user)."""
        audit = create_vat_audit_record(
            execution_id='exec_anon_test',
            cart=None,
            vat_result={'status': 'success'},
            duration_ms=15
        )

        self.assertIsNone(audit.cart)

    def test_handles_order_none(self):
        """Test handles order=None (pre-checkout)."""
        audit = create_vat_audit_record(
            execution_id='exec_no_order',
            cart=self.cart,
            vat_result={'status': 'success'},
            duration_ms=20,
            order=None
        )

        self.assertIsNone(audit.order)
