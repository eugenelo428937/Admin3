# Implementation Plan: Filtering System Remediation

**Branch**: `20260129-filter-system-fix` | **Date**: 2026-01-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/20260129-filter-system-fix/spec.md`

## Summary

Remediate 6 identified issues in the filtering system spanning backend query logic, filter count computation, hierarchy resolution, bundle filtering, frontend dynamic configuration, and format cross-contamination. The backend `filtering` app and `search` service require targeted fixes to partitioning logic, disjunctive faceting, recursive hierarchy traversal, and bundle query expansion. The frontend `FilterRegistry` must transition from static registrations to backend-driven dynamic population. Pact contracts must be updated to reflect changed API response structures.

## Technical Context

**Language/Version**: Python 3.14 (backend), JavaScript ES2022 / React 19.2 (frontend)
**Primary Dependencies**: Django 6.0, Django REST Framework, Redux Toolkit, RTK Query, Material-UI v7
**Storage**: PostgreSQL with `acted` schema
**Testing**: Django `APITestCase` (backend), Jest + React Testing Library (frontend), Pact v16 (consumer) / pact-python 2.2.2 (provider)
**Target Platform**: Web application (server: macOS/Linux, client: modern browsers)
**Project Type**: Web application (Django backend + React frontend)
**Performance Goals**: API responses < 200ms p95, URL sync < 5ms, filter registry lookups < 1ms
**Constraints**: ~20-50 filter groups (recursive traversal is performant), existing Redux state shape must be preserved
**Scale/Scope**: 6 backend fixes, 1 major frontend refactor, Pact contract updates, ~15-20 files modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. TDD (Non-Negotiable) | PASS | All changes require test-first approach. Backend: Django APITestCase. Frontend: Jest. Pact: consumer + provider tests updated. |
| II. Modular Architecture | PASS | Changes are scoped to existing modules: `filtering` app (models, views, services), `search` service, frontend `store/` (Redux, registry). No new apps needed. |
| III. Security First | PASS | No auth changes. Filter endpoints are public (read-only). No new input surfaces requiring additional validation. |
| IV. Performance Optimization | PASS | Disjunctive faceting adds multiple DB queries per dimension. Mitigated by: ~50 filter groups (small set), `select_related`/`prefetch_related`, existing 15-min cache on filter options. Recursive CTE for hierarchy is O(n) on small tree. |
| V. Code Quality & Conventions | PASS | Follow existing snake_case (backend), camelCase (frontend) patterns. No new abstractions beyond necessary fixes. |

**Gate Result**: PASS - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/20260129-filter-system-fix/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── unified-search.yaml
│   └── filter-configuration.yaml
├── checklists/
│   ├── requirements.md
│   └── clarifications.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── filtering/
│   ├── models/
│   │   ├── filter_configuration.py    # FilterConfiguration, FilterConfigurationGroup (existing)
│   │   ├── filter_group.py            # FilterGroup with hierarchy (existing - enhance get_descendants)
│   │   └── product_group_filter.py    # DEPRECATED - add deprecation warnings
│   ├── views.py                       # filter_configuration endpoint (modify response structure)
│   ├── serializers.py                 # Add FilterConfigurationSerializer with groups
│   └── services/
│       └── filter_service.py          # FilterGroupStrategy, ProductFilterService (modify)
├── search/
│   └── services/
│       └── search_service.py          # _generate_filter_counts (rewrite for disjunctive faceting)
│                                      # _apply_filters (fix partitioning, hierarchy)
│                                      # _get_bundles (expand to all filter dimensions)
└── pact_tests/
    ├── state_handlers.py              # Update states for new response structures
    └── test_provider_verification.py  # Verify updated contracts

frontend/react-Admin3/src/
├── store/
│   ├── filters/
│   │   └── filterRegistry.js          # Convert from static → dynamic backend-driven
│   ├── slices/
│   │   └── baseFilters.slice.js       # Add filterConfiguration state
│   ├── api/
│   │   └── catalogApi.js              # Add/update filterConfiguration endpoint
│   └── middleware/
│       └── urlSyncMiddleware.js       # No changes (registry-driven already)
├── components/Product/
│   ├── FilterPanel.js                 # Dynamic rendering from backend config
│   └── ActiveFilters.js               # Use registry for removal actions
├── hooks/
│   └── useProductsSearch.js           # Handle zero-count hiding (FR-013)
└── pact/consumers/
    ├── products.pact.test.js          # Update filter-configuration contract
    └── search.pact.test.js            # Add unified search contract (if missing)
```

**Structure Decision**: Web application structure. Backend changes are confined to the `filtering` and `search` apps. Frontend changes touch Redux state, FilterRegistry, FilterPanel, and Pact consumer tests. No new apps or major structural changes.

## Post-Design Constitution Re-Check

*Re-evaluation after Phase 1 design completion.*

| Principle | Pre-Design | Post-Design | Notes |
|-----------|------------|-------------|-------|
| I. TDD | PASS | PASS | Test files identified in quickstart.md. RED/GREEN/REFACTOR phases tracked per task. |
| II. Modular Architecture | PASS | PASS | All changes within existing modules. No new apps or cross-cutting concerns. |
| III. Security First | PASS | PASS | No new auth surfaces. Filter endpoints remain read-only public endpoints. |
| IV. Performance | PASS | PASS | 5 additional DB queries per search for disjunctive faceting. Acceptable on ~50-row filter_groups table with existing cache. |
| V. Code Quality | PASS | PASS | Following existing conventions. Data model has no schema changes. |

**Post-Design Gate Result**: PASS - No new violations introduced by design decisions.

## Complexity Tracking

> No violations detected. This section is intentionally empty.
