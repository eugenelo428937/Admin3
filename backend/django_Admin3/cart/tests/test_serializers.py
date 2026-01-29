"""
Phase 4: Serializer tests for Cart VAT integration
TDD Phase: RED - Tests for VAT serializers

These tests verify that serializers properly format VAT data for API responses.
"""
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from decimal import Decimal
from unittest.mock import patch, MagicMock

from cart.models import Cart, CartItem
from cart.serializers import CartSerializer, CartItemSerializer

User = get_user_model()


class CartItemVATSerializerTestCase(TestCase):
    """Test CartItem serializer includes VAT fields"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='test_user',
            email='test@test.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_cartitem_serializer_includes_vat_fields(self):
        """Test that CartItemSerializer includes VAT fields in output"""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_region='UK',
            vat_rate=Decimal('0.2000'),
            vat_amount=Decimal('10.00'),
            gross_amount=Decimal('60.00')
        )

        serializer = CartItemSerializer(cart_item)
        data = serializer.data

        # Verify VAT fields are present
        self.assertIn('vat_region', data)
        self.assertIn('vat_rate', data)
        self.assertIn('vat_amount', data)
        self.assertIn('gross_amount', data)

        # Verify values
        self.assertEqual(data['vat_region'], 'UK')
        self.assertEqual(Decimal(data['vat_rate']), Decimal('0.2000'))
        self.assertEqual(Decimal(data['vat_amount']), Decimal('10.00'))
        self.assertEqual(Decimal(data['gross_amount']), Decimal('60.00'))

    def test_cartitem_serializer_handles_null_vat_fields(self):
        """Test that CartItemSerializer handles null VAT fields"""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
            # VAT fields are None
        )

        serializer = CartItemSerializer(cart_item)
        data = serializer.data

        # Verify VAT fields are null
        self.assertIsNone(data.get('vat_region'))
        self.assertIsNone(data.get('vat_rate'))
        self.assertIsNone(data.get('vat_amount'))
        self.assertIsNone(data.get('gross_amount'))

    def test_cartitem_serializer_includes_net_amount(self):
        """Test that CartItemSerializer includes calculated net_amount"""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=2,
            actual_price=Decimal('50.00')
        )

        serializer = CartItemSerializer(cart_item)
        data = serializer.data

        # net_amount should be price * quantity
        self.assertIn('net_amount', data)
        self.assertEqual(Decimal(data['net_amount']), Decimal('100.00'))


class CartVATSerializerTestCase(TestCase):
    """Test Cart serializer VAT integration"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='test_user',
            email='test@test.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)
        self.factory = RequestFactory()

    def _create_request_with_session(self, path='/', method='GET'):
        """Create a request with session support"""
        from django.contrib.sessions.middleware import SessionMiddleware

        if method == 'GET':
            request = self.factory.get(path)
        else:
            request = self.factory.post(path)

        request.user = self.user

        # Add session
        middleware = SessionMiddleware(lambda x: None)
        middleware.process_request(request)
        request.session.save()

        return request

    def test_cart_serializer_includes_vat_totals(self):
        """Test that CartSerializer includes VAT totals in response"""
        # Phase 5: Set up vat_result directly on cart (serializer reads from cart.vat_result)
        self.cart.vat_result = {
            'success': True,
            'items': [],
            'total_net_amount': '100.00',
            'total_vat_amount': '20.00',
            'total_gross_amount': '120.00',
            'vat_breakdown': [
                {
                    'region': 'UK',
                    'rate': '20%',
                    'amount': '20.00',
                    'item_count': 1
                }
            ]
        }
        self.cart.save()

        # Create request context
        request = self._create_request_with_session('/api/cart/')

        serializer = CartSerializer(self.cart, context={'request': request})
        data = serializer.data

        # Verify VAT totals are present
        self.assertIn('vat_totals', data)
        vat_totals = data['vat_totals']

        self.assertEqual(Decimal(vat_totals['total_net_amount']), Decimal('100.00'))
        self.assertEqual(Decimal(vat_totals['total_vat_amount']), Decimal('20.00'))
        self.assertEqual(Decimal(vat_totals['total_gross_amount']), Decimal('120.00'))

    def test_cart_serializer_includes_vat_breakdown(self):
        """Test that CartSerializer includes VAT breakdown by region"""
        # Phase 5: Set up vat_result directly on cart with multiple regions
        self.cart.vat_result = {
            'success': True,
            'items': [],
            'total_net_amount': '200.00',
            'total_vat_amount': '35.00',
            'total_gross_amount': '235.00',
            'vat_breakdown': [
                {
                    'region': 'UK',
                    'rate': '20%',
                    'amount': '20.00',
                    'item_count': 1
                },
                {
                    'region': 'SA',
                    'rate': '15%',
                    'amount': '15.00',
                    'item_count': 1
                }
            ]
        }
        self.cart.save()

        request = self._create_request_with_session('/api/cart/')

        serializer = CartSerializer(self.cart, context={'request': request})
        data = serializer.data

        # Verify breakdown is present
        self.assertIn('vat_totals', data)
        self.assertIn('vat_breakdown', data['vat_totals'])

        breakdown = data['vat_totals']['vat_breakdown']
        self.assertEqual(len(breakdown), 2)
        self.assertEqual(breakdown[0]['region'], 'UK')
        self.assertEqual(breakdown[1]['region'], 'SA')

    def test_cart_serializer_handles_vat_calculation_error(self):
        """Test that CartSerializer handles VAT calculation errors gracefully"""
        # Phase 5: Set up vat_result with error state
        self.cart.vat_result = {
            'success': False,
            'error': 'Rules engine unavailable',
            'items': [],
            'total_net_amount': '0.00',
            'total_vat_amount': '0.00',
            'total_gross_amount': '0.00',
            'vat_breakdown': []
        }
        self.cart.save()

        request = self._create_request_with_session('/api/cart/')

        serializer = CartSerializer(self.cart, context={'request': request})
        data = serializer.data

        # Verify error is included
        self.assertIn('vat_totals', data)
        vat_totals = data['vat_totals']

        self.assertFalse(vat_totals['success'])
        self.assertIn('error', vat_totals)
        self.assertEqual(vat_totals['error'], 'Rules engine unavailable')

    def test_cart_serializer_uses_country_from_context(self):
        """Test that CartSerializer returns vat_result data (Phase 5)

        Note: In Phase 5, the serializer reads from cart.vat_result directly.
        Country_code handling is done by the VAT orchestrator when writing to vat_result.
        """
        # Phase 5: Set up vat_result with South Africa (SA) region data
        # (In real usage, the VAT orchestrator sets this based on country_code=ZA)
        self.cart.vat_result = {
            'success': True,
            'items': [],
            'total_net_amount': '100.00',
            'total_vat_amount': '15.00',
            'total_gross_amount': '115.00',
            'vat_breakdown': [
                {
                    'region': 'SA',
                    'rate': '15%',
                    'amount': '15.00',
                    'item_count': 1
                }
            ]
        }
        self.cart.save()

        # Create request with country_code in query params
        request = self._create_request_with_session('/api/cart/?country_code=ZA')

        serializer = CartSerializer(self.cart, context={'request': request})
        data = serializer.data

        # Verify vat_totals reflects the stored vat_result
        self.assertIn('vat_totals', data)
        vat_totals = data['vat_totals']
        self.assertEqual(vat_totals['vat_breakdown'][0]['region'], 'SA')

    def test_cart_serializer_includes_timestamp(self):
        """Test that CartSerializer includes VAT calculation timestamp"""
        from django.utils import timezone
        timestamp = timezone.now()

        # Set timestamp on cart
        self.cart.vat_last_calculated_at = timestamp
        self.cart.save()

        request = self._create_request_with_session('/api/cart/')

        serializer = CartSerializer(self.cart, context={'request': request})
        data = serializer.data

        # Verify timestamp is included
        self.assertIn('vat_last_calculated_at', data)
        self.assertIsNotNone(data['vat_last_calculated_at'])

    def test_cart_serializer_includes_error_flags(self):
        """Test that CartSerializer includes VAT error flags"""
        # Set error state
        self.cart.vat_calculation_error = True
        self.cart.vat_calculation_error_message = "Test error"
        self.cart.save()

        request = self._create_request_with_session('/api/cart/')

        serializer = CartSerializer(self.cart, context={'request': request})
        data = serializer.data

        # Verify error flags are included
        self.assertIn('vat_calculation_error', data)
        self.assertTrue(data['vat_calculation_error'])
        self.assertIn('vat_calculation_error_message', data)
        self.assertEqual(data['vat_calculation_error_message'], "Test error")
