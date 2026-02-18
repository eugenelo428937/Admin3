# Implementation Plan: Admin Panel Backend API

**Branch**: `20260216-admin-panel-api` | **Date**: 2026-02-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/20260216-admin-panel-api/spec.md`

## Summary

Provide backend Django REST Framework API endpoints to support the admin panel frontend. The frontend (20260216-admin-panel) is already built with 12 service files calling CRUD endpoints that don't yet exist or are read-only on the backend. This plan covers creating 8 new ViewSets, upgrading 3 existing ViewSets from read-only to full CRUD, and adding 1 new top-level endpoint — all following the established `ModelViewSet` + `IsSuperUser` permission pattern already proven in the catalog app's `SubjectViewSet` and `ExamSessionViewSet`.

## Technical Context

**Language/Version**: Python 3.14, Django 6.0 + Django REST Framework
**Primary Dependencies**: Django REST Framework ViewSets, DRF Routers, `IsSuperUser` permission class
**Storage**: PostgreSQL with `acted` schema (all models pre-exist, no migrations needed)
**Testing**: Django `APITestCase` with `CatalogAPITestCase` base class pattern, JWT auth helpers
**Target Platform**: Linux/macOS server, Django development server on port 8888
**Project Type**: Web application (backend API only for this feature)
**Performance Goals**: < 200ms p95 for CRUD operations (admin-only, low traffic)
**Constraints**: Must not break existing read-only store consumers. Must match frontend service contracts exactly.
**Scale/Scope**: ~15 admin users, 12 endpoints, low concurrent request volume

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --- | --- | --- |
| I. TDD (Non-Negotiable) | PASS | Tests written first per existing `CatalogAPITestCase` pattern. 80% coverage required. |
| II. Modular Architecture | PASS | New ViewSets in existing apps (catalog, store, users). No new apps needed. |
| III. Security First | PASS | `IsSuperUser` permission for writes, `AllowAny` for reads (catalog/store), full `IsSuperUser` for user data. Server-side enforcement. |
| IV. Performance Optimization | PASS | Use `select_related`/`prefetch_related` on all querysets. Admin traffic is low-volume. |
| V. Code Quality & Conventions | PASS | Follow existing `snake_case`, DRF patterns, consistent `get_permissions()` pattern. |

No constitution violations. No complexity tracking needed.

**Post-Design Re-evaluation** (Phase 1 complete):
- I. TDD: PASS — Test patterns defined in quickstart.md; test files planned for all 3 apps
- II. Modular Architecture: PASS — ViewSets in existing apps, no new apps created
- III. Security First: PASS — IsSuperUser for writes, AllowAny for reads, full IsSuperUser for user data
- IV. Performance: PASS — select_related/prefetch_related on all querysets; admin-only traffic
- V. Code Quality: PASS — Consistent get_permissions() pattern, snake_case, DRF conventions

## Project Structure

### Documentation (this feature)

```text
specs/20260216-admin-panel-api/
├── plan.md              # This file
├── research.md          # Phase 0: Existing patterns analysis
├── data-model.md        # Phase 1: Entity field mappings for serializers
├── quickstart.md        # Phase 1: Quick implementation reference
├── contracts/           # Phase 1: API endpoint contracts
│   ├── catalog-api.md   # Catalog CRUD endpoints
│   ├── store-api.md     # Store CRUD endpoints
│   └── users-api.md     # User/Staff endpoints
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── catalog/
│   ├── views/
│   │   ├── subject_views.py              # Existing (reference pattern)
│   │   ├── exam_session_views.py         # Existing (reference pattern)
│   │   ├── exam_session_subject_views.py # NEW: ExamSessionSubject CRUD
│   │   ├── product_variation_views.py    # NEW: ProductVariation + PPV CRUD
│   │   ├── product_bundle_views.py       # NEW: ProductBundle + BundleProduct CRUD
│   │   └── recommendation_views.py       # NEW: Recommendation CRUD
│   ├── serializers/
│   │   ├── exam_session_serializers.py   # Existing (has ExamSessionSubjectSerializer)
│   │   ├── product_serializers.py        # Existing (has ProductVariationSerializer)
│   │   └── admin_serializers.py          # NEW: Admin-specific serializers
│   ├── urls.py                           # MODIFY: Register new ViewSets
│   └── tests/
│       ├── base.py                       # Existing: CatalogAPITestCase
│       ├── test_views.py                 # Existing
│       └── test_admin_views.py           # NEW: Admin CRUD endpoint tests
├── store/
│   ├── views/
│   │   ├── product.py                    # MODIFY: ReadOnly → ModelViewSet
│   │   ├── price.py                      # MODIFY: ReadOnly → ModelViewSet
│   │   ├── bundle.py                     # MODIFY: ReadOnly → ModelViewSet
│   │   └── bundle_product.py             # NEW: BundleProduct CRUD
│   ├── serializers/                      # Existing (may need admin write serializers)
│   ├── urls.py                           # MODIFY: Register BundleProduct ViewSet
│   └── tests/
│       ├── test_views.py                 # Existing
│       └── test_admin_views.py           # NEW: Store admin CRUD tests
├── users/
│   ├── views.py                          # MODIFY: Add profile/staff ViewSets
│   ├── serializers.py                    # MODIFY: Add profile/staff serializers
│   ├── urls.py                           # MODIFY: Register new ViewSets
│   └── tests/
│       └── test_admin_views.py           # NEW: User admin endpoint tests
└── userprofile/
    ├── serializers.py                    # NEW: UserProfile serializers
    └── views.py                          # Remains empty (views go in users app)
```

**Structure Decision**: All new ViewSets are placed within existing Django apps following the modular architecture principle. Catalog admin endpoints go in the catalog app, store admin endpoints in the store app, and user/staff endpoints in the users app. No new Django apps are created.
