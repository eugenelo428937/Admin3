import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods
from django.conf import settings
import requests

# Initialize logger
logger = logging.getLogger(__name__)

@csrf_exempt
@require_GET
def address_lookup_proxy(request, is_test=True):
    
    postcode = request.GET.get('postcode').replace(' ', '').upper()
    if not postcode:
        return JsonResponse({'error': 'Missing postcode'}, status=400)
    # Replace with your real key in production
    api_key = settings.GETADDRESS_API_KEY
    # Step 1: Autocomplete
    if not is_test:
        autocomplete_url = f'https://api.getaddress.io/autocomplete/{postcode}?api-key={api_key}'

        try:
            auto_resp = requests.get(autocomplete_url, timeout=10)
            auto_resp.raise_for_status()
            auto_data = auto_resp.json()
            suggestions = auto_data.get('suggestions', [])
            addresses = []
            # Step 2: For each suggestion, get the full address
            for suggestion in suggestions:
                suggestion_id = suggestion.get('id')
                if not suggestion_id:
                    continue
                get_url = f'https://api.getaddress.io/get/{suggestion_id}?api-key={api_key}'
                get_resp = requests.get(get_url, timeout=10)
                if get_resp.status_code == 200:
                    addr_data = get_resp.json()
                    addresses.append(addr_data)
            return JsonResponse({'addresses': addresses}, safe=False)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    else:
        api_key = settings.GETADDRESS_ADMIN_KEY
        autocomplete_url = f'https://api.getAddress.io/v2/private-address?api-key={api_key}'
        print(autocomplete_url)
        auto_resp = requests.get(autocomplete_url, timeout=10)
        auto_resp.raise_for_status()
        auto_data = auto_resp.json()
        
        # Private Address API returns a list of addresses directly, not an object with 'suggestions'
        if isinstance(auto_data, list):
            addresses = auto_data  # auto_data is already a list of addresses
        else:
            # Fallback in case the response format is different
            addresses = []
        
        return JsonResponse({'addresses': addresses}, safe=False)
        # postcode = request.GET.get('postcode')
        # country = request.GET.get('country', '').lower()
        # # Only mock for UK postcode OX44 9EL
        # if postcode and postcode.replace(' ', '').upper() == 'OX449EL' and (not country or country in ['uk', 'united kingdom', 'gb', 'great britain', 'england']):
        #     mock_response = {
        #         "addresses": [
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7176,
        #                 "longitude": -1.15909,
        #                 "formatted_address": [
        #                     "2 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "2",
        #                 "line_1": "2 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7176,
        #                 "longitude": -1.15946,
        #                 "formatted_address": [
        #                     "3 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "3",
        #                 "line_1": "3 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7176,
        #                 "longitude": -1.15925,
        #                 "formatted_address": [
        #                     "4 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "4",
        #                 "line_1": "4 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7179,
        #                 "longitude": -1.15904,
        #                 "formatted_address": [
        #                     "5 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "5",
        #                 "line_1": "5 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7176,
        #                 "longitude": -1.15917,
        #                 "formatted_address": [
        #                     "6 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "6",
        #                 "line_1": "6 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7179,
        #                 "longitude": -1.15892,
        #                 "formatted_address": [
        #                     "7 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "7",
        #                 "line_1": "7 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7176,
        #                 "longitude": -1.15932,
        #                 "formatted_address": [
        #                     "8 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "8",
        #                 "line_1": "8 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7173,
        #                 "longitude": -1.15749,
        #                 "formatted_address": [
        #                     "9 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "9",
        #                 "line_1": "9 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7175,
        #                 "longitude": -1.15939,
        #                 "formatted_address": [
        #                     "10 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "10",
        #                 "line_1": "10 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.718,
        #                 "longitude": -1.15742,
        #                 "formatted_address": [
        #                     "11 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "11",
        #                 "line_1": "11 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7175,
        #                 "longitude": -1.15954,
        #                 "formatted_address": [
        #                     "12 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "12",
        #                 "line_1": "12 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7175,
        #                 "longitude": -1.15968,
        #                 "formatted_address": [
        #                     "14 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "14",
        #                 "line_1": "14 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7175,
        #                 "longitude": -1.15948,
        #                 "formatted_address": [
        #                     "16 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "16",
        #                 "line_1": "16 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7175,
        #                 "longitude": -1.15957,
        #                 "formatted_address": [
        #                     "18 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "18",
        #                 "line_1": "18 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7175,
        #                 "longitude": -1.15967,
        #                 "formatted_address": [
        #                     "20 Denton Lane",
        #                     "",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "20",
        #                 "line_1": "20 Denton Lane",
        #                 "line_2": "",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": True
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7173,
        #                 "longitude": -1.15749,
        #                 "formatted_address": [
        #                     "Doug Wheelers",
        #                     "32-34 Denton Lane",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "32-34",
        #                 "line_1": "Doug Wheelers",
        #                 "line_2": "32-34 Denton Lane",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": False
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7181,
        #                 "longitude": -1.15451,
        #                 "formatted_address": [
        #                     "Garsington Sports Club",
        #                     "Denton Lane",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "",
        #                 "line_1": "Garsington Sports Club",
        #                 "line_2": "Denton Lane",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": False
        #             },
        #             {
        #                 "postcode": "OX44 9EL",
        #                 "latitude": 51.7179,
        #                 "longitude": -1.15892,
        #                 "formatted_address": [
        #                     "New Leaf Tree Surgery Ltd",
        #                     "7 Denton Lane",
        #                     "",
        #                     "Garsington, Oxford",
        #                     "Oxfordshire"
        #                 ],
        #                 "thoroughfare": "Denton Lane",
        #                 "building_name": "",
        #                 "sub_building_name": "",
        #                 "sub_building_number": "",
        #                 "building_number": "7",
        #                 "line_1": "New Leaf Tree Surgery Ltd",
        #                 "line_2": "7 Denton Lane",
        #                 "line_3": "",
        #                 "line_4": "",
        #                 "locality": "Garsington",
        #                 "town_or_city": "Oxford",
        #                 "county": "Oxfordshire",
        #                 "district": "South Oxfordshire",
        #                 "country": "England",
        #                 "residential": False
        #             },
        #         ]
        #     }
        # return JsonResponse(mock_response)
        # return JsonResponse({"addresses": []})  

@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """Simple health check for ALB target group"""
    return JsonResponse({
        'status': 'healthy',
        'message': 'Django server is running'
    })


# ============================================================================
# Postcoder.com Address Lookup (New separate method - see ARCHITECTURE.md)
# ============================================================================

def transform_autocomplete_suggestions(postcoder_response, country_code='GB'):
    """
    Transform Postcoder autocomplete suggestions to getaddress.io compatible format.

    Postcoder autocomplete returns: {'id', 'type', 'summaryline', 'locationsummary', 'count'}
    We transform to simplified format with summaryline as line_1

    Args:
        postcoder_response: List of autocomplete suggestions from Postcoder API
        country_code: ISO country code

    Returns:
        dict: {'addresses': [...]} in getaddress.io format
    """
    from utils.models import UtilsCountrys

    # Get country name from database
    try:
        country = UtilsCountrys.objects.get(code=country_code.upper())
        country_name = country.name
    except UtilsCountrys.DoesNotExist:
        logger.warning(f"Country code {country_code} not found in UtilsCountrys")
        country_name = country_code.upper()

    addresses = []

    if isinstance(postcoder_response, list):
        for suggestion in postcoder_response:
            # Extract summaryline and locationsummary
            summaryline = suggestion.get('summaryline', '')
            locationsummary = suggestion.get('locationsummary', '')

            # Build address
            address = {
                'postcode': '',  # Autocomplete doesn't have postcode yet
                'latitude': 0,
                'longitude': 0,
                'formatted_address': [summaryline, locationsummary] if locationsummary else [summaryline],
                'line_1': summaryline,
                'line_2': locationsummary if locationsummary else '',
                'line_3': '',
                'line_4': '',
                'building_name': '',
                'town_or_city': '',
                'county': '',
                'country': country_name
            }

            addresses.append(address)

    logger.info(f"✅ Transformed {len(addresses)} autocomplete suggestions")

    return {'addresses': addresses}


@csrf_exempt
@require_GET
def postcoder_address_lookup(request):
    """
    Look up international addresses using Postcoder.com API.

    Supports address lookups for multiple countries with country-specific formatting.

    Features:
    - International address support (UK, HK, US, CA, AU, etc.)
    - 7-day caching for improved performance
    - Analytics logging for monitoring
    - Response format matches getaddress.io for frontend compatibility

    Query Parameters:
        postcode (str): Postal code (e.g., "SW1A 1AA" for UK)
        country (str): ISO 3166-1 alpha-2 country code (e.g., "GB", "HK")
                       Defaults to "GB" for backward compatibility

    Returns:
        JsonResponse: {
            "addresses": [...],
            "cache_hit": bool,
            "response_time_ms": int
        }

    Error Responses:
        400: Missing or invalid postcode/country
        500: API failure or internal error
    """
    import time
    from utils.services import PostcoderService, AddressCacheService, AddressLookupLogger

    start_time = time.time()

    # Extract parameters for autocomplete search
    query = request.GET.get('query', '').strip()  # Search text (address line)
    postcode = request.GET.get('postcode', '').strip()  # Postcode (optional, for countries that use it)
    country_code = request.GET.get('country', 'GB').strip().upper()  # Default to GB

    if not query:
        return JsonResponse({
            'error': 'Missing query parameter',
            'code': 'MISSING_QUERY'
        }, status=400)

    logger.info(f"🔍 Address lookup request: query='{query}', postcode='{postcode}', country={country_code}")

    # Initialize services
    cache_service = AddressCacheService()
    logger_service = AddressLookupLogger()
    postcoder_service = PostcoderService()

    cache_hit = False
    addresses = None
    error_message = None
    success = False

    try:
        # Don't cache autocomplete suggestions - they're temporary search results
        # Call Postcoder Autocomplete API directly
        logger.info(f"🔍 Calling Postcoder Autocomplete API (no cache for suggestions)")

        # Always use autocomplete API for all searches
        postcoder_response = postcoder_service.autocomplete_address(
            search_query=query,
            country_code=country_code,
            postcode=postcode if postcode else None
        )

        # Transform autocomplete suggestions to simple format
        addresses = transform_autocomplete_suggestions(postcoder_response, country_code)
        success = True

    except ValueError as e:
        error_message = str(e)
        addresses = {"addresses": []}
        success = False

    except TimeoutError as e:
        error_message = f"API timeout: {str(e)}"
        addresses = {"addresses": []}
        success = False

    except Exception as e:
        error_message = f"API error: {str(e)}"
        addresses = {"addresses": []}
        success = False

    # Calculate response time
    response_time_ms = int((time.time() - start_time) * 1000)

    # Step 2: Log analytics (non-blocking)
    try:
        result_count = len(addresses.get('addresses', []))
        logger_service.log_lookup(
            postcode=query[:10],  # Truncate to 10 chars to fit database field
            cache_hit=False,  # Not caching autocomplete suggestions
            response_time_ms=response_time_ms,
            result_count=result_count,
            success=success,
            api_provider='postcoder',
            error_message=error_message,
            search_query=f"query={query[:100]}, postcode={postcode}, country={country_code}"  # Truncate search_query too
        )
    except Exception as log_error:
        # Logging failures should not break the response - log to console instead
        logger.warning(f"⚠️ Failed to log address lookup: {log_error}")

    # Step 3: Return response
    if success:
        return JsonResponse({
            **addresses,
            'cache_hit': False,  # Not caching autocomplete suggestions
            'response_time_ms': response_time_ms
        })
    else:
        return JsonResponse({
            'error': error_message or 'Address lookup failed',
            'code': 'API_ERROR',
            'addresses': []
        }, status=500)
