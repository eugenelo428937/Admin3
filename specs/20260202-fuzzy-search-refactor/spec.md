# Feature Specification: Fuzzy Search Accuracy & Search Service Refactoring

**Feature Branch**: `20260202-fuzzy-search-refactor`
**Created**: 2026-02-02
**Status**: Draft
**Input**: User description: "Improve fuzzy search ranking accuracy (e.g., 'CS2 addition mock' should rank mock-related products above course notes) and refactor the search service to eliminate filter logic duplication by delegating to ProductFilterService."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accurate Search Result Ranking (Priority: P1)

A student searches for a specific type of product (e.g., "CS2 addition mock") and expects mock exam products to appear at the top of results, above unrelated products like course notes. Currently, search results for multi-word queries that include a subject code return products in an arbitrary order because the subject code match overshadows the actual content relevance of each product.

**Why this priority**: This is the core user-facing problem. Students cannot find the products they need efficiently, which directly impacts purchasing decisions and user satisfaction with the online store.

**Independent Test**: Can be fully tested by performing searches with known queries (e.g., "CS2 addition mock", "CM2 study text") and verifying that products whose names closely match the search terms rank higher than products that only match on subject code.

**Acceptance Scenarios**:

1. **Given** a catalog containing "CS2 Additional Mock Exam Marking" and "CS2 Course Notes", **When** a user searches for "CS2 addition mock", **Then** the mock exam product appears above the course notes product in the results list.
2. **Given** a catalog containing "CM2 Study Text (eBook)" and "CM2 Course Notes (Printed)", **When** a user searches for "CM2 study text", **Then** the study text product appears as the top result.
3. **Given** a search query containing a subject code prefix (e.g., "CS2 mock"), **When** two products share the same subject code but differ in content relevance, **Then** the product whose name more closely matches the non-subject-code portion of the query ranks higher.
4. **Given** a search query "CS2 mock", **When** the catalog contains both CS2 and CM2 mock products, **Then** CS2 mock products rank above CM2 mock products.
5. **Given** a completely irrelevant product (e.g., "SA1 Professional Standards Handbook"), **When** a user searches for "CS2 mock exam", **Then** the irrelevant product does not appear in the search results (falls below the relevance threshold).

---

### User Story 2 - Consistent Filter Behavior Between Search and Browse (Priority: P2)

When a student uses the search feature with active filters (subjects, categories, product types, modes of delivery), the filter results and available filter counts are consistent with what they would see when browsing the product catalog directly. Currently, the search service applies filters using its own separate logic, which can produce different results than the product browsing filter system.

**Why this priority**: Filter inconsistency erodes user trust. If a student filters by "Printed" materials in the search results and gets different products than when browsing "Printed" materials directly, it creates confusion and may cause them to miss products they need.

**Independent Test**: Can be tested by applying identical filters through both the search and browse interfaces and comparing the resulting product lists and filter counts.

**Acceptance Scenarios**:

1. **Given** a user has searched for products and applied a subject filter, **When** the same subject filter is applied through the product browsing interface, **Then** the filtered product sets are identical (assuming the same base catalog).
2. **Given** active filters on categories and product types, **When** the system displays available filter counts in the search results, **Then** the counts match what the product browsing filter panel would show for the same base set of products.
3. **Given** a user applies a mode-of-delivery filter (e.g., "Printed") in search results, **When** the search results are filtered, **Then** only products with the "Printed" delivery mode appear, consistent with the browsing filter behavior.

---

### User Story 3 - Navigation Menu Filters Produce Consistent Results (Priority: P3)

When a student clicks a navigation menu link (e.g., "Show all Materials" or a specific product group), the resulting filtered view is consistent with what the filter panel would produce for the same selection. Currently, navigation menu filters follow a separate code path that resolves filter criteria differently.

**Why this priority**: While less frequently encountered than search ranking issues, inconsistencies between navigation and filter panel behavior undermine the predictability of the store interface.

**Independent Test**: Can be tested by clicking navigation links and comparing the resulting product list with the same filters applied through the filter panel.

**Acceptance Scenarios**:

1. **Given** a navigation menu item for a product group (e.g., "Printed Materials"), **When** a student clicks it, **Then** the resulting product list matches what would be shown by selecting the same group in the filter panel.
2. **Given** a student navigates via the navbar to a product category, **When** they then refine using the filter panel, **Then** both sets of filters work together correctly without conflicts or duplicate filtering.

---

### Edge Cases

- What happens when a search query contains only a subject code with no additional terms (e.g., just "CS2")? The system should return all products for that subject, ranked by general relevance.
- What happens when a search query contains no recognizable subject code? The system should rank purely on content relevance without any subject-based boost.
- What happens when filter counts are generated for an empty result set? All filter dimensions should return zero counts rather than errors.
- What happens when a navigation filter parameter refers to a group that no longer exists? The system should gracefully handle missing groups without errors.
- What happens when both navigation filters and panel filters are active simultaneously? The system should merge them, with panel filters taking precedence for overlapping dimensions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST rank search results based on a composite assessment of multiple relevance signals (content match, subject match, word overlap), rather than allowing any single signal to dominate the ranking.
- **FR-002**: For a search query containing a subject code prefix followed by content terms, products whose names closely match the content terms MUST rank higher than products that match only on subject code.
- **FR-003**: Products with no meaningful relevance to the search query MUST be excluded from results (filtered by a minimum relevance threshold).
- **FR-004**: The search relevance score MUST remain within a normalized range of 0 to 100.
- **FR-005**: The system MUST produce identical filter results whether filters are applied through the search interface or the product browsing interface.
- **FR-006**: Filter counts displayed alongside search results MUST use disjunctive faceting (each dimension's count reflects what would be available if only other filters were active).
- **FR-007**: Navigation menu filter actions MUST produce the same results as the equivalent filter panel selection.
- **FR-008**: All existing search and filter API contracts MUST remain backward compatible. Existing endpoints, request formats, and response structures must not change.
- **FR-009**: The search relevance threshold MUST be calibrated so that products with reasonable relevance to the query are not incorrectly excluded.
- **FR-010**: When a user combines search with filters, the filter counts MUST update to reflect only the products matching the current search and filter state.

### Key Entities

- **Search Query**: The user's text input used to find products. Contains optional subject code prefix and content terms.
- **Search Result**: A product returned by the search system, with an associated relevance score determining its position in the results list.
- **Relevance Score**: A composite numeric value (0-100) representing how closely a product matches a search query across multiple dimensions.
- **Filter Dimensions**: The five categories of filters available to users: subjects, categories, product types, products, and modes of delivery.
- **Filter Counts**: The number of products available in each filter option, calculated using disjunctive faceting relative to other active filters.
- **Navigation Filter**: A filter applied via top navigation menu links, representing a single-dimension drill-down into the product catalog.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For the query "CS2 addition mock", mock exam products appear in the top 3 results, above course notes products.
- **SC-002**: For any search query containing a subject code plus additional content terms, the product whose name most closely matches the content terms ranks first among products sharing that subject code in at least 90% of test cases.
- **SC-003**: When identical filters are applied through search and browse interfaces, the resulting product lists are 100% identical.
- **SC-004**: Filter counts produced during search match filter counts produced during browsing for the same base product set, with zero discrepancies.
- **SC-005**: Navigation menu filter actions produce product lists that are 100% consistent with the equivalent filter panel selections.
- **SC-006**: All existing automated tests continue to pass after the changes, confirming backward compatibility.
- **SC-007**: Search response times remain within acceptable limits (users see results without noticeable delay) after scoring and filter changes.

## Assumptions

- The current product catalog data structure (subjects, product variations, exam sessions) remains unchanged during this feature implementation.
- The existing filter panel UI and search modal UI do not require changes; only the backend ranking and filter delegation logic changes.
- The minimum relevance threshold may require empirical tuning based on real search queries; initial calibration will be validated against a representative set of test queries.
- Disjunctive faceting is the correct approach for filter counts (industry standard for e-commerce filter panels).
- Backward compatibility means existing API request/response formats are preserved; internal method reorganization is acceptable.

## Dependencies

- Existing `ProductFilterService` in the filtering app provides the foundation for filter delegation.
- The search service's fuzzy matching library (used for text similarity scoring) remains available and unchanged.
- Filter configuration data (filter groups, hierarchies, filter configuration groups) is correctly maintained in the database.
