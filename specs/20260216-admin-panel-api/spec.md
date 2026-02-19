# Feature Specification: Admin Panel Backend API

**Feature Branch**: `20260216-admin-panel-api`
**Created**: 2026-02-16
**Status**: Draft
**Input**: User description: "Create backend API endpoints to support the admin panel frontend CRUD operations. The frontend admin panel (20260216-admin-panel) is already built with React service layers calling these endpoints, but most backend endpoints either don't exist or are read-only."

## Context

The frontend admin panel (`20260216-admin-panel`) has been fully implemented with 12 service files calling REST API endpoints for CRUD operations. However, the backend does not yet provide most of these endpoints. This spec covers the backend changes required to fulfill the frontend service contracts defined in `specs/20260216-admin-panel/contracts/frontend-services.md`.

### Current Backend State

| Frontend Service | Expected URL | Backend Status |
| --- | --- | --- |
| `examSessionSubjectService` | `/api/catalog/exam-session-subjects/` | Missing entirely |
| `productVariationService` | `/api/catalog/product-variations/` | Missing entirely |
| `productProductVariationService` | `/api/catalog/product-product-variations/` | Missing entirely |
| `catalogBundleService` | `/api/catalog/product-bundles/` | Missing (closest: `/api/catalog/bundles/` read-only) |
| `catalogBundleProductService` | `/api/catalog/bundle-products/` | Missing entirely |
| `recommendationService` | `/api/catalog/recommendations/` | Missing entirely |
| `storeProductService` | `/api/store/products/` | Exists but read-only |
| `priceService` | `/api/store/prices/` | Exists but read-only |
| `storeBundleService` | `/api/store/bundles/` | Exists but read-only |
| `storeBundleProductService` | `/api/store/bundle-products/` | Missing (only nested GET via `bundles/{id}/products/`) |
| `userProfileService` | `/api/users/profiles/` | Missing entirely |
| `staffService` | `/api/users/staff/` | Missing entirely |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Catalog API: Exam Session Subjects, Variations & Mappings (Priority: P1)

A superuser manages catalog relationships through the admin panel. The backend provides full CRUD endpoints for Exam Session Subjects, Product Variations, and Product-Product-Variation mappings. Read operations are available to all authenticated users; write operations (create, update, delete) are restricted to superusers.

**Why this priority**: These are the most fundamental catalog management entities. Exam Session Subjects link sessions to subjects (required before store products can be created). Product Variations and their mappings define the product catalog structure that everything else depends on.

**Independent Test**: Can be tested by making HTTP requests to each new endpoint and verifying CRUD operations succeed for superusers, read-only access works for regular users, and appropriate error responses are returned for unauthorized users.

**Acceptance Scenarios**:

1. **Given** a superuser sends a GET request to `/api/catalog/exam-session-subjects/`, **When** the response is received, **Then** it contains a list of all exam session subject pairings with exam session and subject details.
2. **Given** a superuser sends a POST request to `/api/catalog/exam-session-subjects/` with valid exam session and subject IDs, **When** the response is received, **Then** the new pairing is created and returned with status 201.
3. **Given** a superuser sends a POST with a duplicate exam_session + subject combination, **When** the response is received, **Then** a 400 error is returned indicating the combination already exists.
4. **Given** a regular user sends a POST to `/api/catalog/exam-session-subjects/`, **When** the response is received, **Then** a 403 Forbidden error is returned.
5. **Given** a superuser sends a GET request to `/api/catalog/product-variations/`, **When** the response is received, **Then** it contains a list of all product variations with type, name, description, and code.
6. **Given** a superuser sends a POST to `/api/catalog/product-variations/` with valid data, **When** the response is received, **Then** the new variation is created with status 201.
7. **Given** a superuser sends a GET to `/api/catalog/product-product-variations/`, **When** the response is received, **Then** it contains a list of product-to-variation mappings with related product and variation details.
8. **Given** a superuser sends a POST to `/api/catalog/product-product-variations/` linking a product to a variation, **When** the response is received, **Then** the mapping is created with status 201.
9. **Given** a superuser sends a DELETE to any of these endpoints with a valid ID, **When** the response is received, **Then** the record is deleted and status 204 is returned.

---

### User Story 2 - Catalog API: Product Bundles & Recommendations (Priority: P2)

A superuser manages catalog product bundles and cross-sell recommendations. The backend provides full CRUD for Product Bundles, Bundle Products (components within a bundle), and Product-Variation Recommendations.

**Why this priority**: Bundles and recommendations build on the product variation infrastructure from US1. They are important for catalog configuration but are secondary to the core entity relationships.

**Independent Test**: Can be tested by making HTTP requests to create, read, update, and delete bundles, bundle products, and recommendations, verifying correct responses and data integrity.

**Acceptance Scenarios**:

1. **Given** a superuser sends a GET to `/api/catalog/product-bundles/`, **When** the response is received, **Then** it contains a list of product bundles with name, subject, description, and component counts.
2. **Given** a superuser sends a POST to `/api/catalog/product-bundles/` with bundle name and subject, **When** the response is received, **Then** the bundle is created with status 201.
3. **Given** a superuser sends a GET to `/api/catalog/bundle-products/`, **When** the response is received, **Then** it contains a list of bundle-product associations.
4. **Given** a superuser sends a GET to `/api/catalog/bundle-products/?bundle={id}`, **When** the response is received, **Then** only bundle products belonging to that bundle are returned.
5. **Given** a superuser sends a POST to `/api/catalog/bundle-products/` associating a PPV with a bundle, **When** the response is received, **Then** the association is created with sort order and status 201.
6. **Given** a superuser sends a GET to `/api/catalog/recommendations/`, **When** the response is received, **Then** it contains a list of recommendation links showing source and recommended PPV details.
7. **Given** a superuser sends a POST to `/api/catalog/recommendations/` creating a self-referencing recommendation, **When** the response is received, **Then** a 400 error is returned indicating self-references are not allowed.
8. **Given** a superuser sends a DELETE to `/api/catalog/product-bundles/{id}/` for a bundle with store bundles referencing it, **When** the response is received, **Then** a 400 error is returned indicating dependent records exist.

---

### User Story 3 - Store API: Write Operations for Products, Prices & Bundles (Priority: P3)

A superuser manages store entities. The existing read-only store endpoints are upgraded to support create, update, and delete operations for superusers while maintaining existing read behavior for all users. A new top-level endpoint for store bundle products is added.

**Why this priority**: Store management enables the admin to control what is purchasable. It depends on catalog data (US1/US2) being manageable first but is critical for the business.

**Independent Test**: Can be tested by verifying existing GET operations still work, then testing POST/PUT/DELETE operations as a superuser, and confirming 403 responses for non-superusers on write operations.

**Acceptance Scenarios**:

1. **Given** a regular user sends a GET to `/api/store/products/`, **When** the response is received, **Then** the existing list behavior is unchanged (backward compatible).
2. **Given** a superuser sends a POST to `/api/store/products/` with exam_session_subject and product_product_variation IDs, **When** the response is received, **Then** a store product is created with an auto-generated product_code and status 201.
3. **Given** a superuser sends a PUT to `/api/store/prices/{id}/` updating the amount, **When** the response is received, **Then** the price is updated and the new amount is returned.
4. **Given** a superuser sends a POST to `/api/store/prices/` with duplicate product + price_type, **When** the response is received, **Then** a 400 error is returned indicating the combination already exists.
5. **Given** a superuser sends a POST to `/api/store/bundles/` with a bundle_template and exam_session_subject, **When** the response is received, **Then** a store bundle is created with status 201.
6. **Given** a superuser sends a GET to `/api/store/bundle-products/`, **When** the response is received, **Then** a list of all store bundle-product associations is returned.
7. **Given** a superuser sends a POST to `/api/store/bundle-products/` associating a product with a bundle, **When** the response is received, **Then** the association is created with status 201.
8. **Given** a regular user sends a DELETE to `/api/store/products/{id}/`, **When** the response is received, **Then** a 403 Forbidden error is returned.
9. **Given** a superuser sends a DELETE to `/api/store/products/{id}/` for a product referenced in cart items, **When** the response is received, **Then** a 400 error is returned indicating dependent records exist.

---

### User Story 4 - User API: Profiles & Staff Management (Priority: P4)

A superuser manages user profiles and staff records. New endpoints provide list and edit access to user profiles with nested sub-resources (addresses, contact numbers, emails), and full CRUD for staff records.

**Why this priority**: User management is an independent domain that doesn't block catalog or store operations. It is important for administration but has lower urgency than product/price management.

**Independent Test**: Can be tested by making HTTP requests to list and update user profiles, access nested address/contact/email resources, and perform full CRUD on staff records.

**Acceptance Scenarios**:

1. **Given** a superuser sends a GET to `/api/users/profiles/`, **When** the response is received, **Then** it contains a paginated list of user profiles with username, name, title, and preferences.
2. **Given** a superuser sends a GET to `/api/users/profiles/{id}/`, **When** the response is received, **Then** it contains the full profile details.
3. **Given** a superuser sends a PUT to `/api/users/profiles/{id}/` updating the title, **When** the response is received, **Then** the profile is updated and the new data is returned.
4. **Given** a superuser sends a GET to `/api/users/profiles/{id}/addresses/`, **When** the response is received, **Then** it contains the user's addresses (home, work).
5. **Given** a superuser sends a PUT to `/api/users/profiles/{pid}/addresses/{aid}/` updating address data, **When** the response is received, **Then** the address is updated.
6. **Given** a superuser sends a GET to `/api/users/staff/`, **When** the response is received, **Then** it contains a list of staff members with user details.
7. **Given** a superuser sends a POST to `/api/users/staff/` with a user ID, **When** the response is received, **Then** the user is marked as staff with status 201.
8. **Given** a superuser sends a DELETE to `/api/users/staff/{id}/`, **When** the response is received, **Then** the staff record is removed with status 204.
9. **Given** a regular user sends a GET to `/api/users/profiles/`, **When** the response is received, **Then** a 403 Forbidden error is returned.

---

### Edge Cases

- What happens when a superuser deletes a catalog entity with dependent store records (e.g., an ExamSessionSubject linked to store products)? The system should return a 400 error listing which dependent records prevent deletion.
- What happens when creating a store product with an inactive catalog template? The product should still be creatable by a superuser (the FR-012 inactive filter only applies to public browsing, not admin creation).
- How does the system handle a DELETE request for a non-existent record? A 404 Not Found response is returned.
- What happens when the auto-generated product_code for a store product conflicts with an existing code? The system should retry with a unique suffix or return a clear error.
- What happens if a superuser's session expires mid-operation? The standard 401 Unauthorized response triggers the frontend's token refresh flow.

## Requirements *(mandatory)*

### Functional Requirements

#### Permission & Security

- **FR-001**: All new and upgraded endpoints MUST restrict write operations (POST, PUT, PATCH, DELETE) to superusers using the existing `IsSuperUser` permission class.
- **FR-002**: All read operations (GET) on catalog and store endpoints MUST remain accessible to any authenticated user (matching existing behavior).
- **FR-003**: User profile and staff endpoints MUST restrict all operations (including GET) to superusers only, as these contain sensitive user data.

#### Catalog API - New Endpoints

- **FR-010**: System MUST provide a full CRUD endpoint at `/api/catalog/exam-session-subjects/` for managing ExamSessionSubject records with fields: exam_session (FK), subject (FK), is_active.
- **FR-011**: System MUST provide a full CRUD endpoint at `/api/catalog/product-variations/` for managing ProductVariation records with fields: variation_type, name, description, description_short, code.
- **FR-012**: System MUST provide a full CRUD endpoint at `/api/catalog/product-product-variations/` for managing ProductProductVariation mappings with fields: product (FK), product_variation (FK).
- **FR-013**: System MUST provide a full CRUD endpoint at `/api/catalog/product-bundles/` for managing ProductBundle records with fields: bundle_name, subject (FK), bundle_description, is_featured, is_active, display_order.
- **FR-014**: System MUST provide a full CRUD endpoint at `/api/catalog/bundle-products/` for managing ProductBundleProduct records with fields: bundle (FK), product_product_variation (FK), default_price_type, quantity, sort_order, is_active. Must support filtering by bundle ID via query parameter.
- **FR-015**: System MUST provide a full CRUD endpoint at `/api/catalog/recommendations/` for managing ProductVariationRecommendation records with fields: product_product_variation (OneToOne), recommended_product_product_variation (FK). Must enforce the model's self-reference and circular reference validation.

#### Store API - Upgraded Endpoints

- **FR-020**: System MUST upgrade the store products endpoint (`/api/store/products/`) from read-only to full CRUD while maintaining backward compatibility for existing read operations.
- **FR-021**: System MUST upgrade the store prices endpoint (`/api/store/prices/`) from read-only to full CRUD.
- **FR-022**: System MUST upgrade the store bundles endpoint (`/api/store/bundles/`) from read-only to full CRUD.
- **FR-023**: System MUST provide a new top-level CRUD endpoint at `/api/store/bundle-products/` for managing store BundleProduct records, in addition to the existing nested GET at `/api/store/bundles/{id}/products/`.

#### User API - New Endpoints

- **FR-030**: System MUST provide list and detail endpoints at `/api/users/profiles/` for viewing UserProfile records with related user information (username, first_name, last_name, email).
- **FR-031**: System MUST provide update capability on `/api/users/profiles/{id}/` for editing profile fields (title, send_invoices_to, send_study_material_to, remarks).
- **FR-032**: System MUST provide nested endpoints for user profile sub-resources: `/api/users/profiles/{id}/addresses/`, `/api/users/profiles/{id}/contacts/`, `/api/users/profiles/{id}/emails/` with list and update operations.
- **FR-033**: System MUST provide a full CRUD endpoint at `/api/users/staff/` for managing Staff records.

#### Data Integrity

- **FR-040**: All endpoints with unique constraints MUST return clear validation errors (400) when a duplicate record is attempted, identifying which fields caused the conflict.
- **FR-041**: DELETE operations on records with dependent foreign key references MUST return a 400 error listing the dependent records, rather than cascading deletes or returning a 500 error.
- **FR-042**: All endpoints MUST validate foreign key references exist before creating or updating records, returning 400 with a clear message if a referenced record is not found.

#### Backward Compatibility

- **FR-050**: Existing GET responses on store endpoints MUST maintain their current response format and data structure.
- **FR-051**: The existing nested action at `/api/store/bundles/{id}/products/` MUST continue to work alongside the new top-level `/api/store/bundle-products/` endpoint.
- **FR-052**: The existing catalog `BundleViewSet` at `/api/catalog/bundles/` (read-only, using store.Bundle) MUST continue to work alongside the new `/api/catalog/product-bundles/` endpoint (CRUD, using catalog.ProductBundle).

### Key Entities

- **ExamSessionSubject**: Links an exam session to a subject. Unique on (exam_session, subject).
- **ProductVariation**: A variant type (eBook, Printed, Tutorial, etc.) with code, name, description. Unique on (variation_type, name).
- **ProductProductVariation**: Maps a catalog product to a variation. Unique on (product, product_variation).
- **ProductBundle**: A bundle template grouping products for a subject. Unique on (subject, bundle_name).
- **ProductBundleProduct**: A product within a catalog bundle. Unique on (bundle, product_product_variation).
- **ProductVariationRecommendation**: A cross-sell link from one PPV to another. OneToOne on product_product_variation. No self-references or circular references allowed.
- **Store Product**: A purchasable item. Auto-generates product_code on save. Unique on (exam_session_subject, product_product_variation).
- **Store Price**: A pricing tier for a store product. Unique on (product, price_type).
- **Store Bundle**: A store-level bundle instantiation from a catalog template. Unique on (bundle_template, exam_session_subject).
- **Store BundleProduct**: A product within a store bundle. Unique on (bundle, product).
- **UserProfile**: Extends django User with title, mailing preferences. OneToOne with User.
- **UserProfileAddress**: User address with JSON-structured address_data. FK to UserProfile.
- **UserProfileContactNumber**: Phone number with type (HOME/WORK/MOBILE). FK to UserProfile.
- **UserProfileEmail**: Email with type (PERSONAL/WORK). FK to UserProfile.
- **Staff**: Links a django User to the tutorials staff system. OneToOne with User.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 12 frontend admin services can successfully perform their contracted CRUD operations against the backend API without modification to the frontend code.
- **SC-002**: All write operations return appropriate HTTP status codes: 201 for creation, 200 for updates, 204 for deletion, 400 for validation errors, 403 for unauthorized access.
- **SC-003**: Existing read-only consumers of store endpoints experience no change in response format or behavior (100% backward compatible).
- **SC-004**: All unique constraint violations return user-friendly error messages within 1 second.
- **SC-005**: Deletion of records with dependent foreign keys returns a clear error listing dependents rather than cascading or failing with a 500 error.
- **SC-006**: All new and modified endpoints have test coverage at minimum 80%.
- **SC-007**: Non-superusers receive 403 responses for all write operations within 100ms.
- **SC-008**: All API responses follow the existing DRF serializer patterns used in the catalog and store apps.

## Assumptions

- The existing `IsSuperUser` permission class in `catalog/permissions.py` is sufficient for all admin endpoints. No new permission classes are needed.
- Existing serializers for catalog and store entities can be reused or extended. Some new serializers will be needed (e.g., for ProductVariation admin, UserProfile admin).
- The Staff model in the tutorials app is the correct model for staff management (not a new model in users app).
- The frontend service contracts in `specs/20260216-admin-panel/contracts/frontend-services.md` are the definitive API contracts. No new frontend changes should be required.
- No new database migrations are needed since all models already exist.
- The existing `get_permissions()` pattern in catalog viewsets (AllowAny for read, IsSuperUser for write) is the standard to follow.

## Out of Scope

- Creating new database models or modifying existing model schemas.
- Database migrations.
- Frontend changes (the frontend admin panel is already built).
- API endpoints for disabled admin panel sections (Filtering, Tutorials, Marking, Orders).
- Pagination customization beyond DRF defaults.
- Bulk import endpoints (beyond what already exists for Subjects and Products).
- API rate limiting or throttling.
- Audit logging for admin operations (future enhancement).
