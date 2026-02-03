# Implementation Plan: Fuzzy Search Accuracy & Search Service Refactoring

**Branch**: `20260202-fuzzy-search-refactor` | **Date**: 2026-02-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/20260202-fuzzy-search-refactor/spec.md`

## Summary

Improve fuzzy search ranking accuracy by replacing the `max()` scoring aggregation with a weighted composite formula, and refactor the search service to eliminate duplicated filter logic by delegating filter application and count generation to `ProductFilterService` in the filtering app. This is a backend-only change affecting `search/services/search_service.py` and `filtering/services/filter_service.py`, with no frontend or API contract changes.

## Technical Context

**Language/Version**: Python 3.14, Django 6.0
**Primary Dependencies**: Django REST Framework, FuzzyWuzzy (fuzz module), store.models.Product, filtering.models.FilterGroup/FilterConfiguration/FilterConfigurationGroup
**Storage**: PostgreSQL (existing `acted` schema, no schema changes)
**Testing**: Django TestCase with unittest.mock; `python manage.py test search filtering`
**Target Platform**: Linux/macOS server (Django backend)
**Project Type**: Web application (backend only for this feature)
**Performance Goals**: Search API response < 200ms p95 (constitution target); no regression from current performance
**Constraints**: Backward compatibility with existing API contracts (FR-008); minimum 80% test coverage for new code (constitution)
**Scale/Scope**: ~400 existing tests across search (256) and filtering (149) apps; 987-line search_service.py, 483-line filter_service.py

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Test-Driven Development | PASS | All tasks follow RED/GREEN/REFACTOR cycle. Failing tests written before implementation. Existing 405 tests serve as regression safety net. |
| II. Modular Architecture | PASS | Core refactoring goal is to move filter logic from search app to filtering app, improving separation of concerns. No new apps or cross-cutting abstractions. |
| III. Security First | PASS | No new authentication, authorization, or data exposure changes. Internal method refactoring only. |
| IV. Performance Optimization | PASS | Weighted scoring formula replaces `max()` — same algorithmic complexity. Filter delegation adds one function call indirection, no additional DB queries. Performance target: < 200ms p95. |
| V. Code Quality & Conventions | PASS | Follows snake_case, Django patterns, conventional commits. No new external dependencies. |

**Gate Result**: PASS — No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/20260202-fuzzy-search-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── search-api.md    # API contract documentation
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── search/
│   ├── services/
│   │   └── search_service.py        # MODIFY: scoring formula, filter delegation
│   └── tests/
│       ├── test_fuzzy_scoring.py     # CREATE: weighted scoring tests
│       ├── test_search_delegates_to_filter_service.py  # CREATE: delegation tests
│       ├── test_navbar_filter_translation.py           # CREATE: navbar translation tests
│       └── [10 existing test files]                    # VERIFY: regression
├── filtering/
│   ├── services/
│   │   └── filter_service.py        # MODIFY: add generate_filter_counts, apply_store_product_filters
│   └── tests/
│       ├── test_filter_counts.py     # CREATE: filter count generation tests
│       └── [12 existing test files]  # VERIFY: regression
└── store/
    └── models/
        └── product.py               # READ ONLY: reference for field paths
```

**Structure Decision**: Existing web application structure. Backend-only changes in two existing Django apps (`search`, `filtering`). No new apps, no frontend changes.
