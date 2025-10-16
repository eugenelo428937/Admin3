"""
Phase 4: Model validation tests for Cart and CartItem VAT fields
TDD Phase: RED - These tests validate model constraints and field validations
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import datetime

from cart.models import Cart, CartItem

User = get_user_model()


class CartItemVATFieldsTestCase(TestCase):
    """Test CartItem VAT field validations and constraints"""

    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='test_user',
            email='test@test.com',
            password='testpass123'
        )
        # Create test cart
        self.cart = Cart.objects.create(user=self.user)

    def test_cartitem_vat_fields_nullable(self):
        """Test that all VAT fields are nullable and can be None"""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',  # fee type doesn't require product
            quantity=1,
            actual_price=Decimal('50.00'),
            # VAT fields intentionally left as None
            vat_region=None,
            vat_rate=None,
            vat_amount=None,
            gross_amount=None,
            vat_calculated_at=None,
            vat_rule_version=None
        )

        cart_item.refresh_from_db()

        self.assertIsNone(cart_item.vat_region)
        self.assertIsNone(cart_item.vat_rate)
        self.assertIsNone(cart_item.vat_amount)
        self.assertIsNone(cart_item.gross_amount)
        self.assertIsNone(cart_item.vat_calculated_at)
        self.assertIsNone(cart_item.vat_rule_version)

    def test_cartitem_vat_rate_valid_range(self):
        """Test that vat_rate accepts values between 0.0000 and 1.0000"""
        # Test minimum valid value (0%)
        cart_item_min = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_rate=Decimal('0.0000')
        )
        cart_item_min.full_clean()  # Should not raise

        # Test maximum valid value (100%)
        cart_item_max = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_rate=Decimal('1.0000')
        )
        cart_item_max.full_clean()  # Should not raise

        # Test typical valid value (20%)
        cart_item_typical = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_rate=Decimal('0.2000')
        )
        cart_item_typical.full_clean()  # Should not raise

        self.assertEqual(cart_item_min.vat_rate, Decimal('0.0000'))
        self.assertEqual(cart_item_max.vat_rate, Decimal('1.0000'))
        self.assertEqual(cart_item_typical.vat_rate, Decimal('0.2000'))

    def test_cartitem_vat_rate_below_range_fails(self):
        """Test that vat_rate below 0.0000 fails constraint"""
        with self.assertRaises(IntegrityError) as context:
            CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('50.00'),
                vat_rate=Decimal('-0.0001')  # Invalid: negative rate
            )

        self.assertIn('cart_item_vat_rate_range', str(context.exception))

    def test_cartitem_vat_rate_above_range_fails(self):
        """Test that vat_rate above 1.0000 fails constraint"""
        with self.assertRaises(IntegrityError) as context:
            CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('50.00'),
                vat_rate=Decimal('1.0001')  # Invalid: > 100%
            )

        self.assertIn('cart_item_vat_rate_range', str(context.exception))

    def test_cartitem_vat_amount_non_negative(self):
        """Test that vat_amount must be >= 0"""
        # Valid: zero VAT amount
        cart_item_zero = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_amount=Decimal('0.00')
        )
        cart_item_zero.full_clean()  # Should not raise

        # Valid: positive VAT amount
        cart_item_positive = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_amount=Decimal('10.00')
        )
        cart_item_positive.full_clean()  # Should not raise

        self.assertEqual(cart_item_zero.vat_amount, Decimal('0.00'))
        self.assertEqual(cart_item_positive.vat_amount, Decimal('10.00'))

    def test_cartitem_vat_amount_negative_fails(self):
        """Test that negative vat_amount fails constraint"""
        with self.assertRaises(IntegrityError) as context:
            CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('50.00'),
                vat_amount=Decimal('-0.01')  # Invalid: negative VAT
            )

        self.assertIn('cart_item_vat_amount_non_negative', str(context.exception))

    def test_cartitem_gross_amount_non_negative(self):
        """Test that gross_amount must be >= 0"""
        # Valid: zero gross amount
        cart_item_zero = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('0.00'),
            gross_amount=Decimal('0.00')
        )
        cart_item_zero.full_clean()  # Should not raise

        # Valid: positive gross amount
        cart_item_positive = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            gross_amount=Decimal('60.00')
        )
        cart_item_positive.full_clean()  # Should not raise

        self.assertEqual(cart_item_zero.gross_amount, Decimal('0.00'))
        self.assertEqual(cart_item_positive.gross_amount, Decimal('60.00'))

    def test_cartitem_gross_amount_negative_fails(self):
        """Test that negative gross_amount fails constraint"""
        with self.assertRaises(IntegrityError) as context:
            CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('50.00'),
                gross_amount=Decimal('-0.01')  # Invalid: negative gross
            )

        self.assertIn('cart_item_gross_amount_non_negative', str(context.exception))

    def test_cartitem_vat_region_max_length(self):
        """Test that vat_region accepts max 10 characters"""
        # Valid: 10 characters or less
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_region='ROW'  # 3 characters
        )
        cart_item.full_clean()  # Should not raise

        cart_item_max = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_region='1234567890'  # Exactly 10 characters
        )
        cart_item_max.full_clean()  # Should not raise

        self.assertEqual(cart_item.vat_region, 'ROW')
        self.assertEqual(cart_item_max.vat_region, '1234567890')

    def test_cartitem_vat_region_exceeds_max_length_fails(self):
        """Test that vat_region > 10 characters fails validation"""
        cart_item = CartItem(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_region='12345678901'  # 11 characters - exceeds max
        )

        with self.assertRaises(ValidationError) as context:
            cart_item.full_clean()

        self.assertIn('vat_region', context.exception.message_dict)

    def test_cartitem_vat_calculated_at_timestamp(self):
        """Test that vat_calculated_at accepts datetime values"""
        timestamp = datetime(2025, 1, 12, 10, 30, 0)

        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_calculated_at=timestamp
        )

        cart_item.refresh_from_db()
        # Compare dates only (time may differ due to timezone conversion)
        self.assertEqual(cart_item.vat_calculated_at.date(), timestamp.date())

    def test_cartitem_vat_rule_version_integer(self):
        """Test that vat_rule_version accepts integer values"""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_rule_version=3
        )

        cart_item.refresh_from_db()
        self.assertEqual(cart_item.vat_rule_version, 3)
        self.assertIsInstance(cart_item.vat_rule_version, int)

    def test_cartitem_complete_vat_data(self):
        """Test CartItem with all VAT fields populated"""
        timestamp = datetime(2025, 1, 12, 10, 30, 0)

        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_region='UK',
            vat_rate=Decimal('0.2000'),
            vat_amount=Decimal('10.00'),
            gross_amount=Decimal('60.00'),
            vat_calculated_at=timestamp,
            vat_rule_version=3
        )

        cart_item.refresh_from_db()

        # Verify all VAT fields
        self.assertEqual(cart_item.vat_region, 'UK')
        self.assertEqual(cart_item.vat_rate, Decimal('0.2000'))
        self.assertEqual(cart_item.vat_amount, Decimal('10.00'))
        self.assertEqual(cart_item.gross_amount, Decimal('60.00'))
        self.assertEqual(cart_item.vat_calculated_at.date(), timestamp.date())
        self.assertEqual(cart_item.vat_rule_version, 3)


class CartVATErrorFieldsTestCase(TestCase):
    """Test Cart VAT error tracking field validations"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123'
        )

    def test_cart_vat_error_fields_defaults(self):
        """Test that Cart error fields have correct defaults"""
        cart = Cart.objects.create(user=self.user)

        cart.refresh_from_db()

        # vat_calculation_error should default to False
        self.assertFalse(cart.vat_calculation_error)

        # vat_calculation_error_message should be None
        self.assertIsNone(cart.vat_calculation_error_message)

        # vat_last_calculated_at should be None
        self.assertIsNone(cart.vat_last_calculated_at)

    def test_cart_vat_calculation_error_boolean(self):
        """Test that vat_calculation_error accepts boolean values"""
        cart_no_error = Cart.objects.create(
            user=self.user,
            vat_calculation_error=False
        )

        cart_with_error = Cart.objects.create(
            session_key='test_session_123',
            vat_calculation_error=True
        )

        self.assertFalse(cart_no_error.vat_calculation_error)
        self.assertTrue(cart_with_error.vat_calculation_error)

    def test_cart_vat_calculation_error_message_text(self):
        """Test that vat_calculation_error_message accepts text"""
        error_message = "Rule engine execution failed: No active rules found for entry point 'cart_calculate_vat'"

        cart = Cart.objects.create(
            user=self.user,
            vat_calculation_error=True,
            vat_calculation_error_message=error_message
        )

        cart.refresh_from_db()
        self.assertEqual(cart.vat_calculation_error_message, error_message)

    def test_cart_vat_calculation_error_message_long_text(self):
        """Test that vat_calculation_error_message accepts long text"""
        long_error = "X" * 1000  # 1000 character error message

        cart = Cart.objects.create(
            user=self.user,
            vat_calculation_error=True,
            vat_calculation_error_message=long_error
        )

        cart.refresh_from_db()
        self.assertEqual(len(cart.vat_calculation_error_message), 1000)

    def test_cart_vat_last_calculated_at_timestamp(self):
        """Test that vat_last_calculated_at accepts datetime values"""
        timestamp = datetime(2025, 1, 12, 10, 30, 0)

        cart = Cart.objects.create(
            user=self.user,
            vat_last_calculated_at=timestamp
        )

        cart.refresh_from_db()
        # Compare dates only (time may differ due to timezone conversion)
        self.assertEqual(cart.vat_last_calculated_at.date(), timestamp.date())

    def test_cart_complete_error_state(self):
        """Test Cart with complete error state populated"""
        timestamp = datetime(2025, 1, 12, 10, 30, 0)
        error_message = "VAT calculation failed"

        cart = Cart.objects.create(
            user=self.user,
            vat_calculation_error=True,
            vat_calculation_error_message=error_message,
            vat_last_calculated_at=timestamp
        )

        cart.refresh_from_db()

        self.assertTrue(cart.vat_calculation_error)
        self.assertEqual(cart.vat_calculation_error_message, error_message)
        self.assertEqual(cart.vat_last_calculated_at.date(), timestamp.date())

    def test_cart_error_cleared_state(self):
        """Test Cart with error cleared (set back to defaults)"""
        # Create cart with error
        cart = Cart.objects.create(
            user=self.user,
            vat_calculation_error=True,
            vat_calculation_error_message="Previous error"
        )

        # Clear error
        cart.vat_calculation_error = False
        cart.vat_calculation_error_message = None
        cart.save()

        cart.refresh_from_db()

        self.assertFalse(cart.vat_calculation_error)
        self.assertIsNone(cart.vat_calculation_error_message)
