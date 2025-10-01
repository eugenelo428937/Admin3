"""
Product Classifier Module

Epic 3: Dynamic VAT Calculation System
Phase 3: VAT Context Builder
Task: TASK-025 - Implement Product Classifier

Classifies products based on product code patterns for VAT calculation purposes.
"""


def classify_product(product):
    """
    Classify product based on product code patterns.

    Args:
        product: Product dict with 'product_code' field, or None

    Returns:
        dict: Classification with flags:
            - is_digital: True for digital products (online, digital, ebook)
            - is_ebook: True for eBooks specifically
            - is_material: True for physical materials (printed books, etc.)
            - is_live_tutorial: True for live tutorial sessions
            - is_marking: True for marking/assignment products
            - product_type: Primary type string (ebook, material, digital, live_tutorial, marking)
    """
    # Default classification (material)
    classification = {
        'is_digital': False,
        'is_ebook': False,
        'is_material': True,  # Default to material for unknown types
        'is_live_tutorial': False,
        'is_marking': False,
        'product_type': 'material'
    }

    # Handle None product or missing product_code
    if product is None:
        return classification

    if not isinstance(product, dict):
        return classification

    product_code = product.get('product_code')
    if not product_code:
        return classification

    # Convert to uppercase for case-insensitive matching
    product_code_upper = str(product_code).upper()

    # Check for marking products (highest priority)
    if 'MARK' in product_code_upper:
        return {
            'is_digital': False,
            'is_ebook': False,
            'is_material': False,
            'is_live_tutorial': False,
            'is_marking': True,
            'product_type': 'marking'
        }

    # Check for eBook (takes precedence over other material types)
    if 'EBOOK' in product_code_upper or 'E-BOOK' in product_code_upper:
        return {
            'is_digital': True,  # eBooks are digital
            'is_ebook': True,
            'is_material': False,
            'is_live_tutorial': False,
            'is_marking': False,
            'product_type': 'ebook'
        }

    # Check for live tutorial
    if 'LIVE' in product_code_upper:
        return {
            'is_digital': False,
            'is_ebook': False,
            'is_material': False,
            'is_live_tutorial': True,
            'is_marking': False,
            'product_type': 'live_tutorial'
        }

    # Check for digital/online products
    if 'DIGITAL' in product_code_upper or 'ONLINE' in product_code_upper:
        return {
            'is_digital': True,
            'is_ebook': False,
            'is_material': False,
            'is_live_tutorial': False,
            'is_marking': False,
            'product_type': 'digital'
        }

    # Check for printed materials
    if 'PRINT' in product_code_upper:
        return {
            'is_digital': False,
            'is_ebook': False,
            'is_material': True,
            'is_live_tutorial': False,
            'is_marking': False,
            'product_type': 'material'
        }

    # Default to material for unknown types
    return classification