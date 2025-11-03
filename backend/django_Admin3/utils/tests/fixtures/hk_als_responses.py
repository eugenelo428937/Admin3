"""
Mock responses for Hong Kong Address Lookup Service (HK ALS) API

These fixtures are used in tests for the HK address lookup endpoint.
Based on actual geodata.gov.hk JSON API response structure.
"""

# Success response: 2D address (commercial building)
# geodata.gov.hk returns a flat array of address objects
HK_ALS_SUCCESS_2D = [
    {
        "addressZH": "添美道   2號",
        "nameZH": "政府總部",
        "districtZH": "中西區",
        "x": 834900,
        "y": 815800,
        "nameEN": "Central Government Offices",
        "addressEN": "2 TIM MEI AVENUE",
        "districtEN": "Central & Western District"
    },
    {
        "addressZH": "港灣道   18號",
        "nameZH": "中環廣場",
        "districtZH": "灣仔區",
        "x": 836450,
        "y": 815650,
        "nameEN": "Central Plaza",
        "addressEN": "18 HARBOUR ROAD",
        "districtEN": "Wan Chai District"
    }
]

# Success response: 3D address (residential estate with flat/floor/block)
# Detected by presence of PHASE, TOWER, BLOCK, ESTATE keywords
HK_ALS_SUCCESS_3D = [
    {
        "addressZH": "",
        "nameZH": "美孚新邨",
        "districtZH": "深水埗區",
        "x": 832100,
        "y": 819800,
        "nameEN": "Mei Foo Sun Chuen",
        "addressEN": "BLOCK 3",
        "districtEN": "Sham Shui Po District"
    },
    {
        "addressZH": "碧濤花園第一期",
        "nameZH": "雅碧閣",
        "districtZH": "沙田區",
        "x": 839423,
        "y": 828329,
        "nameEN": "Abbey Court",
        "addressEN": "PICTORIAL GARDEN PHASE I",
        "districtEN": "Sha Tin District"
    }
]

# Error response: Service returns 500 error (not a real geodata.gov.hk format)
# Used to simulate service errors in tests
HK_ALS_ERROR_500 = {
    "error": {
        "code": 500,
        "message": "Internal Server Error",
        "details": "Service temporarily unavailable"
    }
}

# Success response: No results found (empty array)
HK_ALS_NO_RESULTS = []

# Mock timeout exception (not a JSON response - used to trigger RequestException in tests)
# This would be raised via: requests.exceptions.Timeout("Connection timeout")
HK_ALS_TIMEOUT = "MOCK_TIMEOUT_EXCEPTION"  # Sentinel value for test mocking

# Expected contract format responses (after transformation)
# These represent what our endpoint SHOULD return to the frontend

CONTRACT_RESPONSE_2D = {
    "addresses": [
        {
            "building": "Central Government Offices",
            "street": "2 TIM MEI AVENUE",
            "district": "Central & Western District",
            "region": "HK",
            "formatted_address": "Central Government Offices, 2 TIM MEI AVENUE, Central & Western District, HK",
            "is_3d": False
        },
        {
            "building": "Central Plaza",
            "street": "18 HARBOUR ROAD",
            "district": "Wan Chai District",
            "region": "HK",
            "formatted_address": "Central Plaza, 18 HARBOUR ROAD, Wan Chai District, HK",
            "is_3d": False
        }
    ],
    "total": 2,
    "search_text": "central"
}

CONTRACT_RESPONSE_3D = {
    "addresses": [
        {
            "building": "Mei Foo Sun Chuen",
            "street": "BLOCK 3",
            "district": "Sham Shui Po District",
            "region": "KLN",
            "formatted_address": "Mei Foo Sun Chuen, BLOCK 3, Sham Shui Po District, KLN",
            "is_3d": True
        },
        {
            "building": "Abbey Court",
            "street": "PICTORIAL GARDEN PHASE I",
            "district": "Sha Tin District",
            "region": "NT",
            "formatted_address": "Abbey Court, PICTORIAL GARDEN PHASE I, Sha Tin District, NT",
            "is_3d": True
        }
    ],
    "total": 2,
    "search_text": "abbey court"
}

CONTRACT_RESPONSE_NO_RESULTS = {
    "addresses": [],
    "total": 0,
    "search_text": "nonexistent address"
}

CONTRACT_RESPONSE_ERROR_400 = {
    "error": "Missing search_text parameter",
    "allow_manual": True
}

CONTRACT_RESPONSE_ERROR_500 = {
    "error": "Address lookup service temporarily unavailable",
    "allow_manual": True,
    "details": "Connection timeout to HK ALS API"
}
