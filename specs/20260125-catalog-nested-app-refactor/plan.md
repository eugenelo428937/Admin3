# Implementation Plan: Catalog Nested Apps Refactoring

**Branch**: `20260125-catalog-nested-app-refactor` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/20260125-catalog-nested-app-refactor/spec.md`
**Design**: [2026-01-25-catalog-nested-apps-refactoring-design.md](../../docs/plans/2026-01-25-catalog-nested-apps-refactoring-design.md)

## Summary

Restructure the monolithic catalog Django app into a hierarchy of nested Django apps with clear domain boundaries. Core modules (exam_session, subject) will be independently deployable without product dependencies. Products layer organized into catalog.products with bundle and recommendation sub-apps. ProductProductGroup moves to filtering app for cohesion. ExamSessionSubjectProduct removed (marking app migrates to store.Product). Fresh migrations with --fake strategy for existing databases.

## Technical Context

**Language/Version**: Python 3.14, Django 6.0
**Primary Dependencies**: Django REST Framework, PostgreSQL psycopg2-binary
**Storage**: PostgreSQL with `acted` schema (existing database with data to preserve)
**Testing**: `python manage.py test` (Django TestCase/APITestCase)
**Target Platform**: Linux server (production), Windows (development)
**Project Type**: Web application (Django backend, React frontend - backend changes only)
**Performance Goals**: No performance changes - structural refactoring only
**Constraints**: Preserve all existing data, maintain FK relationships to store.Product from cart/orders
**Scale/Scope**: ~11 model files consolidated, 6 nested apps created, ~50+ import statements to update

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Test-Driven Development ✅

- **Compliance**: This is a structural refactoring. Existing tests verify behavior preservation.
- **Approach**: Run full test suite after each phase to verify no regressions.
- **New Tests**: Write tests for any new model relationships (marking → store.Product).

### II. Modular Architecture ✅

- **Compliance**: This feature IMPROVES modular architecture by creating cleaner boundaries.
- **Approach**: Each nested app (exam_session, subject, products, bundle, recommendation) is a proper Django app with its own models, serializers, views, admin.

### III. Security First ✅

- **Compliance**: No security changes - structural refactoring only.
- **Verification**: Foreign key constraints preserved, no authorization changes.

### IV. Performance Optimization ✅

- **Compliance**: No performance impact - same database tables and queries.
- **Verification**: Database table names unchanged, migrations use --fake on existing data.

### V. Code Quality & Conventions ✅

- **Compliance**: Follows Django app conventions (apps.py with unique labels, proper imports).
- **Verification**: All models use snake_case, proper Meta classes with db_table.

**Gate Status**: ✅ PASSED - All constitution principles satisfied. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/20260125-catalog-nested-app-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (model relocations)
├── quickstart.md        # Phase 1 output (implementation guide)
├── contracts/           # Phase 1 output (not applicable - no API changes)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── apps/
│   ├── catalog/                              # CORE APP (ExamSessionSubject)
│   │   ├── __init__.py
│   │   ├── apps.py                           # CatalogConfig (label='catalog')
│   │   ├── models/
│   │   │   ├── __init__.py                   # Exports ExamSessionSubject
│   │   │   └── exam_session_subject.py       # ExamSessionSubject model
│   │   ├── serializers/
│   │   ├── views/
│   │   ├── admin.py
│   │   ├── urls.py
│   │   ├── migrations/                       # Fresh migrations
│   │   │
│   │   ├── exam_session/                     # NESTED APP
│   │   │   ├── __init__.py
│   │   │   ├── apps.py                       # ExamSessionConfig (label='catalog_exam_sessions')
│   │   │   ├── models.py                     # ExamSession
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── admin.py
│   │   │   └── migrations/
│   │   │
│   │   ├── subject/                          # NESTED APP
│   │   │   ├── __init__.py
│   │   │   ├── apps.py                       # SubjectConfig (label='catalog_subjects')
│   │   │   ├── models.py                     # Subject
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── admin.py
│   │   │   └── migrations/
│   │   │
│   │   └── products/                         # NESTED APP
│   │       ├── __init__.py
│   │       ├── apps.py                       # ProductsConfig (label='catalog_products')
│   │       ├── models/
│   │       │   ├── __init__.py               # Exports Product, ProductVariation, PPV
│   │       │   ├── product.py
│   │       │   ├── product_variation.py
│   │       │   └── product_product_variation.py
│   │       ├── serializers/
│   │       ├── views/
│   │       ├── admin.py
│   │       ├── migrations/
│   │       │
│   │       ├── bundle/                       # NESTED APP (level 2)
│   │       │   ├── __init__.py
│   │       │   ├── apps.py                   # BundleConfig (label='catalog_products_bundles')
│   │       │   ├── models.py                 # ProductBundle, ProductBundleProduct
│   │       │   └── migrations/
│   │       │
│   │       └── recommendation/               # NESTED APP (level 2)
│   │           ├── __init__.py
│   │           ├── apps.py                   # RecommendationConfig (label='catalog_products_recommendations')
│   │           ├── models.py                 # ProductVariationRecommendation
│   │           └── migrations/
│   │
│   ├── filtering/                            # Receives ProductProductGroup
│   │   ├── models/
│   │   │   ├── __init__.py                   # Add ProductProductGroup export
│   │   │   └── product_product_group.py      # NEW: Moved from catalog
│   │   └── migrations/
│   │
│   ├── marking/                              # Migrates to store.Product
│   │   └── models.py                         # Update FK: ESSP → store.Product
│   │
│   └── store/                                # No changes (already uses Product)
│       └── models.py
```

**Structure Decision**: Django nested apps within the existing `backend/django_Admin3/apps/catalog/` directory. Each nested app has its own `apps.py` with unique label for Django's app registry.

## Complexity Tracking

> No constitution violations. Complexity is inherent to the feature goal (creating 6 nested apps with proper isolation).

| Aspect | Justification |
|--------|---------------|
| 6 nested apps | Required for independent deployability (FR-002) |
| Fresh migrations | Clean slate approach avoids migration history conflicts (Decision #5) |
| Clean break (no backward imports) | Enables circular import prevention (Decision #6) |

## Phase 0: Research

### Research Tasks

1. **Current import locations**: Find all files importing from catalog.models
2. **ExamSessionSubjectProduct usage**: Verify marking app is the only consumer
3. **Foreign key dependencies**: Map all FK relationships to catalog models
4. **Migration order**: Determine correct order for fresh migrations
5. **App registration**: Verify nested app registration works in Django 6.0

### Research Findings

See [research.md](./research.md) for detailed findings.

## Phase 1: Design

### Data Model

See [data-model.md](./data-model.md) for:
- Model relocation mapping
- New import paths
- FK reference updates (using string labels)
- Database table preservation

### Contracts

Not applicable - this is a structural refactoring with no API changes. Existing API endpoints continue to work with updated import paths.

### Quickstart Guide

See [quickstart.md](./quickstart.md) for step-by-step implementation guide.

## Phase 2: Tasks

To be generated by `/speckit.tasks` command after Phase 1 artifacts are complete.
