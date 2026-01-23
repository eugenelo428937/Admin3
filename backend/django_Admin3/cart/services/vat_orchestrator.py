"""
TASK-503: VAT Orchestrator Service (REFACTOR Phase)

Service that orchestrates VAT calculation through Rules Engine.
Provides a clean interface for cart VAT calculation without hardcoded logic.
"""
import json
import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any
from django.utils import timezone

from rules_engine.services.rule_engine import rule_engine
# VATAudit import removed - audit is captured via ActedRuleExecution


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal objects."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)


def serialize_for_json(data: Any) -> Any:
    """
    Convert data structure to JSON-serializable format.
    Handles Decimal objects by converting to strings.
    """
    if isinstance(data, dict):
        return {k: serialize_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [serialize_for_json(item) for item in data]
    elif isinstance(data, Decimal):
        return str(data)
    return data

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
    'Marking': 'Marking'
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
            aggregated = self._aggregate_item_totals(processed_items, all_results)

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
        Build user context for Rules Engine using direct profile lookup.

        Args:
            cart: Cart instance

        Returns:
            dict: User context with id and country_code (matching schema)
        """
        user_id = 'anonymous'
        country = DEFAULT_COUNTRY

        if cart.user and cart.user.is_authenticated:
            user_id = str(cart.user.id)

            # Get country from user's HOME address
            if hasattr(cart.user, 'userprofile') and cart.user.userprofile:
                profile = cart.user.userprofile
                if hasattr(profile, 'addresses'):
                    home_address = profile.addresses.filter(address_type='HOME').first()
                    if home_address:
                        country_str = home_address.country
                        if country_str:
                            # Try to find matching Country object by name or iso_code
                            from country.models import Country
                            from django.db.models import Q
                            try:
                                country_obj = Country.objects.filter(
                                    Q(name=country_str) | Q(iso_code=country_str)
                                ).first()
                                if country_obj:
                                    country = country_obj.iso_code
                                else:
                                    # Assume country_str is already an iso_code
                                    country = country_str
                            except Exception:
                                country = country_str

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
            str: Product type (Digital, Printed, Tutorial, Marking, etc.)
        """
        metadata = cart_item.metadata or {}

        # PRIORITY 1: Check metadata for variationType (for marking, tutorial products)
        if 'variationType' in metadata:
            variation_type = metadata.get('variationType', '')
            if variation_type:
                # Map variation type to product type
                mapped_type = VARIATION_TYPE_TO_PRODUCT_TYPE.get(variation_type, DEFAULT_PRODUCT_TYPE)
                logger.debug(f"Using variationType from metadata: {variation_type} → {mapped_type}")
                return mapped_type

        # PRIORITY 2: Check is_digital flag in metadata (for material products)
        # Material products have is_digital: true/false but no variationType
        if 'is_digital' in metadata:
            is_digital = metadata.get('is_digital', False)
            if is_digital:
                logger.debug(f"Using is_digital flag from metadata: True → Digital")
                return 'Digital'
            else:
                # Not digital - check if it's a tutorial or marking
                if metadata.get('is_tutorial'):
                    logger.debug(f"Using is_tutorial flag from metadata: True → Tutorial")
                    return 'Tutorial'
                elif metadata.get('is_marking'):
                    logger.debug(f"Using is_marking flag from metadata: True → Marking")
                    return 'Marking'
                else:
                    # Default to Printed for non-digital materials
                    logger.debug(f"Using is_digital flag from metadata: False → Printed")
                    return 'Printed'

        # PRIORITY 3: Fallback to product's first variation (legacy)
        if cart_item.product:
            variation_type = self._extract_variation_type(cart_item.product)
            if variation_type:
                mapped_type = VARIATION_TYPE_TO_PRODUCT_TYPE.get(variation_type, DEFAULT_PRODUCT_TYPE)
                logger.debug(f"Using variation type from product: {variation_type} → {mapped_type}")
                return mapped_type

        # PRIORITY 4: Default
        logger.warning(f"No variation type found for cart item {cart_item.id}, using default: {DEFAULT_PRODUCT_TYPE}")
        return DEFAULT_PRODUCT_TYPE

    def _aggregate_item_totals(self, processed_items: list, all_results: list) -> Dict[str, Any]:
        """
        Aggregate VAT totals from individually processed cart items.

        Args:
            processed_items: List of cart_item dicts from Rules Engine results
            all_results: List of full Rules Engine results (to extract vat.rate)

        Returns:
            dict: Aggregated totals and items with VAT data
        """
        # Initialize totals
        total_net = Decimal('0.00')
        total_vat = Decimal('0.00')

        # Aggregate from processed items
        items_with_vat = []
        for idx, item in enumerate(processed_items):
            # Get item values (Rules Engine adds vat_amount to cart_item)
            net_amount = Decimal(str(item.get('net_amount', '0.00')))
            vat_amount = Decimal(str(item.get('vat_amount', '0.00')))
            gross_amount = Decimal(str(item.get('gross_amount', '0.00')))

            # Extract vat_rate, vat_region, and applied rule from corresponding Rules Engine result
            vat_rate = Decimal('0.0000')
            vat_region = 'UNKNOWN'
            applied_rule = None
            if idx < len(all_results):
                result = all_results[idx]
                vat_context = result.get('vat', {})
                rate_str = vat_context.get('rate', '0.0000')
                vat_rate = Decimal(str(rate_str))
                vat_region = vat_context.get('region', 'UNKNOWN')

                # Find the final rule that calculated VAT for this item
                # Look for the last rule with condition_result=true and actions_executed > 0
                rules_executed = result.get('rules_executed', [])
                applied_rule = self._find_applied_vat_rule(rules_executed)

            # Aggregate totals
            total_net += net_amount
            total_vat += vat_amount

            # Build item result with VAT data
            items_with_vat.append({
                'id': item.get('id'),
                'product_type': item.get('product_type'),
                'net_amount': str(net_amount),
                'vat_region': vat_region,  # Add vat_region
                'vat_rate': str(vat_rate),  # Add vat_rate
                'vat_amount': str(vat_amount),
                'gross_amount': str(gross_amount),
                'applied_rule': applied_rule  # Add the rule that calculated this item's VAT
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
        Audit record creation - now a no-op.

        ActedRuleExecution automatically captures rule execution audit data.
        Cart.vat_result stores the calculation result.
        ActedOrder.calculations_applied stores order-level result.

        Args:
            cart: Cart instance
            context: Input context sent to Rules Engine
            all_results: List of Rules Engine execution results from all items
        """
        # No-op: ActedRuleExecution already captures audit trail during rule execution
        logger.debug(f"Audit for cart {cart.id} captured via ActedRuleExecution")

    # Helper methods

    def _find_applied_vat_rule(self, rules_executed: list) -> str:
        """
        Find the final rule that calculated VAT for an item.

        The applied rule is the last rule that had:
        - condition_result: true
        - actions_executed > 0

        Priority is given to product-specific rules (priority 85-86) over
        region rules (priority 90) and base rules (priority 100).

        Args:
            rules_executed: List of rule execution records

        Returns:
            str: The rule_id of the applied VAT rule, or None if not found
        """
        if not rules_executed:
            return None

        # Find the last rule that actually calculated VAT (executed actions)
        # Rules are executed in priority order, so the last matching rule wins
        applied_rule = None
        for rule in rules_executed:
            if rule.get('condition_result') and rule.get('actions_executed', 0) > 0:
                # This rule matched and executed actions
                applied_rule = rule.get('rule_id')

        return applied_rule

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
