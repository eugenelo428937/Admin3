# Feature Specification: Catalog App Consolidation

**Feature Branch**: `001-catalog-consolidation`
**Created**: 2026-01-05
**Status**: Complete
**Completed**: 2026-01-06
**Input**: Create catalog app based on backend-code-review-reorganization.md. Exclude exam_sessions_subjects and exam_sessions_subjects_products. Create new "acted" schema with tables acted.catalog_subjects, acted.catalog_exam_sessions, acted.catalog_products.

## Overview

Consolidate the fragmented catalog domain into a single `catalog` Django app to reduce complexity, improve maintainability, and establish clear domain boundaries. This refactoring creates a new PostgreSQL schema (`acted`) with renamed tables while maintaining backward compatibility with existing code.

### Scope

**In Scope:**

- Subject model (from `subjects` app)
- ExamSession model (from `exam_sessions` app)
- Product, ProductVariation, ProductProductVariation, ProductProductGroup models (from `products` app)
- ProductBundle, ProductBundleProduct models (from `products` app)
- New PostgreSQL schema `acted`
- Backward-compatible re-exports in original apps

**Out of Scope:**

- `exam_sessions_subjects` app and ExamSessionSubject model
- `exam_sessions_subjects_products` app and all its models
- FilterGroup, FilterConfiguration, FilterPreset, FilterUsageAnalytics (remain in `products`)
- Order extraction from Cart (Phase 2)
- Filter system extraction (Phase 3)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Imports Catalog Models (Priority: P1)

A developer working on the Admin3 backend needs to use catalog models (Subject, Product, ExamSession) in their code. With the consolidated catalog app, they can import all related models from a single source.

**Why this priority**: This is the core value proposition - simplified imports reduce cognitive load and prevent circular import issues.

**Independent Test**: Can be fully tested by importing models from `catalog.models` and verifying all expected models are available and functional.

**Acceptance Scenarios**:

1. **Given** the catalog app is installed, **When** a developer writes `from catalog.models import Subject, Product, ExamSession`, **Then** all three models are successfully imported without errors
2. **Given** the catalog app is installed, **When** a developer writes `from catalog.models import ProductVariation, ProductBundle`, **Then** all product-related models are available from the single import source
3. **Given** existing code uses `from subjects.models import Subject`, **When** the code runs after migration, **Then** the import still works via backward-compatible re-export

---

### User Story 2 - Database Administrator Manages Schema (Priority: P1)

A database administrator needs to manage the catalog tables in PostgreSQL. The new `acted` schema provides logical grouping of catalog tables with clear naming conventions.

**Why this priority**: Critical for database operations, backups, and permissions management.

**Independent Test**: Can be tested by connecting to PostgreSQL and verifying the `acted` schema exists with properly named tables.

**Acceptance Scenarios**:

1. **Given** the migration has run, **When** the DBA queries `SELECT table_name FROM information_schema.tables WHERE table_schema = 'acted'`, **Then** tables `catalog_subjects`, `catalog_exam_sessions`, `catalog_products` are listed
2. **Given** existing data in old tables, **When** the migration completes, **Then** all data is preserved in the new schema tables
3. **Given** the new schema exists, **When** a DBA sets permissions on `acted` schema, **Then** access control applies to all catalog tables uniformly

---

### User Story 3 - Developer Maintains Backward Compatibility (Priority: P2)

A developer maintaining legacy code that imports from the original apps (`subjects`, `products`, `exam_sessions`) needs their code to continue working without immediate refactoring.

**Why this priority**: Enables gradual migration without breaking existing functionality.

**Independent Test**: Can be tested by running existing test suites that use old import paths.

**Acceptance Scenarios**:

1. **Given** existing code with `from subjects.models import Subject`, **When** the code executes after catalog app is installed, **Then** the Subject model is successfully imported and functional
2. **Given** existing code with `from products.models import Product, ProductVariation`, **When** the code executes, **Then** both models are imported via re-export
3. **Given** existing code with `from exam_sessions.models import ExamSession`, **When** the code executes, **Then** ExamSession model works identically to before

---

### User Story 4 - Developer Runs Tests After Migration (Priority: P2)

A developer needs to verify that all existing functionality works correctly after the catalog consolidation.

**Why this priority**: Ensures no regression in existing features.

**Independent Test**: Run full test suite and verify all tests pass.

**Acceptance Scenarios**:

1. **Given** the catalog app is installed, **When** `python manage.py test` runs, **Then** all existing tests pass without modification
2. **Given** tests that create Subject/Product/ExamSession instances, **When** tests run, **Then** objects are created in the new schema tables
3. **Given** tests that query across models, **When** tests run, **Then** relationships and foreign keys work correctly

---

### Edge Cases

- What happens when a developer tries to import a model that wasn't moved (e.g., FilterGroup)?
  - FilterGroup remains in `products` app - import path unchanged
- How does the system handle circular imports between catalog and dependent apps?
  - Catalog has no dependencies on other apps; other apps import from catalog
- What happens if the `acted` schema already exists?
  - Migration checks for existence and skips creation if present
- How are foreign keys from other apps (cart, tutorials, marking) handled?
  - They continue pointing to same table data via new schema path

## Requirements *(mandatory)*

### Functional Requirements

**App Structure:**

- **FR-001**: System MUST create a new Django app named `catalog` with structure: `__init__.py`, `apps.py`, `admin.py`, `urls.py`, and subdirectories `models/`, `migrations/`, `serializers/`, `views/`, `tests/` (each with `__init__.py`)
- **FR-002**: System MUST organize models into separate files within `catalog/models/` directory
- **FR-003**: System MUST provide `__init__.py` that re-exports all models for clean imports

**Model Migration:**

- **FR-004**: System MUST move Subject model from `subjects` app to `catalog/models/subject.py`
- **FR-005**: System MUST move ExamSession model from `exam_sessions` app to `catalog/models/exam_session.py`
- **FR-006**: System MUST move Product model from `products` app to `catalog/models/product.py`
- **FR-006a**: System MUST move ProductVariation model from `products` app to `catalog/models/product_variation.py`
- **FR-007**: System MUST move ProductProductVariation junction table to `catalog/models/product_product_variation.py`
- **FR-007a**: System MUST move ProductProductGroup junction table to `catalog/models/product_product_group.py`
- **FR-008**: System MUST move ProductBundle model to `catalog/models/product_bundle.py`
- **FR-008a**: System MUST move ProductBundleProduct junction table to `catalog/models/product_bundle_product.py`

**Database Schema:**

- **FR-009**: System MUST create PostgreSQL schema named `acted` via Django migration
- **FR-010**: System MUST set `db_table` meta option for Subject to `acted.catalog_subjects`
- **FR-011**: System MUST set `db_table` meta option for ExamSession to `acted.catalog_exam_sessions`
- **FR-012**: System MUST set `db_table` meta option for Product to `acted.catalog_products`
- **FR-013**: System MUST set `db_table` meta option for ProductVariation to `acted.catalog_product_variations`
- **FR-014**: System MUST set `db_table` meta option for ProductBundle to `acted.catalog_product_bundles`
- **FR-015**: System MUST create data migration to COPY existing data from old tables to new schema (preserving old tables for rollback)
- **FR-015a**: System MUST set `db_table` meta option for ProductProductVariation to `acted.catalog_product_product_variations`
- **FR-015b**: System MUST set `db_table` meta option for ProductProductGroup to `acted.catalog_product_product_groups`
- **FR-015c**: System MUST set `db_table` meta option for ProductBundleProduct to `acted.catalog_product_bundle_products`

**Backward Compatibility:**

- **FR-016**: System MUST create re-export in `subjects/models.py` that imports Subject from catalog
- **FR-017**: System MUST create re-export in `exam_sessions/models.py` that imports ExamSession from catalog
- **FR-018**: System MUST create re-export in `products/models/__init__.py` that imports product models from catalog
- **FR-019**: System MUST maintain all existing model relationships and foreign key references

**Configuration:**

- **FR-020**: System MUST add `catalog` to INSTALLED_APPS before dependent apps
- **FR-021**: System MUST configure `catalog/apps.py` with proper AppConfig

### Key Entities

- **Subject**: Academic subject (code, description, active status). Moved to `acted.catalog_subjects` table.
- **ExamSession**: Exam session period (session_code, start_date, end_date). Moved to `acted.catalog_exam_sessions` table.
- **Product**: Product definition (fullname, shortname, code, description). Moved to `acted.catalog_products` table.
- **ProductVariation**: Product variant type (name, code, variation_type). Moved to `acted.catalog_product_variations` table.
- **ProductBundle**: Bundle definition linking to subject. Moved to `acted.catalog_product_bundles` table.
- **ProductProductVariation**: Junction table linking products to variations. Moved to `acted.catalog_product_product_variations` table.
- **ProductProductGroup**: Junction table linking products to filter groups. Moved to `acted.catalog_product_product_groups` table.
- **ProductBundleProduct**: Junction table for bundle composition. Moved to `acted.catalog_product_bundle_products` table.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All catalog models can be imported from `catalog.models` in a single import statement
- **SC-002**: 100% of existing tests pass after migration with zero code changes to test files
- **SC-003**: All catalog tables exist in `acted` schema with correct naming convention
- **SC-004**: Backward-compatible imports from original apps work for 100% of moved models
- **SC-005**: No circular import errors occur when using catalog models from any app
- **SC-006**: Data integrity verified: row counts match before and after migration for all affected tables
- **SC-007**: Foreign key relationships from dependent apps continue to function correctly

## Assumptions

- PostgreSQL database supports schema creation and cross-schema foreign keys
- Django migrations can handle schema creation and data migration
- The `products` app will retain FilterGroup/FilterConfiguration models (not moved)
- The `exam_sessions_subjects` and `exam_sessions_subjects_products` apps remain unchanged
- Existing table data will be migrated, not recreated

## Clarifications

### Session 2026-01-05

- Q: Should old tables be preserved after data migration? → A: Copy and Preserve - data copied to new tables, old tables kept as backup (drop later in separate cleanup phase)
- Q: What naming convention for all tables in acted schema? → A: Use `acted.catalog_` prefix with pluralized names for ALL tables (e.g., `acted.catalog_subjects`, `acted.catalog_products`, `acted.catalog_product_variations`)
- Q: What are the migration downtime requirements? → A: No downtime concerns - system is not live yet. Standard migration approach acceptable.

## Dependencies

- PostgreSQL 12+ (schema support)
- Django 5.1+
- Existing apps: subjects, products, exam_sessions (source of models to migrate)
- Dependent apps: cart, tutorials, marking, exam_sessions_subjects, exam_sessions_subjects_products
