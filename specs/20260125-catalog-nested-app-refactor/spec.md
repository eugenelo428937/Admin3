# Feature Specification: Catalog Nested Apps Refactoring

**Feature Branch**: `20260125-catalog-nested-app-refactor`
**Created**: 2026-01-25
**Status**: Draft
**Input**: Refactor catalog app into nested Django apps for better file organization, independent deployability, and code isolation.
**Design Document**: [2026-01-25-catalog-nested-apps-refactoring-design.md](../../docs/plans/2026-01-25-catalog-nested-apps-refactoring-design.md)

## Clarifications

### Session 2026-01-25

- Q: How should existing MarkingPaper records be linked to store.Product during migration? → A: Direct 1:1 mapping - marking products have only one variation, so each MarkingPaper links to its corresponding store.Product directly.

## Overview

Restructure the existing monolithic catalog Django app into a hierarchy of nested Django apps, creating clear domain boundaries and enabling independent deployment of core modules.

### Goals

1. **File organization** - Group related models into logical sub-modules for easier navigation
2. **Independent deployability** - Enable core catalog apps (exam_session, subject) to be reused in other Django projects
3. **Code isolation** - Enforce strict import boundaries between sub-modules

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Catalog Independence (Priority: P1)

As a developer, I want the core catalog modules (ExamSession, Subject, ExamSessionSubject) to have no dependencies on product-related code, so that they can be deployed independently in other Django projects.

**Why this priority**: This establishes the foundational architecture. All other work depends on having clean, isolated core modules.

**Independent Test**: Can deploy catalog.exam_session and catalog.subject to a fresh Django project without importing any product models. The modules function correctly for basic CRUD operations.

**Acceptance Scenarios**:

1. **Given** a new Django project with only catalog.exam_session and catalog.subject installed, **When** I run migrations, **Then** the migrations complete successfully without errors about missing product dependencies
2. **Given** the core catalog apps are installed, **When** I import ExamSession or Subject models, **Then** no product-related code is loaded into memory
3. **Given** the dependency hierarchy is in place, **When** catalog.products imports from catalog core, **Then** the import succeeds, but catalog core cannot import from catalog.products

---

### User Story 2 - Products Layer Organization (Priority: P2)

As a developer, I want product-related models organized into a dedicated nested app structure with bundle and recommendation sub-apps, so that I can navigate and maintain product code more easily.

**Why this priority**: Products are the most complex part of the catalog with 6+ models. Organizing them improves maintainability.

**Independent Test**: Can locate any product-related model by navigating the folder hierarchy (products/, products/bundle/, products/recommendation/) without searching.

**Acceptance Scenarios**:

1. **Given** the new structure is in place, **When** I need to find the ProductBundle model, **Then** I navigate directly to catalog/products/bundle/models.py
2. **Given** the products app is registered, **When** I run `python manage.py check`, **Then** Django recognizes all nested apps with correct labels
3. **Given** the bundle sub-app exists, **When** I import ProductBundle, **Then** the import path is `from catalog.products.bundle.models import ProductBundle`

---

### User Story 3 - Filter System Cohesion (Priority: P2)

As a developer, I want the ProductProductGroup junction table moved to the filtering app, so that all filter-related models are co-located and the catalog app has no filtering dependencies.

**Why this priority**: Improves cohesion by keeping filter logic together. Equal priority with products reorganization.

**Independent Test**: Can run filter-related queries using only models from the filtering app.

**Acceptance Scenarios**:

1. **Given** ProductProductGroup is moved to filtering, **When** I import it, **Then** the path is `from filtering.models import ProductProductGroup`
2. **Given** the migration is complete, **When** I query ProductProductGroup, **Then** the database table is `acted.filtering_product_product_groups`
3. **Given** the catalog app, **When** I check its imports, **Then** there are no imports from the filtering app

---

### User Story 4 - Marking App Migration (Priority: P3)

As a developer, I want the marking app to use store.Product instead of ExamSessionSubjectProduct, so that we can remove the redundant ExamSessionSubjectProduct model entirely.

**Why this priority**: Eliminates technical debt but requires data migration. Lower priority as it affects fewer systems.

**Independent Test**: Can create and query marking papers using store.Product references.

**Acceptance Scenarios**:

1. **Given** the marking app is updated, **When** I create a MarkingPaper, **Then** I link it to a store.Product instance (not ExamSessionSubjectProduct)
2. **Given** existing marking papers exist, **When** the data migration runs, **Then** all papers are linked to corresponding store.Product records
3. **Given** the migration is complete, **When** I search the codebase for ExamSessionSubjectProduct, **Then** no references remain

---

### User Story 5 - Fresh Migration Baseline (Priority: P3)

As a developer, I want fresh migrations for all nested apps with correct table names in the acted schema, so that we have a clean migration history that reflects the new structure.

**Why this priority**: Required for production deployment but can be done after structural changes.

**Independent Test**: Can run `python manage.py migrate --fake` on existing database without errors.

**Acceptance Scenarios**:

1. **Given** old migrations are removed, **When** I run makemigrations for each app in order, **Then** migrations are created without dependency errors
2. **Given** fresh migrations exist, **When** I inspect the migration files, **Then** all tables reference the `acted` schema
3. **Given** an existing database with data, **When** I run `migrate --fake`, **Then** Django marks migrations as applied without modifying data

---

### Edge Cases

- What happens when a circular import is accidentally introduced between catalog core and products? Django should fail at startup with a clear import error.
- How does the system handle missing nested app registration in INSTALLED_APPS? Django should raise an error indicating the missing app label.
- What happens if marking papers reference store.Product variations that were deleted? The foreign key constraint should prevent deletion or cascade appropriately.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST organize catalog models into nested Django apps: catalog (ExamSessionSubject), catalog.exam_session, catalog.subject, catalog.products, catalog.products.bundle, catalog.products.recommendation
- **FR-002**: System MUST register each nested app in INSTALLED_APPS with unique labels: catalog, catalog_exam_sessions, catalog_subjects, catalog_products, catalog_products_bundles, catalog_products_recommendations
- **FR-003**: System MUST enforce dependency direction where products layer imports from catalog core, but not vice versa
- **FR-004**: System MUST move ProductProductGroup model to the filtering app
- **FR-005**: System MUST update all database tables to use the `acted` schema with consistent naming
- **FR-006**: System MUST migrate marking app from ExamSessionSubjectProduct to store.Product (1:1 mapping - each marking product has only one variation)
- **FR-007**: System MUST remove ExamSessionSubjectProduct model after marking migration
- **FR-008**: System MUST update all import statements across the codebase to use new paths
- **FR-009**: System MUST create fresh migrations for each nested app without preserving old migration history
- **FR-010**: System MUST maintain backward compatibility with existing cart and order foreign key relationships to store.Product

### Key Entities

- **ExamSession**: Academic exam period (e.g., 2025-04, 2025-09). Lives in catalog.exam_session.
- **Subject**: Academic subject (e.g., CM2, CB1, SA1). Lives in catalog.subject.
- **ExamSessionSubject**: Links exam sessions to subjects. Lives in catalog (parent app).
- **Product**: Master product template. Lives in catalog.products.
- **ProductVariation**: Variation types (eBook, Printed, Marking). Lives in catalog.products.
- **ProductProductVariation**: Junction linking products to variations. Lives in catalog.products.
- **ProductBundle**: Bundle template for subjects. Lives in catalog.products.bundle.
- **ProductBundleProduct**: Junction for bundle membership. Lives in catalog.products.bundle.
- **ProductVariationRecommendation**: Recommendation links between variations. Lives in catalog.products.recommendation.
- **ProductProductGroup**: Junction for filter groups. Moves to filtering app.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can locate any catalog model by navigating the folder hierarchy in under 10 seconds
- **SC-002**: Core catalog apps (exam_session, subject) can be installed in a fresh Django project with zero product dependencies
- **SC-003**: All 6 nested apps pass Django's `check` command with no warnings
- **SC-004**: All existing tests pass after the refactoring (100% test suite green)
- **SC-005**: Database structure remains unchanged (same table names, same data, same constraints)
- **SC-006**: No circular import errors occur at Django startup
- **SC-007**: All import statements in the codebase use the new paths (zero references to old `from catalog.models import Product` pattern)

## Assumptions

- Existing database has data that must be preserved during migration
- The `--fake` migration strategy is acceptable for existing deployments
- Marking app has a known, finite number of MarkingPaper records that can be migrated
- No external systems depend on the old import paths (only internal codebase references)
- All developers will update their local environments after merge
