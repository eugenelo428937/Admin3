from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from decimal import Decimal
from unittest.mock import patch, MagicMock

from cart.models import Cart, CartItem
from cart.services.cart_service import CartService

User = get_user_model()


@override_settings(USE_DUMMY_PAYMENT_GATEWAY=True)
class CartServiceVATTest(TestCase):
    def setUp(self):
        self.service = CartService()
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='product',
            quantity=2,
            price_type='standard',
            actual_price=Decimal('50.00'),
            metadata={'variationType': 'Printed'},
        )

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_calculate_vat_uk_customer(self, mock_engine):
        mock_engine.execute.return_value = {
            'vat': {'region': 'UK', 'rate': '0.2000'},
            'cart_item': {'vat_amount': '20.00', 'gross_amount': '120.00'},
        }

        result = self.service.calculate_vat(self.cart)

        self.assertEqual(result['region'], 'UK')
        self.assertEqual(result['totals']['net'], '100.00')
        self.assertEqual(result['totals']['vat'], '20.00')
        self.assertEqual(result['totals']['gross'], '120.00')
        self.assertEqual(len(result['items']), 1)

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_calculate_vat_row_customer(self, mock_engine):
        mock_engine.execute.return_value = {
            'vat': {'region': 'ROW', 'rate': '0.0000'},
            'cart_item': {'vat_amount': '0.00', 'gross_amount': '100.00'},
        }

        result = self.service.calculate_vat(self.cart)

        self.assertEqual(result['region'], 'ROW')
        self.assertEqual(result['totals']['vat'], '0.00')
        self.assertEqual(result['totals']['gross'], '100.00')

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_calculate_vat_multiple_items(self, mock_engine):
        CartItem.objects.create(
            cart=self.cart,
            item_type='product',
            quantity=1,
            price_type='standard',
            actual_price=Decimal('30.00'),
            metadata={'variationType': 'eBook'},
        )

        mock_engine.execute.side_effect = [
            {
                'vat': {'region': 'UK', 'rate': '0.2000'},
                'cart_item': {'vat_amount': '20.00', 'gross_amount': '120.00'},
            },
            {
                'vat': {'region': 'UK', 'rate': '0.2000'},
                'cart_item': {'vat_amount': '6.00', 'gross_amount': '36.00'},
            },
        ]

        result = self.service.calculate_vat(self.cart)

        self.assertEqual(result['totals']['net'], '130.00')
        self.assertEqual(result['totals']['vat'], '26.00')
        self.assertEqual(result['totals']['gross'], '156.00')
        self.assertEqual(len(result['items']), 2)

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_calculate_vat_stores_result_on_cart(self, mock_engine):
        mock_engine.execute.return_value = {
            'vat': {'region': 'UK', 'rate': '0.2000'},
            'cart_item': {'vat_amount': '20.00', 'gross_amount': '120.00'},
        }

        self.service.calculate_vat(self.cart)
        self.cart.refresh_from_db()

        self.assertIsNotNone(self.cart.vat_result)
        self.assertEqual(self.cart.vat_result['region'], 'UK')
        self.assertFalse(self.cart.vat_calculation_error)
        self.assertIsNone(self.cart.vat_calculation_error_message)

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_calculate_vat_updates_cart_item_fields(self, mock_engine):
        mock_engine.execute.return_value = {
            'vat': {'region': 'UK', 'rate': '0.2000'},
            'cart_item': {'vat_amount': '20.00', 'gross_amount': '120.00'},
        }

        self.service.calculate_vat(self.cart)
        self.cart_item.refresh_from_db()

        self.assertEqual(self.cart_item.vat_region, 'UK')
        self.assertEqual(self.cart_item.vat_rate, Decimal('0.2000'))
        self.assertEqual(self.cart_item.vat_amount, Decimal('20.00'))
        self.assertEqual(self.cart_item.gross_amount, Decimal('120.00'))

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_trigger_vat_calculation_error_handling(self, mock_engine):
        mock_engine.execute.side_effect = Exception("Rules engine unavailable")

        self.service._trigger_vat_calculation(self.cart)
        self.cart.refresh_from_db()

        self.assertTrue(self.cart.vat_calculation_error)
        self.assertIn("unavailable", self.cart.vat_calculation_error_message)

    def test_resolve_user_context_authenticated(self):
        context = self.service._resolve_user_context(self.cart)
        self.assertEqual(context['id'], str(self.user.id))
        self.assertEqual(context['country_code'], 'GB')

    def test_resolve_user_context_anonymous(self):
        anon_cart = Cart.objects.create(session_key='guest-123')
        context = self.service._resolve_user_context(anon_cart)
        self.assertEqual(context['id'], 'anonymous')
        self.assertEqual(context['country_code'], 'GB')

    def test_get_item_product_type_from_metadata(self):
        item = CartItem(metadata={'variationType': 'eBook'})
        self.assertEqual(self.service._get_item_product_type(item), 'Digital')

        item = CartItem(metadata={'variationType': 'Printed'})
        self.assertEqual(self.service._get_item_product_type(item), 'Printed')

        item = CartItem(metadata={'variationType': 'Tutorial'})
        self.assertEqual(self.service._get_item_product_type(item), 'Tutorial')

        item = CartItem(metadata={'type': 'tutorial'})
        self.assertEqual(self.service._get_item_product_type(item), 'Tutorial')

    def test_get_item_product_type_fee(self):
        item = CartItem(item_type='fee', metadata={})
        self.assertEqual(self.service._get_item_product_type(item), 'Fee')

    def test_get_item_product_type_default(self):
        item = CartItem(item_type='product', metadata={})
        self.assertEqual(self.service._get_item_product_type(item), 'Digital')

    def test_get_item_product_code_no_product(self):
        item = CartItem(product=None)
        self.assertEqual(self.service._get_item_product_code(item), '')

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_calculate_vat_calls_rule_engine_with_correct_context(self, mock_engine):
        mock_engine.execute.return_value = {
            'vat': {'region': 'UK', 'rate': '0.2000'},
            'cart_item': {'vat_amount': '20.00', 'gross_amount': '120.00'},
        }

        self.service.calculate_vat(self.cart)

        mock_engine.execute.assert_called_once_with(
            'cart_calculate_vat',
            {
                'user': {'id': str(self.user.id), 'country_code': 'GB'},
                'cart_item': {
                    'id': str(self.cart_item.id),
                    'product_type': 'Printed',
                    'product_code': '',
                    'net_amount': 100.0,
                },
            }
        )
