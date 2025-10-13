"""
Phase 4: Cart signals for VAT cache invalidation

When cart items change (create, update, delete), we need to invalidate
the cached VAT calculations so they are recalculated on next API request.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import CartItem


@receiver(post_save, sender=CartItem)
def clear_vat_cache_on_item_save(sender, instance, created, **kwargs):
    """
    Clear VAT cache when a CartItem is created or updated.

    This ensures fresh VAT calculation on next cart API request.
    """
    cart = instance.cart

    # Clear VAT cache
    cart.vat_result = None
    cart.vat_last_calculated_at = None

    # Clear error flags
    cart.vat_calculation_error = False
    cart.vat_calculation_error_message = None

    # Save cart without triggering additional signals
    cart.save(update_fields=[
        'vat_result',
        'vat_last_calculated_at',
        'vat_calculation_error',
        'vat_calculation_error_message'
    ])


@receiver(post_delete, sender=CartItem)
def clear_vat_cache_on_item_delete(sender, instance, **kwargs):
    """
    Clear VAT cache when a CartItem is deleted.

    This ensures fresh VAT calculation on next cart API request.
    """
    cart = instance.cart

    # Clear VAT cache
    cart.vat_result = None
    cart.vat_last_calculated_at = None

    # Clear error flags
    cart.vat_calculation_error = False
    cart.vat_calculation_error_message = None

    # Save cart without triggering additional signals
    cart.save(update_fields=[
        'vat_result',
        'vat_last_calculated_at',
        'vat_calculation_error',
        'vat_calculation_error_message'
    ])
