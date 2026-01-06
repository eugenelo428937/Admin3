# Implementation Plan: Catalog App Consolidation

**Branch**: `001-catalog-consolidation` | **Date**: 2026-01-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-catalog-consolidation/spec.md`

## Summary

Consolidate Subject, ExamSession, Product, ProductVariation, ProductBundle models and their junction tables from three separate Django apps (`subjects`, `exam_sessions`, `products`) into a single `catalog` app. Create a new PostgreSQL schema `acted` with tables using the `acted.catalog_` prefix naming convention. Implement backward-compatible re-exports in original apps to ensure zero breaking changes.

## Technical Context

**Language/Version**: Python 3.11, Django 5.1
**Primary Dependencies**: Django REST Framework, PostgreSQL psycopg2-binary
**Storage**: PostgreSQL with new `acted` schema
**Testing**: Django TestCase/APITestCase, pytest patterns
**Target Platform**: Linux server (Railway deployment)
**Project Type**: Web application (Django backend + React frontend)
**Performance Goals**: Standard CRUD operations < 200ms p95
**Constraints**: Zero downtime not required (system not live), backward compatibility required
**Scale/Scope**: 8 models moved, 8 new tables in `acted` schema, 3 apps with re-exports

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-Driven Development | PASS | Tests will be written first for new catalog app models and migrations |
| II. Modular Architecture | PASS | Consolidation improves modularity by unifying fragmented catalog domain |
| III. Security First | PASS | No security changes - internal refactoring only |
| IV. Performance Optimization | PASS | No performance changes - using Django's db_table for same data access patterns |
| V. Code Quality & Conventions | PASS | Following Django conventions for app structure and naming |

**Gate Result**: PASS - No violations. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-catalog-consolidation/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no new APIs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── catalog/                          # NEW: Consolidated catalog app
│   ├── __init__.py
│   ├── apps.py                       # CatalogConfig
│   ├── admin.py                      # Admin registrations
│   ├── models/
│   │   ├── __init__.py               # Re-exports all models
│   │   ├── subject.py                # Subject model
│   │   ├── exam_session.py           # ExamSession model
│   │   ├── product.py                # Product model
│   │   ├── product_variation.py      # ProductVariation model
│   │   ├── product_product_variation.py  # ProductProductVariation junction
│   │   ├── product_product_group.py  # ProductProductGroup junction
│   │   ├── product_bundle.py         # ProductBundle model
│   │   └── product_bundle_product.py # ProductBundleProduct junction
│   ├── migrations/
│   │   ├── 0001_initial.py           # Create acted schema
│   │   ├── 0002_create_tables.py     # Create tables with db_table
│   │   └── 0003_copy_data.py         # Copy data from old tables
│   ├── serializers/
│   │   └── __init__.py               # Empty initially (re-use existing)
│   ├── views/
│   │   └── __init__.py               # Empty initially (re-use existing)
│   └── urls.py                       # Empty initially
├── subjects/
│   └── models.py                     # MODIFY: Re-export Subject from catalog
├── exam_sessions/
│   └── models.py                     # MODIFY: Re-export ExamSession from catalog
├── products/
│   └── models/
│       └── __init__.py               # MODIFY: Re-export product models from catalog
└── django_Admin3/
    └── settings/
        └── base.py                   # MODIFY: Add catalog to INSTALLED_APPS

backend/django_Admin3/catalog/tests/
├── __init__.py
├── test_models.py                    # Unit tests for model imports and functionality
├── test_migrations.py                # Integration tests for data migration
└── test_backward_compat.py           # Tests for backward-compatible imports
```

**Structure Decision**: Web application structure with new `catalog` app added under `backend/django_Admin3/`. The app follows Django conventions with models organized in a `models/` subdirectory for better maintainability.

## Constitution Check (Post-Design)

*Re-evaluation after Phase 1 design completion.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. Test-Driven Development | PASS | Test files defined in project structure (test_models.py, test_migrations.py, test_backward_compat.py). TDD workflow will be followed. |
| II. Modular Architecture | PASS | Design maintains modular boundaries. Catalog app is self-contained with clear re-export pattern. |
| III. Security First | PASS | No security implications. Internal refactoring with same data access patterns. |
| IV. Performance Optimization | PASS | Data model preserves existing indexes. No N+1 query changes. Same ORM patterns. |
| V. Code Quality & Conventions | PASS | Following Django conventions: snake_case, __str__ methods, proper Meta classes, organized models/ directory. |

**Post-Design Gate Result**: PASS - Design aligns with all constitution principles.

## Complexity Tracking

> No violations - table is empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| - | - | - |

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Feature Spec | [spec.md](spec.md) | Complete |
| Implementation Plan | [plan.md](plan.md) | Complete |
| Research | [research.md](research.md) | Complete |
| Data Model | [data-model.md](data-model.md) | Complete |
| Quickstart Guide | [quickstart.md](quickstart.md) | Complete |
| Contracts | N/A | Not applicable (no new APIs) |
| Tasks | [tasks.md](tasks.md) | Complete |
