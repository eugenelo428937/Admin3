# API Contract: Hong Kong Address Lookup

**Endpoint**: `/api/utils/address-lookup-hk/`
**Method**: `GET`
**Authentication**: Not required (follows existing `/api/utils/address-lookup-proxy/` pattern)

---

## Request

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `search_text` | string | Yes | Free-text search query across all HK address components | `"central government"` |
| `country` | string | No | Country context (optional, defaults to "Hong Kong") | `"Hong Kong"` |

### Example Requests

**Basic Search**:
```http
GET /api/utils/address-lookup-hk/?search_text=central%20government HTTP/1.1
Host: api.example.com
```

**Search with Country Context**:
```http
GET /api/utils/address-lookup-hk/?search_text=mei%20foo&country=Hong%20Kong HTTP/1.1
Host: api.example.com
```

---

## Response

### Success Response (200 OK)

**Structure**:
```json
{
  "addresses": [
    {
      "building": "string",
      "street": "string",
      "district": "string",
      "region": "string",
      "formatted_address": "string",
      "is_3d": boolean
    }
  ],
  "total": integer,
  "search_text": "string"
}
```

**Example**:
```json
{
  "addresses": [
    {
      "building": "Central Government Offices",
      "street": "2 Tim Mei Avenue",
      "district": "Central & Western",
      "region": "HK",
      "formatted_address": "Central Government Offices, 2 Tim Mei Avenue, Central & Western, Hong Kong",
      "is_3d": false
    },
    {
      "building": "Flat 5A, Floor 12, Block 3, Mei Foo Sun Chuen",
      "street": "",
      "district": "Sham Shui Po",
      "region": "Kowloon",
      "formatted_address": "Flat 5A, Floor 12, Block 3, Mei Foo Sun Chuen, Sham Shui Po, Kowloon",
      "is_3d": true
    }
  ],
  "total": 2,
  "search_text": "central"
}
```

**Field Descriptions**:
- `building`: Building name/number (includes flat/floor for 3D addresses)
- `street`: Street name with building number (may be empty for residential estates)
- `district`: Hong Kong district (1 of 18 districts)
- `region`: Main region ("HK", "Kowloon", or "New Territories")
- `formatted_address`: Combined display string for UI presentation
- `is_3d`: Boolean flag indicating 3D residential address (flat/floor/block)
- `total`: Number of addresses returned
- `search_text`: Echo of the search query

---

### Error Responses

#### 400 Bad Request (Missing Search Text)

```json
{
  "error": "Missing search_text parameter",
  "allow_manual": true
}
```

#### 500 Internal Server Error (HK ALS API Unavailable)

```json
{
  "error": "Address lookup service temporarily unavailable",
  "allow_manual": true,
  "details": "Connection timeout to HK ALS API"
}
```

#### 404 Not Found (No Results)

```json
{
  "addresses": [],
  "total": 0,
  "search_text": "nonexistent address",
  "message": "No addresses found matching your search"
}
```

**Error Response Fields**:
- `error`: Human-readable error message
- `allow_manual`: Boolean flag indicating user should use manual entry (true for service unavailability)
- `details`: (Optional) Additional error context for debugging

---

## Validation Rules

### Request Validation
- `search_text` must not be empty
- `search_text` minimum length: 2 characters
- `search_text` maximum length: 200 characters

### Response Validation
- All addresses must include `district` and `region`
- `building` OR `street` must be present (not both empty)
- `formatted_address` must not be empty
- `is_3d` defaults to `false` if not specified

---

## Backend Implementation Notes

### Django View Pattern

```python
@csrf_exempt
@require_GET
def address_lookup_proxy_hk(request):
    search_text = request.GET.get('search_text', '').strip()
    if not search_text:
        return JsonResponse({'error': 'Missing search_text parameter', 'allow_manual': True}, status=400)

    try:
        # Call HK ALS API
        response = call_hk_als_api(search_text)
        addresses = parse_hk_als_response(response)
        return JsonResponse({'addresses': addresses, 'total': len(addresses), 'search_text': search_text})
    except Exception as e:
        logger.error(f"HK ALS API error: {str(e)}")
        return JsonResponse({
            'error': 'Address lookup service temporarily unavailable',
            'allow_manual': True,
            'details': str(e)
        }, status=500)
```

### HK ALS API Integration

**Endpoint**: `https://www.als.gov.hk/lookup`
**Method**: GET
**Parameter**: `q=<search_text>` (URL-encoded)
**Timeout**: 10 seconds
**Response**: JSON (parse and transform to contract format)

---

## Frontend Integration

### React Hook Usage

```javascript
import { useState } from 'react';
import axios from 'axios';

const useHKAddressLookup = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allowManual, setAllowManual] = useState(false);

  const searchAddresses = async (searchText) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/utils/address-lookup-hk/', {
        params: { search_text: searchText }
      });
      setAddresses(response.data.addresses);
      setAllowManual(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Address lookup failed');
      setAllowManual(err.response?.data?.allow_manual || false);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  return { addresses, loading, error, allowManual, searchAddresses };
};
```

### UI Integration (UserFormWizard.js)

```javascript
// When country === "Hong Kong"
const { addresses, loading, error, allowManual, searchAddresses } = useHKAddressLookup();

const handleSearch = () => {
  if (searchText.length >= 2) {
    searchAddresses(searchText);
  }
};

const handleAddressSelect = (selectedAddress) => {
  setFormData({
    home_building: selectedAddress.building,
    home_address: selectedAddress.street,
    home_district: selectedAddress.district,
    home_county: selectedAddress.region,
    home_city: "Hong Kong",
    home_country: "Hong Kong",
    home_postal_code: "",
    home_state: ""
  });
  setValidationMode('strict'); // FR-016
};
```

---

## Testing Contract

### Contract Test Requirements

**File**: `backend/django_Admin3/utils/tests/test_address_lookup_hk.py`

```python
from django.test import TestCase
from django.urls import reverse

class AddressLookupHKContractTest(TestCase):
    def test_successful_search_returns_200_with_addresses(self):
        """Contract: GET /api/utils/address-lookup-hk/?search_text=central should return 200 with address list"""
        response = self.client.get(reverse('address_lookup_hk'), {'search_text': 'central'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('addresses', data)
        self.assertIn('total', data)
        self.assertIn('search_text', data)
        self.assertIsInstance(data['addresses'], list)

    def test_missing_search_text_returns_400(self):
        """Contract: Missing search_text parameter should return 400 with allow_manual=true"""
        response = self.client.get(reverse('address_lookup_hk'))
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('error', data)
        self.assertEqual(data['allow_manual'], True)

    def test_address_object_structure(self):
        """Contract: Each address object must have required fields"""
        response = self.client.get(reverse('address_lookup_hk'), {'search_text': 'government'})
        data = response.json()
        if data['addresses']:
            address = data['addresses'][0]
            self.assertIn('building', address)
            self.assertIn('street', address)
            self.assertIn('district', address)
            self.assertIn('region', address)
            self.assertIn('formatted_address', address)
            self.assertIn('is_3d', address)
```

**Frontend Contract Test**:

**File**: `frontend/react-Admin3/src/hooks/__tests__/useHKAddressLookup.test.js`

```javascript
import { renderHook, waitFor } from '@testing-library/react';
import { useHKAddressLookup } from '../useHKAddressLookup';
import axios from 'axios';

jest.mock('axios');

describe('useHKAddressLookup Contract', () => {
  it('should fetch addresses with correct API call', async () => {
    const mockData = {
      addresses: [{ building: 'Test Building', district: 'Central' }],
      total: 1,
      search_text: 'test'
    };
    axios.get.mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useHKAddressLookup());

    result.current.searchAddresses('test');

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/utils/address-lookup-hk/', {
        params: { search_text: 'test' }
      });
      expect(result.current.addresses).toEqual(mockData.addresses);
    });
  });
});
```

---

## OpenAPI Specification

```yaml
openapi: 3.0.0
info:
  title: Hong Kong Address Lookup API
  version: 1.0.0

paths:
  /api/utils/address-lookup-hk/:
    get:
      summary: Search Hong Kong addresses
      parameters:
        - name: search_text
          in: query
          required: true
          schema:
            type: string
            minLength: 2
            maxLength: 200
          description: Free-text search query
      responses:
        '200':
          description: Successful search
          content:
            application/json:
              schema:
                type: object
                properties:
                  addresses:
                    type: array
                    items:
                      type: object
                      properties:
                        building:
                          type: string
                        street:
                          type: string
                        district:
                          type: string
                        region:
                          type: string
                        formatted_address:
                          type: string
                        is_3d:
                          type: boolean
                  total:
                    type: integer
                  search_text:
                    type: string
        '400':
          description: Bad request (missing search_text)
        '500':
          description: Service unavailable
```

---

## Status

✅ **Contract Defined**: Ready for TDD implementation (write tests first, then implement endpoint)
