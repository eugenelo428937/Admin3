"""
VAT rate registry and country-to-region mapping.

This module provides VAT rates for different regions and functions
to map countries to regions and calculate VAT amounts.
"""
from decimal import Decimal

# VAT rates by region (all values must be Decimal for precision)
VAT_RATES = {
    "UK": Decimal("0.20"),   # United Kingdom - 20%
    "IE": Decimal("0.23"),   # Ireland - 23%
    "SA": Decimal("0.15"),   # South Africa - 15%
    "ROW": Decimal("0.00"),  # Rest of World - 0% (default)
    "CH": Decimal("0.00"),   # Switzerland - 0%
    "GG": Decimal("0.00"),   # Guernsey - 0%
}

# Country-to-region mapping (all values must be sets for efficient lookup)
REGION_MAP = {
    'UK': {'GB', 'UK'},
    'IE': {'IE'},
    'EU': {'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE',
           'GR', 'HU', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
           'RO', 'SK', 'SI', 'ES', 'SE'},
    'SA': {'ZA'},
    'CH': {'CH'},
    'GG': {'GG'}
}


def map_country_to_region(country_code: str) -> str:
    """
    Map country code to VAT region.

    Args:
        country_code: ISO country code (e.g., 'GB', 'DE', 'US')

    Returns:
        Region code (UK, IE, EU, SA, CH, GG, or ROW)

    Examples:
        >>> map_country_to_region('GB')
        'UK'
        >>> map_country_to_region('DE')
        'EU'
        >>> map_country_to_region('US')
        'ROW'
    """
    # Convert to uppercase for case-insensitive matching
    country_code_upper = country_code.upper()

    # Check each region for matching country code
    for region, codes in REGION_MAP.items():
        if country_code_upper in codes:
            return region

    # Default fallback for unknown countries
    return 'ROW'


def get_vat_rate(region: str, classification: dict = None) -> Decimal:
    """
    Get VAT rate based on region and product classification.

    Rules:
    - UK eBooks: 0% (post-2020 rule)
    - ROW digital: 0%
    - SA products: 15%
    - Standard: region default rate

    Args:
        region: Region code (UK, IE, EU, SA, CH, GG, ROW)
        classification: Product classification dict with keys (optional):
            - is_ebook (bool): True if product is an eBook
            - is_digital (bool): True if product is digital
            - is_live_tutorial (bool): True if product is live tutorial

    Returns:
        VAT rate as Decimal (e.g., Decimal('0.20') for 20%)

    Examples:
        >>> get_vat_rate('UK', {'is_ebook': True})
        Decimal('0.00')
        >>> get_vat_rate('UK', {'is_ebook': False})
        Decimal('0.20')
        >>> get_vat_rate('ROW', {'is_digital': True})
        Decimal('0.00')
    """
    # Handle None classification by treating as empty dict
    if classification is None:
        classification = {}

    # UK eBooks get 0% VAT (post-2020 rule)
    if region == "UK" and classification.get("is_ebook", False):
        return Decimal("0.00")

    # ROW digital products get 0% VAT
    if region == "ROW" and classification.get("is_digital", False):
        return Decimal("0.00")

    # SA products get 15% VAT
    if region == "SA":
        return Decimal("0.15")

    # Return region default rate (handles UK, IE, ROW, CH, GG, EU)
    return VAT_RATES.get(region, Decimal("0.00"))