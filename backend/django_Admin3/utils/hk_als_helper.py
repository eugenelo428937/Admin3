"""
Hong Kong Address Lookup Service (HK ALS) API Integration Helper

Provides functions to:
1. Call the HK ALS government API
2. Transform HK ALS responses to the contract format

API Documentation:
- https://data.gov.hk/en-data/dataset/hk-dpo-als_01-als
- https://www.als.gov.hk/docs/Data_Specification_for_ALS_GeoJSON_EN.pdf

Contract: specs/003-currently-the-backend/contracts/address-lookup-hk-api.md
"""

import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def call_hk_als_api(search_text, timeout=10):
    """
    Call Hong Kong Address Lookup Service API with free-text search

    Args:
        search_text (str): Free-text search query (building, street, district, etc.)
        timeout (int): Request timeout in seconds (default: 10)

    Returns:
        dict: Raw HK ALS API response JSON

    Raises:
        requests.exceptions.RequestException: On API call failure (timeout, connection error, etc.)
    """
    if not search_text or len(search_text) < 2:
        raise ValueError("search_text must be at least 2 characters")

    api_url = settings.HK_ALS_API_URL
    api_key = settings.HK_ALS_API_KEY

    # Build request parameters
    params = {
        'q': search_text,  # Free-text search parameter
    }

    # Add API key if configured (optional for public API)
    if api_key:
        params['api-key'] = api_key

    logger.info(f"Calling HK ALS API: {api_url} with query: {search_text}")

    try:
        response = requests.get(api_url, params=params, timeout=timeout)
        response.raise_for_status()  # Raise exception for HTTP errors
        return response.json()
    except requests.exceptions.Timeout as e:
        logger.error(f"HK ALS API timeout after {timeout}s: {str(e)}")
        raise
    except requests.exceptions.RequestException as e:
        logger.error(f"HK ALS API request failed: {str(e)}")
        raise


def parse_hk_als_response(api_response):
    """
    Transform HK ALS API response to contract format

    Converts geodata.gov.hk JSON array to flat address objects matching
    the contract specification.

    Args:
        api_response (list): Raw geodata.gov.hk API response (array of address objects)

    Returns:
        list: Array of address objects in contract format:
            [{
                "building": str,
                "street": str,
                "district": str,
                "region": str,
                "formatted_address": str,
                "is_3d": bool
            }]

    Contract format specified in:
    specs/003-currently-the-backend/contracts/address-lookup-hk-api.md
    """
    addresses = []

    # geodata.gov.hk returns a flat array of address objects
    if not isinstance(api_response, list):
        logger.warning(f"Unexpected API response type: {type(api_response)}")
        return addresses

    for result in api_response:
        try:
            # Extract fields from geodata.gov.hk format
            address_en = result.get('addressEN', '').strip()
            name_en = result.get('nameEN', '').strip()
            district_en = result.get('districtEN', '').strip()

            # Derive region from district name
            region = _derive_region_from_district(district_en)

            # Determine building and street from API fields
            # nameEN = building/estate name (e.g., "Abbey Court", "Central Government Offices")
            # addressEN = full street address (e.g., "22 YIN ON STREET", "2 Tim Mei Avenue")
            building = name_en
            street = address_en

            # Detect 3D addresses (flat/floor/block indicators)
            is_3d = _is_3d_address(address_en, name_en)

            # Build formatted_address for display
            formatted_parts = []
            if building:
                formatted_parts.append(building)
            if street:
                formatted_parts.append(street)
            if district_en:
                formatted_parts.append(district_en)
            if region:
                formatted_parts.append(region)

            formatted_address = ", ".join(formatted_parts)

            # Create address object matching contract
            address_object = {
                "building": building,
                "street": street,
                "district": district_en,
                "region": region,
                "formatted_address": formatted_address,
                "is_3d": is_3d
            }

            addresses.append(address_object)

        except (KeyError, TypeError) as e:
            # Skip malformed address entries but log the error
            logger.warning(f"Failed to parse geodata.gov.hk address entry: {str(e)}")
            continue

    logger.info(f"Parsed {len(addresses)} addresses from geodata.gov.hk response")
    return addresses


def _derive_region_from_district(district):
    """
    Derive region code (HK/KLN/NT) from district name

    Args:
        district (str): District name in English (e.g., "Central & Western", "Kowloon City District")

    Returns:
        str: Region code (HK, KLN, or NT)
    """
    # Hong Kong Island districts
    hk_island_districts = [
        'Central & Western', 'Central and Western',
        'Eastern', 'Southern', 'Wan Chai'
    ]

    # Kowloon districts
    kowloon_districts = [
        'Kowloon City', 'Kwun Tong', 'Sham Shui Po',
        'Wong Tai Sin', 'Yau Tsim Mong'
    ]

    # New Territories districts
    nt_districts = [
        'Islands', 'Kwai Tsing', 'North', 'Sai Kung',
        'Sha Tin', 'Tai Po', 'Tsuen Wan', 'Tuen Mun', 'Yuen Long'
    ]

    # Normalize district name for comparison
    district_normalized = district.replace(' District', '').strip()

    # Check which region the district belongs to
    if any(d in district_normalized for d in hk_island_districts):
        return 'HK'
    elif any(d in district_normalized for d in kowloon_districts):
        return 'KLN'
    elif any(d in district_normalized for d in nt_districts):
        return 'NT'

    # Default to empty if unknown
    logger.warning(f"Could not derive region for district: {district}")
    return ''


def _is_3d_address(address_en, name_en):
    """
    Detect if address is 3D (residential estate with flat/floor/block)

    Args:
        address_en (str): Full address string
        name_en (str): Building/estate name

    Returns:
        bool: True if 3D address, False otherwise
    """
    # Keywords that indicate 3D address structure
    keywords_3d = [
        'FLAT', 'FLT', 'FLOOR', 'FL', 'BLK', 'BLOCK',
        'PHASE', 'TOWER', 'BUILDING', 'ESTATE'
    ]

    # Check if any 3D keyword appears in address or name
    combined = f"{address_en} {name_en}".upper()
    return any(keyword in combined for keyword in keywords_3d)


def validate_search_text(search_text):
    """
    Validate search_text parameter against contract rules

    Args:
        search_text (str): Search query to validate

    Returns:
        tuple: (is_valid: bool, error_message: str or None)

    Validation Rules (from contract):
    - Must not be empty
    - Minimum length: 2 characters
    - Maximum length: 200 characters
    """
    if not search_text:
        return False, "Missing search_text parameter"

    if not isinstance(search_text, str):
        return False, "search_text must be a string"

    search_text = search_text.strip()

    if len(search_text) < 2:
        return False, "search_text must be at least 2 characters"

    if len(search_text) > 200:
        return False, "search_text must not exceed 200 characters"

    return True, None
