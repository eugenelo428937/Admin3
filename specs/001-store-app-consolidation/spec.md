# Feature Specification: Store App Consolidation

**Feature Branch**: `001-store-app-consolidation`
**Created**: 2025-01-14
**Status**: Draft
**Input**: User description: "Database Schema Consolidation: Store App Creation - Consolidate exam session product models into a clean two-app architecture with catalog for master data and store for purchasable items"

## Clarifications

### Session 2025-01-14

- Q: What happens when store products reference inactive catalog templates? → A: Store products are hidden entirely from browsing/search
- Q: How should cart items be handled during migration? → A: Clear all carts before migration with advance user notification

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Product Catalog Data Integrity (Priority: P1)

Staff and system administrators need the product data model to ensure data integrity where product information cannot become inconsistent between related tables. Currently, the intermediate ESSP table allows potential mismatches between product references.

**Why this priority**: Data integrity is fundamental - if product relationships can become inconsistent, it affects all downstream operations including cart, orders, and reporting. This is the core business driver for the consolidation.

**Independent Test**: Can be fully tested by creating products and verifying that product information is consistently derived from a single source, with no possibility of conflicting product references.

**Acceptance Scenarios**:

1. **Given** a product is created in the store, **When** the product details are retrieved, **Then** all product information comes from the master catalog definition without any intermediate redundant lookups
2. **Given** a product exists in the store, **When** the master catalog template is updated, **Then** the store product reflects the updated information automatically
3. **Given** a product variation is linked to a store product, **When** viewing the store product, **Then** the variation details match exactly what is defined in the catalog

---

### User Story 2 - Shopping Cart and Order Continuity (Priority: P1)

Customers need to continue adding products to their cart, completing checkout, and viewing order history without disruption during and after the consolidation.

**Why this priority**: Any disruption to the purchase flow directly impacts revenue. This is tied with P1 because data integrity and purchase functionality are equally critical.

**Independent Test**: Can be fully tested by performing complete purchase workflows including adding products to cart, checkout, and verifying order history displays correctly.

**Acceptance Scenarios**:

1. **Given** a customer has items in their cart, **When** they complete checkout, **Then** the order is created successfully with all product details intact
2. **Given** a customer completed orders before consolidation, **When** they view order history after consolidation, **Then** all historical orders display correctly with accurate product information
3. **Given** a customer adds a bundle to their cart, **When** they view the cart, **Then** all bundle products are correctly listed with their prices

---

### User Story 3 - Clean Architecture for Maintenance (Priority: P2)

Development team needs a simplified architecture with clear separation between master data (templates and definitions) and purchasable items (products available for sale) to reduce maintenance burden and enable faster feature development.

**Why this priority**: While not immediately customer-facing, simplified architecture reduces ongoing maintenance costs and bugs. Less urgent than core functionality but important for long-term sustainability.

**Independent Test**: Can be verified by reviewing the system structure to confirm clear separation between catalog (master data) and store (purchasable items) with no redundant intermediate layers.

**Acceptance Scenarios**:

1. **Given** the consolidated architecture, **When** developers need to query product information, **Then** they use a maximum of two joins (store product to catalog template) instead of the current four-table chain
2. **Given** the consolidated architecture, **When** adding a new product variation to the catalog, **Then** only catalog-related areas need modification, with no changes to store structure
3. **Given** the consolidated architecture, **When** creating a purchasable product in the store, **Then** it links directly to the catalog without redundant intermediate entities

---

### User Story 4 - Admin Product Management (Priority: P2)

Staff administrators need to manage products, prices, and bundles through the admin interface without workflow disruption, using the new consolidated structure.

**Why this priority**: Administrative functionality is essential for business operations but can tolerate brief disruptions during migration. Critical for ongoing product management.

**Independent Test**: Can be verified by performing all CRUD operations on products, prices, and bundles through the admin interface.

**Acceptance Scenarios**:

1. **Given** an administrator accesses the admin interface, **When** they create a new store product, **Then** they can link it directly to a catalog template and exam session subject
2. **Given** an administrator needs to set pricing, **When** they access a store product, **Then** they can define multiple price types (standard, retaker, reduced, additional) for that product
3. **Given** an administrator manages bundles, **When** they create a bundle, **Then** they can add multiple store products with quantities and display order

---

### User Story 5 - Filter System Consolidation (Priority: P3)

Users browsing products need the filter system to continue working, with filters logically located with the catalog data they filter against.

**Why this priority**: Filter functionality is important for user experience but is less critical than core purchase flow and data integrity. Can be addressed after primary consolidation.

**Independent Test**: Can be verified by using product filters to narrow down product listings and confirming correct results.

**Acceptance Scenarios**:

1. **Given** a user is browsing products, **When** they apply subject or category filters, **Then** the filtered results accurately reflect the selected criteria
2. **Given** the filter system is consolidated with catalog, **When** filter configuration is updated, **Then** changes are managed in a single logical location alongside the data being filtered

---

### Edge Cases

- When a store product references a deactivated catalog template → Product is hidden from browsing/search (resolved)
- Cart items during migration → Carts cleared with advance user notification (resolved)
- What happens when a bundle references products that are no longer active?
- How does the system handle historical orders that reference the old data structure?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain all existing product, price, and bundle data with zero data loss during consolidation
- **FR-002**: System MUST preserve all foreign key relationships including cart items, order items, and bundle contents
- **FR-003**: System MUST ensure store products link directly to catalog templates without redundant intermediate entities
- **FR-004**: System MUST support multiple price types per product (standard, retaker, reduced rate, additional copy)
- **FR-005**: System MUST maintain bundle functionality with products grouped and priced together
- **FR-006**: System MUST preserve all historical order data and maintain accurate order history display
- **FR-007**: System MUST enforce unique product codes across all store products
- **FR-008**: System MUST enforce that each store product is uniquely identified by its exam session subject and product variation combination
- **FR-009**: System MUST maintain active/inactive status for products to control availability without data deletion
- **FR-010**: System MUST consolidate exam session subject management within the catalog domain
- **FR-011**: System MUST relocate filter system functionality to be managed alongside catalog data
- **FR-012**: System MUST hide store products from browsing and search results when their referenced catalog template is inactive or deleted
- **FR-013**: System MUST clear all shopping carts before migration and notify affected users in advance

### Key Entities

- **ProductTemplate (Catalog)**: Master product definition containing reusable product information (name, description, attributes). Renamed from current Product to clarify it represents templates, not purchasable items.
- **ProductVariation (Catalog)**: Variants of product templates (e.g., Printed vs eBook, tutorial types). Defines how a product template can be delivered or consumed.
- **ProductProductVariation (Catalog)**: Links specific product templates to their available variations with variation-specific attributes.
- **ExamSessionSubject (Catalog)**: Associates exam sessions with subjects, defining what subjects are available in each exam session period.
- **Store Product**: A purchasable item available for sale in a specific exam session. Links an exam session subject directly to a product variation, eliminating the redundant intermediate ESSP entity.
- **Store Price**: Pricing information for a store product, supporting multiple price types (standard, retaker, reduced, additional) per product.
- **Store Bundle**: A collection of store products sold together, based on a catalog bundle template and specific to an exam session subject.
- **Store BundleProduct**: Individual products within a bundle, specifying quantities and display order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing purchase workflows (cart, checkout, order history) continue to function without user-facing errors
- **SC-002**: Zero data loss - all products, prices, bundles, cart items, and orders are preserved with accurate relationships
- **SC-003**: Product queries require no more than two joins to retrieve complete product information (compared to current four-table chain)
- **SC-004**: Number of active Django apps reduced from current count by eliminating redundant wrapper apps
- **SC-005**: All existing automated tests pass after consolidation with equivalent or improved coverage
- **SC-006**: Historical orders display correctly with accurate product details matching original purchase records
- **SC-007**: Administrator CRUD operations on products, prices, and bundles complete successfully without errors
- **SC-008**: Product filter functionality returns accurate results matching applied filter criteria

## Assumptions

- The current system has comprehensive test coverage that will validate functionality post-migration
- Django migration framework will be used for schema changes (standard Django practice)
- The Strangler Fig pattern will be employed to maintain API compatibility during transition
- Foreign key IDs will be preserved during migration to maintain referential integrity
- All shopping carts will be cleared before migration with advance user notification to prevent FK integrity issues
- The acted schema namespace will continue to be used for database tables
