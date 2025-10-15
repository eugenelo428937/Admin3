"""
TASK-507: Cart Serializer VAT Tests (RED Phase)

Tests for cart serializers to verify VAT fields are properly exposed
from Phase 5 cart.vat_result JSONB storage.
These tests should FAIL until TASK-508 implementation.
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.sessions.middleware import SessionMiddleware
from django.test import RequestFactory
from django.utils import timezone

from cart.models import Cart, CartItem
from cart.serializers import CartSerializer, CartItemSerializer

User = get_user_model()


def add_session_to_request(request):
    """Helper to add session middleware to request."""
    middleware = SessionMiddleware(lambda x: None)
    middleware.process_request(request)
    request.session.save()
    return request


class CartItemSerializerVATTests(TestCase):
    """Test suite for CartItem serializer VAT field exposure."""

    def setUp(self):
        """Set up test data."""
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_vat_fields_serialized_from_model(self):
        """Test that VAT fields from model are properly serialized."""
        # Create cart item with VAT fields populated (Phase 5)
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=2,
            actual_price=Decimal('100.00'),
            item_type='fee',
            vat_region='UK',
            vat_rate=Decimal('0.2000'),
            vat_amount=Decimal('40.00'),
            gross_amount=Decimal('240.00')
        )

        # Serialize
        serializer = CartItemSerializer(cart_item)
        data = serializer.data

        # Assert VAT fields are present
        self.assertIn('vat_region', data)
        self.assertIn('vat_rate', data)
        self.assertIn('vat_amount', data)
        self.assertIn('gross_amount', data)
        self.assertIn('net_amount', data)

        # Assert values match
        self.assertEqual(data['vat_region'], 'UK')
        self.assertEqual(Decimal(data['vat_rate']), Decimal('0.2000'))
        self.assertEqual(Decimal(data['vat_amount']), Decimal('40.00'))
        self.assertEqual(Decimal(data['gross_amount']), Decimal('240.00'))
        self.assertEqual(Decimal(data['net_amount']), Decimal('200.00'))  # 100 * 2

    def test_vat_fields_zero_when_not_calculated(self):
        """Test that VAT fields default to zero when not yet calculated."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )

        serializer = CartItemSerializer(cart_item)
        data = serializer.data

        # Assert VAT fields are present but zero/null
        self.assertIn('vat_region', data)
        self.assertIn('vat_rate', data)
        self.assertIn('vat_amount', data)
        self.assertIn('gross_amount', data)

        # Verify defaults (handle None values from DB)
        self.assertIsNone(data['vat_region'])  # NULL in DB
        # vat_rate, vat_amount, gross_amount may be None when not calculated
        if data['vat_rate'] is not None:
            self.assertEqual(Decimal(data['vat_rate']), Decimal('0.0000'))
        if data['vat_amount'] is not None:
            self.assertEqual(Decimal(data['vat_amount']), Decimal('0.00'))
        if data['gross_amount'] is not None:
            self.assertEqual(Decimal(data['gross_amount']), Decimal('0.00'))

    def test_net_amount_calculation(self):
        """Test net_amount is correctly calculated as price * quantity."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=3,
            actual_price=Decimal('25.50'),
            item_type='fee'
        )

        serializer = CartItemSerializer(cart_item)
        data = serializer.data

        self.assertEqual(Decimal(data['net_amount']), Decimal('76.50'))


class CartSerializerVATTests(TestCase):
    """Test suite for Cart serializer VAT field exposure from Phase 5 JSONB."""

    def setUp(self):
        """Set up test data."""
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123'
        )

    def test_vat_totals_from_jsonb_storage(self):
        """Test that vat_totals are extracted from cart.vat_result JSONB."""
        # Create cart with vat_result JSONB populated by orchestrator
        cart = Cart.objects.create(
            user=self.user,
            vat_result={
                'status': 'calculated',
                'region': 'UK',
                'totals': {
                    'net': '200.00',
                    'vat': '40.00',
                    'gross': '240.00'
                },
                'items': [
                    {
                        'id': '123',
                        'vat_amount': '40.00',
                        'vat_rate': '0.2000',
                        'vat_region': 'UK',
                        'gross_amount': '240.00'
                    }
                ],
                'execution_id': 'exec_123',
                'timestamp': timezone.now().isoformat()
            },
            vat_last_calculated_at=timezone.now()
        )

        # Create request context with session
        request = self.factory.get('/api/cart/')
        request.user = self.user
        request = add_session_to_request(request)

        # Serialize with request context
        serializer = CartSerializer(cart, context={'request': request})
        data = serializer.data

        # Assert vat_totals field exists
        self.assertIn('vat_totals', data)

        # Phase 5: vat_totals should come from cart.vat_result, not calculate_vat_for_all_items()
        # This test will FAIL in RED phase because serializer still uses Phase 4 method
        vat_totals = data['vat_totals']
        self.assertIsNotNone(vat_totals)

        # Verify structure (should match cart.vat_result structure)
        self.assertIn('status', vat_totals)
        self.assertIn('region', vat_totals)
        self.assertIn('totals', vat_totals)

        self.assertEqual(vat_totals['status'], 'calculated')
        self.assertEqual(vat_totals['region'], 'UK')
        self.assertEqual(vat_totals['totals']['net'], '200.00')
        self.assertEqual(vat_totals['totals']['vat'], '40.00')
        self.assertEqual(vat_totals['totals']['gross'], '240.00')

    def test_vat_error_flags_exposed(self):
        """Test that VAT error flags are properly exposed."""
        cart = Cart.objects.create(
            user=self.user,
            vat_calculation_error=True,
            vat_calculation_error_message='Rules Engine connection failed'
        )

        request = self.factory.get('/api/cart/')
        request.user = self.user
        request = add_session_to_request(request)

        serializer = CartSerializer(cart, context={'request': request})
        data = serializer.data

        # Assert error fields are exposed
        self.assertIn('vat_calculation_error', data)
        self.assertIn('vat_calculation_error_message', data)

        self.assertTrue(data['vat_calculation_error'])
        self.assertEqual(data['vat_calculation_error_message'], 'Rules Engine connection failed')

    def test_vat_last_calculated_at_exposed(self):
        """Test that vat_last_calculated_at timestamp is exposed."""
        now = timezone.now()
        cart = Cart.objects.create(
            user=self.user,
            vat_last_calculated_at=now
        )

        request = self.factory.get('/api/cart/')
        request.user = self.user
        request = add_session_to_request(request)

        serializer = CartSerializer(cart, context={'request': request})
        data = serializer.data

        self.assertIn('vat_last_calculated_at', data)
        self.assertIsNotNone(data['vat_last_calculated_at'])

    def test_vat_totals_null_when_not_calculated(self):
        """Test that vat_totals returns null structure when VAT not yet calculated."""
        cart = Cart.objects.create(user=self.user)

        request = self.factory.get('/api/cart/')
        request.user = self.user
        request = add_session_to_request(request)

        serializer = CartSerializer(cart, context={'request': request})
        data = serializer.data

        # vat_totals should exist but indicate no calculation yet
        self.assertIn('vat_totals', data)

        # Phase 5: Should return null or empty structure from cart.vat_result
        # This test will FAIL in RED phase if serializer doesn't check vat_result first
        vat_totals = data['vat_totals']

        # Either null or has 'status': 'not_calculated'
        if vat_totals is not None:
            self.assertIn('status', vat_totals)
            # Status should indicate not calculated, not error
            self.assertNotEqual(vat_totals.get('status'), 'calculated')

    def test_vat_totals_with_multiple_items(self):
        """Test VAT totals aggregation with multiple cart items."""
        # Create cart first (without vat_result to avoid signal clearing it)
        cart = Cart.objects.create(user=self.user)

        # Create actual cart items first
        item1 = CartItem.objects.create(
            cart=cart,
            quantity=2,
            actual_price=Decimal('100.00'),
            item_type='fee',
            vat_amount=Decimal('40.00'),
            vat_rate=Decimal('0.2000'),
            vat_region='UK',
            gross_amount=Decimal('240.00')
        )
        item2 = CartItem.objects.create(
            cart=cart,
            quantity=1,
            actual_price=Decimal('150.00'),
            item_type='fee',
            vat_amount=Decimal('30.00'),
            vat_rate=Decimal('0.2000'),
            vat_region='UK',
            gross_amount=Decimal('180.00')
        )

        # Now set vat_result AFTER items are created (so signal doesn't clear it)
        cart.vat_result = {
            'status': 'calculated',
            'region': 'UK',
            'totals': {
                'net': '350.00',
                'vat': '70.00',
                'gross': '420.00'
            },
            'items': [
                {
                    'id': str(item1.id),
                    'actual_price': '100.00',
                    'quantity': 2,
                    'vat_amount': '40.00',
                    'vat_rate': '0.2000',
                    'vat_region': 'UK',
                    'gross_amount': '240.00'
                },
                {
                    'id': str(item2.id),
                    'actual_price': '150.00',
                    'quantity': 1,
                    'vat_amount': '30.00',
                    'vat_rate': '0.2000',
                    'vat_region': 'UK',
                    'gross_amount': '180.00'
                }
            ],
            'execution_id': 'exec_multi',
            'timestamp': timezone.now().isoformat()
        }
        cart.save()

        request = self.factory.get('/api/cart/')
        request.user = self.user
        request = add_session_to_request(request)

        serializer = CartSerializer(cart, context={'request': request})
        data = serializer.data

        vat_totals = data['vat_totals']
        self.assertEqual(vat_totals['totals']['net'], '350.00')
        self.assertEqual(vat_totals['totals']['vat'], '70.00')
        self.assertEqual(vat_totals['totals']['gross'], '420.00')

    def test_vat_totals_regional_variations(self):
        """Test VAT totals for different regions (UK, EU, SA, ROW)."""
        test_cases = [
            {
                'region': 'UK',
                'net': '100.00',
                'vat': '20.00',
                'gross': '120.00',
                'rate': '0.2000'
            },
            {
                'region': 'EU',
                'net': '100.00',
                'vat': '0.00',
                'gross': '100.00',
                'rate': '0.0000'
            },
            {
                'region': 'SA',
                'net': '100.00',
                'vat': '15.00',
                'gross': '115.00',
                'rate': '0.1500'
            },
            {
                'region': 'ROW',
                'net': '100.00',
                'vat': '0.00',
                'gross': '100.00',
                'rate': '0.0000'
            }
        ]

        for case in test_cases:
            with self.subTest(region=case['region']):
                cart = Cart.objects.create(
                    user=self.user,
                    vat_result={
                        'status': 'calculated',
                        'region': case['region'],
                        'totals': {
                            'net': case['net'],
                            'vat': case['vat'],
                            'gross': case['gross']
                        },
                        'items': [{
                            'id': '1',
                            'vat_amount': case['vat'],
                            'vat_rate': case['rate'],
                            'vat_region': case['region']
                        }],
                        'execution_id': f"exec_{case['region']}",
                        'timestamp': timezone.now().isoformat()
                    }
                )

                request = self.factory.get('/api/cart/')
                request.user = self.user
                request = add_session_to_request(request)

                serializer = CartSerializer(cart, context={'request': request})
                data = serializer.data

                vat_totals = data['vat_totals']
                self.assertEqual(vat_totals['region'], case['region'])
                self.assertEqual(vat_totals['totals']['net'], case['net'])
                self.assertEqual(vat_totals['totals']['vat'], case['vat'])
                self.assertEqual(vat_totals['totals']['gross'], case['gross'])

                # Clean up for next iteration
                cart.delete()
