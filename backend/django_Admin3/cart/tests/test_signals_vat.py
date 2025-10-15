"""
Test suite for Cart VAT cache invalidation signals (Phase 4, Task T009)

Tests cart modification triggers that should invalidate VAT cache:
- post_save CartItem created → invalidate cache
- post_save CartItem quantity changed → invalidate cache
- post_delete CartItem → invalidate cache
- Signal clears error flags
- Signal handles anonymous carts (session-based)

Cache invalidation strategy prevents infinite recursion.
Fresh VAT calculated on-demand by serializers.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from cart.models import Cart, CartItem

User = get_user_model()


class CartVATSignalsTestCase(TestCase):
    """Test signals for automatic VAT recalculation on cart modifications"""

    def setUp(self):
        """Set up test data"""
        # Create test user with country
        self.user = User.objects.create_user(
            username='test_user',
            email='test@test.com',
            password='testpass123'
        )

        # Assuming user profile or user model has country_code field
        # If not, we'll need to get country from request context
        # For now, we'll test with the method signature that accepts country_code

        # Create cart
        self.cart = Cart.objects.create(user=self.user)

    def test_post_save_cartitem_created_invalidates_cache(self):
        """Test that creating a new CartItem invalidates VAT cache"""
        # Set initial VAT data on cart
        self.cart.vat_result = {'test': 'data'}
        self.cart.vat_last_calculated_at = timezone.now()
        self.cart.save()

        # Create a new cart item - this should trigger post_save signal
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Verify VAT cache was invalidated
        self.cart.refresh_from_db()
        self.assertIsNone(self.cart.vat_result, "VAT cache should be cleared")
        self.assertIsNone(self.cart.vat_last_calculated_at, "VAT timestamp should be cleared")

    def test_post_save_cartitem_quantity_changed_invalidates_cache(self):
        """Test that changing CartItem quantity invalidates VAT cache"""
        # Create initial cart item
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Set VAT cache after creation
        self.cart.vat_result = {'cached': 'data'}
        self.cart.vat_last_calculated_at = timezone.now()
        self.cart.save()

        # Update quantity - this should trigger post_save signal
        cart_item.quantity = 3
        cart_item.save()

        # Verify VAT cache was invalidated again
        self.cart.refresh_from_db()
        self.assertIsNone(self.cart.vat_result)

    def test_post_delete_cartitem_invalidates_cache(self):
        """Test that deleting a CartItem invalidates VAT cache"""
        # Create cart item
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Set VAT cache
        self.cart.vat_result = {'cached': 'data'}
        self.cart.vat_last_calculated_at = timezone.now()
        self.cart.save()

        # Delete cart item - this should trigger post_delete signal
        cart_item.delete()

        # Verify VAT cache was cleared
        self.cart.refresh_from_db()
        self.assertIsNone(self.cart.vat_result)
        self.assertIsNone(self.cart.vat_last_calculated_at)

    def test_signal_clears_error_flags(self):
        """Test that signal clears VAT error flags on cart modification"""
        # Set error state
        self.cart.vat_calculation_error = True
        self.cart.vat_calculation_error_message = "Previous error"
        self.cart.save()

        # Create cart item - should clear error flags
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Verify error flags cleared
        self.cart.refresh_from_db()
        self.assertFalse(self.cart.vat_calculation_error)
        self.assertIsNone(self.cart.vat_calculation_error_message)

    def test_signal_handles_anonymous_cart(self):
        """Test that signal handles carts without authenticated users (session-based)"""
        # Create anonymous cart (no user)
        anonymous_cart = Cart.objects.create(session_key='test_session_123')

        # Set initial cache
        anonymous_cart.vat_result = {'test': 'data'}
        anonymous_cart.save()

        # Create cart item for anonymous cart
        cart_item = CartItem.objects.create(
            cart=anonymous_cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Verify cache was invalidated (signal handled anonymous cart)
        anonymous_cart.refresh_from_db()
        self.assertIsNone(anonymous_cart.vat_result)

        # Clean up
        cart_item.delete()
        anonymous_cart.delete()

    def test_signal_error_handling(self):
        """Test that signal handles errors gracefully without crashing"""
        # Create cart item - signal should handle any errors internally
        try:
            cart_item = CartItem.objects.create(
                cart=self.cart,
                item_type='fee',
                quantity=1,
                actual_price=Decimal('50.00')
            )
            # If we reach here, item was created successfully
            self.assertIsNotNone(cart_item.id)
        except Exception as e:
            # Signal should catch and log errors, not propagate them
            self.fail(f"Signal should handle errors gracefully, but raised: {e}")
