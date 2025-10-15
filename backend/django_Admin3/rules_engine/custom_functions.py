import logging

logger = logging.getLogger(__name__)

def apply_tutorial_booking_fee(cart_items, params):
    """
    Apply tutorial booking fee to the cart.
    
    Args:
        cart_items: List of cart items or cart object (can be empty for testing)
        params: Dictionary containing fee parameters including cart_id and rule_id
        
    Returns:
        dict: Fee application result
    """
    try:
        fee_amount = params.get('fee_amount', 1.00)  # Default £1
        fee_description = params.get('fee_description', 'Tutorial Booking Fee')
        cart_id = params.get('cart_id')
        rule_id = params.get('rule_id')

        # For testing, if no cart_id provided, return a mock success
        if not cart_id:
            return {
                'success': True,
                'fee_applied': True,
                'fee_amount': fee_amount,
                'fee_description': fee_description,
                'fee_id': 'test_fee_id',
                'fee_details': {
                    'id': 'test_fee_id',
                    'name': fee_description,
                    'amount': fee_amount,
                    'type': 'tutorial_booking_fee',
                    'description': 'One-time booking fee for tutorial reservations (TEST MODE)',
                    'refundable': False,
                    'currency': 'GBP'
                },
                'message': f'{fee_description} of £{fee_amount} applied to cart (TEST MODE)'
            }
        
        # Import here to avoid circular imports
        from cart.models import Cart, CartFee
        
        try:
            cart = Cart.objects.get(id=cart_id)
        except Cart.DoesNotExist:
            logger.error(f"DEBUG: Cart {cart_id} not found")
            return {
                'success': False,
                'error': f'Cart {cart_id} not found',
                'fee_applied': False,
                'fee_amount': 0
            }
        
        # Check if fee already exists
        existing_fee = CartFee.objects.filter(
            cart=cart,
            fee_type='tutorial_booking_fee'
        ).first()
        
        if existing_fee:
            return {
                'success': True,
                'fee_applied': False,
                'message': 'Tutorial booking fee already exists in cart',
                'fee_amount': existing_fee.amount,
                'fee_id': existing_fee.id
            }
        
        # Create the fee
        cart_fee = CartFee.objects.create(
            cart=cart,
            fee_type='tutorial_booking_fee',
            name=fee_description,
            description='One-time booking fee for tutorial reservations. This charge cannot be refunded but will be deducted from your final tutorial booking charge.',
            amount=fee_amount,
            currency='GBP',
            is_refundable=False,
            applied_by_rule=rule_id,
            metadata={
                'applied_by_rule_name': params.get('rule_name', 'Tutorial Booking Fee'),
                'payment_method': params.get('payment_method', 'credit_card'),
                'application_timestamp': params.get('timestamp')
            }
        )
        
        result = {
            'success': True,
            'fee_applied': True,
            'fee_amount': fee_amount,
            'fee_description': fee_description,
            'fee_id': cart_fee.id,
            'fee_details': {
                'id': cart_fee.id,
                'name': fee_description,
                'amount': fee_amount,
                'type': 'tutorial_booking_fee',
                'description': cart_fee.description,
                'refundable': False,
                'currency': 'GBP'
            },
            'message': f'{fee_description} of £{fee_amount} applied to cart'
        }

        return result
        
    except Exception as e:
        logger.error(f"Error in apply_tutorial_booking_fee: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'fee_applied': False,
            'fee_amount': 0
        }


# ============================================================================
# VAT Calculation Functions (Epic 3 - Phase 1 & Phase 2)
# ============================================================================

from country.vat_rates import get_vat_rate, map_country_to_region
from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Q
from django.utils import timezone


def lookup_region(country_code, effective_date=None):
    """
    Lookup VAT region for country code using UtilsCountryRegion.

    Args:
        country_code: ISO 3166-1 alpha-2 country code (e.g., 'GB', 'IE', 'ZA')
        effective_date: Optional date to check (defaults to today)

    Returns:
        str: Region code ('UK', 'IE', 'EU', 'SA', 'ROW')

    Examples:
        >>> lookup_region('GB')
        'UK'
        >>> lookup_region('ZA')
        'SA'
        >>> lookup_region('UNKNOWN')
        'ROW'
    """
    from utils.models import UtilsCountrys, UtilsCountryRegion

    if effective_date is None:
        effective_date = timezone.now().date()

    try:
        # Normalize country code to uppercase
        country = UtilsCountrys.objects.get(code=country_code.upper())

        # Query for region mapping with date filtering
        mapping = UtilsCountryRegion.objects.filter(
            country=country,
            effective_from__lte=effective_date
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=effective_date)
        ).select_related('region').first()

        if mapping:
            return mapping.region.code
        else:
            logger.warning(f'No region mapping found for country: {country_code}')
            return 'ROW'

    except UtilsCountrys.DoesNotExist:
        logger.warning(f'Country not found: {country_code}')
        return 'ROW'


def lookup_vat_rate(country_code):
    """
    Get VAT rate percentage from UtilsCountrys.

    Args:
        country_code: ISO 3166-1 alpha-2 country code (e.g., 'GB', 'IE', 'ZA')

    Returns:
        Decimal: VAT rate as decimal (e.g., Decimal('0.20') for 20%)

    Examples:
        >>> lookup_vat_rate('GB')
        Decimal('0.20')
        >>> lookup_vat_rate('ZA')
        Decimal('0.15')
        >>> lookup_vat_rate('UNKNOWN')
        Decimal('0.00')
    """
    from utils.models import UtilsCountrys

    try:
        # Normalize country code to uppercase
        country = UtilsCountrys.objects.get(code=country_code.upper(), active=True)

        # Get VAT percent and convert to decimal rate
        if country.vat_percent is None:
            logger.warning(f'VAT percent is NULL for country: {country_code}')
            return Decimal('0.00')

        # Convert percentage (20.00) to decimal rate (0.20)
        vat_rate = country.vat_percent / Decimal('100')
        return vat_rate

    except UtilsCountrys.DoesNotExist:
        logger.warning(f'Country not found: {country_code}')
        return Decimal('0.00')


def calculate_vat_amount(net_amount, vat_rate):
    """
    Calculate VAT amount with proper rounding (ROUND_HALF_UP to 2 decimal places).

    Args:
        net_amount: Net amount before VAT (Decimal or string)
        vat_rate: VAT rate as decimal (e.g., 0.20 for 20%)

    Returns:
        Decimal: VAT amount rounded to 2 decimal places

    Examples:
        >>> calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
        Decimal('20.00')
        >>> calculate_vat_amount('50.555', '0.20')
        Decimal('10.11')
    """
    amount = Decimal(str(net_amount)) * Decimal(str(vat_rate))
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


# Helper function for adding decimal values
def add_decimals(value1, value2):
    """
    Add two decimal values.

    Args:
        value1: First decimal value
        value2: Second decimal value

    Returns:
        Decimal: Sum of the two values

    Examples:
        >>> add_decimals(Decimal('100.00'), Decimal('20.00'))
        Decimal('120.00')
    """
    return Decimal(str(value1)) + Decimal(str(value2))


# Function Registry - maps function names to callable functions for Rules Engine
FUNCTION_REGISTRY = {
    # Phase 1 functions (legacy)
    "get_vat_rate": get_vat_rate,
    "map_country_to_region": map_country_to_region,
    # Phase 2 functions (database-driven)
    "lookup_region": lookup_region,
    "lookup_vat_rate": lookup_vat_rate,
    "calculate_vat_amount": calculate_vat_amount,
    # Helper functions for Phase 3
    "add_decimals": add_decimals,
}

# ============================================================================
# VAT Calculation Integration (Epic 3 - Phase 2)
# ============================================================================

def calculate_vat_for_context(context, params):
    """
    Calculate VAT for a given context using the new VAT calculation service.
    This function integrates the VAT service with the rules engine.

    Args:
        context: Dictionary containing country_code, net_amount, or cart_items
        params: Dictionary with optional parameter overrides

    Returns:
        dict: VAT calculation results or error information

    Examples:
        >>> context = {'country_code': 'GB', 'net_amount': Decimal('100.00')}
        >>> result = calculate_vat_for_context(context, {})
        >>> result['vat_amount']
        Decimal('20.00')
    """
    try:
        from utils.services.vat_service import VATCalculationService

        vat_service = VATCalculationService()

        # Get country code from params (override) or context
        country_code = params.get('country_code') or context.get('country_code')

        if not country_code:
            return {
                'error': 'country_code is required for VAT calculation',
                'success': False
            }

        # Check if cart items are provided
        cart_items = context.get('cart_items') or params.get('cart_items')

        if cart_items:
            # Calculate VAT for cart items
            result = vat_service.calculate_vat_for_cart(
                country_code=country_code,
                cart_items=cart_items
            )
        else:
            # Calculate VAT for single net amount
            net_amount = params.get('net_amount') or context.get('net_amount')

            if not net_amount:
                return {
                    'error': 'net_amount or cart_items is required for VAT calculation',
                    'success': False
                }

            result = vat_service.calculate_vat(
                country_code=country_code,
                net_amount=Decimal(str(net_amount))
            )

        result['success'] = True
        logger.info(f"VAT calculated for {country_code}: {result.get('vat_amount', result.get('total_vat_amount'))}")
        return result

    except Exception as e:
        logger.error(f"Error in calculate_vat_for_context: {str(e)}")
        return {
            'error': str(e),
            'success': False
        }