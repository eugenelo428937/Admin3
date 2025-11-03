# Feature Specification: Hong Kong Address Lookup Service Integration

**Feature Branch**: `003-currently-the-backend`
**Created**: 2025-11-01
**Status**: Draft
**Input**: User description: "Currently the @backend/django_Admin3/utils/views.py has address_lookup_proxy() to lookup address to UK. create a address_lookup_proxy_hk, to look up address for Hong Kong. Explore the lookup service in https://data.gov.hk/en-data/dataset/hk-dpo-als_01-als and https://www.als.gov.hk/docs/Data_Specification_for_ALS_GeoJSON_EN.pdf. The frontend will need to cater the Hong Kong address in the @UserFormWizard.js for both register new user and updating existing address."

## Execution Flow (main)
```
1. Parse user description from Input ✓
   → Feature clear: Add Hong Kong address lookup alongside existing UK lookup
2. Extract key concepts from description ✓
   → Actors: Users (new registrations, existing users updating addresses)
   → Actions: Lookup Hong Kong addresses, select from results, save addresses
   → Data: Hong Kong address components, lookup results from government API
   → Constraints: Must work for both registration and profile update flows
3. For each unclear aspect:
   → ✓ Language preference resolved: English only
   → ✓ Search input format resolved: Free-text search across all address components
   → ✓ Country selection scope resolved: Users can mix countries for home vs work addresses
   → ✓ Address validation resolved: Conditional validation (strict for lookup-selected, basic for manual)
   → ✓ Fallback behavior resolved: Disable lookup, allow manual entry
4. Fill User Scenarios & Testing section ✓
5. Generate Functional Requirements ✓
6. Identify Key Entities ✓
7. Run Review Checklist ✓
   → All clarifications resolved
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-11-01
- Q: Should the system display Hong Kong addresses in English only, Chinese only, or both languages? → A: English only
- Q: What specific fields should users provide to search for Hong Kong addresses? → A: Free-text search across all address components
- Q: Can users select different countries for home vs work addresses? → A: Yes - users can mix countries
- Q: What validation rules should apply to Hong Kong addresses when manually entered? → A: Conditional validation - strict for lookup-selected, basic for manual entry
- Q: What is the expected user experience if the Hong Kong Address Lookup Service is temporarily unavailable? → A: Allow manual address entry only - disable lookup but allow form completion

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
**As a** Hong Kong resident registering or updating their profile
**I want to** look up my Hong Kong address by entering partial address information
**So that** I can select my accurate address from a list of matching addresses without manually typing all address components

### Acceptance Scenarios

1. **Given** a new user is registering and enters free-text address information (e.g., building name, street, or district) in the home address section, **When** they trigger the address lookup, **Then** the system searches across all Hong Kong address components and displays a list of matching addresses to choose from

2. **Given** an existing user is updating their work address and selects "Hong Kong" as the country, **When** they enter partial address information in the free-text search field, **Then** the system provides Hong Kong-specific address suggestions using the government address lookup service

3. **Given** a user has selected a Hong Kong address from the lookup results, **When** they review the form, **Then** all relevant Hong Kong address fields (building, district, region) are automatically populated with the selected address data

4. **Given** a user is entering a UK address, **When** they trigger address lookup, **Then** the system continues to use the existing UK address lookup service (no change to UK functionality)

5. **Given** a user enters address information for Hong Kong, **When** no matches are found in the lookup service, **Then** the system allows the user to manually enter their address components

6. **Given** a user has selected UK as their home address country and Hong Kong as their work address country, **When** they perform address lookups, **Then** the system uses the UK address lookup service for home address and Hong Kong address lookup service for work address independently

7. **Given** a user selects a Hong Kong address from the lookup results, **When** they submit the form, **Then** the system applies strict validation to ensure all address components are valid and complete

8. **Given** a user manually enters a Hong Kong address without using the lookup service, **When** they submit the form, **Then** the system applies basic validation requiring only essential fields (building, district, region) to be filled in

9. **Given** the Hong Kong Address Lookup Service is temporarily unavailable, **When** a user attempts to register or update their Hong Kong address, **Then** the system disables the lookup functionality and allows the user to complete the form using manual address entry only

### Edge Cases
- How does the system handle addresses with missing building numbers (e.g., government facilities without street numbers)?
- How does the system differentiate between residential estates with 3-dimensional addresses (flat/floor/building) and commercial buildings with 2-dimensional addresses?
- What happens when a user has already manually entered a Hong Kong address and then triggers the lookup service?

## Requirements *(mandatory)*

### Functional Requirements

**Address Lookup Functionality**
- **FR-001**: System MUST provide Hong Kong address lookup functionality when users select Hong Kong as their country for home or work addresses
- **FR-002**: System MUST maintain existing UK address lookup functionality without disruption
- **FR-003**: System MUST allow users to select different countries for home and work addresses (e.g., UK home address with Hong Kong work address)
- **FR-004**: System MUST retrieve address data from the Hong Kong government Address Lookup Service (ALS) standard `/lookup` endpoint using free-text search queries
- **FR-005**: System MUST accept free-text search input that searches across all Hong Kong address components (building name/number, street name, district, region)
- **FR-006**: System MUST display address search results in a user-friendly selection interface
- **FR-007**: System MUST support address lookup for both new user registration and existing user profile updates

**Address Data Handling**
- **FR-008**: System MUST automatically populate all relevant address fields when user selects an address from Hong Kong lookup results
- **FR-009**: System MUST handle Hong Kong address components including: building name, street name, district, region, and any location identifiers
- **FR-010**: System MUST display Hong Kong addresses in English only
- **FR-011**: System MUST differentiate between 3-dimensional addresses (residential estates with flat/floor numbers) and 2-dimensional addresses (commercial buildings with street numbers)
- **FR-012**: System MUST allow manual address entry if lookup results do not match user's address

**User Experience**
- **FR-013**: System MUST indicate to users which country's address lookup service will be used based on their country selection
- **FR-014**: System MUST provide clear feedback when address lookup is in progress
- **FR-015**: System MUST disable the Hong Kong address lookup functionality when the service is unavailable and allow users to complete registration or profile update using manual address entry only

**Validation**
- **FR-016**: System MUST apply strict validation to Hong Kong addresses selected from the lookup service, ensuring all address components are valid and complete
- **FR-017**: System MUST apply basic validation to manually entered Hong Kong addresses, requiring only essential fields (building, district, region) to be filled in

**Data Persistence**
- **FR-018**: System MUST store Hong Kong address data in the same user profile structure as UK addresses
- **FR-019**: System MUST preserve address data integrity for both home and work addresses when users update their profile
- **FR-020**: System MUST retain user's manually entered address data if they choose not to use the lookup service

### Key Entities

- **User Profile**: Contains personal information and multiple address records (home address, work address). Each address has a country field that determines which address lookup service to use.

- **Hong Kong Address**: Represents a validated address from the Hong Kong government Address Lookup Service, containing components such as:
  - Building name/number (in English)
  - Street name (in English)
  - District (in English)
  - Region (in English)
  - Location identifiers
  - Dimensional format (2D vs 3D for residential estates)

- **Address Lookup Results**: A collection of matching Hong Kong addresses returned from the government service based on user's search criteria. Users select one result to populate their address fields.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked and resolved (5 clarifications completed)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

**Status**: ✅ Ready for planning phase
