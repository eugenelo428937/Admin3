"""
Test suite for CartItem VAT validation constraints (Phase 4, Task T003)

Tests VAT field validations on CartItem model:
- vat_rate range validation (0.0000 to 1.0000)
- vat_amount non-negative constraint
- gross_amount calculation logic
- vat_region enum validation
- vat_calculated_at timestamp ordering
"""
from django.test import TestCase
from django.db import IntegrityError, transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from cart.models import Cart, CartItem
# Note: Cart now uses store.Product (T087 legacy app cleanup)

User = get_user_model()


class CartItemVATValidationTestCase(TestCase):
    """Test CartItem VAT field validations and constraints"""

    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # Create test cart
        self.cart = Cart.objects.create(user=self.user)

    def test_vat_rate_valid_range(self):
        """Test vat_rate must be between 0.0000 and 1.0000"""
        # Create a minimal product for testing (if ExamSessionSubjectProduct requires it)
        # For now, we'll create a CartItem with item_type='fee' to avoid product requirement

        # Valid rate: 0.0000
        item_zero = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00'),
            vat_rate=Decimal('0.0000'),
            vat_amount=Decimal('0.00'),
            gross_amount=Decimal('100.00')
        )
        self.assertEqual(item_zero.vat_rate, Decimal('0.0000'))

        # Valid rate: 0.2000 (20%)
        item_twenty = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00'),
            vat_rate=Decimal('0.2000'),
            vat_amount=Decimal('20.00'),
            gross_amount=Decimal('120.00')
        )
        self.assertEqual(item_twenty.vat_rate, Decimal('0.2000'))

        # Valid rate: 1.0000 (100%)
        item_hundred = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00'),
            vat_rate=Decimal('1.0000'),
            vat_amount=Decimal('100.00'),
            gross_amount=Decimal('200.00')
        )
        self.assertEqual(item_hundred.vat_rate, Decimal('1.0000'))

        # Invalid rate: 1.5000 (150% - exceeds max)
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                CartItem.objects.create(
                    cart=self.cart,
                    item_type='fee',
                    quantity=1,
                    actual_price=Decimal('100.00'),
                    vat_rate=Decimal('1.5000'),
                    vat_amount=Decimal('150.00'),
                    gross_amount=Decimal('250.00')
                )

        # Invalid rate: -0.1000 (negative)
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                CartItem.objects.create(
                    cart=self.cart,
                    item_type='fee',
                    quantity=1,
                    actual_price=Decimal('100.00'),
                    vat_rate=Decimal('-0.1000'),
                    vat_amount=Decimal('-10.00'),
                    gross_amount=Decimal('90.00')
                )

    def test_vat_amount_non_negative(self):
        """Test vat_amount must be >= 0"""
        # Valid: 0.00
        item_zero = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00'),
            vat_rate=Decimal('0.0000'),
            vat_amount=Decimal('0.00'),
            gross_amount=Decimal('100.00')
        )
        self.assertEqual(item_zero.vat_amount, Decimal('0.00'))

        # Valid: positive amount
        item_positive = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00'),
            vat_rate=Decimal('0.2000'),
            vat_amount=Decimal('20.00'),
            gross_amount=Decimal('120.00')
        )
        self.assertEqual(item_positive.vat_amount, Decimal('20.00'))

        # Invalid: negative amount
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                CartItem.objects.create(
                    cart=self.cart,
                    item_type='fee',
                    quantity=1,
                    actual_price=Decimal('100.00'),
                    vat_rate=Decimal('0.0000'),
                    vat_amount=Decimal('-10.00'),
                    gross_amount=Decimal('90.00')
                )

    def test_gross_amount_calculation(self):
        """Test gross_amount = net_amount + vat_amount logic"""
        # Create item with known values
        net_price = Decimal('100.00')
        vat_amount = Decimal('20.00')
        expected_gross = net_price + vat_amount

        item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=net_price,
            vat_rate=Decimal('0.2000'),
            vat_amount=vat_amount,
            gross_amount=expected_gross
        )

        # Verify gross amount
        self.assertEqual(item.gross_amount, expected_gross)
        self.assertEqual(item.gross_amount, Decimal('120.00'))

        # Verify calculation with quantity
        item_qty = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=3,
            actual_price=Decimal('50.00'),
            vat_rate=Decimal('0.1500'),
            vat_amount=Decimal('22.50'),  # (50 * 3) * 0.15 = 22.50
            gross_amount=Decimal('172.50')  # (50 * 3) + 22.50
        )

        net_total = item_qty.actual_price * item_qty.quantity
        expected_gross_qty = net_total + item_qty.vat_amount
        self.assertEqual(item_qty.gross_amount, expected_gross_qty)

    def test_vat_region_enum(self):
        """Test vat_region accepts valid region codes"""
        valid_regions = ['UK', 'IE', 'EU', 'SA', 'ROW']

        for region in valid_regions:
            item = CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('100.00'),
                vat_region=region,
                vat_rate=Decimal('0.2000'),
                vat_amount=Decimal('20.00'),
                gross_amount=Decimal('120.00')
            )
            self.assertEqual(item.vat_region, region)

        # Note: CharField doesn't enforce enum at DB level in Django by default
        # The validation would be in serializers/forms
        # But we can still test that valid values are stored correctly

    def test_gross_amount_non_negative(self):
        """Test gross_amount must be >= 0"""
        # Valid: zero gross amount
        item_zero = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('0.00'),
            vat_rate=Decimal('0.0000'),
            vat_amount=Decimal('0.00'),
            gross_amount=Decimal('0.00')
        )
        self.assertEqual(item_zero.gross_amount, Decimal('0.00'))

        # Valid: positive gross amount
        item_positive = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00'),
            vat_rate=Decimal('0.2000'),
            vat_amount=Decimal('20.00'),
            gross_amount=Decimal('120.00')
        )
        self.assertGreater(item_positive.gross_amount, Decimal('0.00'))

        # Invalid: negative gross amount
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                CartItem.objects.create(
                    cart=self.cart,
                    item_type='fee',
                    quantity=1,
                    actual_price=Decimal('100.00'),
                    vat_rate=Decimal('0.0000'),
                    vat_amount=Decimal('0.00'),
                    gross_amount=Decimal('-50.00')
                )

    def test_vat_calculated_at_timestamp(self):
        """Test vat_calculated_at timestamp ordering and updates"""
        now = timezone.now()

        # Create item with initial timestamp
        item1 = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00'),
            vat_region='UK',
            vat_rate=Decimal('0.2000'),
            vat_amount=Decimal('20.00'),
            gross_amount=Decimal('120.00'),
            vat_calculated_at=now
        )
        self.assertIsNotNone(item1.vat_calculated_at)
        self.assertEqual(item1.vat_calculated_at, now)

        # Create item with later timestamp
        later = now + timedelta(seconds=10)
        item2 = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00'),
            vat_region='UK',
            vat_rate=Decimal('0.2000'),
            vat_amount=Decimal('10.00'),
            gross_amount=Decimal('60.00'),
            vat_calculated_at=later
        )

        # Verify timestamp ordering
        self.assertLess(item1.vat_calculated_at, item2.vat_calculated_at)

        # Update timestamp
        new_timestamp = timezone.now()
        item1.vat_calculated_at = new_timestamp
        item1.save()
        item1.refresh_from_db()
        self.assertEqual(item1.vat_calculated_at, new_timestamp)

    def test_vat_rule_version_storage(self):
        """Test vat_rule_version field stores rule version correctly"""
        item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00'),
            vat_region='UK',
            vat_rate=Decimal('0.2000'),
            vat_amount=Decimal('20.00'),
            gross_amount=Decimal('120.00'),
            vat_rule_version=3,
            vat_calculated_at=timezone.now()
        )

        self.assertEqual(item.vat_rule_version, 3)

        # Update to new version
        item.vat_rule_version = 4
        item.save()
        item.refresh_from_db()
        self.assertEqual(item.vat_rule_version, 4)

    def test_vat_fields_nullable(self):
        """Test VAT fields can be null (for items not yet calculated)"""
        item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00'),
            # VAT fields intentionally null
            vat_region=None,
            vat_rate=None,
            vat_amount=None,
            gross_amount=None,
            vat_calculated_at=None,
            vat_rule_version=None
        )

        self.assertIsNone(item.vat_region)
        self.assertIsNone(item.vat_rate)
        self.assertIsNone(item.vat_amount)
        self.assertIsNone(item.gross_amount)
        self.assertIsNone(item.vat_calculated_at)
        self.assertIsNone(item.vat_rule_version)
