import logging

logger = logging.getLogger(__name__)

def check_same_subject_products(cart_items, params):
    """
    Check if cart contains assignment and marking products of the same subject.
    
    Args:
        cart_items: List of cart items
        params: Dictionary containing assignment_ids and marking_ids
        
    Returns:
        bool: True if matching products found, False otherwise
    """
    try:
        logger.info(f"DEBUG: check_same_subject_products called")
        logger.info(f"DEBUG: cart_items type: {type(cart_items)}")
        logger.info(f"DEBUG: cart_items: {cart_items}")
        logger.info(f"DEBUG: params: {params}")
        
        # Get the product IDs from params
        assignment_ids = params.get('assignment_ids', [])
        marking_ids = params.get('marking_ids', [])
        
        logger.info(f"DEBUG: assignment_ids: {assignment_ids}")
        logger.info(f"DEBUG: marking_ids: {marking_ids}")
        
        # Create sets of subject codes for assignments and markings
        assignment_subjects = set()
        marking_subjects = set()
        
        # Check each cart item
        for item in cart_items:
            logger.info(f"DEBUG: Processing item: {item}")
            
            # Get the product ID from the correct field
            product_id = item.get('product_id')  # This is the ID from acted_products table
            
            # Get subject code from the correct field
            subject_code = item.get('subject_code')
            
            logger.info(f"DEBUG: product_id: {product_id}, subject_code: {subject_code}")
            
            if not subject_code:
                logger.info(f"DEBUG: No subject code for item, skipping")
                continue
                
            if product_id in assignment_ids:
                logger.info(f"DEBUG: Found assignment product {product_id} with subject {subject_code}")
                assignment_subjects.add(subject_code)
            elif product_id in marking_ids:
                logger.info(f"DEBUG: Found marking product {product_id} with subject {subject_code}")
                marking_subjects.add(subject_code)
        
        logger.info(f"DEBUG: assignment_subjects: {assignment_subjects}")
        logger.info(f"DEBUG: marking_subjects: {marking_subjects}")
        
        # Check if there's any overlap in subjects
        result = bool(assignment_subjects.intersection(marking_subjects))
        logger.info(f"DEBUG: Final result: {result}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in check_same_subject_products: {str(e)}")
        return False


def calculate_vat_standard(cart_items, params):
    """
    Calculate standard VAT for cart items.
    
    Args:
        cart_items: List of cart items with pricing information
        params: Dictionary containing VAT calculation parameters
            - vat_rate: VAT rate as decimal (e.g., 0.20 for 20%)
            - exempt_product_types: List of product types exempt from VAT
            - threshold_amount: Minimum order value for VAT application
            
    Returns:
        dict: VAT calculation results
    """
    try:
        logger.info(f"DEBUG: calculate_vat_standard called")
        logger.info(f"DEBUG: cart_items: {cart_items}")
        logger.info(f"DEBUG: params: {params}")
        
        vat_rate = float(params.get('vat_rate') or 0.20)  # Default 20% VAT
        exempt_types = params.get('exempt_product_types', [])
        threshold = float(params.get('threshold_amount') or 0)
        
        total_net = 0
        total_vat = 0
        item_calculations = []
        
        for item in cart_items:
            item_price = float(item.get('actual_price') or 0)
            quantity = int(item.get('quantity') or 1)
            product_type = item.get('product_type', '')
            
            line_net = item_price * quantity
            
            # Check if item is VAT exempt
            is_exempt = (product_type or '').lower() in [t.lower() for t in exempt_types]
            
            if is_exempt:
                line_vat = 0
                line_gross = line_net
            else:
                line_vat = line_net * vat_rate
                line_gross = line_net + line_vat
            
            item_calculation = {
                'item_id': item.get('id'),
                'product_name': item.get('product_name'),
                'net_amount': round(line_net, 2),
                'vat_amount': round(line_vat, 2),
                'gross_amount': round(line_gross, 2),
                'vat_rate': vat_rate if not is_exempt else 0,
                'is_exempt': is_exempt
            }
            
            item_calculations.append(item_calculation)
            total_net += line_net
            total_vat += line_vat
        
        total_gross = total_net + total_vat
        
        # Apply threshold check
        meets_threshold = total_net >= threshold
        
        result = {
            'calculation_type': 'standard_vat',
            'vat_rate': vat_rate,
            'total_net': round(total_net, 2),
            'total_vat': round(total_vat, 2) if meets_threshold else 0,
            'total_gross': round(total_gross, 2) if meets_threshold else round(total_net, 2),
            'meets_threshold': meets_threshold,
            'threshold_amount': threshold,
            'item_calculations': item_calculations,
            'calculation_timestamp': logger.info('VAT calculation completed')
        }
        
        logger.info(f"DEBUG: VAT calculation result: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error in calculate_vat_standard: {str(e)}")
        return {
            'calculation_type': 'standard_vat',
            'error': str(e),
            'total_net': 0,
            'total_vat': 0,
            'total_gross': 0
        }


def calculate_vat_by_location(cart_items, params):
    """
    Calculate VAT based on user location/country.
    
    Args:
        cart_items: List of cart items
        params: Dictionary containing location-based VAT rules
            - country_rates: Dict mapping country codes to VAT rates
            - user_country: User's country code
            - default_rate: Default VAT rate if country not found
            
    Returns:
        dict: VAT calculation results
    """
    try:
        logger.info(f"DEBUG: calculate_vat_by_location called")
        
        country_rates = params.get('country_rates', {})
        user_country = params.get('user_country', 'GB')
        default_rate = float(params.get('default_rate') or 0.20)
        
        # Get VAT rate for user's country
        vat_rate = float(country_rates.get(user_country) or default_rate)
        
        # Use standard VAT calculation with location-specific rate
        modified_params = {
            **params,
            'vat_rate': vat_rate
        }
        
        result = calculate_vat_standard(cart_items, modified_params)
        result['calculation_type'] = 'location_based_vat'
        result['user_country'] = user_country
        result['country_vat_rate'] = vat_rate
        
        return result
        
    except Exception as e:
        logger.error(f"Error in calculate_vat_by_location: {str(e)}")
        return {
            'calculation_type': 'location_based_vat',
            'error': str(e),
            'total_net': 0,
            'total_vat': 0,
            'total_gross': 0
        }


def calculate_business_vat(cart_items, params):
    """
    Calculate VAT for business customers (potentially reverse charge).
    
    Args:
        cart_items: List of cart items
        params: Dictionary containing business VAT parameters
            - is_business_customer: Boolean indicating business customer
            - business_country: Business customer's country
            - supplier_country: Supplier's country
            - has_valid_vat_number: Boolean indicating valid VAT registration
            
    Returns:
        dict: VAT calculation results
    """
    try:
        logger.info(f"DEBUG: calculate_business_vat called")
        
        is_business = params.get('is_business_customer', False)
        business_country = params.get('business_country', 'GB')
        supplier_country = params.get('supplier_country', 'GB')
        has_vat_number = params.get('has_valid_vat_number', False)
        
        # Determine if reverse charge applies (EU B2B with valid VAT number)
        eu_countries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']
        
        is_reverse_charge = (
            is_business and 
            has_vat_number and 
            business_country != supplier_country and
            business_country in eu_countries and
            supplier_country in eu_countries
        )
        
        if is_reverse_charge:
            # Reverse charge - no VAT charged by supplier
            modified_params = {**params, 'vat_rate': 0}
            result = calculate_vat_standard(cart_items, modified_params)
            result['calculation_type'] = 'reverse_charge_vat'
            result['reverse_charge_applied'] = True
        else:
            # Standard VAT calculation
            result = calculate_vat_standard(cart_items, params)
            result['calculation_type'] = 'business_vat'
            result['reverse_charge_applied'] = False
        
        result['is_business_customer'] = is_business
        result['business_country'] = business_country
        result['supplier_country'] = supplier_country
        
        return result
        
    except Exception as e:
        logger.error(f"Error in calculate_business_vat: {str(e)}")
        return {
            'calculation_type': 'business_vat',
            'error': str(e),
            'total_net': 0,
            'total_vat': 0,
            'total_gross': 0
        } 