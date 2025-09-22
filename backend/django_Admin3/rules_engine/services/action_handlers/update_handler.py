"""
Update Action Handler for Rules Engine

Handles update actions such as adding fees to cart
"""
import logging
from typing import Dict, Any
from decimal import Decimal
from django.db import transaction

logger = logging.getLogger(__name__)


class UpdateHandler:
    """Handler for update actions in rules engine"""

    def execute(self, action: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an update action

        Args:
            action: Action configuration containing:
                - target: What to update (e.g., 'cart.fees')
                - operation: Operation to perform (e.g., 'add_fee')
                - value: Value to apply (e.g., fee configuration)
            context: Execution context

        Returns:
            Dict containing execution result
        """
        target = action.get('target', '')
        operation = action.get('operation', '')
        value = action.get('value', {})

        logger.info(f"Executing update action: target={target}, operation={operation}")

        if target == 'cart.fees' and operation == 'add_fee':
            return self._add_cart_fee(value, context)
        elif target == 'cart.fees' and operation == 'remove_fee':
            return self._remove_cart_fee(value, context)
        elif target == 'cart.items' and operation == 'add_item':
            return self._add_cart_item(value, context)
        else:
            logger.warning(f"Unknown update target/operation: {target}/{operation}")
            return {
                'type': 'update',
                'success': False,
                'error': f'Unknown update target/operation: {target}/{operation}'
            }

    @transaction.atomic
    def _add_cart_fee(self, fee_config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add a fee to the cart

        Args:
            fee_config: Fee configuration containing:
                - fee_type: Type of fee (e.g., 'tutorial_booking_fee')
                - amount: Fee amount
                - name: Display name
                - description: Fee description
            context: Execution context with cart information

        Returns:
            Dict containing execution result with added fee details
        """
        try:
            from cart.models import Cart, CartFee

            # Get cart from context
            cart_id = context.get('cart', {}).get('id')
            if not cart_id:
                return {
                    'type': 'update',
                    'success': False,
                    'error': 'No cart ID in context'
                }

            # Get cart instance
            try:
                cart = Cart.objects.get(id=cart_id)
            except Cart.DoesNotExist:
                return {
                    'type': 'update',
                    'success': False,
                    'error': f'Cart {cart_id} not found'
                }

            # Extract fee details
            fee_type = fee_config.get('fee_type', 'tutorial_booking_fee')
            amount = Decimal(str(fee_config.get('amount', 1.00)))
            name = fee_config.get('name', 'Tutorial Booking Fee')
            description = fee_config.get('description', 'Booking fee for tutorial-only orders')
            # Note: applied_by_rule expects integer ID, not string code
            # We could look up the rule by code but for now we'll leave it null

            # Check if fee already exists
            existing_fee = CartFee.objects.filter(
                cart=cart,
                fee_type=fee_type
            ).first()

            if existing_fee:
                # Update existing fee
                existing_fee.amount = amount
                existing_fee.name = name
                existing_fee.description = description
                # Note: applied_by_rule would need numeric ID, not string code
                existing_fee.save()

                logger.info(f"Updated existing {fee_type} fee for cart {cart_id}: £{amount}")

                fee_data = {
                    'id': existing_fee.id,
                    'fee_type': fee_type,
                    'amount': float(amount),
                    'name': name,
                    'description': description,
                    'updated': True
                }

                return {
                    'type': 'update',
                    'success': True,
                    'target': 'cart.fees',
                    'operation': 'update_fee',
                    'updates': {
                        'cart_fees': [fee_data]
                    },
                    'fee': fee_data
                }
            else:
                # Create new fee
                new_fee = CartFee.objects.create(
                    cart=cart,
                    fee_type=fee_type,
                    amount=amount,
                    name=name,
                    description=description,
                    # applied_by_rule would need numeric ID, not string code
                    currency='GBP',
                    is_refundable=False
                )

                logger.info(f"Added {fee_type} fee to cart {cart_id}: £{amount}")

                fee_data = {
                    'id': new_fee.id,
                    'fee_type': fee_type,
                    'amount': float(amount),
                    'name': name,
                    'description': description,
                    'created': True
                }

                return {
                    'type': 'update',
                    'success': True,
                    'target': 'cart.fees',
                    'operation': 'add_fee',
                    'updates': {
                        'cart_fees': [fee_data]
                    },
                    'fee': fee_data
                }

        except Exception as e:
            logger.error(f"Error adding cart fee: {e}")
            return {
                'type': 'update',
                'success': False,
                'error': str(e)
            }

    @transaction.atomic
    def _remove_cart_fee(self, fee_config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Remove a fee from the cart

        Args:
            fee_config: Fee configuration containing:
                - fee_type: Type of fee to remove (e.g., 'tutorial_booking_fee')
            context: Execution context with cart information

        Returns:
            Dict containing execution result
        """
        try:
            from cart.models import Cart, CartFee

            # Get cart from context
            cart_id = context.get('cart', {}).get('id')
            if not cart_id:
                return {
                    'type': 'update',
                    'success': False,
                    'error': 'No cart ID in context'
                }

            # Get cart instance
            try:
                cart = Cart.objects.get(id=cart_id)
            except Cart.DoesNotExist:
                return {
                    'type': 'update',
                    'success': False,
                    'error': f'Cart {cart_id} not found'
                }

            # Extract fee type
            fee_type = fee_config.get('fee_type', 'tutorial_booking_fee')

            # Find and delete the fee
            deleted_count, _ = CartFee.objects.filter(
                cart=cart,
                fee_type=fee_type
            ).delete()

            if deleted_count > 0:
                logger.info(f"Removed {fee_type} fee from cart {cart_id}")

                return {
                    'type': 'update',
                    'success': True,
                    'target': 'cart.fees',
                    'operation': 'remove_fee',
                    'updates': {
                        'cart_fees_removed': [{'fee_type': fee_type, 'removed': True}]
                    },
                    'fee': {
                        'fee_type': fee_type,
                        'removed': True
                    }
                }
            else:
                logger.info(f"No {fee_type} fee found to remove from cart {cart_id}")

                return {
                    'type': 'update',
                    'success': True,
                    'target': 'cart.fees',
                    'operation': 'remove_fee',
                    'updates': {
                        'cart_fees_removed': []
                    },
                    'fee': {
                        'fee_type': fee_type,
                        'removed': False,
                        'message': 'No fee found to remove'
                    }
                }

        except Exception as e:
            logger.error(f"Error removing cart fee: {e}")
            return {
                'type': 'update',
                'success': False,
                'error': str(e)
            }

    def _add_cart_item(self, item_config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add an item to the cart (placeholder for future implementation)

        Args:
            item_config: Item configuration
            context: Execution context

        Returns:
            Dict containing execution result
        """
        # Placeholder for adding items to cart
        return {
            'type': 'update',
            'success': False,
            'error': 'Add cart item not yet implemented'
        }