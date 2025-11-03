import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods
from django.conf import settings
import requests

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
@require_GET
def address_lookup_proxy_hk(request):
    """
    Hong Kong Address Lookup Service proxy endpoint

    Contract: specs/003-currently-the-backend/contracts/address-lookup-hk-api.md

    GET /api/utils/address-lookup-hk/?search_text=<query>

    Returns:
        200: {addresses: [...], total: int, search_text: str}
        400: {error: str, allow_manual: true} - missing/invalid search_text
        500: {error: str, allow_manual: true, details: str} - service unavailable
    """
    from .hk_als_helper import call_hk_als_api, parse_hk_als_response, validate_search_text
    import logging

    logger = logging.getLogger(__name__)

    # Get and validate search_text parameter
    search_text = request.GET.get('search_text', '').strip()

    is_valid, error_message = validate_search_text(search_text)
    if not is_valid:
        return JsonResponse({
            'error': error_message,
            'allow_manual': True
        }, status=400)

    try:
        # Call HK ALS API
        api_response = call_hk_als_api(search_text, timeout=10)

        # Transform response to contract format
        addresses = parse_hk_als_response(api_response)

        # Return success response
        return JsonResponse({
            'addresses': addresses,
            'total': len(addresses),
            'search_text': search_text
        }, status=200)

    except requests.exceptions.Timeout as e:
        logger.error(f"HK ALS API timeout: {str(e)}")
        return JsonResponse({
            'error': 'Address lookup service temporarily unavailable',
            'allow_manual': True,
            'details': 'Connection timeout to HK ALS API'
        }, status=500)

    except requests.exceptions.RequestException as e:
        logger.error(f"HK ALS API request failed: {str(e)}")
        return JsonResponse({
            'error': 'Address lookup service temporarily unavailable',
            'allow_manual': True,
            'details': str(e)
        }, status=500)

    except Exception as e:
        logger.error(f"Unexpected error in HK address lookup: {str(e)}")
        return JsonResponse({
            'error': 'Address lookup service temporarily unavailable',
            'allow_manual': True,
            'details': 'Internal server error'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """Simple health check for ALB target group"""
    return JsonResponse({
        'status': 'healthy',
        'message': 'Django server is running'
    })
