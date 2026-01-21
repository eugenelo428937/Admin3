# Feature Specification: Remove Legacy VAT App

**Feature Branch**: `20260114-20260121-remove-legacy-vat`
**Created**: 2026-01-21
**Status**: Draft
**Input**: User description: "Remove legacy vat app - refactor VAT calculation dependencies to use Rules Engine database-driven functions"

## Clarifications

### Session 2026-01-21

- Q: What strategy for handling existing VATAudit historical data when dropping the table? → A: Drop table directly without archival - data is redundant with ActedRuleExecution and ActedOrder.calculations_applied

## Background & Context

Following the Phase 6 refactoring of the VAT calculation system, the `vat` app now contains legacy code that has been superseded by database-driven functions in the Rules Engine. An investigation revealed:

| Component | Current Status | Replacement |
|-----------|---------------|-------------|
| `map_country_to_region()` | Hardcoded in-memory lookup | `lookup_region()` queries `UtilsCountryRegion` table |
| `build_item_context()` | Unused in production | `VATOrchestrator._build_item_context()` |
| `build_vat_context()` | Used only for user address extraction | Direct profile lookup |
| `VATAudit` model | Duplicate audit trail | `ActedRuleExecution` + `ActedOrder.calculations_applied` |
| `ip_geolocation.py` | Utility functions | Relocate to `utils` app |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - VAT Calculation Continues Working (Priority: P1)

As a customer purchasing products, I need VAT to be calculated correctly on my cart and orders so that I pay the correct tax amount based on my country.

**Why this priority**: This is the core functionality that must remain unaffected. Any regression in VAT calculation would directly impact revenue and compliance.

**Independent Test**: Can be fully tested by adding items to cart and verifying VAT amounts match expected rates for UK, EU, SA, IE, and ROW regions.

**Acceptance Scenarios**:

1. **Given** a UK customer with items in cart, **When** VAT is calculated, **Then** 20% VAT is applied to applicable products
2. **Given** a South African customer with items in cart, **When** VAT is calculated, **Then** 15% VAT is applied to applicable products
3. **Given** a ROW (Rest of World) customer, **When** VAT is calculated, **Then** 0% VAT is applied
4. **Given** an existing order with VAT applied, **When** the vat app is removed, **Then** historical VAT data in `calculations_applied` remains accessible

---

### User Story 2 - Developers Access Clean Codebase (Priority: P2)

As a developer maintaining the Admin3 system, I need legacy code removed so that I don't have to maintain duplicate implementations and can rely on a single source of truth for VAT logic.

**Why this priority**: Reduces technical debt and prevents confusion about which implementation to use.

**Independent Test**: Can be verified by confirming no imports from `vat` app exist and all VAT-related tests pass.

**Acceptance Scenarios**:

1. **Given** the vat app has been removed, **When** I search for `from vat.` imports, **Then** no production code references are found
2. **Given** the Rules Engine custom functions, **When** I need to look up a region, **Then** only `lookup_region()` from `custom_functions.py` is available
3. **Given** the VATOrchestrator, **When** it builds user context, **Then** it retrieves country directly without depending on vat app

---

### User Story 3 - System Administrators Monitor VAT (Priority: P3)

As a system administrator, I need to audit VAT calculations so that I can verify compliance and debug issues when they arise.

**Why this priority**: Audit capability is important but the existing `ActedRuleExecution` model already captures this data.

**Independent Test**: Can be verified by executing VAT calculation and confirming audit trail exists in `ActedRuleExecution` with cart/order context.

**Acceptance Scenarios**:

1. **Given** a VAT calculation is performed, **When** I query `ActedRuleExecution`, **Then** I can find the execution record with context and results
2. **Given** an order is created, **When** I view `ActedOrder.calculations_applied`, **Then** the full VAT result is stored
3. **Given** the VATAudit table is dropped, **When** I need historical audit data, **Then** I can access equivalent data via `ActedRuleExecution` records and `ActedOrder.calculations_applied`

---

### Edge Cases

- **VATAudit historical data**: Table is dropped directly without archival; existing records referencing carts/orders are discarded as redundant with `ActedRuleExecution` and `ActedOrder.calculations_applied`
- **Anonymous users**: IP geolocation module is relocated to `utils/services/`, maintaining functionality for anonymous user region detection
- **Management commands/admin views**: Any references to vat app models must be removed or updated to use replacement implementations

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST continue calculating VAT correctly for all regions (UK, IE, EU, SA, ROW) after vat app removal
- **FR-002**: System MUST use database-driven `lookup_region()` function exclusively for country-to-region mapping
- **FR-003**: System MUST use `UtilsCountrys.vat_percent` for VAT rate lookups via `lookup_vat_rate()`
- **FR-004**: VATOrchestrator MUST retrieve user country directly from UserProfile address without depending on `build_vat_context()`
- **FR-005**: System MUST relocate IP geolocation functionality to `utils/services/` for anonymous user region detection
- **FR-006**: System MUST preserve VAT audit capability through `ActedRuleExecution` records
- **FR-007**: System MUST store VAT calculation results in `ActedOrder.calculations_applied` for order-level audit
- **FR-008**: System MUST remove `vat` from `INSTALLED_APPS` after all dependencies are refactored
- **FR-009**: System MUST create a migration to drop the `vat_audit` table directly without archival (data is redundant with ActedRuleExecution)
- **FR-010**: All existing tests that import from vat app MUST be updated or removed

### Key Entities

- **UtilsCountrys**: Stores country codes with `vat_percent` field for VAT rates
- **UtilsRegion**: Stores region codes (UK, IE, EU, SA, ROW)
- **UtilsCountryRegion**: Links countries to regions with effective date ranges
- **ActedRuleExecution**: Audit trail for all rule executions including VAT calculations
- **ActedOrder.calculations_applied**: JSONB field storing VAT results at order level

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing VAT-related tests pass after refactoring (100% test success rate)
- **SC-002**: Zero imports from `vat` module exist in production code after completion
- **SC-003**: VAT calculation performance remains under 100ms per cart (no degradation from baseline)
- **SC-004**: All existing cart and order VAT functionality works identically for end users
- **SC-005**: Codebase size reduced by removing legacy duplicate code
- **SC-006**: Developer onboarding time for VAT system reduced by having single source of truth

## Assumptions

1. The `UtilsCountrys`, `UtilsRegion`, and `UtilsCountryRegion` tables are fully populated with all required country-region mappings
2. All historical VAT calculations stored in `VATAudit` are non-critical for compliance since `ActedOrder.calculations_applied` captures order-level data
3. IP geolocation is only needed for anonymous users and can be safely moved to utils
4. The `cleanup_vat_audit` management command can be removed along with the VATAudit model
5. Test fixtures that depend on vat app models will be updated to use appropriate mocks or actual utils models

## Dependencies

- Rules Engine custom functions (`lookup_region`, `lookup_vat_rate`, `calculate_vat_amount`) must remain stable
- `utils` app must be available to receive relocated IP geolocation module
- Database migrations must handle `vat_audit` table removal safely

## Out of Scope

- Changing VAT calculation business logic or rates
- Modifying the Rules Engine architecture
- Adding new VAT regions or country mappings
- Changing the `calculations_applied` JSONB schema on ActedOrder
