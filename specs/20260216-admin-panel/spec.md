# Feature Specification: Admin Panel

**Feature Branch**: `20260216-admin-panel`
**Created**: 2026-02-16
**Status**: Draft
**Input**: User description: "Create an admin panel in the frontend to manage backend settings with organized MegaMenu navigation, catalog/store/user CRUD pages, and disabled placeholders for future modules."

## Clarifications

### Session 2026-02-16

- Q: What is `product_productvariation_recommendations`? → A: A cross-sell junction table linking two Product-Product-Variations. A source PPV maps to a recommended PPV. When a Store Product's PPV matches the source, the storefront displays a buy button for the Store Product whose PPV matches the recommended PPV.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin MegaMenu Navigation (Priority: P1)

A superuser clicks the "Admin" button in the main navigation bar and sees a full-width MegaMenu popover (replacing the current small dropdown). The menu is organized in two rows with categorized links: Catalog, Store, Filtering (disabled), User in Row 1; Tutorials (disabled), Marking (disabled), Orders (disabled) in Row 2. Disabled links are visually dimmed and non-clickable, indicating future functionality.

**Why this priority**: Navigation is the foundation — every other admin page depends on reachable links. Without navigation, no admin page can be accessed.

**Independent Test**: Can be fully tested by logging in as a superuser and verifying all menu categories, link labels, enabled/disabled states, and navigation to existing admin pages.

**Acceptance Scenarios**:

1. **Given** a superuser is logged in, **When** they click the "Admin" navigation button, **Then** a full-width MegaMenu popover opens showing two rows of categorized admin links.
2. **Given** the Admin MegaMenu is open, **When** the user clicks an enabled link (e.g., "Exam Sessions"), **Then** they are navigated to the corresponding admin page and the menu closes.
3. **Given** the Admin MegaMenu is open, **When** the user views a disabled link (e.g., "Tutorials"), **Then** the link appears visually dimmed/greyed out and clicking it does nothing.
4. **Given** a non-superuser is logged in, **When** they view the navigation bar, **Then** the Admin menu button is not visible.
5. **Given** the Admin MegaMenu is open, **When** the user clicks outside the menu, **Then** the menu closes.

---

### User Story 2 - Catalog Admin: Exam Sessions & Subjects (Priority: P2)

A superuser navigates to the Catalog section of the Admin panel and manages Exam Sessions and Subjects. The existing admin pages for these entities are updated to integrate with the new admin panel navigation and follow consistent patterns.

**Why this priority**: These admin pages already exist and need updating to work with the new MegaMenu. This is lower risk since the pages are mostly functional.

**Independent Test**: Can be tested by navigating from the new Admin MegaMenu to Exam Sessions and Subjects pages and performing list, create, edit, and delete operations.

**Acceptance Scenarios**:

1. **Given** a superuser clicks "Exam Sessions" in the Admin MegaMenu, **When** the page loads, **Then** they see a list of all exam sessions with options to create, edit, and delete.
2. **Given** a superuser clicks "Subjects" in the Admin MegaMenu, **When** the page loads, **Then** they see a list of all subjects with options to create, edit, delete, and import.
3. **Given** a superuser is on any catalog admin page, **When** they look at the page layout, **Then** it follows the consistent admin page pattern (heading, action buttons, data table, loading/error states).

---

### User Story 3 - Catalog Admin: Exam Session Subjects, Product Catalog, Variations & Bundles (Priority: P3)

A superuser manages the remaining catalog entities: Exam Session Subjects (the many-to-many link between exam sessions and subjects), Product Catalog (master product definitions), Product Variations with Product-Product-Variations (variation setup), and Product Bundles with Bundle Products (bundle configuration).

**Why this priority**: These are new admin pages for core catalog data. They enable full catalog management but depend on the navigation (P1) and existing patterns (P2) being in place.

**Independent Test**: Can be tested by navigating to each new catalog admin page and performing CRUD operations, verifying data relationships are correctly displayed and editable.

**Acceptance Scenarios**:

1. **Given** a superuser clicks "Exam Session Subjects" in the Admin MegaMenu, **When** the page loads, **Then** they see a list showing exam session and subject pairings with options to create, edit, and delete.
2. **Given** a superuser clicks "Product Catalog" in the Admin MegaMenu, **When** the page loads, **Then** they see a list of master product definitions with full CRUD capability.
3. **Given** a superuser clicks "Product Variations Catalog setup" in the Admin MegaMenu, **When** the page loads, **Then** they can manage product variations and the product-to-variation mappings.
4. **Given** a superuser clicks "Product Bundles Catalog setup" in the Admin MegaMenu, **When** the page loads, **Then** they can manage product bundles and the products within each bundle.
5. **Given** a superuser creates an Exam Session Subject pairing, **When** they select an exam session and a subject, **Then** the system validates the combination is unique and saves it.

---

### User Story 4 - Store Admin: Products, Recommendations, Prices & Bundles (Priority: P4)

A superuser manages store entities: current purchasable Products, Product-Variation Recommendations, Prices (with tier support), and Store Bundles with their constituent products.

**Why this priority**: Store management is critical for the online shop but depends on catalog data being manageable first (P3).

**Independent Test**: Can be tested by navigating to each store admin page and performing CRUD operations on purchasable items, prices, and bundles.

**Acceptance Scenarios**:

1. **Given** a superuser clicks "Current Products" in the Admin MegaMenu, **When** the page loads, **Then** they see a list of store products showing product code, linked catalog data, and active status.
2. **Given** a superuser clicks "Current Products Recommendations" in the Admin MegaMenu, **When** the page loads, **Then** they see a list of cross-sell recommendation links (source PPV → recommended PPV) with options to create, edit, and delete.
3. **Given** a superuser clicks "Current Products Variation Prices" in the Admin MegaMenu, **When** the page loads, **Then** they can view and edit pricing tiers (standard, retaker, reduced, additional) for each product.
4. **Given** a superuser clicks "Current Products Bundles" in the Admin MegaMenu, **When** the page loads, **Then** they can manage store bundles and assign/remove products within each bundle.

---

### User Story 5 - User Admin: Profiles, Addresses, Contacts, Emails & Staff (Priority: P5)

A superuser manages user-related data: User Profiles, Profile Addresses, Contact Numbers, Emails, and Staff records.

**Why this priority**: User management is important but is an independent domain that doesn't block catalog or store management.

**Independent Test**: Can be tested by navigating to each user admin page and performing list, view, and edit operations on user data.

**Acceptance Scenarios**:

1. **Given** a superuser clicks "User Profile" in the Admin MegaMenu, **When** the page loads, **Then** they see a searchable list of user profiles with options to view and edit.
2. **Given** a superuser clicks "Staff" in the Admin MegaMenu, **When** the page loads, **Then** they see a list of staff members with role management capabilities.
3. **Given** a superuser views a user profile, **When** they navigate to addresses/contacts/emails, **Then** they see the associated records for that user with edit capability.

---

### Edge Cases

- What happens when a superuser tries to delete a catalog entity that has dependent store records (e.g., deleting a subject linked to exam session subjects)? The system should display a clear error message indicating which dependent records exist.
- How does the system handle concurrent edits to the same entity by two different admins? Last-write-wins with an error message if the record was modified since loading.
- What happens when the backend API returns a 403 (user lost superuser status mid-session)? The system should redirect to the home page with an appropriate message.
- How are empty states handled when no records exist for a given entity? A friendly empty-state message with a "Create new" call-to-action is displayed.
- What happens when navigating directly to an admin URL without going through the MegaMenu? The page loads normally if the user is a superuser; otherwise they are redirected.

## Requirements *(mandatory)*

### Functional Requirements

#### Navigation

- **FR-001**: System MUST replace the existing Admin dropdown menu with a MegaMenuPopover that spans the full navigation width when opened.
- **FR-002**: The Admin MegaMenu MUST be organized in two rows of categorized links: Row 1 (Catalog, Store, Filtering, User) and Row 2 (Tutorials, Marking, Orders).
- **FR-003**: Disabled menu items (Filtering, Tutorials, Marking, Orders) MUST appear visually dimmed and MUST NOT navigate when clicked.
- **FR-004**: The Admin MegaMenu MUST only be visible to superusers (matching current behavior).
- **FR-005**: Each enabled menu item MUST navigate to the corresponding admin page and close the MegaMenu.

#### Catalog Admin

- **FR-010**: System MUST provide list, create, edit, and delete functionality for Exam Sessions via the admin panel.
- **FR-011**: System MUST provide list, create, edit, delete, and bulk import functionality for Subjects via the admin panel.
- **FR-012**: System MUST provide list, create, edit, and delete functionality for Exam Session Subjects (exam session + subject pairings).
- **FR-013**: System MUST provide list, create, edit, and delete functionality for Product Catalog (master product definitions).
- **FR-014**: System MUST provide list, create, edit, and delete functionality for Product Variations and Product-Product-Variations mappings.
- **FR-015**: System MUST provide list, create, edit, and delete functionality for Product Bundles and Bundle Products.

#### Store Admin

- **FR-020**: System MUST provide list, create, edit, and delete functionality for Store Products (current purchasable items).
- **FR-021**: System MUST provide list, create, edit, and delete functionality for Product-ProductVariation Recommendations (cross-sell links between a source PPV and a recommended PPV).
- **FR-022**: System MUST provide list, create, edit, and delete functionality for Prices with support for pricing tiers (standard, retaker, reduced, additional).
- **FR-023**: System MUST provide list, create, edit, and delete functionality for Store Bundles and Bundle Products.

#### User Admin

- **FR-030**: System MUST provide list and edit functionality for User Profiles.
- **FR-031**: System MUST provide list and edit functionality for User Profile Addresses.
- **FR-032**: System MUST provide list and edit functionality for User Profile Contact Numbers.
- **FR-033**: System MUST provide list and edit functionality for User Profile Emails.
- **FR-034**: System MUST provide list, create, edit, and delete functionality for Staff records.

#### Consistency & UX

- **FR-040**: All admin list pages MUST follow a consistent pattern: page heading, action buttons, data table with sortable columns, loading indicator, and error/empty states.
- **FR-041**: All admin form pages MUST follow a consistent pattern: form heading, input fields with validation, submit/cancel buttons, loading state during submission, and error display.
- **FR-042**: All destructive actions (delete) MUST require user confirmation before execution.
- **FR-043**: All admin pages MUST display user-friendly error messages when backend operations fail.
- **FR-044**: All admin pages MUST be accessible only to superusers; non-superusers attempting direct URL access MUST be redirected.

### Key Entities

- **Exam Session**: An exam sitting period with start/end dates and name.
- **Subject**: An actuarial subject with code (e.g., CM2, SA1) and description.
- **Exam Session Subject**: A link between an exam session and a subject, representing that a subject is offered in that session.
- **Product (Catalog)**: A master product definition with code, name, description, and active status.
- **Product Variation**: A variant of a product (e.g., Printed, eBook, tutorial format).
- **Product-Product-Variation**: A mapping linking a catalog product to a specific variation.
- **Product Bundle (Catalog)**: A grouping template for bundling products together.
- **Bundle Product**: An individual product within a bundle with sort ordering.
- **Store Product**: A purchasable item linking exam session subject to product-product-variation.
- **Product-ProductVariation Recommendation**: A cross-sell junction linking a source Product-Product-Variation to a recommended Product-Product-Variation. When a Store Product's PPV matches the source, the storefront shows a buy button for the Store Product whose PPV matches the recommended target.
- **Price**: A pricing tier for a store product (standard, retaker, reduced, additional).
- **Store Bundle**: A collection of store products sold together.
- **User Profile**: A user's personal information record.
- **User Profile Address**: A postal/billing address linked to a user profile.
- **User Profile Contact Number**: A phone number linked to a user profile.
- **User Profile Email**: An email address linked to a user profile.
- **Staff**: A staff member record with role/permission information.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Superusers can access all enabled admin pages from the MegaMenu within 2 clicks (open menu, click link).
- **SC-002**: All CRUD operations on catalog entities complete successfully with appropriate feedback within 3 seconds.
- **SC-003**: All CRUD operations on store entities complete successfully with appropriate feedback within 3 seconds.
- **SC-004**: Disabled menu items are visually distinguishable from enabled items (dimmed appearance, no hover effect, no navigation on click).
- **SC-005**: 100% of admin pages follow the consistent layout pattern (heading, actions, table, loading/error states).
- **SC-006**: All destructive operations require confirmation and display success/failure feedback.
- **SC-007**: Non-superusers cannot access any admin page via direct URL navigation.
- **SC-008**: All new admin pages include test coverage at minimum 80%.

## Assumptions

- Backend API endpoints already exist for most catalog and store entities. New endpoints may be needed for some entities (e.g., Exam Session Subjects CRUD, Product-Product-Variations, user profile sub-resources, recommendations).
- The existing admin component patterns (list/form/detail with services) will be followed for all new pages.
- Disabled menu items will be enabled in future feature branches without structural changes to the MegaMenu.
- User admin pages provide list and edit functionality (not create/delete for profiles, as users self-register). Staff records support full CRUD.
- The MegaMenuPopover component already supports the layout needed; content will be organized using Material-UI Grid within it.

## Out of Scope

- Filtering admin pages (filter_configurations, filter_groups, etc.) — disabled for future implementation.
- Tutorial admin pages (course templates, locations, venues, etc.) — disabled for future implementation.
- Marking admin pages (papers, vouchers) — disabled for future implementation.
- Orders admin pages — disabled for future implementation.
- Backend API creation — this spec covers frontend only; backend endpoints are assumed to exist or will be specified separately.
- Role-based access beyond superuser (e.g., editor, viewer roles) — all admin access requires superuser.
