# Implementation Plan: Store App Consolidation

**Branch**: `20250115-store-app-consolidation` | **Date**: 2025-01-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/20250115-store-app-consolidation/spec.md`

## Summary

Consolidate exam session product models into a clean two-app architecture:
- **catalog**: Master data (ProductTemplate, ProductVariation, ProductProductVariation, ExamSessionSubject, filters)
- **store**: Purchasable items (Product, Price, Bundle, BundleProduct)

The key architectural change is eliminating the redundant `ExamSessionSubjectProduct` (ESSP) intermediate table. The new `store.Product` links directly to `catalog.ExamSessionSubject`, reducing the query chain from 4 tables to 2 joins while improving data integrity.

## Technical Context

**Language/Version**: Python 3.11, Django 5.1
**Primary Dependencies**: Django REST Framework, psycopg2-binary
**Storage**: PostgreSQL with `acted` schema namespace
**Testing**: `python manage.py test` (Django TestCase/APITestCase), 80% coverage required
**Target Platform**: Linux server (Ubuntu), Windows development
**Project Type**: Web application (Django backend + React frontend)
**Performance Goals**: API responses < 200ms p95, product queries ≤ 2 joins
**Constraints**: Zero data loss, preserve foreign key IDs, Strangler Fig pattern for API compatibility
**Scale/Scope**: ~21 Django apps, 44+ file updates, 30+ test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Design Status | Notes |
|-----------|------------------|-------|
| I. Test-Driven Development | ✅ PASS | Comprehensive existing tests; new store models will follow TDD |
| II. Modular Architecture | ✅ PASS | Consolidation improves modularity (removes redundant apps) |
| III. Security First | ✅ PASS | No security changes; FK constraints preserved |
| IV. Performance Optimization | ✅ PASS | Reduces joins from 4 to 2; indexes on key fields |
| V. Code Quality & Conventions | ✅ PASS | Following Django patterns; snake_case for models |

**Pre-Design Gate**: ✅ PASSED - Proceeding to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/20250115-store-app-consolidation/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── catalog/                           # EXISTING - Master data (updates needed)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── product.py                 # RENAME to product_template.py
│   │   ├── product_variation.py
│   │   ├── product_product_variation.py
│   │   ├── product_bundle.py
│   │   └── exam_session_subject.py    # MOVE from exam_sessions_subjects
│   ├── views/
│   │   └── filter_views.py            # MOVE from products app
│   ├── serializers/
│   │   └── filter_serializers.py      # MOVE from products app
│   └── migrations/
├── store/                             # NEW - Purchasable items
│   ├── __init__.py
│   ├── apps.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── product.py                 # NEW - replaces ESSPV
│   │   ├── price.py                   # NEW - replaces current Price
│   │   ├── bundle.py                  # NEW - replaces ESS Bundle
│   │   └── bundle_product.py          # NEW - replaces ESS BundleProduct
│   ├── serializers/
│   ├── views/
│   ├── admin.py
│   ├── urls.py
│   └── migrations/
├── cart/                              # EXISTING - FK updates needed
│   ├── models.py                      # Update FKs: ESSP → store.Product
│   └── views.py
├── exam_sessions_subjects/            # TO BE REMOVED - merge into catalog
├── exam_sessions_subjects_products/   # TO BE REMOVED - replace with store
├── subjects/                          # TO BE REMOVED - wrapper only
├── exam_sessions/                     # TO BE REMOVED - wrapper only
└── products/                          # PARTIAL REMOVAL - filter system moves to catalog

frontend/react-Admin3/
├── src/
│   └── services/                      # API client updates for new endpoints
└── tests/
```

**Structure Decision**: Web application structure. Backend consolidation from 5+ apps to 2 primary apps (catalog + store). Frontend requires minimal changes (API endpoints preserved via Strangler Fig pattern).

## Complexity Tracking

> No constitution violations identified. Consolidation reduces complexity.

| Change | Justification |
|--------|--------------|
| Creating new `store` app | Required for clean separation between master data and purchasable items |
| 44+ file updates | Systematic approach with test coverage; grep/replace patterns |
| 8 migration files | Sequential order prevents FK integrity issues |

## Migration Strategy

### Data Migration Order

1. **catalog/0005_add_exam_session_subject.py** - Move ExamSessionSubject model to catalog
2. **catalog/0006_rename_product_to_product_template.py** - Rename Product → ProductTemplate
3. **store/0001_initial.py** - Create store.Product, store.Price, store.Bundle, store.BundleProduct tables
4. **store/0002_migrate_product_data.py** - ESSPV → store.Product (flatten through ESSP)
5. **store/0003_migrate_price_data.py** - Current Price → store.Price
6. **store/0004_migrate_bundle_data.py** - ESS Bundle/BundleProduct → store models
7. **cart/migrations/00XX_update_product_fk.py** - Update cart FKs
8. **Cleanup migrations** - Drop old tables (ESSP, ESSPV, etc.)

### Pre-Migration Checklist

- [ ] Clear all shopping carts with advance user notification
- [ ] Backup database
- [ ] Run migrations on staging first
- [ ] Verify all FK IDs preserved

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Cart/Order FK integrity | Preserve IDs during migration; extensive testing |
| ESSP flattening data loss | SQL JOIN preserves all relationships |
| 44+ file import updates | Systematic grep/replace; comprehensive test coverage |
| Frontend API breaks | Strangler Fig pattern; deprecation period for old endpoints |
| Inactive catalog templates | Products hidden from browsing/search (FR-012) |

## Post-Design Constitution Re-Check

*Completed after Phase 1 design artifacts generated.*

| Principle | Post-Design Status | Notes |
|-----------|-------------------|-------|
| I. Test-Driven Development | ✅ PASS | Test structure defined in quickstart.md; TDD workflow documented |
| II. Modular Architecture | ✅ PASS | Clear catalog/store separation in data-model.md; removes redundant apps |
| III. Security First | ✅ PASS | JWT auth in contracts/store-api.yaml; FK constraints preserved |
| IV. Performance Optimization | ✅ PASS | Query patterns in data-model.md show 4→2 join reduction |
| V. Code Quality & Conventions | ✅ PASS | snake_case models; Django patterns in quickstart.md |

**Post-Design Gate**: ✅ PASSED - Ready for task generation

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Implementation Plan | [plan.md](plan.md) | This file |
| Research | [research.md](research.md) | 9 research decisions documented |
| Data Model | [data-model.md](data-model.md) | Entity definitions, relationships, migrations |
| API Contract | [contracts/store-api.yaml](contracts/store-api.yaml) | OpenAPI 3.0 spec for store API |
| Quickstart | [quickstart.md](quickstart.md) | Implementation guide with code examples |

**Next Step**: Run `/speckit.tasks` to generate implementation tasks.
