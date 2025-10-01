"""
VAT Context Builder - Epic 3 Phase 3

Builds VAT calculation context from user and cart data for Rules Engine.
Follows TDD methodology - tests in vat/tests/test_context_builder.py
"""

from decimal import Decimal
from datetime import date
from .product_classifier import classify_product


def build_vat_context(user, cart):
    """
    Build VAT calculation context from user and cart data.

    Args:
        user: Django User object or None (anonymous)
        cart: Django Cart object with items

    Returns:
        dict: Context structure with user, cart, and settings sections
    """
    from country.vat_rates import map_country_to_region

    # Build user section
    if user is None or not user.is_authenticated:
        # Anonymous user
        user_context = {
            'id': None,
            'region': None,
            'address': {}
        }
    else:
        # Authenticated user - extract region from profile
        region = None
        address = {}

        if hasattr(user, 'userprofile') and user.userprofile:
            profile = user.userprofile

            # Extract country from profile
            country_code = None
            if hasattr(profile, 'country') and profile.country:
                country_code = profile.country.code
                address['country'] = country_code

            # Extract postcode if available
            if hasattr(profile, 'postcode') and profile.postcode:
                address['postcode'] = profile.postcode

            # Map country to region using Phase 1 function
            if country_code:
                region = map_country_to_region(country_code)

        user_context = {
            'id': user.id,
            'region': region,
            'address': address
        }

    # Build cart section
    cart_items = []
    total_net = Decimal('0.00')

    if cart and hasattr(cart, 'cartitem_set'):
        for cart_item in cart.cartitem_set.all():
            item_context = build_item_context(cart_item)
            cart_items.append(item_context)
            total_net += item_context['net_amount']

    cart_context = {
        'id': cart.id if cart else None,
        'items': cart_items,
        'total_net': total_net
    }

    # Build settings section
    settings_context = {
        'effective_date': date.today().isoformat(),
        'context_version': '1.0'
    }

    return {
        'user': user_context,
        'cart': cart_context,
        'settings': settings_context
    }


def build_item_context(cart_item):
    """
    Build context for a single cart item.

    Args:
        cart_item: Django CartItem object

    Returns:
        dict: Item context with classification
    """
    # Extract product info
    product = cart_item.product if hasattr(cart_item, 'product') else None
    product_variation = cart_item.product_variation if hasattr(cart_item, 'product_variation') else None

    # Determine product code (prefer variation code)
    product_code = None
    product_id = None

    if product_variation:
        product_code = product_variation.product_code if hasattr(product_variation, 'product_code') else None
        product_id = product_variation.id
    elif product:
        product_code = product.product_code if hasattr(product, 'product_code') else None
        product_id = product.id

    # Classify product
    classification = classify_product({'product_code': product_code} if product_code else None)

    # Calculate net amount
    price = cart_item.price if hasattr(cart_item, 'price') else Decimal('0.00')
    quantity = cart_item.quantity if hasattr(cart_item, 'quantity') else 1
    net_amount = (price * quantity).quantize(Decimal('0.01'))

    return {
        'item_id': cart_item.id,
        'product_id': product_id,
        'product_code': product_code,
        'price': price,
        'net_amount': net_amount,
        'quantity': quantity,
        'classification': classification
    }
