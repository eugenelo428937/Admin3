"""
VAT Calculation Service - Epic 3 Phase 4

Orchestrates VAT calculation for cart items with Rules Engine integration.
Follows TDD methodology - tests in vat/tests/test_service.py
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
import uuid
from country.vat_rates import get_vat_rate


def calculate_vat_for_item(item_context):
    """
    Calculate VAT for a single cart item.

    Args:
        item_context: Dict with structure:
            {
                'user': {'region': str},
                'item': {
                    'item_id': int,
                    'product_code': str,
                    'net_amount': Decimal,
                    'classification': dict
                }
            }

    Returns:
        dict: {
            'item_id': int,
            'net_amount': Decimal,
            'vat_amount': Decimal,
            'vat_rate': Decimal,
            'vat_rule_applied': str,
            'exemption_reason': str (optional)
        }
    """
    # Extract region and item data
    region = item_context.get('user', {}).get('region')
    item = item_context.get('item', {})

    item_id = item.get('item_id')
    # Convert net_amount from string to Decimal
    net_amount_raw = item.get('net_amount', '0.00')
    net_amount = Decimal(net_amount_raw) if isinstance(net_amount_raw, str) else net_amount_raw
    classification = item.get('classification', {})

    # Default to ROW if region is None
    if region is None:
        region = 'ROW'

    # Get VAT rate from Phase 1 function
    vat_rate = get_vat_rate(region, classification)

    # Calculate VAT amount with proper rounding
    vat_amount = (net_amount * vat_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    # Determine rule applied and exemption reason
    vat_rule_applied = _determine_vat_rule(region, classification, vat_rate)

    result = {
        'item_id': item_id,
        'net_amount': net_amount,
        'vat_amount': vat_amount,
        'vat_rate': vat_rate,
        'vat_rule_applied': vat_rule_applied
    }

    # Add exemption reason if VAT is 0 and there's a specific reason
    if vat_rate == Decimal('0.00'):
        exemption_reason = _determine_exemption_reason(region, classification)
        if exemption_reason:
            result['exemption_reason'] = exemption_reason

    return result


def _determine_vat_rule(region, classification, vat_rate):
    """
    Determine which VAT rule was applied.

    Args:
        region: User region (UK, EU, ROW, SA, etc.)
        classification: Product classification dict
        vat_rate: Applied VAT rate

    Returns:
        str: Rule identifier in format "rule_name:version"
    """
    # UK eBook zero rate
    if region == 'UK' and classification.get('is_ebook', False):
        return 'vat_uk_ebook_zero:v1'

    # ROW digital zero rate
    if region == 'ROW' and classification.get('is_digital', False):
        return 'vat_row_digital_zero:v1'

    # SA standard rate
    if region == 'SA':
        return 'vat_sa_standard:v1'

    # UK standard rate
    if region == 'UK' and vat_rate == Decimal('0.20'):
        return 'vat_uk_standard:v1'

    # EU/ROW zero rate (non-digital)
    if region in ['EU', 'ROW'] and vat_rate == Decimal('0.00'):
        return 'vat_eu_row_zero:v1'

    # Default fallback
    return f'vat_{region.lower()}_default:v1'


def _determine_exemption_reason(region, classification):
    """
    Determine exemption reason for zero-rated items.

    Args:
        region: User region
        classification: Product classification dict

    Returns:
        str: Exemption reason or None
    """
    if region == 'UK' and classification.get('is_ebook', False):
        return 'UK eBook post-2020'

    if region == 'ROW' and classification.get('is_digital', False):
        return 'ROW digital products'

    if region in ['EU', 'ROW']:
        return 'Non-UK customer'

    return None


def calculate_vat_for_cart(user, cart):
    """
    Calculate VAT for all items in cart.

    Args:
        user: Django User object or None
        cart: Django Cart object

    Returns:
        dict: VAT result structure matching cart.vat_result schema:
        {
            'status': 'success',
            'execution_id': str,
            'vat_calculations': {
                'items': [...],
                'totals': {...},
                'region_info': {...}
            },
            'rules_executed': [...],
            'execution_time_ms': int,
            'created_at': str (ISO format)
        }
    """
    from vat.context_builder import build_vat_context
    import time

    # Start execution timer
    start_time = time.time()

    # Generate unique execution ID
    execution_id = f"exec_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    # Build full context using Phase 3
    full_context = build_vat_context(user, cart)

    # Calculate VAT for each item
    vat_items = []
    rules_executed = []

    for item in full_context['cart']['items']:
        # Build per-item context with user + item + settings
        item_context = {
            'user': full_context['user'],
            'item': item,
            'settings': full_context['settings']
        }

        # Calculate VAT for this item
        item_result = calculate_vat_for_item(item_context)
        vat_items.append(item_result)

        # Track rule applied
        if item_result['vat_rule_applied'] not in rules_executed:
            rules_executed.append(item_result['vat_rule_applied'])

    # Aggregate totals
    total_net = sum(item['net_amount'] for item in vat_items)
    total_vat = sum(item['vat_amount'] for item in vat_items)
    total_gross = total_net + total_vat

    # Build region info
    user_context = full_context['user']
    region_info = {
        'country': user_context['address'].get('country') if user_context['address'] else None,
        'region': user_context['region']
    }

    # Stop timer and calculate execution time
    end_time = time.time()
    execution_time_ms = int((end_time - start_time) * 1000)

    # Build result structure
    return {
        'status': 'success',
        'execution_id': execution_id,
        'vat_calculations': {
            'items': vat_items,
            'totals': {
                'total_net': total_net,
                'total_vat': total_vat,
                'total_gross': total_gross
            },
            'region_info': region_info
        },
        'rules_executed': rules_executed,
        'execution_time_ms': execution_time_ms,
        'created_at': datetime.now().isoformat()
    }


def save_vat_result_to_cart(cart, vat_result):
    """
    Save VAT calculation result to cart.vat_result field.

    Args:
        cart: Django Cart object
        vat_result: Dict with VAT calculation results

    Returns:
        bool: True if saved successfully
    """
    from vat.utils import decimal_to_string

    if cart is None:
        return False

    try:
        cart.vat_result = decimal_to_string(vat_result)
        cart.save(update_fields=['vat_result'])
        return True
    except Exception:
        return False


def create_vat_audit_record(execution_id, cart, vat_result, duration_ms, order=None):
    """
    Create audit trail record for VAT calculation.

    Args:
        execution_id: Unique execution identifier
        cart: Django Cart object or None
        vat_result: Dict with VAT calculation results
        duration_ms: Execution time in milliseconds
        order: Django ActedOrder object or None

    Returns:
        VATAudit: Created audit record
    """
    from vat.models import VATAudit
    from vat.context_builder import build_vat_context
    from vat.utils import decimal_to_string

    # Build input context (reconstruct from cart if available)
    if cart:
        # Get user from cart
        from django.contrib.auth import get_user_model
        User = get_user_model()

        user = None
        if cart.user_id:
            try:
                user = User.objects.get(id=cart.user_id)
            except User.DoesNotExist:
                user = None

        input_context = build_vat_context(user, cart)
    else:
        input_context = {'user': None, 'cart': None, 'settings': {}}

    # Create audit record - convert Decimals to strings for JSON storage
    audit = VATAudit.objects.create(
        execution_id=execution_id,
        cart=cart,
        order=order,
        rule_id='calculate_vat_per_item',  # Standard rule ID for VAT calculations
        rule_version=1,  # Version 1 for initial implementation
        input_context=decimal_to_string(input_context),
        output_data=decimal_to_string(vat_result),
        duration_ms=duration_ms
    )

    return audit
