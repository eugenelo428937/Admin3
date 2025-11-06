"""
Postcoder.com API Service

This service handles integration with the Postcoder.com API for UK address lookups.
Provides address search functionality with response transformation to maintain
backward compatibility with the existing getaddress.io format.
"""

import requests
from django.conf import settings
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class PostcoderService:
    """
    Service for interacting with Postcoder.com API.

    Provides methods for:
    - Looking up UK addresses by postcode
    - Transforming Postcoder responses to getaddress.io format
    - Error handling for API failures
    """

    BASE_URL = "https://ws.postcoder.com/pcw"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Postcoder service.

        Args:
            api_key: Postcoder API key (defaults to settings.POSTCODER_API_KEY)
        """
        self.api_key = api_key or settings.POSTCODER_API_KEY
        if not self.api_key:
            logger.warning("POSTCODER_API_KEY not configured")

    def lookup_address(self, postcode: str, country_code: str = 'GB') -> Dict:
        """
        Look up addresses for a given postcode or address search term using Postcoder.com API.

        Supports international address lookups with country-specific endpoints.

        Note: For countries without postcodes (e.g., Hong Kong), the postcode parameter
        can be an address search term (street name, building name, district).

        Args:
            postcode: Postal code (e.g., "SW1A 1AA" for UK) OR address search term
                     (e.g., "Nathan Road" for Hong Kong)
            country_code: ISO 3166-1 alpha-2 country code (e.g., "GB", "HK", "US")
                         Defaults to "GB" for backward compatibility

        Returns:
            dict: Postcoder API response containing address data

        Raises:
            ValueError: If postcode/search term is invalid or missing
            requests.RequestException: If API call fails
            TimeoutError: If API call times out
        """
        if not postcode:
            raise ValueError("Search term (postcode or address) is required")

        if not self.api_key:
            raise ValueError("POSTCODER_API_KEY not configured")

        # Clean postcode (remove spaces, convert to uppercase)
        clean_postcode = postcode.replace(' ', '').upper()

        # Convert country code to lowercase for API endpoint
        country_lower = country_code.lower()

        # Postcoder.com API endpoint (international support)
        url = f"{self.BASE_URL}/{self.api_key}/address/{country_lower}/{clean_postcode}"

        try:
            logger.info(f"Calling Postcoder API for {country_code} postcode: {clean_postcode}")

            response = requests.get(url, timeout=10)
            response.raise_for_status()

            data = response.json()

            # Check if Postcoder returned an error
            if isinstance(data, dict) and 'error' in data:
                error_msg = data.get('error', 'Unknown error')
                logger.error(f"Postcoder API error for {country_code}: {error_msg}")
                raise requests.RequestException(f"Postcoder API error: {error_msg}")

            logger.info(f"Successfully retrieved {len(data) if isinstance(data, list) else 0} addresses for {country_code}")
            return data

        except requests.Timeout as e:
            logger.error(f"Postcoder API timeout for {country_code} postcode {clean_postcode}: {str(e)}")
            raise TimeoutError(f"Postcoder API request timed out: {str(e)}")

        except requests.HTTPError as e:
            logger.error(f"Postcoder API HTTP error for {country_code} postcode {clean_postcode}: {str(e)}")
            if e.response.status_code == 404:
                # No addresses found for this postcode
                return []
            raise

        except requests.RequestException as e:
            logger.error(f"Postcoder API request failed for {country_code} postcode {clean_postcode}: {str(e)}")
            raise

    def transform_to_getaddress_format(self, postcoder_response: List[Dict], country_code: str = 'GB') -> Dict:
        """
        Transform Postcoder.com response to match getaddress.io format.

        Supports international addresses with country-specific formatting.

        Postcoder.com returns:
        {
            "postcode": "SW1A1AA",
            "summaryline": "10 Downing Street, Westminster, London",
            "organisation": "",
            "buildingname": "",
            "number": "10",
            "premise": "10",
            "street": "Downing Street",
            "dependentlocality": "",
            "posttown": "LONDON",
            "county": "Greater London",
            "latitude": 51.503396,
            "longitude": -0.127784
        }

        getaddress.io format:
        {
            "addresses": [
                {
                    "postcode": "SW1A 1AA",
                    "latitude": 51.503396,
                    "longitude": -0.127784,
                    "formatted_address": ["10 Downing Street", "Westminster", "London"],
                    "line_1": "10 Downing Street",
                    "line_2": "",
                    "line_3": "Westminster",
                    "line_4": "",
                    "town_or_city": "London",
                    "county": "Greater London",
                    "country": "England"
                }
            ]
        }

        Args:
            postcoder_response: Raw response from Postcoder API (list of addresses)
            country_code: ISO 3166-1 alpha-2 country code (e.g., "GB", "HK", "US")

        Returns:
            dict: Transformed response in getaddress.io format
        """
        # Get country name from database
        from utils.models import UtilsCountrys

        try:
            country = UtilsCountrys.objects.get(code=country_code.upper())
            country_name = country.name
        except UtilsCountrys.DoesNotExist:
            logger.warning(f"Country code {country_code} not found in UtilsCountrys, using code as fallback")
            country_name = country_code.upper()

        if not isinstance(postcoder_response, list):
            logger.warning("Postcoder response is not a list, returning empty addresses")
            return {"addresses": []}

        addresses = []

        for item in postcoder_response:
            try:
                # Extract address components
                organisation = item.get('organisation', '')  # Company/organisation name
                number = item.get('number', '')
                premise = item.get('premise', '')
                building_name = item.get('buildingname', '')
                street = item.get('street', '')
                dependent_locality = item.get('dependentlocality', '')
                post_town = item.get('posttown', '')
                county = item.get('county', '')
                postcode = item.get('postcode', '')

                # Format postcode with space (e.g., "SW1A1AA" -> "SW1A 1AA")
                if postcode and len(postcode) >= 3:
                    formatted_postcode = f"{postcode[:-3]} {postcode[-3:]}"
                else:
                    formatted_postcode = postcode

                # Build line_1 with organisation for better distinction
                # Priority: organisation > building_name > number/premise + street
                line_1_parts = []
                if organisation:
                    # Include organisation name as primary identifier
                    line_1_parts.append(organisation)
                if building_name:
                    line_1_parts.append(building_name)
                elif number or premise:
                    line_1_parts.append(number or premise)
                if street:
                    line_1_parts.append(street)
                line_1 = ', '.join(line_1_parts) if organisation else ' '.join(line_1_parts)

                # Build formatted_address array
                formatted_address = []
                if line_1:
                    formatted_address.append(line_1)
                if dependent_locality:
                    formatted_address.append(dependent_locality)
                if post_town:
                    formatted_address.append(post_town.title())  # Convert to title case

                # Create transformed address
                transformed = {
                    "postcode": formatted_postcode,
                    "latitude": item.get('latitude', 0),
                    "longitude": item.get('longitude', 0),
                    "formatted_address": formatted_address,
                    "line_1": line_1,
                    "line_2": "",
                    "line_3": dependent_locality,
                    "line_4": "",
                    "building_name": organisation or building_name,  # Store org/building for frontend
                    "town_or_city": post_town.title() if post_town else "",
                    "county": county,
                    "country": country_name  # Dynamic country based on country_code parameter
                }

                addresses.append(transformed)

            except Exception as e:
                logger.error(f"Error transforming address item: {str(e)}")
                continue

        return {"addresses": addresses}

    def execute_lookup(self, postcode: str, country_code: str = 'GB') -> tuple[Dict, int]:
        """
        Execute a complete address lookup with timing.

        This is a standalone method that ONLY calls the Postcoder API.
        It does NOT integrate with caching or logging - those are handled
        by the view layer.

        Args:
            postcode: Postal code (e.g., "SW1A 1AA" for UK) OR address search term
                     (e.g., "Nathan Road" for Hong Kong)
            country_code: ISO 3166-1 alpha-2 country code (defaults to "GB")

        Returns:
            tuple: (addresses_dict, response_time_ms)
        """
        import time

        start_time = time.time()

        try:
            # Call Postcoder API with country code
            postcoder_response = self.lookup_address(postcode, country_code)

            # Transform to getaddress.io format with country code
            addresses = self.transform_to_getaddress_format(postcoder_response, country_code)

            # Calculate response time
            response_time_ms = int((time.time() - start_time) * 1000)

            return addresses, response_time_ms

        except Exception as e:
            # Calculate response time even for errors
            response_time_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Lookup failed: {str(e)}")
            raise
