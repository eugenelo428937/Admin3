# Implementation Plan: Catalog API Consolidation

**Branch**: `002-catalog-api-consolidation` | **Date**: 2026-01-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-catalog-api-consolidation/spec.md`

## Summary

Migrate the API layer (views, serializers, URLs, management commands) from legacy `subjects`, `exam_sessions`, and `products` apps to the centralized `catalog` app. Uses the Strangler Fig pattern: new `/api/catalog/` endpoints alongside legacy endpoints that delegate to catalog implementations. Maintains 100% backward compatibility with no breaking changes to existing frontend integrations.

## Technical Context

**Language/Version**: Python 3.11, Django 5.1
**Primary Dependencies**: Django REST Framework 3.x, djangorestframework_simplejwt
**Storage**: PostgreSQL (acted schema, tables created in 001-catalog-consolidation)
**Testing**: Django APITestCase, pytest patterns (python manage.py test)
**Target Platform**: Linux server (production), Windows (development)
**Project Type**: Web application (backend API consolidation)
**Performance Goals**: <200ms p95 API response times, maintain existing 5-minute cache on subjects
**Constraints**: Zero breaking changes to API response formats, backward-compatible legacy endpoints
**Scale/Scope**: 8 catalog models, ~15 API endpoints, 3 ViewSets, 9 serializers, 3 legacy apps

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Test-Driven Development | ✅ PASS | FR-015 mandates dual test coverage; legacy tests preserved, new catalog tests added |
| II. Modular Architecture | ✅ PASS | Consolidates 3 legacy apps into single catalog app; clear separation maintained |
| III. Security First | ✅ PASS | FR-013 defines permission classes: AllowAny for reads, superuser for writes |
| IV. Performance Optimization | ✅ PASS | FR-010 preserves existing caching; SC-005 requires <10% response time variance |
| V. Code Quality & Conventions | ✅ PASS | Following DRF ViewSet/Serializer patterns; snake_case conventions maintained |

**Gate Result**: PASS - All 5 principles satisfied. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-catalog-api-consolidation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api-endpoints.md # API contract definitions
│   └── serializers.md   # Serializer field contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── catalog/
│   ├── models/              # Existing (from 001-catalog-consolidation)
│   │   ├── __init__.py
│   │   ├── subject.py
│   │   ├── exam_session.py
│   │   ├── product.py
│   │   ├── product_variation.py
│   │   ├── product_product_variation.py
│   │   ├── product_product_group.py
│   │   ├── product_bundle.py
│   │   └── product_bundle_product.py
│   ├── views/               # NEW: API views
│   │   ├── __init__.py
│   │   ├── subject_views.py
│   │   ├── exam_session_views.py
│   │   ├── product_views.py
│   │   └── bundle_views.py
│   ├── serializers/         # NEW: DRF serializers
│   │   ├── __init__.py
│   │   ├── subject_serializers.py
│   │   ├── exam_session_serializers.py
│   │   ├── product_serializers.py
│   │   └── bundle_serializers.py
│   ├── management/          # NEW: Management commands
│   │   └── commands/
│   │       └── import_subjects.py
│   ├── tests/               # Extended test suite
│   │   ├── test_models.py       # Existing
│   │   ├── test_views.py        # NEW
│   │   ├── test_serializers.py  # NEW
│   │   └── test_backward_compat.py  # Existing + extended
│   └── urls.py              # NEW: Catalog URL routing
│
├── subjects/                # LEGACY: Becomes thin wrapper
│   ├── views.py             # Re-exports from catalog.views
│   ├── serializers.py       # Re-exports from catalog.serializers
│   └── urls.py              # Delegates to catalog views
│
├── exam_sessions/           # LEGACY: Becomes thin wrapper
│   ├── views.py             # Re-exports from catalog.views
│   ├── serializers.py       # Re-exports from catalog.serializers
│   └── urls.py              # Delegates to catalog views
│
└── products/                # PARTIAL MIGRATION (filter system stays)
    ├── views.py             # Re-exports catalog views; filter views stay
    ├── serializers.py       # Re-exports catalog serializers; filter serializers stay
    └── urls.py              # Delegates catalog endpoints; filter routes stay
```

**Structure Decision**: Web application backend with single Django project. API consolidation follows existing Django app patterns. Legacy apps become thin wrappers with deprecation warnings while maintaining backward compatibility.

## Complexity Tracking

> No constitution violations identified. All gates passed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
