#!/usr/bin/env python
"""
Fix for the acknowledgment transfer bug where session acknowledgments are transferred
to orders even when the corresponding rules didn't match in the current execution.

ISSUE:
- User acknowledges digital consent rule in session A with digital items
- User starts new checkout in session B with non-digital items
- Digital consent rule doesn't match but old acknowledgment still transferred to order

SOLUTION:
- Only transfer acknowledgments for rules that actually matched in current execution
- Validate acknowledgments against current rules engine results
- Clear stale acknowledgments from session
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from cart.models import Cart, ActedOrder, OrderUserAcknowledgment
from rules_engine.services.rule_engine import rule_engine
from rules_engine.models import ActedRule
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

def get_cart_context_for_rules(cart, user):
    """Build cart context for rules engine execution"""
    cart_items = cart.items.all().select_related('product__product', 'product__exam_session_subject__subject')

    # Check if cart has digital items
    has_digital = False
    for item in cart_items:
        # Digital products typically have certain characteristics
        product = item.product.product
        if (hasattr(product, 'is_digital') and product.is_digital) or \
           ('ebook' in product.fullname.lower() or 'online' in product.fullname.lower()):
            has_digital = True
            break

    # Build context similar to frontend
    context = {
        'cart': {
            'id': cart.id,
            'user_id': cart.user.id if cart.user else None,
            'has_digital': has_digital,
            'total': float(cart.total_amount or 0),
            'items': []
        },
        'user': {
            'id': user.id,
            'email': user.email,
            'is_authenticated': True
        } if user.is_authenticated else None,
        'session': {
            'ip_address': '127.0.0.1',
            'session_id': 'checkout_session'
        },
        'acknowledgments': {}  # Will be populated from session
    }

    # Add cart items
    for item in cart_items:
        context['cart']['items'].append({
            'id': item.id,
            'product_id': item.product.product.id,
            'quantity': item.quantity,
            'actual_price': str(item.actual_price),
            'is_digital': has_digital  # Simplified check
        })

    return context

def get_matched_rules_for_current_execution(cart, user):
    """
    Execute rules engine for checkout_terms and return which rules actually matched
    """
    try:
        # Build context for rules execution
        context = get_cart_context_for_rules(cart, user)

        # Execute rules engine
        result = rule_engine.execute('checkout_terms', context)

        if not result.get('success'):
            logger.warning(f"Rules execution failed: {result.get('error')}")
            return set()

        # Extract rule IDs that actually matched and executed
        matched_rule_ids = set()

        # Check rules_executed list for rules that had condition_result=True
        for rule_exec in result.get('rules_executed', []):
            if rule_exec.get('condition_result'):
                matched_rule_ids.add(rule_exec.get('rule_id'))

        # Also check messages for template_ids that were generated
        for message in result.get('messages', []):
            template_id = message.get('template_id')
            if template_id:
                matched_rule_ids.add(str(template_id))

        logger.info(f"Rules that matched in current execution: {matched_rule_ids}")
        return matched_rule_ids

    except Exception as e:
        logger.error(f"Error executing rules for validation: {e}")
        return set()

def create_fixed_transfer_method():
    """
    Create the fixed version of _transfer_session_acknowledgments_to_order method
    """

    fixed_method_code = '''
    def _transfer_session_acknowledgments_to_order(self, request, order):
        """
        Transfer session-based acknowledgments to order acknowledgments table
        FIXED: Only transfer acknowledgments for rules that actually matched in current execution
        """
        try:
            session_acknowledgments = request.session.get('user_acknowledgments', [])
            if not session_acknowledgments:
                logger.info(f"No session acknowledgments found for order {order.id}")
                return

            logger.info(f"Found {len(session_acknowledgments)} session acknowledgments for order {order.id}")

            # CRITICAL FIX: Get rules that actually matched in current execution
            matched_rule_ids = self._get_matched_rules_for_current_execution(order)
            logger.info(f"Rules that matched in current execution: {matched_rule_ids}")

            # Filter acknowledgments to only include those for matched rules
            valid_acknowledgments = []
            stale_acknowledgments = []

            for ack in session_acknowledgments:
                message_id = str(ack.get('message_id', ''))
                ack_key = ack.get('ack_key', '')

                # Check if this acknowledgment corresponds to a rule that matched
                is_valid = (
                    message_id in matched_rule_ids or
                    ack_key in matched_rule_ids or
                    any(rule_id for rule_id in matched_rule_ids if str(rule_id) == message_id)
                )

                if is_valid:
                    valid_acknowledgments.append(ack)
                    logger.info(f"Valid acknowledgment: message_id={message_id}, ack_key={ack_key}")
                else:
                    stale_acknowledgments.append(ack)
                    logger.info(f"Stale acknowledgment (rule didn't match): message_id={message_id}, ack_key={ack_key}")

            if not valid_acknowledgments:
                logger.info(f"No valid acknowledgments to transfer for order {order.id}")
                # Clear stale acknowledgments from session
                request.session['user_acknowledgments'] = []
                request.session.modified = True
                return

            logger.info(f"Transferring {len(valid_acknowledgments)} valid acknowledgments (discarding {len(stale_acknowledgments)} stale ones)")

            # Group valid acknowledgments by message_id for aggregation
            acknowledgment_groups = {}
            for ack in valid_acknowledgments:
                message_id = ack.get('message_id')
                if message_id not in acknowledgment_groups:
                    acknowledgment_groups[message_id] = []
                acknowledgment_groups[message_id].append(ack)

            # Create order acknowledgments for each group
            for message_id, acks in acknowledgment_groups.items():
                # Determine acknowledgment type based on ack_key
                acknowledgment_type = 'custom'
                for ack in acks:
                    ack_key = ack.get('ack_key', '')
                    if 'terms' in ack_key.lower():
                        acknowledgment_type = 'terms_conditions'
                    elif 'expired' in ack_key.lower() and 'deadline' in ack_key.lower():
                        acknowledgment_type = 'deadline_expired'
                    elif 'warning' in ack_key.lower():
                        acknowledgment_type = 'warning'

                # Get the most recent acknowledgment for this message_id
                latest_ack = max(acks, key=lambda x: x.get('acknowledged_timestamp', ''))

                # Create acknowledgment data with all entry points
                acknowledgment_data = {
                    'session_acknowledgments': acks,
                    'entry_points': list(set(ack.get('entry_point_location') for ack in acks)),
                    'total_acknowledgments': len(acks),
                    'first_acknowledged': min(acks, key=lambda x: x.get('acknowledged_timestamp', '')).get('acknowledged_timestamp'),
                    'last_acknowledged': latest_ack.get('acknowledged_timestamp'),
                    'ack_keys': list(set(ack.get('ack_key') for ack in acks)),
                    'validation_info': {
                        'validated_against_current_execution': True,
                        'matched_rule_ids': list(matched_rule_ids),
                        'stale_acknowledgments_discarded': len(stale_acknowledgments)
                    }
                }

                # Create the order acknowledgment record
                order_acknowledgment = OrderUserAcknowledgment.objects.create(
                    order=order,
                    acknowledgment_type=acknowledgment_type,
                    rule_id=message_id,  # Use message_id as rule_id reference
                    template_id=message_id,  # Use message_id as template reference
                    title=f'Session Acknowledgment {message_id}',
                    content_summary=f'Validated acknowledgment for message {message_id} across {len(set(ack.get("entry_point_location") for ack in acks))} entry points',
                    is_accepted=latest_ack.get('acknowledged', False),
                    ip_address=latest_ack.get('ip_address', ''),
                    user_agent=latest_ack.get('user_agent', ''),
                    content_version='1.0',
                    acknowledgment_data=acknowledgment_data,
                    rules_engine_context={
                        'transferred_from_session': True,
                        'session_id': request.session.session_key,
                        'transfer_timestamp': timezone.now().isoformat(),
                        'validated_against_rules': True,
                        'matched_rule_ids': list(matched_rule_ids),
                        'original_session_data': session_acknowledgments,
                        'stale_acknowledgments_count': len(stale_acknowledgments)
                    }
                )

                logger.info(f"Created validated order acknowledgment {order_acknowledgment.id} for message {message_id} with type {acknowledgment_type}")

            # Clear session acknowledgments after successful transfer
            request.session['user_acknowledgments'] = []
            request.session.modified = True

            logger.info(f"Successfully transferred {len(valid_acknowledgments)} valid acknowledgments to order {order.id}, discarded {len(stale_acknowledgments)} stale ones")

        except Exception as e:
            logger.error(f"Failed to transfer session acknowledgments to order {order.id}: {str(e)}")
            # Don't raise exception - acknowledgment transfer failure shouldn't block checkout

    def _get_matched_rules_for_current_execution(self, order):
        """
        Execute rules engine for checkout_terms and return which rules actually matched
        """
        try:
            # Get cart associated with this order
            cart = order.cart if hasattr(order, 'cart') else None
            if not cart:
                # Try to find cart by user
                from cart.models import Cart
                cart = Cart.objects.filter(user=order.user).first()

            if not cart:
                logger.warning(f"No cart found for order {order.id}, cannot validate acknowledgments")
                return set()

            # Build context for rules execution
            cart_items = cart.items.all().select_related('product__product', 'product__exam_session_subject__subject')

            # Check if cart has digital items
            has_digital = False
            for item in cart_items:
                product = item.product.product
                if (hasattr(product, 'is_digital') and product.is_digital) or \\
                   ('ebook' in product.fullname.lower() or 'online' in product.fullname.lower()):
                    has_digital = True
                    break

            context = {
                'cart': {
                    'id': cart.id,
                    'user_id': cart.user.id if cart.user else None,
                    'has_digital': has_digital,
                    'total': float(cart.total_amount or 0),
                    'items': []
                },
                'user': {
                    'id': order.user.id,
                    'email': order.user.email,
                    'is_authenticated': True
                } if order.user else None,
                'session': {
                    'ip_address': '127.0.0.1',
                    'session_id': 'checkout_validation'
                },
                'acknowledgments': {}
            }

            # Add cart items
            for item in cart_items:
                context['cart']['items'].append({
                    'id': item.id,
                    'product_id': item.product.product.id,
                    'quantity': item.quantity,
                    'actual_price': str(item.actual_price),
                    'is_digital': has_digital
                })

            # Execute rules engine
            from rules_engine.services.rule_engine import rule_engine
            result = rule_engine.execute('checkout_terms', context)

            if not result.get('success'):
                logger.warning(f"Rules execution failed for order {order.id}: {result.get('error')}")
                return set()

            # Extract rule IDs that actually matched and executed
            matched_rule_ids = set()

            # Check rules_executed list for rules that had condition_result=True
            for rule_exec in result.get('rules_executed', []):
                if rule_exec.get('condition_result'):
                    matched_rule_ids.add(rule_exec.get('rule_id'))

            # Also check messages for template_ids that were generated
            for message in result.get('messages', []):
                template_id = message.get('template_id')
                if template_id:
                    matched_rule_ids.add(str(template_id))

            logger.info(f"Rules that matched for order {order.id}: {matched_rule_ids}")
            return matched_rule_ids

        except Exception as e:
            logger.error(f"Error executing rules for validation in order {order.id}: {e}")
            return set()
    '''

    return fixed_method_code

def test_acknowledgment_validation():
    """
    Test the acknowledgment validation logic
    """
    print("=== TESTING ACKNOWLEDGMENT VALIDATION ===\\n")

    # Test case 1: Cart without digital items
    try:
        cart = Cart.objects.filter(user__isnull=False).first()
        if cart:
            user = cart.user
            print(f"Testing with cart {cart.id} for user {user.email}")

            matched_rules = get_matched_rules_for_current_execution(cart, user)
            print(f"Matched rules: {matched_rules}")

            # Simulate session acknowledgments
            session_acks = [
                {
                    'message_id': 11,  # Terms & conditions
                    'ack_key': 'terms_conditions_v1',
                    'acknowledged': True,
                    'acknowledged_timestamp': '2025-09-17T13:23:57.733728+00:00',
                    'entry_point_location': 'checkout_terms'
                },
                {
                    'message_id': 12,  # Digital consent
                    'ack_key': 'digital_content_v1',
                    'acknowledged': True,
                    'acknowledged_timestamp': '2025-09-17T08:52:43.607178+00:00',
                    'entry_point_location': 'checkout_terms'
                }
            ]

            print(f"\\nSession acknowledgments: {len(session_acks)}")
            for ack in session_acks:
                print(f"  - message_id: {ack['message_id']}, ack_key: {ack['ack_key']}")

            # Validate acknowledgments
            valid_acks = []
            stale_acks = []

            for ack in session_acks:
                message_id = str(ack.get('message_id', ''))
                ack_key = ack.get('ack_key', '')

                is_valid = (
                    message_id in matched_rules or
                    ack_key in matched_rules or
                    any(rule_id for rule_id in matched_rules if str(rule_id) == message_id)
                )

                if is_valid:
                    valid_acks.append(ack)
                else:
                    stale_acks.append(ack)

            print(f"\\nValidation results:")
            print(f"  Valid acknowledgments: {len(valid_acks)}")
            for ack in valid_acks:
                print(f"    - message_id: {ack['message_id']}, ack_key: {ack['ack_key']}")

            print(f"  Stale acknowledgments: {len(stale_acks)}")
            for ack in stale_acks:
                print(f"    - message_id: {ack['message_id']}, ack_key: {ack['ack_key']} (SHOULD BE DISCARDED)")

    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == '__main__':
    test_acknowledgment_validation()

    print("\\n" + "="*80)
    print("FIXED METHOD CODE:")
    print("="*80)
    print(create_fixed_transfer_method())