"""
Phase 4: Cart VAT cache invalidation signals

When cart items change, invalidate cached VAT calculations.
Fresh VAT is calculated on-demand by serializers/views to avoid infinite recursion.

Strategy:
- Signals clear VAT cache (vat_result, timestamps, error flags)
- Serializers call calculate_vat_for_all_items() on GET requests
- This prevents signal→save→signal infinite loops
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import CartItem

logger = logging.getLogger(__name__)


@receiver(post_save, sender=CartItem)
def invalidate_vat_cache_on_item_save(sender, instance, created, **kwargs):
    """
    Signal handler: Invalidate VAT cache when CartItem is created or updated.

    Triggers:
    - CartItem created (new item added to cart)
    - CartItem quantity changed
    - CartItem price changed

    This clears cached VAT so fresh calculation happens on next API request.
    Does NOT actively recalculate to avoid infinite recursion.

    Args:
        sender: CartItem model class
        instance: CartItem instance that was saved
        created: Boolean - True if this is a new instance
        **kwargs: Additional signal arguments
    """
    # Skip if this save is from VAT calculation itself (prevent recursion)
    if kwargs.get('update_fields') and 'vat_amount' in kwargs.get('update_fields', []):
        return

    try:
        cart = instance.cart

        # Log the trigger
        action = "created" if created else "updated"
        logger.debug(f"CartItem {instance.id} {action} - invalidating VAT cache for cart {cart.id}")

        # Clear VAT cache - fresh calculation will happen on next GET /api/cart/
        cart.vat_result = None
        cart.vat_last_calculated_at = None

        # Clear error flags
        cart.vat_calculation_error = False
        cart.vat_calculation_error_message = None

        # Save without triggering signals
        cart.save(update_fields=[
            'vat_result',
            'vat_last_calculated_at',
            'vat_calculation_error',
            'vat_calculation_error_message'
        ])

        logger.debug(f"VAT cache invalidated for cart {cart.id}")

    except Exception as e:
        # Log error but don't crash the cart operation
        logger.error(f"Failed to invalidate VAT cache for cart {instance.cart.id}: {str(e)}")


@receiver(post_delete, sender=CartItem)
def invalidate_vat_cache_on_item_delete(sender, instance, **kwargs):
    """
    Signal handler: Invalidate VAT cache when CartItem is deleted.

    Triggers:
    - CartItem deleted (item removed from cart)

    Args:
        sender: CartItem model class
        instance: CartItem instance that was deleted
        **kwargs: Additional signal arguments
    """
    try:
        cart = instance.cart

        logger.debug(f"CartItem {instance.id} deleted - invalidating VAT cache for cart {cart.id}")

        # Clear VAT cache
        cart.vat_result = None
        cart.vat_last_calculated_at = None

        # Clear error flags
        cart.vat_calculation_error = False
        cart.vat_calculation_error_message = None

        # Save without triggering signals
        cart.save(update_fields=[
            'vat_result',
            'vat_last_calculated_at',
            'vat_calculation_error',
            'vat_calculation_error_message'
        ])

        logger.debug(f"VAT cache invalidated for cart {cart.id}")

    except Exception as e:
        # Log error but don't crash the cart operation
        logger.error(f"Failed to invalidate VAT cache after item deletion for cart {instance.cart.id}: {str(e)}")
