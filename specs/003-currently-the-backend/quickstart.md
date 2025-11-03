# Quickstart: Hong Kong Address Lookup Feature

**Feature**: 003-currently-the-backend
**Purpose**: End-to-end validation of HK address lookup functionality

---

## Prerequisites

1. **Backend Running**: Django development server on port 8888
   ```bash
   cd backend/django_Admin3
   python manage.py runserver 8888
   ```

2. **Frontend Running**: React development server on port 3000
   ```bash
   cd frontend/react-Admin3
   npm start
   ```

3. **Database**: Migrations applied (no new migrations needed for this feature)

4. **Test User**: Create test user or use existing account

---

## Test Scenario 1: New User Registration with HK Address

**User Story**: AS-1 (New user registers with HK home address)

### Steps

1. **Navigate to Registration**
   - Open `http://localhost:3000/register`
   - Fill in personal details (name, email, password)

2. **Select Hong Kong for Home Address**
   - Click "Next" to reach Home Address step
   - In "Country" dropdown, select "Hong Kong"
   - Verify UK address lookup is disabled
   - Verify HK address search field appears

3. **Search for HK Address**
   - Enter free-text search: `"central government"`
   - Click "Search" button (or press Enter)
   - Verify loading indicator appears
   - Wait for results (should return within 2 seconds)

4. **Select Address from Results**
   - Verify dropdown/list shows matching addresses
   - Each result displays `formatted_address`
   - Select: "Central Government Offices, 2 Tim Mei Avenue, Central & Western"
   - Verify form fields auto-populate:
     - Building: "Central Government Offices"
     - Address: "2 Tim Mei Avenue"
     - District: "Central & Western"
     - County/Region: "HK"
     - City: "Hong Kong" (auto-set)
     - Country: "Hong Kong" (locked)
     - Postal Code: "" (empty, HK has no postcodes)

5. **Continue Registration**
   - Click "Next" to Work Address step
   - Skip work address (or repeat with different HK address)
   - Complete registration
   - Submit form

6. **Validation Check**
   - Backend applies **strict validation** (FR-016)
   - All required fields must be present
   - Verify user profile created successfully
   - Check database: User has HK home address saved

**Expected Result**: ✅ User registered with HK address, strict validation passed

---

## Test Scenario 2: Existing User Updates Work Address (Mixed Country)

**User Story**: AS-6 (User with UK home address adds HK work address)

### Steps

1. **Login and Navigate to Profile**
   - Login with existing user (has UK home address)
   - Go to "Profile" or "Edit Address" page

2. **Edit Work Address**
   - Click "Edit Work Address"
   - In "Country" dropdown, select "Hong Kong"
   - Verify home address remains UK (no change)
   - Verify work address switches to HK lookup mode

3. **Search for HK Work Address**
   - Enter search: `"mei foo"`
   - Click "Search"
   - Select: "Flat 5A, Floor 12, Block 3, Mei Foo Sun Chuen, Sham Shui Po, Kowloon"

4. **Verify Mixed Country Addresses**
   - Home Address: UK (postcode, county, etc.)
   - Work Address: HK (district, region, no postcode)
   - Both addresses displayed correctly
   - Save profile

5. **Validation Check**
   - Backend saves both addresses independently
   - Verify database: User has UK home + HK work
   - No cross-contamination between address types

**Expected Result**: ✅ User profile supports mixed country addresses (FR-003)

---

## Test Scenario 3: Manual Entry Fallback (Service Unavailable)

**User Story**: AS-9 (HK ALS API unavailable, user completes registration manually)

### Steps

1. **Simulate Service Unavailability**
   - **Option A**: Disconnect backend from internet
   - **Option B**: Mock API endpoint to return 500 error
   - **Option C**: Set HK ALS API URL to invalid endpoint (for testing only)

2. **Attempt Address Lookup**
   - Navigate to registration or profile edit
   - Select "Hong Kong" as country
   - Enter search text: `"test address"`
   - Click "Search"

3. **Verify Graceful Degradation**
   - Loading indicator appears (waits up to 10 seconds timeout)
   - Error message displays: "Address lookup service temporarily unavailable"
   - Search button becomes disabled
   - Manual entry fields remain enabled

4. **Enter Address Manually**
   - Fill in fields manually:
     - Building: "Test Building"
     - District: "Wan Chai"
     - County/Region: "HK"
   - Other fields (Address, City) auto-filled or entered manually

5. **Submit Form**
   - Click "Submit" or "Save"
   - Backend applies **basic validation** (FR-017)
   - Only building, district, country required
   - Verify form accepted

6. **Validation Check**
   - User profile saved with manually entered HK address
   - No strict validation applied (only essential fields checked)
   - Registration/update completes successfully

**Expected Result**: ✅ Manual entry works when service unavailable (FR-015)

---

## Test Scenario 4: 3D vs 2D Address Handling

**User Story**: Verify system handles residential estates (3D) vs commercial buildings (2D)

### Steps

1. **Search for Residential Estate (3D)**
   - Enter search: `"mei foo sun chuen"`
   - Select result with `is_3d: true`
   - Verify building field shows: "Flat [X], Floor [Y], Block [Z], [Estate Name]"
   - Verify address/street field may be empty

2. **Search for Commercial Building (2D)**
   - Enter search: `"central government offices"`
   - Select result with `is_3d: false`
   - Verify building field shows: "[Building Name]"
   - Verify address field shows: "[Number] [Street Name]"

3. **Save Both Address Types**
   - Verify both formats save correctly
   - No data loss for 3D flat/floor information
   - Formatted address displays correctly in UI

**Expected Result**: ✅ System differentiates and handles both address types (FR-011)

---

## Test Scenario 5: Validation Modes

**User Story**: Verify strict vs basic validation based on entry method

### Setup

Create two test scenarios:
- **Test A**: User selects address from lookup (strict validation)
- **Test B**: User enters address manually (basic validation)

### Test A: Strict Validation

1. Search and select HK address from lookup
2. Try to submit with missing fields (e.g., remove district)
3. **Expected**: Form validation error - "All fields required for selected addresses"
4. Re-populate field and submit
5. **Expected**: Success

### Test B: Basic Validation

1. Enter HK address manually (type, don't use lookup)
2. Fill only: building="Test", district="Central", country="HK"
3. Leave address, county, city blank
4. Submit form
5. **Expected**: Success (basic validation only requires building, district, country)

**Expected Result**: ✅ Conditional validation works correctly (FR-016, FR-017)

---

## Integration Test Checklist

Run through all scenarios above and verify:

- [ ] **Scenario 1**: New user registration with HK address
- [ ] **Scenario 2**: Mixed country addresses (UK home + HK work)
- [ ] **Scenario 3**: Manual entry fallback when service unavailable
- [ ] **Scenario 4**: 3D and 2D address handling
- [ ] **Scenario 5**: Strict vs basic validation

### Additional Checks

- [ ] UK address lookup still works (FR-002: No disruption)
- [ ] Search returns results in < 2 seconds (performance goal)
- [ ] English-only addresses displayed (FR-010)
- [ ] Free-text search works for building, street, district (FR-005)
- [ ] Address fields auto-populate on selection (FR-008)
- [ ] Form allows manual entry if no matches (FR-012)

---

## Acceptance Criteria Validation

Map test scenarios to spec requirements:

| Requirement | Test Scenario | Status |
|-------------|---------------|--------|
| FR-001: HK lookup available | Scenario 1 | ✅ |
| FR-002: UK lookup maintained | Additional check | ✅ |
| FR-003: Mixed countries | Scenario 2 | ✅ |
| FR-005: Free-text search | Scenario 1, 4 | ✅ |
| FR-008: Auto-populate fields | Scenario 1, 2 | ✅ |
| FR-010: English only | All scenarios | ✅ |
| FR-011: 2D vs 3D | Scenario 4 | ✅ |
| FR-012: Manual entry allowed | Scenario 3 | ✅ |
| FR-015: Service unavailable handling | Scenario 3 | ✅ |
| FR-016: Strict validation | Scenario 5A | ✅ |
| FR-017: Basic validation | Scenario 5B | ✅ |
| FR-018: Store in user profile | All scenarios | ✅ |

---

## Performance Validation

**Metrics to Measure**:

1. **API Response Time**
   - Open browser DevTools → Network tab
   - Trigger HK address search
   - Check request to `/api/utils/address-lookup-hk/`
   - **Target**: < 2 seconds total (backend + HK ALS API)

2. **Frontend Debounce** (if autocomplete added)
   - Type rapidly in search field
   - Verify API calls debounced to 300ms intervals
   - **Target**: No more than 1 API call per 300ms typing burst

3. **Timeout Handling**
   - Simulate slow network (Chrome DevTools → Network → Throttling)
   - Verify 10-second timeout applied
   - **Target**: Error message after 10 seconds, not indefinite wait

---

## Known Issues / Edge Cases

**Edge Case 1**: No Results Found
- Search for: `"zzz nonexistent"`
- **Expected**: Empty results list, message "No addresses found"
- **Actual**: [Test and verify]

**Edge Case 2**: Special Characters in Search
- Search for: `"St. John's Building"`
- **Expected**: Handles apostrophes and periods correctly
- **Actual**: [Test and verify]

**Edge Case 3**: Very Long Search Text
- Search for: `"[200 character string]"`
- **Expected**: Truncated or validated (max 200 chars)
- **Actual**: [Test and verify]

---

## Rollback Plan

If feature fails in production:

1. **Immediate**: Disable HK address lookup in frontend (feature flag or country dropdown)
2. **Fallback**: Users must enter HK addresses manually
3. **Hotfix**: Revert backend changes to `/api/utils/address-lookup-hk/` endpoint
4. **Verify**: UK address lookup still functional

---

## Status

- [ ] All test scenarios executed
- [ ] All acceptance criteria validated
- [ ] Performance targets met
- [ ] Edge cases documented
- [ ] Ready for production deployment

**Next Steps**: Run quickstart tests, update status, deploy to staging for QA validation.
