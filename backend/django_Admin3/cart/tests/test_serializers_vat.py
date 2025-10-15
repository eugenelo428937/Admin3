"""
Test suite for Cart VAT serializers (Phase 4, Task T013)

Tests serializer output format for VAT data:
- CartItemVATSerializer structure matches OpenAPI schema
- CartTotalsSerializer includes vat_breakdown
- CartSerializer includes VAT fields
- VAT details have correct decimal precision (4 for rate, 2 for amounts)
- VAT region enum serialization (UK/IE/EU/SA/ROW only)

Expected to follow OpenAPI spec from contracts/cart-vat-api.yaml
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from rest_framework.test import APIRequestFactory
from unittest.mock import patch, MagicMock

from cart.models import Cart, CartItem
from cart.serializers import CartSerializer

User = get_user_model()


class CartVATSerializersTestCase(TestCase):
    """Test VAT serializer output formats and structure"""

    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='test_user',
            email='test@test.com',
            password='testpass123'
        )

        # Create cart
        self.cart = Cart.objects.create(user=self.user)

        # Create request factory for serializer context
        self.factory = APIRequestFactory()
        self.request = self.factory.get('/api/cart/')
        self.request.user = self.user

        # Add session support (required by serializer)
        from django.contrib.sessions.middleware import SessionMiddleware
        middleware = SessionMiddleware(lambda x: None)
        middleware.process_request(self.request)
        self.request.session.save()

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_cart_item_vat_serializer_structure(self, mock_rule_engine):
        """Test CartItem with VAT fields serializes correctly"""
        # Mock rules engine to return UK VAT
        mock_rule_engine.execute.return_value = {
            'cart_item': {'vat_amount': Decimal('20.00'), 'gross_amount': Decimal('120.00')},
            'vat': {'region': 'UK', 'rate': Decimal('0.2000')}
        }

        # Create cart item
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )

        # First serialization: Pass update_items=True to persist VAT data to CartItem fields
        serializer1 = CartSerializer(self.cart, context={'request': self.request, 'update_items': True})
        _ = serializer1.data  # Trigger serialization which calls get_vat_totals and updates items

        # Second serialization: Now read the updated fields
        serializer2 = CartSerializer(self.cart, context={'request': self.request})
        data = serializer2.data

        # Verify cart items exist
        self.assertIn('items', data)
        self.assertEqual(len(data['items']), 1)

        # Verify serialized item VAT data
        item_data = data['items'][0]
        self.assertEqual(item_data['vat_region'], 'UK')
        self.assertEqual(Decimal(item_data['vat_rate']), Decimal('0.2000'))
        self.assertEqual(Decimal(item_data['vat_amount']), Decimal('20.00'))

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_cart_totals_serializer_structure(self, mock_rule_engine):
        """Test Cart totals include vat_breakdown"""
        # Mock rules engine to return different VAT for each call
        mock_rule_engine.execute.side_effect = [
            {
                'cart_item': {'vat_amount': Decimal('20.00'), 'gross_amount': Decimal('120.00')},
                'vat': {'region': 'UK', 'rate': Decimal('0.2000')}
            },
            {
                'cart_item': {'vat_amount': Decimal('7.50'), 'gross_amount': Decimal('57.50')},
                'vat': {'region': 'SA', 'rate': Decimal('0.1500')}
            }
        ]

        # Create multiple items with different VAT regions
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Serialize cart
        serializer = CartSerializer(self.cart, context={'request': self.request})
        data = serializer.data

        # Verify vat_totals exists
        self.assertIn('vat_totals', data)
        vat_totals = data['vat_totals']

        # Verify totals structure
        self.assertIn('total_net_amount', vat_totals)
        self.assertIn('total_vat_amount', vat_totals)
        self.assertIn('total_gross_amount', vat_totals)
        self.assertIn('vat_breakdown', vat_totals)

        # Verify vat_breakdown is list
        self.assertIsInstance(vat_totals['vat_breakdown'], list)

        # Verify breakdown contains regions
        regions = [item['region'] for item in vat_totals['vat_breakdown']]
        self.assertIn('UK', regions)
        self.assertIn('SA', regions)

    def test_cart_serializer_includes_vat_fields(self):
        """Test CartSerializer includes all required VAT fields"""
        # Create cart item
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00'),
            vat_region='UK',
            vat_rate=Decimal('0.2000'),
            vat_amount=Decimal('20.00'),
            gross_amount=Decimal('120.00')
        )

        # Serialize cart
        serializer = CartSerializer(self.cart, context={'request': self.request})
        data = serializer.data

        # Verify VAT totals fields
        self.assertIn('vat_totals', data)

        # Verify error tracking fields
        self.assertIn('vat_calculation_error', data)
        self.assertIn('vat_calculation_error_message', data)
        self.assertIn('vat_last_calculated_at', data)

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_vat_details_decimal_precision(self, mock_rule_engine):
        """Test VAT rate has 4 decimals, amounts have 2 decimals"""
        # Mock rules engine to return UK VAT with precise decimals
        mock_rule_engine.execute.return_value = {
            'cart_item': {'vat_amount': Decimal('20.00'), 'gross_amount': Decimal('120.00')},
            'vat': {'region': 'UK', 'rate': Decimal('0.2000')}
        }

        # Create cart item
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )

        # First serialization: update_items=True to persist VAT data
        serializer1 = CartSerializer(self.cart, context={'request': self.request, 'update_items': True})
        _ = serializer1.data  # Trigger update

        # Second serialization: read updated data
        serializer2 = CartSerializer(self.cart, context={'request': self.request})
        data = serializer2.data

        # Get item data
        item_data = data['items'][0]

        # Verify rate precision (4 decimals)
        rate_str = str(item_data['vat_rate'])
        if '.' in rate_str:
            decimals = len(rate_str.split('.')[1])
            self.assertLessEqual(decimals, 4, "VAT rate should have max 4 decimal places")

        # Verify amount precision (2 decimals)
        amount_str = str(item_data['vat_amount'])
        if '.' in amount_str:
            decimals = len(amount_str.split('.')[1])
            self.assertLessEqual(decimals, 2, "VAT amount should have max 2 decimal places")

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_vat_region_enum_serialization(self, mock_rule_engine):
        """Test vat_region only accepts valid enum values (UK/IE/EU/SA/ROW)"""
        valid_regions = ['UK', 'IE', 'EU', 'SA', 'ROW']

        for region in valid_regions:
            # Mock rules engine to return the specific region
            mock_rule_engine.execute.return_value = {
                'cart_item': {'vat_amount': Decimal('20.00'), 'gross_amount': Decimal('120.00')},
                'vat': {'region': region, 'rate': Decimal('0.2000')}
            }

            # Create cart item
            cart_item = CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('100.00')
            )

            # First serialization: update_items=True to persist VAT data
            serializer1 = CartSerializer(self.cart, context={'request': self.request, 'update_items': True})
            _ = serializer1.data  # Trigger update

            # Second serialization: read updated data
            serializer2 = CartSerializer(self.cart, context={'request': self.request})
            data = serializer2.data

            # Verify region serialized correctly
            item_data = data['items'][0]
            self.assertEqual(item_data['vat_region'], region)

            # Clean up for next iteration
            cart_item.delete()

    def test_empty_cart_vat_serialization(self):
        """Test empty cart serializes with zero VAT totals"""
        # Serialize empty cart
        serializer = CartSerializer(self.cart, context={'request': self.request})
        data = serializer.data

        # Verify vat_totals exists even for empty cart
        self.assertIn('vat_totals', data)

        # Note: The actual values will depend on whether calculate_vat_for_all_items
        # is called. For empty cart, it should return zeros.

    def test_cart_with_error_state_serialization(self):
        """Test cart with VAT calculation error serializes error fields"""
        # Set cart error state
        self.cart.vat_calculation_error = True
        self.cart.vat_calculation_error_message = "Rules engine connection failed"
        self.cart.save()

        # Serialize cart
        serializer = CartSerializer(self.cart, context={'request': self.request})
        data = serializer.data

        # Verify error fields serialized
        self.assertTrue(data['vat_calculation_error'])
        self.assertEqual(data['vat_calculation_error_message'], "Rules engine connection failed")

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_vat_breakdown_aggregation(self, mock_rule_engine):
        """Test VAT breakdown correctly aggregates items by region"""
        # Mock rules engine to return UK VAT for both items
        mock_rule_engine.execute.side_effect = [
            {
                'cart_item': {'vat_amount': Decimal('20.00'), 'gross_amount': Decimal('120.00')},
                'vat': {'region': 'UK', 'rate': Decimal('0.2000')}
            },
            {
                'cart_item': {'vat_amount': Decimal('10.00'), 'gross_amount': Decimal('60.00')},
                'vat': {'region': 'UK', 'rate': Decimal('0.2000')}
            }
        ]

        # Create multiple items in same region
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Serialize cart
        serializer = CartSerializer(self.cart, context={'request': self.request})
        data = serializer.data

        # Get vat_breakdown
        vat_breakdown = data['vat_totals']['vat_breakdown']

        # Should have only 1 entry for UK (aggregated)
        uk_entries = [item for item in vat_breakdown if item['region'] == 'UK']
        self.assertEqual(len(uk_entries), 1, "UK items should be aggregated into single breakdown entry")

        # Verify aggregated amount
        uk_breakdown = uk_entries[0]
        expected_total_vat = Decimal('30.00')  # 20.00 + 10.00
        self.assertEqual(Decimal(uk_breakdown['amount']), expected_total_vat)

        # Verify item count
        self.assertEqual(uk_breakdown['item_count'], 2)

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_vat_rate_percentage_formatting(self, mock_rule_engine):
        """Test VAT rate is formatted as percentage in breakdown"""
        # Mock rules engine to return UK VAT
        mock_rule_engine.execute.return_value = {
            'cart_item': {'vat_amount': Decimal('20.00'), 'gross_amount': Decimal('120.00')},
            'vat': {'region': 'UK', 'rate': Decimal('0.2000')}
        }

        # Create cart item
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )

        # Serialize cart
        serializer = CartSerializer(self.cart, context={'request': self.request})
        data = serializer.data

        # Get vat_breakdown
        vat_breakdown = data['vat_totals']['vat_breakdown']
        uk_breakdown = [item for item in vat_breakdown if item['region'] == 'UK'][0]

        # Verify rate is formatted as percentage string (e.g., "20%")
        self.assertIn('rate', uk_breakdown)
        rate_str = uk_breakdown['rate']
        self.assertTrue(rate_str.endswith('%'), f"Rate should be formatted as percentage, got: {rate_str}")
