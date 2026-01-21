"""
VAT Context Builder - Epic 3 Phase 3

Builds VAT calculation context from user and cart data for Rules Engine.
Follows TDD methodology - tests in vat/tests/test_context_builder.py
"""

from decimal import Decimal
from datetime import date
from django.db import models


# EU member country codes (ISO 3166-1 alpha-2)
EU_COUNTRY_CODES = {
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
}


def map_country_to_region(country_code: str) -> str:
    """
    Map ISO 3166-1 alpha-2 country code to VAT region.

    VAT Regions:
    - UK: United Kingdom (GB)
    - IE: Ireland (special case - EU but separate VAT rules)
    - SA: South Africa (ZA)
    - EU: European Union member states (excluding IE which is handled separately)
    - ROW: Rest of World (all other countries)

    Args:
        country_code: ISO 3166-1 alpha-2 country code (e.g., 'GB', 'DE', 'US')

    Returns:
        VAT region code: 'UK', 'IE', 'SA', 'EU', or 'ROW'
    """
    if not country_code:
        return None

    country_code = country_code.upper()

    # UK/GB
    if country_code in ('GB', 'UK'):
        return 'UK'

    # Ireland - separate from EU for VAT purposes
    if country_code == 'IE':
        return 'IE'

    # South Africa
    if country_code == 'ZA':
        return 'SA'

    # EU member states (excluding Ireland which is handled above)
    if country_code in EU_COUNTRY_CODES:
        return 'EU'

    # All other countries
    return 'ROW'


def build_vat_context(user, cart, client_ip=None):
    """
    Build VAT calculation context from user and cart data.

    Args:
        user: Django User object or None (anonymous)
        cart: Django Cart object with items
        client_ip: Optional client IP address for anonymous users

    Returns:
        dict: Context structure with user, cart, and settings sections
    """
    # PHASE 1 CLEANUP: Removed import from legacy country.vat_rates
    # TODO Phase 2: Region lookup will be handled by Rules Engine custom functions
    from .ip_geolocation import get_region_from_ip, get_country_from_ip

    # Build user section
    if user is None or not user.is_authenticated:
        # Anonymous user - use IP geolocation if available
        region = None
        address = {}

        if client_ip:
            region = get_region_from_ip(client_ip)
            country_code = get_country_from_ip(client_ip)
            if country_code:
                address['country'] = country_code

        user_context = {
            'id': None,
            'region': region,
            'address': address
        }
    else:
        # Authenticated user - extract region from profile
        region = None
        address = {}

        if hasattr(user, 'userprofile') and user.userprofile:
            profile = user.userprofile

            # Extract country from HOME address (UserProfileAddress)
            country_code = None
            home_address = None

            # Get HOME address from profile
            if hasattr(profile, 'addresses'):
                home_address = profile.addresses.filter(address_type='HOME').first()

                if home_address:
                    # Get country from UserProfileAddress.country field (string)
                    country_str = home_address.country
                    if country_str:
                        # Try to find matching Country object by name or iso_code
                        from country.models import Country
                        try:
                            country_obj = Country.objects.filter(
                                models.Q(name=country_str) | models.Q(iso_code=country_str)
                            ).first()
                            if country_obj:
                                country_code = country_obj.iso_code
                        except:
                            # Assume country_str is already an iso_code
                            country_code = country_str

                    # Add to address dict
                    if country_code:
                        address['country'] = country_code

                    # Extract postcode from address_data JSON
                    postcode = home_address.postal_code  # Uses @property
                    if postcode:
                        address['postcode'] = postcode

            # Map country code to VAT region
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

    # Fixed: use 'items' related_name from CartItem model
    if cart and hasattr(cart, 'items'):
        for cart_item in cart.items.all():
            item_context = build_item_context(cart_item)
            cart_items.append(item_context)
            # Convert net_amount from string back to Decimal for aggregation
            total_net += Decimal(item_context['net_amount'])

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
        cart_item: Django CartItem object with actual_price and metadata fields

    Returns:
        dict: Item context with classification
    """
    # Extract product code from metadata (primary source) or product FK (fallback)
    product_code = None
    product_id = None

    # Try metadata first (preferred for VAT system)
    if cart_item.metadata and isinstance(cart_item.metadata, dict):
        product_code = cart_item.metadata.get('product_code')

    # Fallback to product FK if metadata doesn't have product_code
    if not product_code and cart_item.product:
        product = cart_item.product
        product_id = product.id
        # Try to get product_code from product (ExamSessionSubjectProduct)
        if hasattr(product, 'product_code'):
            product_code = product.product_code
        elif hasattr(product, 'code'):
            product_code = product.code

    # Get classification from metadata (if provided)
    # PHASE 1 CLEANUP: Removed classify_product() call (function deleted)
    # TODO Phase 2: Classification will be handled by Rules Engine
    classification = None
    if cart_item.metadata and 'classification' in cart_item.metadata:
        classification = cart_item.metadata['classification']
    else:
        # Classification will be determined by Rules Engine based on product_code
        classification = {'product_type': 'unknown', 'metadata': {}}

    # Calculate net amount using actual_price (not price)
    actual_price = cart_item.actual_price if cart_item.actual_price is not None else Decimal('0.00')
    quantity = cart_item.quantity if cart_item.quantity else 1
    net_amount = (actual_price * quantity).quantize(Decimal('0.01'))

    return {
        'item_id': cart_item.id,
        'product_id': product_id,
        'product_code': product_code,
        'net_amount': str(net_amount),  # Convert to string as per VAT schema
        'quantity': quantity,
        'classification': classification
    }
