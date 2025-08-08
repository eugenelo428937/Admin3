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


def check_tutorial_only_credit_card(cart_items, params):
    """
    Check if cart contains only tutorial products and payment method is credit card.
    
    Args:
        cart_items: List of cart items (can be empty for testing)
        params: Dictionary containing payment_method and other context including test_cart_items
        
    Returns:
        bool: True if conditions are met, False otherwise
    """
    try:
        logger.info(f"DEBUG: check_tutorial_only_credit_card called")
        logger.info(f"DEBUG: cart_items: {cart_items}")
        logger.info(f"DEBUG: params: {params}")
        
        # For testing, use test_cart_items if available, otherwise use cart_items
        items_to_check = params.get('test_cart_items', cart_items)
        
        # Check payment method
        payment_method = params.get('payment_method', '').lower()
        is_credit_card = payment_method in ['credit_card', 'card', 'creditcard']
        
        logger.info(f"DEBUG: payment_method: {payment_method}, is_credit_card: {is_credit_card}")
        logger.info(f"DEBUG: items_to_check: {items_to_check}")
        
        if not is_credit_card:
            logger.info("DEBUG: Not paying by credit card, condition not met")
            return False
        
        # Check if all items are tutorials
        tutorial_count = 0
        non_tutorial_count = 0
        
        for item in items_to_check:
            # Check different possible fields for product type
            product_type = (
                item.get('product_type') or 
                item.get('type') or 
                ''
            ).lower()
            
            logger.info(f"DEBUG: Item {item.get('id')}: product_type = {product_type}")
            
            # Skip booking fee items (they shouldn't count against tutorial-only check)
            if 'booking' in product_type and 'fee' in product_type:
                logger.info(f"DEBUG: Skipping booking fee item")
                continue
            
            if 'tutorial' in product_type:
                tutorial_count += 1
            else:
                non_tutorial_count += 1
        
        logger.info(f"DEBUG: tutorial_count: {tutorial_count}, non_tutorial_count: {non_tutorial_count}")
        
        # Must have at least one tutorial and no non-tutorial items
        result = tutorial_count > 0 and non_tutorial_count == 0
        logger.info(f"DEBUG: Final result: {result}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in check_tutorial_only_credit_card: {str(e)}")
        return False


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
        logger.info(f"DEBUG: apply_tutorial_booking_fee called")
        logger.info(f"DEBUG: params: {params}")
        
        fee_amount = params.get('fee_amount', 1.00)  # Default £1
        fee_description = params.get('fee_description', 'Tutorial Booking Fee')
        cart_id = params.get('cart_id')
        rule_id = params.get('rule_id')
        
        # For testing, if no cart_id provided, return a mock success
        if not cart_id:
            logger.info("DEBUG: No cart_id provided - returning mock fee application for testing")
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
            logger.info("DEBUG: Tutorial booking fee already applied")
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
        
        logger.info(f"DEBUG: Fee application result: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error in apply_tutorial_booking_fee: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'fee_applied': False,
            'fee_amount': 0
        }


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
        from django.utils import timezone
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
            'calculation_timestamp': timezone.now().isoformat()
        }
        
        logger.info('VAT calculation completed')
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


def check_expired_marking_deadlines(cart_items, params):
    """
    Check if cart contains marking products with expired deadlines.
    
    Args:
        cart_items: List of cart items with product information
        params: Dictionary with function parameters
        
    Returns:
        dict: Results containing expired deadline information
    """
    try:
        from marking.models import MarkingPaper
        from django.utils import timezone
        from collections import defaultdict
        
        # logger.info("DEBUG: check_expired_marking_deadlines called")
        # logger.info(f"DEBUG: cart_items: {cart_items}")
        # logger.info(f"DEBUG: params: {params}")
        
        current_time = timezone.now()
        expired_products = []
        warnings = []
        
        # Process each cart item
        for item in cart_items:
            # Check if this is a marking product
            product_type = (item.get('product_type') or '').lower()
            product_name = item.get('product_name', '')
            subject_code = item.get('subject_code', '')
            
            # logger.info(f"DEBUG: Checking item - Product: {product_name}, Type: {product_type}, Subject: {subject_code}")
            
            # Check if this is a marking product (contains "marking" in name or type)
            if 'marking' in product_name.lower() or 'marking' in product_type:
                try:
                    # Get the ExamSessionSubjectProduct ID from the cart item
                    # This should be available as the cart item's product field references ExamSessionSubjectProduct
                    essp_id = item.get('id')  # This might be the cart item ID, not the product ID
                    
                    # We need to get the actual ExamSessionSubjectProduct ID
                    # Let's try to find it by matching the product information
                    from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
                    
                    # Try to find the ExamSessionSubjectProduct by subject code and product name
                    marking_products = ExamSessionSubjectProduct.objects.filter(
                        exam_session_subject__subject__code=subject_code,
                        product__fullname__icontains='marking'
                    ).select_related(
                        'exam_session_subject__subject',
                        'product'
                    ).prefetch_related('marking_papers')
                    
                    # logger.info(f"DEBUG: Found {marking_products.count()} marking products for {subject_code}")
                    
                    for marking_product in marking_products:
                        # Check if this matches our cart item
                        if marking_product.product.fullname.lower() == product_name.lower():
                            # logger.info(f"DEBUG: Matched product: {marking_product.product.fullname}")
                            
                            # Get all marking papers for this product
                            marking_papers = marking_product.marking_papers.all()
                            total_papers = marking_papers.count()
                            expired_papers = []
                            
                            # logger.info(f"DEBUG: Found {total_papers} marking papers")
                            
                            for paper in marking_papers:
                                if paper.deadline < current_time:
                                    expired_papers.append(paper.name)
                                    # logger.info(f"DEBUG: Paper {paper.name} expired on {paper.deadline}")
                                # else:
                                    # logger.info(f"DEBUG: Paper {paper.name} deadline {paper.deadline} is still valid")
                            
                            expired_count = len(expired_papers)
                            
                            if expired_count > 0:
                                expired_info = {
                                    'product_name': product_name,
                                    'subject': subject_code,
                                    'expired_count': expired_count,
                                    'paper_count': total_papers,  # Add paper_count alias
                                    'total_papers': total_papers,
                                    'expired_papers': ', '.join(expired_papers)
                                }
                                
                                expired_products.append(expired_info)
                                
                                # Create warning message
                                warning_message = f"{expired_count}/{total_papers} deadlines for {subject_code} {product_name} has expired. If you need marking for this study session then please purchase Marking Vouchers instead."
                                warnings.append({
                                    'type': 'expired_deadline',
                                    'message': warning_message,
                                    'product_details': expired_info
                                })
                                
                                # logger.info(f"DEBUG: Added warning for {product_name}: {expired_count}/{total_papers} expired")
                            break
                    
                except Exception as e:
                    logger.error(f"Error checking marking deadlines for {product_name}: {str(e)}")
                    continue
        
        # Prepare the result
        has_expired_deadlines = len(expired_products) > 0
        
        result = {
            'success': True,
            'has_expired_deadlines': has_expired_deadlines,
            'expired_products': expired_products,
            'warnings': warnings,
            'total_warnings': len(warnings)
        }
        
        # logger.info(f"DEBUG: check_expired_marking_deadlines result: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error in check_expired_marking_deadlines: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'has_expired_deadlines': False,
            'expired_products': [],
            'warnings': []
        }