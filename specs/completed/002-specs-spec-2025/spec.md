# Feature Specification: VAT Calculation - Phase 2 Custom Functions

**Feature Branch**: `002-specs-spec-2025`
**Created**: 2025-10-12
**Status**: Draft
**Input**: Phase 2 of Epic 3 VAT Calculation System architectural correction
**Parent Epic**: Epic 3 - Dynamic VAT Calculation System
**Parent Spec**: specs/spec-2025-10-06-121922.md
**Reference**: docs/sprint-change-proposal-vat-arch-2025-10-12.md

## Execution Flow (main)
```
1. Parse Phase 2 requirements from Sprint Change Proposal
   ✅ Successfully extracted: Custom function requirements
2. Extract key concepts
   ✅ Identified: lookup_region, lookup_vat_rate, calculate_vat_amount, database queries
3. Unclear aspects
   ✅ All requirements clearly defined in Sprint Change Proposal
4. Fill User Scenarios & Testing section
   ✅ Function behaviors defined from technical requirements
5. Generate Functional Requirements
   ✅ All requirements testable and unambiguous
6. Identify Key Entities
   ✅ Identified: Custom functions, FUNCTION_REGISTRY, UtilsCountryRegion, UtilsCountrys
7. Run Review Checklist
   ✅ No implementation details beyond necessary technical specifications
   ✅ All functional needs clearly stated
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT the custom functions must do and WHY
- ❌ Avoid HOW to implement (specific algorithms, optimization techniques)
- 👥 Written for both business stakeholders and technical reviewers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a **Rules Engine**, I need granular custom functions for VAT calculations, so that I can compose complex VAT rules from simple, testable, reusable building blocks without requiring hardcoded Python calculation logic in application code.

As a **finance administrator**, I need VAT rates to be looked up from the database dynamically, so that I can update rates through the admin interface without code changes.

### Acceptance Scenarios

**Scenario 1: Lookup VAT Region for UK Customer**
- **Given** a customer with country code 'GB' and current effective date
- **When** `lookup_region('GB')` is called by a Rules Engine rule
- **Then** the function returns 'UK' by querying UtilsCountryRegion
- **And** the query respects effective_from and effective_to date ranges

**Scenario 2: Get VAT Rate for South Africa**
- **Given** a customer in South Africa with country code 'ZA'
- **When** `lookup_vat_rate('ZA')` is called by a Rules Engine rule
- **Then** the function returns Decimal('0.15') (15% as decimal) from UtilsCountrys.vat_percent
- **And** the rate is current from the database, not hardcoded

**Scenario 3: Calculate VAT Amount for £100 Net at 20%**
- **Given** a net amount of Decimal('100.00') and VAT rate Decimal('0.20')
- **When** `calculate_vat_amount(100.00, 0.20)` is called by a Rules Engine rule
- **Then** the function returns Decimal('20.00') with ROUND_HALF_UP rounding
- **And** the result has exactly 2 decimal places

**Scenario 4: Handle Unknown Country Code**
- **Given** a customer with invalid or unmapped country code 'XX'
- **When** `lookup_region('XX')` is called
- **Then** the function returns 'ROW' (Rest of World) as default
- **And** no exception is raised

**Scenario 5: Handle Country with No VAT Rate**
- **Given** a country exists in database but has no VAT rate configured
- **When** `lookup_vat_rate('XX')` is called
- **Then** the function returns Decimal('0.00') as safe default
- **And** no exception is raised

### Edge Cases
- What happens when effective_date is in the past and region mapping has changed?
  - Function queries UtilsCountryRegion with date filter, returns historical region
- How does the system handle fractional VAT rates (e.g., 5.5%)?
  - Function converts percentage to decimal (Decimal('0.055')) with proper precision
- What if net_amount is zero?
  - calculate_vat_amount returns Decimal('0.00') correctly
- How are negative amounts handled?
  - Caller validation responsibility - functions process negative amounts mathematically
- What if UtilsCountrys.vat_percent is NULL?
  - Function treats NULL as 0, returns Decimal('0.00')

---

## Requirements *(mandatory)*

### Functional Requirements

**Custom Function: lookup_region**
- **FR-001**: System MUST provide `lookup_region(country_code)` custom function for Rules Engine
- **FR-002**: Function MUST query UtilsCountryRegion model to map country code to region
- **FR-003**: Function MUST filter by effective_from and effective_to date ranges
- **FR-004**: Function MUST default effective_date to current date if not provided
- **FR-005**: Function MUST return region code string: 'UK', 'IE', 'EU', 'SA', or 'ROW'
- **FR-006**: Function MUST return 'ROW' as default when country not found
- **FR-007**: Function MUST return 'ROW' as default when no active region mapping exists
- **FR-008**: Function MUST handle country_code in uppercase (normalize input)
- **FR-009**: Function MUST not raise exceptions for missing or invalid country codes

**Custom Function: lookup_vat_rate**
- **FR-010**: System MUST provide `lookup_vat_rate(country_code)` custom function for Rules Engine
- **FR-011**: Function MUST query UtilsCountrys.vat_percent field for VAT rate
- **FR-012**: Function MUST convert percentage to decimal rate (e.g., 20.00 → 0.20)
- **FR-013**: Function MUST return Decimal type with proper precision
- **FR-014**: Function MUST return Decimal('0.00') when country not found
- **FR-015**: Function MUST return Decimal('0.00') when vat_percent is NULL
- **FR-016**: Function MUST handle country_code in uppercase (normalize input)
- **FR-017**: Function MUST not raise exceptions for missing or invalid country codes

**Custom Function: calculate_vat_amount**
- **FR-018**: System MUST provide `calculate_vat_amount(net_amount, vat_rate)` custom function for Rules Engine
- **FR-019**: Function MUST accept net_amount as Decimal type
- **FR-020**: Function MUST accept vat_rate as Decimal type (e.g., 0.20 for 20%)
- **FR-021**: Function MUST multiply net_amount by vat_rate for VAT calculation
- **FR-022**: Function MUST round result to 2 decimal places using ROUND_HALF_UP
- **FR-023**: Function MUST return Decimal type result
- **FR-024**: Function MUST handle zero net_amount correctly (return 0.00)
- **FR-025**: Function MUST handle zero vat_rate correctly (return 0.00)
- **FR-026**: Function MUST preserve Decimal precision (no float conversion)

**Function Registry Integration**
- **FR-027**: System MUST register all three functions in FUNCTION_REGISTRY
- **FR-028**: Registered functions MUST be callable by Rules Engine without imports
- **FR-029**: Function names in registry MUST match function names in rules (string identifiers)
- **FR-030**: System MUST allow Rules Engine to discover registered functions dynamically

**Database Query Requirements**
- **FR-031**: Functions MUST use Django ORM queries (not raw SQL)
- **FR-032**: Functions MUST use select_related for efficient foreign key queries
- **FR-033**: Functions MUST filter UtilsCountrys by active=True status
- **FR-034**: Functions MUST respect UtilsCountryRegion date range filters (effective_from/to)
- **FR-035**: Queries MUST be database-agnostic (work with PostgreSQL, SQLite, etc.)

**Error Handling**
- **FR-036**: Functions MUST handle UtilsCountrys.DoesNotExist gracefully (return defaults)
- **FR-037**: Functions MUST handle NULL database values gracefully (return defaults)
- **FR-038**: Functions MUST not raise unhandled exceptions that crash Rules Engine
- **FR-039**: Functions MUST log warnings for unexpected database states
- **FR-040**: Functions MUST return safe default values for all error conditions

**Testing Requirements**
- **FR-041**: Each custom function MUST have dedicated unit tests
- **FR-042**: Tests MUST verify correct database queries are executed
- **FR-043**: Tests MUST verify default return values for error conditions
- **FR-044**: Tests MUST verify Decimal precision and rounding behavior
- **FR-045**: Tests MUST verify effective_date filtering logic
- **FR-046**: Tests MUST use test fixtures for UtilsCountrys and UtilsCountryRegion
- **FR-047**: Tests MUST achieve 100% code coverage for custom functions

**Performance Requirements**
- **FR-048**: Each function call MUST complete in under 5ms (database query + calculation)
- **FR-049**: Functions MUST not trigger N+1 query problems when called in loops
- **FR-050**: Database queries MUST use proper indexes on country code and dates

### Key Entities *(include if feature involves data)*

- **Custom Function (lookup_region)**: Queries UtilsCountryRegion to map country ISO codes to VAT regions. Takes country_code (string) and optional effective_date (date). Returns region code string or 'ROW' default. Registered in FUNCTION_REGISTRY for Rules Engine access.

- **Custom Function (lookup_vat_rate)**: Queries UtilsCountrys.vat_percent to get current VAT rate for a country. Takes country_code (string). Returns Decimal VAT rate (e.g., 0.20 for 20%) or Decimal('0.00') default. Registered in FUNCTION_REGISTRY.

- **Custom Function (calculate_vat_amount)**: Pure calculation function for VAT amount from net amount and rate. Takes net_amount (Decimal) and vat_rate (Decimal). Returns VAT amount (Decimal) with ROUND_HALF_UP to 2 decimal places. Registered in FUNCTION_REGISTRY.

- **FUNCTION_REGISTRY**: Dictionary mapping function names (strings) to callable function objects. Updated with new VAT functions. Used by Rules Engine to dynamically invoke custom functions by name from rule definitions.

- **UtilsCountryRegion** (existing): Database model linking countries to VAT regions with date ranges. Used by lookup_region for database queries. Contains country FK, region FK, effective_from, effective_to fields.

- **UtilsCountrys** (existing): Database model storing VAT rates per country. Used by lookup_vat_rate for database queries. Contains country code, name, vat_percent (Decimal), active (Boolean) fields.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details beyond necessary function signatures
- [x] Focused on functional behavior and business value
- [x] Written for both technical and non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (< 5ms per function, 100% coverage)
- [x] Scope is clearly bounded (Phase 2: Custom Functions only)
- [x] Dependencies identified (UtilsCountrys, UtilsCountryRegion models from Phase 1)

---

## Execution Status

- [x] User description parsed (from Sprint Change Proposal Phase 2)
- [x] Key concepts extracted (3 custom functions, database queries, error handling)
- [x] Ambiguities marked (none - all requirements clear from proposal)
- [x] User scenarios defined (5 primary scenarios + 5 edge cases)
- [x] Requirements generated (50 functional requirements)
- [x] Entities identified (3 custom functions + 2 database models)
- [x] Review checklist passed (all criteria met)

---

## Success Criteria

**Technical Success:**
- 100% test coverage: All three custom functions have comprehensive unit tests
- Performance: Each function completes in < 5ms (target: 1-2ms for calculations, 3-5ms for DB queries)
- Reliability: Functions return safe defaults for all error conditions (no crashes)
- Precision: All Decimal calculations maintain 2 decimal place precision with ROUND_HALF_UP
- Integration: Functions successfully registered and callable by Rules Engine

**Business Success:**
- Dynamic VAT rates: VAT rates loaded from database, not hardcoded
- Date accuracy: Historical region mappings work correctly with effective dates
- Error resilience: Missing or invalid country codes don't break VAT calculations
- Testability: All functions independently testable without Rules Engine

**Operational Success:**
- Clear function boundaries: Each function does one thing well
- Reusable: Functions composable into complex VAT rules
- Maintainable: Database schema changes don't require function rewrites
- Documented: Function signatures and behaviors clearly documented

---

## Out of Scope

**Explicitly NOT included in Phase 2:**
- VAT rule definitions (covered in Phase 3: Composite Rules)
- Entry point integration (covered in Phase 4: Entry Point Integration)
- Cart view updates (covered in Phase 4)
- Frontend changes (not needed for custom functions)
- Admin interface changes (covered in later phases)
- Product classification logic (deferred to Phase 3 rules)
- VAT calculation workflow orchestration (Rules Engine responsibility)

---

## Dependencies & Assumptions

**Dependencies:**
- Phase 1: Database Foundation MUST be complete (UtilsRegion, UtilsCountrys, UtilsCountryRegion models exist)
- Django ORM and PostgreSQL MUST be available
- Rules Engine FUNCTION_REGISTRY infrastructure MUST exist
- Python Decimal library MUST be available

**Assumptions:**
- UtilsCountrys.vat_percent stores rates as percentages (e.g., 20.00 for 20%)
- UtilsCountryRegion.effective_to=NULL indicates current/active mapping
- Country codes are stored in uppercase in database
- Rules Engine can invoke registered functions by string name
- Database indexes exist on UtilsCountrys.code and UtilsCountryRegion date fields

---

## Constraints

**Business Constraints:**
- Functions MUST not hardcode any VAT rates (all from database)
- Functions MUST support historical date queries for audit purposes
- Functions MUST be deterministic (same inputs → same outputs)
- Functions MUST be safe for concurrent execution

**Technical Constraints:**
- Functions MUST use Decimal type (not float) for all monetary calculations
- Functions MUST not perform database writes (read-only queries)
- Functions MUST be synchronous (no async/await)
- Functions MUST be compatible with Django ORM query optimization
- Rounding MUST use ROUND_HALF_UP as per financial standards

**Performance Constraints:**
- Each function call MUST complete in under 5ms
- Database queries MUST use indexes (no table scans)
- Functions MUST be efficient enough for cart with 20+ items
- No N+1 query problems when called repeatedly in loops

---

## Next Steps

✅ **Specification Complete** - Ready for implementation planning

**Recommended Actions:**
1. Review this specification with development team for technical validation
2. Create test fixtures for UtilsCountrys and UtilsCountryRegion
3. Generate implementation plan with TDD workflow
4. Begin implementation: RED → GREEN → REFACTOR for each function
5. Verify all 50 functional requirements are met before proceeding to Phase 3

**Command to generate implementation plan:**
```
/plan specs/002-specs-spec-2025/spec.md
```

**Implementation Timeline:**
- Estimated: 1-2 days
- Test-first development for all three functions
- 100% code coverage requirement
- Performance validation before completion
