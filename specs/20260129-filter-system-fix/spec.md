# Feature Specification: Filtering System Remediation

**Feature Branch**: `20260129-filter-system-fix`
**Created**: 2026-01-29
**Status**: Clarified
**Input**: Remediation plan for 6 identified filtering system issues across backend and frontend

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct Filter Partitioning (Priority: P1)

As a student browsing the online store, when I open the filter panel, I see distinct filter sections (e.g., "Category" vs "Product Type") each showing only the options that belong to that filter type, not duplicated options across both.

**Why this priority**: This is the most visible defect. Users currently see identical options in both Category and Product Type filters, making the filtering experience confusing and unusable. Without correct partitioning, no other filter behavior can be trusted.

**Independent Test**: Can be tested by calling the unified search API endpoint and verifying that `categories` and `product_types` in the response contain distinct, non-overlapping sets of filter options, each matching their configured group assignments.

**Acceptance Scenarios**:

1. **Given** the store has FilterConfiguration records mapping "Category" to groups [Material, Marking, Tutorial] and "Product Type" to groups [Core Study Materials, Revision Materials], **When** a user fetches filter options, **Then** "Category" shows only Material, Marking, Tutorial and "Product Type" shows only Core Study Materials, Revision Materials with no overlap.
2. **Given** a group is assigned to both Category and Product Type configurations, **When** filter options are fetched, **Then** that group appears in both filter sections (intentional dual assignment is respected).
3. **Given** a group exists in the database but is not assigned to any FilterConfiguration, **When** filter options are fetched, **Then** that group does not appear in any filter section.

---

### User Story 2 - Accurate Filter Counts (Priority: P1)

As a student browsing products with active filters, I expect the count numbers next to each remaining filter option to reflect how many results I would get if I toggled that option, given my current selections.

**Why this priority**: Inaccurate counts mislead users into selecting filters that return unexpected results. Correct counts are essential for a functional faceted navigation experience and are a prerequisite for trust in the filtering system.

**Independent Test**: Can be tested by applying a subject filter (e.g., "CM2"), then verifying the category counts in the API response reflect only products matching CM2, not the entire catalog.

**Acceptance Scenarios**:

1. **Given** no filters are active, **When** filter counts are generated, **Then** each filter option's count reflects the total products in the unfiltered catalog.
2. **Given** a user has selected subject "CM2", **When** category counts are generated, **Then** each category count reflects only products matching CM2 (disjunctive faceting: counts exclude the current dimension's filter but apply all others).
3. **Given** a user has selected subject "CM2" and category "Material", **When** product type counts are generated, **Then** product type counts reflect products matching CM2 AND Material.
4. **Given** a filter combination produces zero results for a particular option, **When** counts are displayed, **Then** that option is hidden entirely from the filter panel (zero-count options are not shown).

---

### User Story 3 - Hierarchical Filter Resolution (Priority: P2)

As a student, when I select a parent filter group like "Material", I expect to see products from all child groups (Core Study Materials, Revision Materials, etc.), not just products tagged with the exact name "Material".

**Why this priority**: Hierarchy support unlocks the intended information architecture. Without it, selecting parent categories returns incomplete results, but the system is still usable if users select leaf-level options.

**Independent Test**: Can be tested by selecting a parent group in the filter and verifying the returned products include those belonging to all descendant groups.

**Acceptance Scenarios**:

1. **Given** "Material" is a parent group with children [Core Study Materials, Revision Materials], **When** a user filters by "Material", **Then** results include products from Core Study Materials AND Revision Materials AND any direct "Material" products.
2. **Given** a multi-level hierarchy (grandparent > parent > child), **When** a user selects the grandparent, **Then** results include products from all descendants at every level.
3. **Given** a leaf-level group with no children, **When** a user selects it, **Then** results include only products directly assigned to that group (no change from current behavior).
4. **Given** a group that is both a parent and has direct product assignments, **When** selected, **Then** results include both its direct products and all descendant products.

---

### User Story 4 - Bundle Filtering (Priority: P2)

As a student with active filters, I expect bundles in the results to match my filter selections, rather than always seeing all available bundles regardless of my filters.

**Why this priority**: Bundles appearing regardless of filters creates noise in search results and undermines user trust. However, since bundles are a secondary product type compared to individual products, this is prioritized below core filtering fixes.

**Independent Test**: Can be tested by applying a category filter and verifying only bundles containing products from that category appear in results, and the bundle count in filter options reflects the filtered count.

**Acceptance Scenarios**:

1. **Given** a user has selected category "Core Study Materials", **When** bundles are fetched, **Then** only bundles containing at least one Core Study Materials product appear.
2. **Given** a user has selected mode of delivery "eBook", **When** bundles are fetched, **Then** only bundles containing at least one eBook variation product appear.
3. **Given** a user has no active filters, **When** bundles are fetched, **Then** all active bundles appear (current default behavior preserved).
4. **Given** a user's filter combination excludes all products in a bundle, **When** bundles are fetched, **Then** that bundle does not appear in results.
5. **Given** filters are active across multiple dimensions (e.g., category "Core Study Materials" AND mode of delivery "eBook"), **When** bundles are evaluated, **Then** a bundle appears only if it contains at least one product that satisfies ALL active filter dimensions simultaneously (a single product must match every dimension; different products cannot satisfy different dimensions independently).
6. **Given** filters are active, **When** the "Bundle" count appears in filter options, **Then** the count reflects the number of bundles matching current filters, not all active bundles.

---

### User Story 5 - Dynamic Filter Configuration from Backend (Priority: P3)

As a store administrator, when I configure which filters are active, their labels, and display order in the admin interface, those changes are reflected in the frontend filter panel without requiring a frontend code change.

**Why this priority**: This decouples filter presentation from frontend code, enabling administrators to manage filters independently. It is prioritized last because the current hardcoded filters still work functionally once the backend data issues are resolved.

**Independent Test**: Can be tested by modifying a FilterConfiguration record (e.g., disabling a filter or changing its label) and verifying the frontend filter panel reflects the change after reload.

**Acceptance Scenarios**:

1. **Given** the backend has 3 active FilterConfiguration records, **When** the frontend filter panel loads, **Then** exactly 3 filter sections appear with labels, order, and UI settings matching the backend configuration.
2. **Given** an administrator disables a FilterConfiguration record, **When** the frontend filter panel reloads, **Then** that filter section no longer appears.
3. **Given** an administrator changes a filter's display_order, **When** the frontend reloads, **Then** filters appear in the updated order.
4. **Given** the backend configuration endpoint is unavailable, **When** the frontend attempts to load filter configuration, **Then** the filter panel displays an empty state with a "Filters unavailable" message (no filter options are shown, products remain unfiltered).

---

### User Story 6 - Format Filtering via Modes of Delivery (Priority: P3)

As a student, when I filter by delivery format (eBook, Printed), results are determined by the product variation type rather than filter groups, eliminating cross-contamination where selecting "eBook" also returns Printed versions of the same product.

**Why this priority**: This is a data integrity cleanup that prevents confusing results. It is lower priority because the modes_of_delivery filter already works correctly through variation_type; the issue is that format-level groups in the filter_groups table duplicate and conflict with this mechanism.

**Independent Test**: Can be tested by filtering by mode_of_delivery "eBook" and verifying only eBook product variations appear, with no Printed variations of the same product in results.

**Acceptance Scenarios**:

1. **Given** a product "Course Notes" exists in both eBook and Printed variations, **When** a user filters by mode_of_delivery "eBook", **Then** only the eBook variation appears in results.
2. **Given** format-level groups (eBook, Printed) have been removed from filter_groups, **When** filter group options are generated, **Then** no format-level options appear in category or product type filters.
3. **Given** modes_of_delivery filter is active, **When** results are returned, **Then** filtering is based on product variation type, not filter group membership.

---

### Edge Cases

- What happens when a filter group has no products assigned? The group is hidden from the filter panel entirely; zero-count options are not displayed.
- How does the system handle a circular parent-child relationship in filter groups? The recursive hierarchy traversal must terminate and not produce infinite loops. The tree structure enforced by parent_id references is inherently acyclic.
- What happens when FilterConfigurationGroup records are missing (empty table)? No filter groups should appear in any filter section; the system should gracefully return empty filter options rather than dumping all groups into every section.
- What happens when a user selects filters that produce zero total results? The system returns an empty result set with filter counts reflecting the disjunctive faceting state (each dimension shows counts as if that dimension's filter were removed).
- How does the system behave when multiple filters are combined across all dimensions? The intersection of all filter conditions applies, and each dimension's counts are computed excluding only that dimension's own filter.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST partition filter group options according to FilterConfigurationGroup assignments, so each filter section displays only its configured groups.
- **FR-002**: System MUST compute filter counts using disjunctive faceting, where each filter dimension's counts reflect the queryset with all OTHER active filters applied but not the current dimension's filter.
- **FR-003**: System MUST resolve filter group hierarchies, so selecting a parent group includes all descendant groups' products in the result set.
- **FR-004**: System MUST apply all active filters (subject, category, product type, mode of delivery) to bundle queries, not just the subject filter.
- **FR-005**: System MUST compute bundle counts in filter options based on the current filtered state, not the total count of all active bundles.
- **FR-006**: Frontend MUST fetch filter configuration from the backend API endpoint and dynamically populate the filter panel based on that configuration.
- **FR-007**: Frontend MUST preserve existing Redux state structure (static named keys: subjects, categories, product_types, products, modes_of_delivery) while the filter registry controls presentation.
- **FR-008**: System MUST use product variation type for delivery format filtering (modes_of_delivery) rather than filter group assignments.
- **FR-009**: System MUST use FilterConfiguration/FilterConfigurationGroup as the canonical source for filter-to-group mappings, deprecating the ProductGroupFilter model.
- **FR-010**: Hierarchical filter resolution MUST handle multi-level trees (not just parent-child) and terminate correctly for all valid tree structures.
- **FR-011**: The frontend filter panel MUST respect backend-configured display order, labels, and active/inactive status for all filter sections.
- **FR-012**: The filter panel MUST handle backend configuration endpoint unavailability gracefully, displaying an empty filter panel with a "Filters unavailable" message while products remain visible and unfiltered.
- **FR-013**: Filter options with zero matching products (given the current active filters) MUST be hidden from the filter panel entirely, not shown with a zero count.
- **FR-014**: Bundle matching across multiple filter dimensions MUST use single-product semantics: a bundle appears in results only if it contains at least one product that satisfies ALL active filter dimensions simultaneously.

### Key Entities

- **FilterConfiguration**: Defines which filters exist, their display labels, UI component type, display order, and active/inactive status. Canonical source of filter definitions.
- **FilterConfigurationGroup**: Junction table linking a FilterConfiguration to the specific filter groups that belong to it. Controls which groups appear under which filter section.
- **FilterGroup**: Hierarchical grouping of products (e.g., Material > Core Study Materials). Has a parent reference for tree structure.
- **StoreProduct**: A purchasable item in the store, linked to exam session subjects and product variations.
- **StoreBundle**: A collection of products sold together, linked to exam session subjects.
- **ProductVariation**: Defines variation type (eBook, Printed, Tutorial, etc.) used for mode of delivery filtering.
- **ProductGroupFilter** (deprecated): Legacy simple filter_type-to-groups mapping, to be replaced by FilterConfiguration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Each filter section displays only its configured groups with zero overlap between sections (unless a group is intentionally assigned to multiple configurations), verified by comparing filter options against FilterConfigurationGroup records.
- **SC-002**: Filter counts accurately reflect the disjunctive faceted state: when a user has active filters, counts for each dimension change to reflect only matching products, not the entire catalog.
- **SC-003**: Selecting a parent filter group returns all products belonging to any descendant group at any depth, increasing result completeness for hierarchical selections.
- **SC-004**: Bundle results match active filter selections: bundles not containing any products matching the current filters are excluded from results.
- **SC-005**: The frontend filter panel renders based entirely on backend configuration, with no hardcoded filter type definitions in frontend code.
- **SC-006**: Filtering by delivery format (eBook/Printed) returns only the matching variation, with no cross-contamination from the other format of the same product.
- **SC-007**: An administrator can add, remove, reorder, or relabel filter sections via the backend admin without any frontend code changes, and the changes appear on the next page load.

## Assumptions

- The FilterConfiguration and FilterConfigurationGroup tables already exist in the database with appropriate records, or a data migration will be created to populate them as part of implementation.
- The filter_groups table contains approximately 20-50 rows, making recursive hierarchy traversal a performant approach.
- The existing variation_type field on ProductVariation reliably distinguishes delivery formats (eBook, Printed, etc.) and does not require normalization.
- The filter configuration API endpoint already exists in the backend and returns the active filter configurations with associated groups.
- Redux state structure (static named keys) is stable and will not change as part of this work; only the registry-driven presentation layer changes.
- The system is not yet live, so backward compatibility with existing user sessions or saved URLs is not a concern.
