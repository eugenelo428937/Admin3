# Feature Specification: Catalog API Consolidation

**Feature Branch**: `002-catalog-api-consolidation`
**Created**: 2026-01-06
**Status**: Draft
**Input**: User description: "Migrate views, URLs, serializers from subjects, exam_sessions, products apps to catalog app for full consolidation"

## Overview

This feature completes the catalog consolidation started in 001-catalog-consolidation by migrating the API layer (views, serializers, URLs) from the legacy `subjects`, `exam_sessions`, and `products` apps to the centralized `catalog` app. After completion, the legacy apps can be reduced to thin wrappers or removed entirely.

## Prerequisites

- **001-catalog-consolidation** must be complete (merged to main)
- All 8 catalog models exist in `catalog/models/`
- Backward-compatible model re-exports already in place in legacy apps

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Catalog API Centralization (Priority: P1)

As a developer, I want all catalog-related API endpoints (subjects, exam sessions, products) to be served from the `catalog` app so that the codebase has a single source of truth for catalog functionality.

**Why this priority**: This is the core migration that enables removing legacy apps. All other stories depend on this.

**Independent Test**: API calls to `/api/catalog/subjects/`, `/api/catalog/exam-sessions/`, `/api/catalog/products/` return the same data as the legacy endpoints.

**Acceptance Scenarios**:

1. **Given** the catalog API is deployed, **When** I call `GET /api/catalog/subjects/`, **Then** I receive the same subject data as from `/api/subjects/subjects/`
2. **Given** the catalog API is deployed, **When** I call `GET /api/catalog/exam-sessions/`, **Then** I receive the same exam session data as from `/api/exam-sessions/`
3. **Given** the catalog API is deployed, **When** I call `GET /api/catalog/products/`, **Then** I receive the same product data as from `/api/products/products/`

---

### User Story 2 - Legacy Endpoint Backward Compatibility (Priority: P1)

As a frontend developer, I want existing API endpoints to continue working unchanged so that frontend code doesn't need immediate updates.

**Why this priority**: Prevents breaking changes during migration. Critical for zero-downtime deployment.

**Independent Test**: All existing API integration tests pass without modification.

**Acceptance Scenarios**:

1. **Given** catalog API consolidation is complete, **When** frontend calls `/api/subjects/subjects/`, **Then** the request succeeds with identical response format
2. **Given** catalog API consolidation is complete, **When** frontend calls `/api/products/navigation-data/`, **Then** the navigation menu loads correctly
3. **Given** catalog API consolidation is complete, **When** frontend calls `/api/products/bundles/`, **Then** bundle data is returned correctly

---

### User Story 3 - Serializer Consolidation (Priority: P2)

As a developer, I want all catalog model serializers in one location so that serialization logic is maintainable and consistent.

**Why this priority**: Reduces code duplication and ensures consistent API responses across all catalog endpoints.

**Independent Test**: Import `from catalog.serializers import SubjectSerializer, ProductSerializer, ExamSessionSerializer` succeeds and serializers produce correct output.

**Acceptance Scenarios**:

1. **Given** catalog serializers exist, **When** I import serializers from `catalog.serializers`, **Then** all catalog model serializers are available
2. **Given** SubjectSerializer in catalog app, **When** I serialize a Subject instance, **Then** output includes `id`, `code`, `description`, `name` fields
3. **Given** ProductSerializer in catalog app, **When** I serialize a Product with variations, **Then** output includes nested variation data

---

### User Story 4 - Legacy App Deprecation (Priority: P3)

As a codebase maintainer, I want legacy apps (`subjects`, `exam_sessions`) to become thin redirect wrappers so that future developers know to use `catalog` for new features.

**Why this priority**: Prepares for eventual removal of legacy apps. Lower priority because system works without it.

**Independent Test**: Legacy app files contain only re-exports and deprecation warnings; no business logic remains.

**Acceptance Scenarios**:

1. **Given** migration complete, **When** I inspect `subjects/views.py`, **Then** it contains only imports from `catalog.views` and deprecation comments
2. **Given** migration complete, **When** I inspect `subjects/serializers.py`, **Then** it re-exports from `catalog.serializers`
3. **Given** migration complete, **When** I run tests for legacy apps, **Then** they pass unchanged (testing the re-exported views/serializers)

---

### Edge Cases

- What happens when a legacy endpoint URL is called after migration? Request is served by legacy app which delegates to catalog views (transparent proxy pattern)
- How does system handle if both catalog and legacy views exist? Legacy views re-export from catalog; no duplication
- What if a serializer field changes during migration? All serializers must maintain identical output format; changes are breaking

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide SubjectViewSet in `catalog/views/` with list, retrieve, create, update, delete operations
- **FR-002**: System MUST provide ExamSessionViewSet in `catalog/views/` with list, retrieve, create, update, delete operations
- **FR-003**: System MUST provide ProductViewSet in `catalog/views/` with the following operations:
  - Standard CRUD: list, retrieve, create, update, partial_update, destroy
  - Custom actions: bulk_import_products, get_bundle_contents, get_bundles
- **FR-003a**: System MUST provide standalone function-based views in `catalog/views/navigation_views.py`:
  - `navigation_data`: Combined navigation data endpoint (cached via `navigation_data_v2`)
  - `fuzzy_search`: Trigram similarity search endpoint
  - `advanced_product_search`: Paginated advanced search endpoint
- **FR-003b**: System MUST provide BundleViewSet in `catalog/views/bundle_views.py` with list and retrieve operations for ExamSessionSubjectBundle models
- **FR-004**: System MUST provide SubjectSerializer in `catalog/serializers/` with fields: id, code, description, name
- **FR-005**: System MUST provide ExamSessionSerializer in `catalog/serializers/` with fields: id, session_code, start_date, end_date, create_date, modified_date
- **FR-006**: System MUST provide ProductSerializer in `catalog/serializers/` with nested variations support
- **FR-007**: System MUST provide the following serializers in `catalog/serializers/`:
  - **ProductVariationSerializer** with fields: id, variation_type, name, description
  - **ProductBundleProductSerializer** with fields: id, product (nested), product_variation (nested), default_price_type, quantity, sort_order, is_active
  - **ProductBundleSerializer** with fields: id, bundle_name, bundle_description, subject_code, subject_name, is_featured, is_active, display_order, components, components_count, created_at, updated_at
  - **ExamSessionSubjectBundleProductSerializer** with fields: id, product (nested), product_variation (nested), exam_session_product_code, exam_session_product_id, default_price_type, quantity, sort_order, is_active, prices
  - **ExamSessionSubjectBundleSerializer** with fields: id, bundle_name, bundle_description, subject_code, subject_name, exam_session_code, master_bundle_id, components, components_count, is_featured, is_active, display_order, created_at, updated_at
- **FR-008**: System MUST expose all catalog endpoints under `/api/catalog/` URL prefix
- **FR-009**: Legacy endpoints (`/api/subjects/`, `/api/exam-sessions/`, `/api/products/`) MUST continue to work by delegating to catalog views
- **FR-010**: System MUST maintain all existing caching behavior with the following cache keys:
  - `subjects_list_v1`: 300 seconds (5 min) - Subject list endpoint
  - `navigation_data_v2`: 300 seconds (5 min) - Navigation data endpoint
- **FR-011**: System MUST maintain all existing search functionality:
  - **Migrates to catalog**: `fuzzy_search`, `advanced_product_search` views
  - **Stays in products**: `filter_configuration` view (part of filter system, out of scope)
- **FR-012**: Legacy app view files MUST contain only re-exports from catalog with deprecation warnings
- **FR-013**: Catalog ViewSets MUST use AllowAny permission for read operations (list, retrieve) and require superuser (is_superuser=True) for write operations (create, update, delete)
- **FR-014**: The `import_subjects` management command MUST be migrated to `catalog/management/commands/` with backward-compatible re-export from `subjects/management/commands/`. Note: Other management commands (e.g., `sync_course_templates`) are not catalog-specific and remain in their current locations.
- **FR-015**: Tests MUST exist in both locations: legacy app tests remain unchanged; new tests for catalog views/serializers MUST be added to `catalog/tests/` (dual coverage)

### Models Staying in Products App

The following components are NOT part of this migration and remain in the `products` app:

- **FilterGroup**, **FilterConfiguration**, **FilterConfigurationGroup**, **FilterPreset**, **FilterUsageAnalytics** (filter system models)
- **ProductVariationRecommendation** model
- `filter_service.py` service
- `filter_admin.py` admin configuration
- Filter-related management commands

### Key Entities

- **Subject**: Academic subject (e.g., CM2, SA1) with code, description, active status
- **ExamSession**: Exam sitting period with session_code, start/end dates
- **Product**: Course material or tutorial with variations and group memberships
- **ProductVariation**: Product format (eBook, Printed, Hub, Marking, Tutorial)
- **ProductBundle**: Package of products for a subject
- **ProductProductVariation**: Junction linking Product to ProductVariation
- **ProductProductGroup**: Junction linking Product to FilterGroup (filter system) - **Note**: This model's API layer stays in products app as it's part of the filter system (out of scope)
- **ProductBundleProduct**: Junction linking ProductBundle to ProductProductVariation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All catalog models have corresponding ViewSets and Serializers in the catalog app
- **SC-002**: 100% of existing API integration tests pass without modification
- **SC-003**: All imports from `catalog.views` and `catalog.serializers` succeed for migrated components
- **SC-004**: Legacy app view/serializer files contain only re-exports (no business logic)
- **SC-005**: API response times remain within 10% of pre-migration baseline
- **SC-006**: Zero breaking changes to API response formats
- **SC-007**: Frontend can operate using either legacy or catalog endpoints interchangeably
- **SC-008**: Code coverage for catalog views/serializers matches or exceeds legacy app coverage

## Clarifications

### Session 2026-01-06

- Q: How should permission classes be handled during migration? → A: Read operations (list/retrieve) use AllowAny; write operations (create/update/delete) require superuser (is_superuser=True)
- Q: Should management commands be migrated to the catalog app? → A: Yes, migrate management commands to catalog app with legacy re-exports for backward compatibility
- Q: Should tests be migrated to the catalog app? → A: Keep legacy tests unchanged; add new comprehensive tests in catalog/tests/ (dual coverage during transition)

## Assumptions

- Django REST Framework patterns will be maintained (ViewSets, Serializers, Routers)
- Caching strategy (Django cache framework) remains unchanged
- No database migrations needed (models already consolidated in 001)
- Frontend will eventually migrate to `/api/catalog/` but legacy URLs supported indefinitely
- Filter system (FilterGroup, FilterConfiguration, etc.) intentionally remains in products app as it's a separate domain
- **URL naming convention**: Use hyphenated paths for URL endpoints (e.g., `/api/catalog/exam-sessions/`, not `/api/catalog/exam_sessions/`). DRF router basenames use underscores internally but URL paths use hyphens.

## Out of Scope

- Frontend migration to new endpoints (frontend continues using existing URLs)
- Removal of legacy apps (deferred to future feature)
- Changes to filter system architecture
- Performance optimization beyond maintaining current baseline
- API versioning strategy
