"""
TASK-503: VAT Orchestrator Service (REFACTOR Phase)

Service that orchestrates VAT calculation through Rules Engine.
Provides a clean interface for cart VAT calculation without hardcoded logic.
"""
import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any
from django.utils import timezone

from rules_engine.services.rule_engine import rule_engine
from vat.models import VATAudit

logger = logging.getLogger(__name__)

# Constants
DEFAULT_ENTRY_POINT = 'calculate_vat'
DEFAULT_COUNTRY = 'GB'
DEFAULT_PRODUCT_TYPE = 'Digital'
STATUS_CALCULATED = 'calculated'
REGION_UNKNOWN = 'UNKNOWN'

# Product type mappings
VARIATION_TYPE_TO_PRODUCT_TYPE = {
    'eBook': 'Digital',
    'Hub': 'Digital',
    'Printed': 'Printed',
    'Tutorial': 'Tutorial',
    'Marking': 'Tutorial'
}


class VATOrchestrator:
    """
    Orchestrates VAT calculation for carts through Rules Engine.

    This service acts as a bridge between the cart domain and the
    Rules Engine, building appropriate context and processing results.
    """

    def __init__(self):
        """Initialize the VAT orchestrator."""
        self.default_entry_point = DEFAULT_ENTRY_POINT

    def execute_vat_calculation(self, cart, entry_point: str = DEFAULT_ENTRY_POINT) -> Dict[str, Any]:
        """
        Execute VAT calculation for a cart through Rules Engine.

        Args:
            cart: Cart instance to calculate VAT for
            entry_point: Rules Engine entry point (default: 'calculate_vat')

        Returns:
            dict: VAT calculation result with structure:
                {
                    'status': 'calculated',
                    'region': 'UK'|'EU'|'SA'|'ROW',
                    'totals': {
                        'net': '100.00',
                        'vat': '20.00',
                        'gross': '120.00'
                    },
                    'items': [...],
                    'execution_id': 'exec_123',
                    'timestamp': '2025-10-15T10:30:00Z'
                }

        Raises:
            Exception: If Rules Engine execution fails
        """
        try:
            # Build context for Rules Engine
            context = self._build_context(cart)

            # Execute Rules Engine
            logger.info(f"Executing VAT calculation for cart {cart.id} at entry point '{entry_point}'")
            results = rule_engine.execute(entry_point, context)

            # Check for errors
            if not results.get('success', False):
                error_msg = results.get('error', 'Unknown error')
                logger.error(f"Rules Engine execution failed: {error_msg}")
                raise Exception(f"Rules Engine execution failed: {error_msg}")

            # Aggregate totals from results
            aggregated = self._aggregate_totals(results)

            # Store results in cart JSONB field
            self._store_vat_result(cart, aggregated, results)

            # Create audit record
            self._create_audit_record(cart, context, results)

            # Return formatted result
            return self._build_calculation_result(aggregated, results)

        except Exception as e:
            logger.error(f"VAT calculation failed for cart {cart.id}: {str(e)}")
            raise

    def _build_context(self, cart) -> Dict[str, Any]:
        """
        Build Rules Engine context from cart data.

        Args:
            cart: Cart instance

        Returns:
            dict: Context structure with user, cart, and settings
        """
        # Get cart items
        cart_items = cart.items.all()

        # Build items array
        items = []
        for item in cart_items:
            item_context = {
                'id': str(item.id),
                'product_type': self._get_product_type(item),
                'actual_price': str(item.actual_price),
                'quantity': item.quantity
            }
            items.append(item_context)

        # Get user country
        user_country = self._get_user_country(cart.user)

        # Build context
        context = {
            'user': {
                'id': str(cart.user.id),
                'country': user_country
            },
            'cart': {
                'id': str(cart.id),
                'items': items
            },
            'settings': {
                'vat_enabled': True
            }
        }

        return context

    def _get_product_type(self, cart_item) -> str:
        """
        Get product type from cart item.

        Args:
            cart_item: CartItem instance

        Returns:
            str: Product type (Digital, Printed, Tutorial, etc.)
        """
        # Return default if no product
        if not cart_item.product:
            return DEFAULT_PRODUCT_TYPE

        # Get variation type from product
        variation_type = self._extract_variation_type(cart_item.product)

        # Map variation type to product type
        return VARIATION_TYPE_TO_PRODUCT_TYPE.get(variation_type, DEFAULT_PRODUCT_TYPE)

    def _aggregate_totals(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aggregate VAT totals from Rules Engine results.

        Args:
            results: Rules Engine execution results

        Returns:
            dict: Aggregated totals and items
        """
        # Extract items from results
        cart_data = results.get('cart', {})
        items = cart_data.get('items', [])

        # Initialize totals
        total_net = Decimal('0.00')
        total_vat = Decimal('0.00')

        # Aggregate from items
        for item in items:
            # Get item values
            actual_price = Decimal(str(item.get('actual_price', '0.00')))
            quantity = int(item.get('quantity', 1))
            vat_amount = Decimal(str(item.get('vat_amount', '0.00')))

            # Calculate item net
            item_net = actual_price * quantity
            total_net += item_net
            total_vat += vat_amount

        # Calculate gross
        total_gross = total_net + total_vat

        # Round to 2 decimal places
        total_net = total_net.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        total_vat = total_vat.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        total_gross = total_gross.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        return {
            'totals': {
                'net': str(total_net),
                'vat': str(total_vat),
                'gross': str(total_gross)
            },
            'items': items
        }

    def _store_vat_result(self, cart, aggregated: Dict[str, Any], results: Dict[str, Any]) -> None:
        """
        Store VAT result in cart.vat_result JSONB field.

        Args:
            cart: Cart instance
            aggregated: Aggregated totals and items
            results: Full Rules Engine results
        """
        # Build JSONB structure using extracted data
        vat_result = {
            'status': STATUS_CALCULATED,
            'region': self._extract_region(results),
            'totals': aggregated['totals'],
            'items': aggregated['items'],
            'execution_id': self._get_execution_id(results),
            'timestamp': timezone.now().isoformat(),
            'rules_executed': results.get('rules_executed', [])
        }

        # Store in cart
        cart.vat_result = vat_result
        cart.save(update_fields=['vat_result'])

        logger.info(f"Stored VAT result in cart {cart.id}")

    def _create_audit_record(self, cart, context: Dict[str, Any], results: Dict[str, Any]) -> None:
        """
        Create VATAudit record for compliance tracking.

        Args:
            cart: Cart instance
            context: Input context sent to Rules Engine
            results: Rules Engine execution results
        """
        try:
            VATAudit.objects.create(
                cart=cart,
                order=None,  # No order at cart stage
                input_context=context,
                output_data={
                    'results': results,
                    'timestamp': timezone.now().isoformat()
                }
            )
            logger.info(f"Created VAT audit record for cart {cart.id}")

        except Exception as e:
            logger.error(f"Failed to create VAT audit record: {str(e)}")
            # Don't raise - audit failure shouldn't block VAT calculation

    # Helper methods

    def _build_calculation_result(self, aggregated: Dict[str, Any], results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build the final calculation result structure.

        Args:
            aggregated: Aggregated totals and items
            results: Full Rules Engine results

        Returns:
            dict: Formatted calculation result
        """
        return {
            'status': STATUS_CALCULATED,
            'region': self._extract_region(results),
            'totals': aggregated['totals'],
            'items': aggregated['items'],
            'execution_id': self._get_execution_id(results),
            'timestamp': timezone.now().isoformat()
        }

    def _get_user_country(self, user) -> str:
        """
        Get user's country code with fallback to default.

        Args:
            user: User instance

        Returns:
            str: Country code
        """
        if hasattr(user, 'country'):
            return user.country or DEFAULT_COUNTRY
        return DEFAULT_COUNTRY

    def _extract_variation_type(self, product) -> str:
        """
        Extract variation type from product with safe attribute access.

        Args:
            product: Product instance

        Returns:
            str: Variation type or empty string if not found
        """
        try:
            first_variation = product.variations.first()
            if not first_variation:
                return ''

            product_product_variation = getattr(first_variation, 'product_product_variation', None)
            if not product_product_variation:
                return ''

            product_variation = getattr(product_product_variation, 'product_variation', None)
            if not product_variation:
                return ''

            return getattr(product_variation, 'variation_type', '')

        except (AttributeError, Exception):
            return ''

    def _extract_region(self, results: Dict[str, Any]) -> str:
        """
        Extract region from Rules Engine results.

        Args:
            results: Rules Engine results

        Returns:
            str: Region code or UNKNOWN
        """
        return results.get('context', {}).get('region', REGION_UNKNOWN)

    def _get_execution_id(self, results: Dict[str, Any]) -> str:
        """
        Get execution ID from results or generate one.

        Args:
            results: Rules Engine results

        Returns:
            str: Execution ID
        """
        return results.get('execution_id', f"exec_{int(timezone.now().timestamp())}")


# Singleton instance
vat_orchestrator = VATOrchestrator()
