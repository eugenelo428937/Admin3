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
DEFAULT_ENTRY_POINT = 'cart_calculate_vat'  # FIXED: Changed from 'calculate_vat' to match actual Rules Engine entry point
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

        NOTE: Rules Engine processes ONE item at a time. This method loops through
        cart items and calls Rules Engine for each item individually.

        Args:
            cart: Cart instance to calculate VAT for
            entry_point: Rules Engine entry point (default: 'cart_calculate_vat')

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
            logger.info(f"Executing VAT calculation for cart {cart.id} at entry point '{entry_point}'")

            # Build user context once (shared across all items)
            user_context = self._build_user_context(cart)

            # Process each cart item individually through Rules Engine
            processed_items = []
            all_results = []

            for cart_item in cart.items.all():
                # Build context for this specific item
                item_context = self._build_item_context(cart_item, user_context)

                # Execute Rules Engine for this item
                logger.debug(f"Processing cart item {cart_item.id}")
                result = rule_engine.execute(entry_point, item_context)

                # Check for errors
                if not result.get('success', False):
                    error_msg = result.get('error', 'Unknown error')
                    logger.error(f"Rules Engine execution failed for item {cart_item.id}: {error_msg}")
                    raise Exception(f"Rules Engine execution failed: {error_msg}")

                # Extract the processed cart_item from results (at top level, not in context)
                processed_item = result.get('cart_item', {})
                if processed_item:
                    processed_items.append(processed_item)

                all_results.append(result)

            # Aggregate totals from all processed items
            aggregated = self._aggregate_item_totals(processed_items)

            # Store results in cart JSONB field
            self._store_vat_result(cart, aggregated, all_results)

            # Create audit record
            self._create_audit_record(cart, {'user': user_context, 'items': processed_items}, all_results)

            # Return formatted result
            return self._build_calculation_result(aggregated, all_results, user_context)

        except Exception as e:
            logger.error(f"VAT calculation failed for cart {cart.id}: {str(e)}")
            raise

    def _build_user_context(self, cart) -> Dict[str, Any]:
        """
        Build user context for Rules Engine using context builder.

        Args:
            cart: Cart instance

        Returns:
            dict: User context with id and country_code (matching schema)
        """
        from vat.context_builder import build_vat_context

        # TODO Phase 5: Pass client_ip from request for IP geolocation
        client_ip = None

        # Build comprehensive context to get user data
        context = build_vat_context(cart.user, cart, client_ip)
        user_data = context.get('user', {})

        # Transform to match Rules Engine schema (country_code not country)
        country = user_data.get('address', {}).get('country', DEFAULT_COUNTRY)

        # Schema requires user.id to be a string (not None)
        user_id = user_data.get('id')
        if user_id:
            user_id = str(user_id)
        else:
            user_id = 'anonymous'  # Default for anonymous users

        return {
            'id': user_id,
            'country_code': country  # Schema requires country_code (2-letter uppercase)
        }

    def _build_item_context(self, cart_item, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build context for a single cart item matching Rules Engine schema.

        Schema expects: { user: {...}, cart_item: {...} }

        Args:
            cart_item: CartItem instance
            user_context: Pre-built user context

        Returns:
            dict: Context for single item with user and cart_item
        """
        # Calculate net amount (actual_price * quantity)
        actual_price = cart_item.actual_price if cart_item.actual_price is not None else Decimal('0.00')
        quantity = cart_item.quantity if cart_item.quantity else 1
        net_amount = actual_price * quantity

        # Get product type
        product_type = self._get_product_type(cart_item)

        # Extract product_code from related product
        product_code = ''
        try:
            if cart_item.product and cart_item.product.product:
                product_code = cart_item.product.product.code or ''
        except (AttributeError, Exception) as e:
            logger.debug(f"Could not extract product_code: {e}")

        # Build cart_item structure matching schema
        cart_item_context = {
            'id': str(cart_item.id),
            'product_type': product_type,
            'product_code': product_code,  # Product code for rule matching (FC, PBOR, etc.)
            'net_amount': float(net_amount),  # Schema expects number, not string
            # vat_amount and gross_amount will be added by Rules Engine
        }

        return {
            'user': user_context,
            'cart_item': cart_item_context  # Schema requires cart_item (singular)
        }

    def _extract_product_type_from_classification(self, item: Dict[str, Any]) -> str:
        """
        Extract product type from context builder's classification structure.

        Args:
            item: Item dict from context builder with 'classification' key

        Returns:
            str: Product type (Digital, Printed, Tutorial, etc.)
        """
        classification = item.get('classification', {})
        if isinstance(classification, dict):
            product_type = classification.get('product_type', DEFAULT_PRODUCT_TYPE)
            # Map 'unknown' to default
            return product_type if product_type != 'unknown' else DEFAULT_PRODUCT_TYPE
        return DEFAULT_PRODUCT_TYPE

    def _get_product_type(self, cart_item) -> str:
        """
        Get product type from cart item.

        NOTE: Product-specific VAT rules now use product_code (FC, PBOR) instead of
        product_type for special cases like Flash Cards and PBOR products.

        Args:
            cart_item: CartItem instance

        Returns:
            str: Product type (Digital, Printed, Tutorial, etc.)
        """
        # PRIORITY 1: Check metadata for variationType (user's selected variation)
        if cart_item.metadata and 'variationType' in cart_item.metadata:
            variation_type = cart_item.metadata.get('variationType', '')
            if variation_type:
                # Map variation type to product type
                mapped_type = VARIATION_TYPE_TO_PRODUCT_TYPE.get(variation_type, DEFAULT_PRODUCT_TYPE)
                logger.debug(f"Using variation type from metadata: {variation_type} → {mapped_type}")
                return mapped_type

        # PRIORITY 2: Fallback to product's first variation (legacy)
        if cart_item.product:
            variation_type = self._extract_variation_type(cart_item.product)
            if variation_type:
                mapped_type = VARIATION_TYPE_TO_PRODUCT_TYPE.get(variation_type, DEFAULT_PRODUCT_TYPE)
                logger.debug(f"Using variation type from product: {variation_type} → {mapped_type}")
                return mapped_type

        # PRIORITY 3: Default
        logger.warning(f"No variation type found for cart item {cart_item.id}, using default: {DEFAULT_PRODUCT_TYPE}")
        return DEFAULT_PRODUCT_TYPE

    def _aggregate_item_totals(self, processed_items: list) -> Dict[str, Any]:
        """
        Aggregate VAT totals from individually processed cart items.

        Args:
            processed_items: List of cart_item dicts from Rules Engine results

        Returns:
            dict: Aggregated totals and items with VAT data
        """
        # Initialize totals
        total_net = Decimal('0.00')
        total_vat = Decimal('0.00')

        # Aggregate from processed items
        items_with_vat = []
        for item in processed_items:
            # Get item values (Rules Engine adds vat_amount to cart_item)
            net_amount = Decimal(str(item.get('net_amount', '0.00')))
            vat_amount = Decimal(str(item.get('vat_amount', '0.00')))
            gross_amount = Decimal(str(item.get('gross_amount', '0.00')))

            # Aggregate totals
            total_net += net_amount
            total_vat += vat_amount

            # Build item result with VAT data
            items_with_vat.append({
                'id': item.get('id'),
                'product_type': item.get('product_type'),
                'net_amount': str(net_amount),
                'vat_amount': str(vat_amount),
                'gross_amount': str(gross_amount)
            })

        # Calculate total gross
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
            'items': items_with_vat
        }

    def _store_vat_result(self, cart, aggregated: Dict[str, Any], all_results: list) -> None:
        """
        Store VAT result in cart.vat_result JSONB field.

        Args:
            cart: Cart instance
            aggregated: Aggregated totals and items
            all_results: List of Rules Engine results from all items
        """
        # Extract region from first result (region is user-based, stored in result['vat'])
        region = REGION_UNKNOWN
        execution_id = f"exec_{int(timezone.now().timestamp())}"
        all_rules_executed = []

        if all_results:
            first_result = all_results[0]
            region = first_result.get('vat', {}).get('region', REGION_UNKNOWN)
            execution_id = first_result.get('execution_id', execution_id)

            # Collect all executed rules from all results
            for result in all_results:
                all_rules_executed.extend(result.get('rules_executed', []))

        # Build JSONB structure using extracted data
        vat_result = {
            'status': STATUS_CALCULATED,
            'region': region,
            'totals': aggregated['totals'],
            'items': aggregated['items'],
            'execution_id': execution_id,
            'timestamp': timezone.now().isoformat(),
            'rules_executed': all_rules_executed
        }

        # Store in cart
        cart.vat_result = vat_result
        cart.save(update_fields=['vat_result'])

        logger.info(f"Stored VAT result in cart {cart.id}")

    def _create_audit_record(self, cart, context: Dict[str, Any], all_results: list) -> None:
        """
        Create VATAudit record for compliance tracking.

        Args:
            cart: Cart instance
            context: Input context sent to Rules Engine
            all_results: List of Rules Engine execution results from all items
        """
        try:
            VATAudit.objects.create(
                cart=cart,
                order=None,  # No order at cart stage
                input_context=context,
                output_data={
                    'results': all_results,  # Store all item results
                    'timestamp': timezone.now().isoformat()
                }
            )
            logger.info(f"Created VAT audit record for cart {cart.id}")

        except Exception as e:
            logger.error(f"Failed to create VAT audit record: {str(e)}")
            # Don't raise - audit failure shouldn't block VAT calculation

    # Helper methods

    def _build_calculation_result(self, aggregated: Dict[str, Any], all_results: list, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build the final calculation result structure.

        Args:
            aggregated: Aggregated totals and items
            all_results: List of Rules Engine results from all items
            user_context: User context with country_code

        Returns:
            dict: Formatted calculation result
        """
        # Extract region from first result (region is stored in result['vat'])
        region = REGION_UNKNOWN
        if all_results:
            first_result = all_results[0]
            region = first_result.get('vat', {}).get('region', REGION_UNKNOWN)

        # Get execution ID from first result
        execution_id = f"exec_{int(timezone.now().timestamp())}"
        if all_results:
            execution_id = all_results[0].get('execution_id', execution_id)

        return {
            'status': STATUS_CALCULATED,
            'region': region,
            'totals': aggregated['totals'],
            'items': aggregated['items'],
            'execution_id': execution_id,
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
