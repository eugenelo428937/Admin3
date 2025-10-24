# Feature Specification: Centralized URL Parameter Utility

**Feature Branch**: `1.10-centralized-url-utility`
**Created**: 2025-10-22
**Status**: Draft
**Input**: User description: "Story 1.10: Create Centralized URL Parameter Utility"

## Execution Flow (main)
```
1. Parse user description from Input
   → Extracted: Centralized URL utility for filter management
2. Extract key concepts from description
   → Actors: Developers
   → Actions: Convert filters to/from URLs, eliminate duplication
   → Data: Filter state, URL parameters
   → Constraints: Must work with existing Redux state, maintain URL compatibility
3. For each unclear aspect:
   → All aspects clear from story documentation
4. Fill User Scenarios & Testing section
   → User flow: Developer uses utility instead of manual URL manipulation
5. Generate Functional Requirements
   → Each requirement is testable
6. Identify Key Entities
   → FilterUrlManager utility, filter objects, URL parameters
7. Run Review Checklist
   → No implementation-specific details (focuses on behavior)
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As a developer maintaining the product filtering system, I need a single, centralized way to convert between filter objects and URL parameters so that I don't have to duplicate the same conversion logic across multiple components, making the codebase more maintainable and reducing the risk of inconsistencies.

### Acceptance Scenarios

1. **Given** a filter object with multiple selected subjects, **When** converting to URL parameters, **Then** the URL should contain indexed subject parameters (subject_code, subject_1, subject_2, etc.)

2. **Given** URL parameters with filter selections, **When** parsing to a filter object, **Then** all filter types should be correctly extracted and returned in the expected data structure

3. **Given** a filter object is converted to URL and back, **When** comparing the original and parsed filters, **Then** they should be identical (bidirectional conversion is lossless)

4. **Given** a URL contains legacy parameter names (e.g., 'subject' instead of 'subject_code'), **When** parsing to filters, **Then** the utility should recognize parameter aliases and extract values correctly

5. **Given** multiple components need to construct URLs with filters, **When** using the centralized utility, **Then** all components produce consistent URL formats

### Edge Cases
- What happens when filter values are null, undefined, or empty arrays?
  - System should omit these from URL parameters to maintain clean URLs
- How does system handle malformed URL parameters?
  - System should gracefully handle and return empty filter structure for invalid inputs
- What if URL contains whitespace in comma-separated values?
  - System should trim whitespace and filter out empty entries
- How are boolean filter values represented in URLs?
  - Only 'true' values should be included; false values omitted

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a centralized utility class for converting filter objects to URL parameters
- **FR-002**: System MUST provide a method to convert URL parameters back to filter objects
- **FR-003**: System MUST support all current filter types: subjects, categories, product_types, products, modes_of_delivery, searchQuery
- **FR-004**: System MUST handle multiple subject selection using indexed parameter format (subject_code, subject_1, subject_2...)
- **FR-005**: System MUST handle comma-separated parameter format for product types, categories, and other multi-select filters
- **FR-006**: System MUST recognize parameter aliases (e.g., 'subject' and 'q' as alternatives to 'subject_code' and 'search')
- **FR-007**: System MUST maintain bidirectional conversion integrity (filters → URL → filters produces identical result)
- **FR-008**: System MUST provide URL parameter name constants to eliminate hardcoded strings throughout codebase
- **FR-009**: System MUST provide helper method to build complete URL paths with query parameters
- **FR-010**: System MUST provide helper method to check if any filters are active
- **FR-011**: System MUST provide helper method to compare two filter objects for equality
- **FR-012**: System MUST omit empty, null, or undefined filter values from URL parameters
- **FR-013**: System MUST execute conversions in under 1ms to support real-time middleware operations
- **FR-014**: Existing URL synchronization middleware MUST use the centralized utility instead of inline logic
- **FR-015**: Existing component URL parsing MUST use the centralized utility instead of inline logic

### Key Entities

- **FilterUrlManager**: Centralized utility providing static methods for bidirectional conversion between filter state and URL parameters
  - Core operations: toUrlParams, fromUrlParams, buildUrl
  - Helper operations: hasActiveFilters, areFiltersEqual
  - Configuration: URL_PARAM_KEYS constants

- **Filter Object**: Redux state representation of active filters
  - Array fields: subjects, categories, product_types, products, modes_of_delivery
  - String fields: searchQuery

- **URL Parameters**: Browser URL query string representation of filters
  - Indexed format: subject_code=X&subject_1=Y (for subjects)
  - Comma-separated format: group=A,B,C (for product types)
  - Single value format: search=query (for strings)

---

## Review & Acceptance Checklist

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

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Success Criteria

1. **Code Reduction**: URL conversion logic reduced from ~150 lines (duplicated) to ~50 lines (centralized utility)
2. **Consistency**: All components use identical URL parameter format
3. **Maintainability**: Adding new filter type requires updating utility in one place only
4. **Performance**: URL conversions execute in < 1ms (fast enough for middleware)
5. **Test Coverage**: Utility achieves ≥95% code coverage with comprehensive tests
6. **Bidirectionality**: filters → URL → filters conversion is lossless for all filter types

---

## Dependencies and Assumptions

### Dependencies
- Story 1.1 (URL Sync Middleware) must be implemented
- Story 1.6 (ProductList URL parsing simplified) must be implemented

### Assumptions
- URL parameter format will remain stable (no breaking changes to bookmark compatibility)
- Performance requirement of < 1ms is sufficient for real-time operations
- Current filter types represent complete set (no new filter types being added during implementation)

---

## Out of Scope

- Changing URL parameter format (maintaining backward compatibility)
- Adding validation logic to URL conversions (validation handled separately)
- Implementing browser history management (handled by existing middleware)
- Adding analytics or tracking to URL operations
- Supporting query string formats other than standard URLSearchParams

---

## Risks and Mitigation

### Risk 1: Breaking Existing Bookmarks
**Impact**: High
**Probability**: Low
**Mitigation**: Comprehensive bidirectional conversion tests ensure URL format compatibility

### Risk 2: Performance Degradation
**Impact**: Medium
**Probability**: Very Low
**Mitigation**: Performance tests ensure < 1ms execution time; centralized utility is simpler than duplicated logic

### Risk 3: Incomplete Migration
**Impact**: Medium
**Probability**: Low
**Mitigation**: Code search verifies all hardcoded URL logic is replaced with utility calls
