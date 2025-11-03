# Research: Hong Kong Address Lookup Service Integration

**Date**: 2025-11-01
**Feature**: 003-currently-the-backend

## Research Questions

### 1. Which HK ALS API endpoint to use (standard lookup vs GeoAddress)?

**Decision**: Use standard Address Lookup Service endpoint (`/lookup`)

**Rationale**:
- The feature requires **free-text search** across address components (building, street, district, region)
- Standard `/lookup` endpoint supports text-based queries: `?q=<search_text>`
- GeoAddress (`/galookup`) is coordinate-based and requires geographic address codes (GA), not suitable for free-text user input
- Specification requires users to enter "partial address information" which aligns with text-based lookup

**Alternatives Considered**:
- GeoAddress lookup: Rejected because it requires pre-existing GA codes, not free-text input
- Autocomplete API: Not documented on the ALS data.gov.hk page; standard lookup sufficient

**API Endpoint**: `https://www.als.gov.hk/lookup`

**Request Format**:
- Method: GET or POST
- Parameter: `q=<search_text>` (URL-encoded for GET)
- Or POST JSON: `{"RequestAddress":{"AddressLine":["<search_text>"]}}`

**Response Format**: JSON (supported format mentioned in documentation)

---

### 2. Authentication and API Key Management

**Decision**: Research if HK ALS requires API keys (similar to UK GetAddress.io pattern)

**Findings**:
- DATA.GOV.HK documentation does not mention authentication requirements
- The UK implementation uses `settings.GETADDRESS_API_KEY` stored in Django settings
- **Assumption**: If HK ALS is a public government API, it may not require authentication
- **Fallback**: If API key is required, follow existing pattern:
  - Add `HK_ALS_API_KEY` to Django settings
  - Store in environment variables (`.env` file)
  - Pass as query parameter or header per API documentation

**Recommendation**: Test API endpoint without authentication first; add key management if 401/403 errors occur

---

### 3. Response Data Mapping to Existing Address Fields

**Decision**: Map HK ALS response to existing Django user profile address fields

**Existing Address Fields** (from CLAUDE.md context):
```python
# Home address fields
home_building
home_address
home_district
home_city
home_county
home_postal_code
home_state
home_country

# Work address fields (same structure)
work_building
work_address
work_district
work_city
work_county
work_postal_code
work_state
work_country
```

**HK ALS Response Mapping** (based on data.gov.hk description):
- `building_name` / `building_number` → `home_building` or `work_building`
- `street_name` → `home_address` or `work_address`
- `district` → `home_district` or `work_district`
- `region` → `home_county` or `work_county` (Hong Kong regions: HK Island, Kowloon, New Territories)
- `formatted_address` → Concatenated into `home_address` if single line preferred
- No postal code in HK addresses (leave blank or N/A)
- `home_country` / `work_country` → "Hong Kong" or "HK"

**Note**: UK addresses use similar structure, so existing fields are compatible. No schema changes required.

---

### 4. 2D vs 3D Address Handling

**Decision**: Support both 2D (commercial/government) and 3D (residential estates) addresses

**Findings**:
- **2D Format**: Building number, street name, building name (commercial buildings, government facilities)
- **3D Format**: Flat/Floor/Block numbers + building name (public housing estates)

**Implementation Strategy**:
- Backend: Return full address object from HK ALS API (includes all components)
- Frontend: Display formatted address in selection list (use `formatted_address` or concatenate components)
- Storage: Populate relevant fields based on available data:
  - If 3D address: `home_building` = "Flat X, Floor Y, Block Z, [Building Name]"
  - If 2D address: `home_building` = "[Building Number] [Building Name]"

**No special logic required** - treat as different data formats within same field structure

---

### 5. Error Handling and Service Availability

**Decision**: Graceful degradation when HK ALS API is unavailable

**Strategy** (from clarifications):
- Catch `requests.exceptions.RequestException` (timeout, connection errors, HTTP errors)
- Return error response with flag: `{"error": "Address lookup service unavailable", "allow_manual": true}`
- Frontend: Disable lookup button, show message, allow manual address entry
- Validation: Apply basic validation (essential fields only) when manual entry used

**Timeout Settings**:
- Follow UK pattern: `requests.get(url, timeout=10)` (10 second timeout)
- Reasonable for government API; prevents indefinite hangs

---

### 6. Frontend Free-Text Search Implementation

**Decision**: Use debounced input with on-demand lookup (not autocomplete)

**Rationale**:
- Specification clarifies: "free-text search across all address components"
- Avoid excessive API calls during typing (cost/rate limit concerns)
- User explicitly triggers search (button click or Enter key)

**Implementation Pattern**:
- Single text input field (similar to UK postcode field)
- Debounce with 300ms delay (if autocomplete added later)
- Primary trigger: "Search" button or Enter keypress
- Display results in dropdown/modal for selection

**React Component**: Update `UserFormWizard.js` → `SmartAddressInput` component (if exists) or create new `HKAddressLookup` component

---

### 7. English-Only Display

**Decision**: Request and display English language addresses only

**Implementation**:
- If API supports language parameter: Pass `lang=en` or equivalent
- If API returns both English and Chinese: Filter/select English fields in backend
- Frontend: Display English address components only
- User clarification confirmed: "English only" to simplify UI/storage

**Data Cleanup**: Strip or ignore Chinese characters if returned (use English fallback)

---

## Summary of Resolved Unknowns

| Unknown | Resolution | Source |
|---------|-----------|--------|
| Which ALS endpoint? | `/lookup` (text-based) | DATA.GOV.HK API docs |
| Authentication required? | TBD - test without key first | Assumption based on gov API |
| Response format? | JSON with address components | DATA.GOV.HK format spec |
| Field mapping? | Use existing address fields | Django model inspection |
| 2D vs 3D addresses? | Store in `building` field | Spec requirement FR-011 |
| Error handling? | Graceful degradation | Spec clarification #5 |
| Search UX? | Free-text with button trigger | Spec clarification #2 |
| Language display? | English only | Spec clarification #1 |

---

## Next Steps (Phase 1)

1. **Data Model**: Document address entity mapping (no schema changes needed)
2. **API Contract**: Define backend endpoint contract (`/api/utils/address-lookup-hk/`)
3. **Integration Tests**: Write tests for HK ALS API integration
4. **Error Scenarios**: Test service unavailability handling
5. **Frontend Contract**: Define props/state for HK address lookup component

**Status**: ✅ All NEEDS CLARIFICATION items resolved. Ready for Phase 1 design.
