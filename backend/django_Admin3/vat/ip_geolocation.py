"""
IP Geolocation for VAT Region Detection - Epic 3

Determines user's VAT region from IP address for unauthenticated users.
"""

import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def get_region_from_ip(ip_address):
    """
    Determine VAT region from IP address.

    Args:
        ip_address: String IP address (e.g., "203.0.113.1")

    Returns:
        str: Region code (UK, EU, ROW, etc.) or None if cannot determine
    """
    if not ip_address or ip_address in ['127.0.0.1', 'localhost', '::1']:
        # Localhost - default to UK for development
        logger.debug(f"Localhost IP detected: {ip_address}, defaulting to UK")
        return 'UK'

    try:
        # Use ip-api.com free tier (45 requests/minute, no API key required)
        # For production, consider upgrading to paid tier or using MaxMind GeoIP2
        response = requests.get(
            f'http://ip-api.com/json/{ip_address}',
            params={'fields': 'status,country,countryCode'},
            timeout=2  # 2 second timeout
        )

        if response.status_code == 200:
            data = response.json()

            if data.get('status') == 'success':
                country_code = data.get('countryCode')
                logger.info(f"IP {ip_address} resolved to country: {country_code}")

                # Map country code to VAT region
                from country.vat_rates import map_country_to_region
                region = map_country_to_region(country_code)

                logger.info(f"Country {country_code} mapped to VAT region: {region}")
                return region
            else:
                logger.warning(f"IP geolocation failed for {ip_address}: {data.get('message')}")

    except requests.exceptions.Timeout:
        logger.warning(f"IP geolocation timeout for {ip_address}")
    except requests.exceptions.RequestException as e:
        logger.warning(f"IP geolocation request failed for {ip_address}: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in IP geolocation for {ip_address}: {str(e)}")

    # Fallback to ROW if geolocation fails
    logger.info(f"Defaulting to ROW for IP {ip_address}")
    return 'ROW'


def get_country_from_ip(ip_address):
    """
    Get country code from IP address.

    Args:
        ip_address: String IP address

    Returns:
        str: ISO country code (e.g., "GB", "US") or None
    """
    if not ip_address or ip_address in ['127.0.0.1', 'localhost', '::1']:
        # Localhost - default to GB for development
        return 'GB'

    try:
        response = requests.get(
            f'http://ip-api.com/json/{ip_address}',
            params={'fields': 'status,countryCode'},
            timeout=2
        )

        if response.status_code == 200:
            data = response.json()

            if data.get('status') == 'success':
                return data.get('countryCode')

    except Exception as e:
        logger.warning(f"Failed to get country from IP {ip_address}: {str(e)}")

    return None
