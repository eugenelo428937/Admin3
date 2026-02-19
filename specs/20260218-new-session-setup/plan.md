# Implementation Plan: New Session Setup Wizard

**Branch**: `20260218-new-session-setup` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/20260218-new-session-setup/spec.md`

## Summary

Build a 4-step wizard accessible from the admin mega menu that guides superusers through creating a new exam session, assigning subjects, copying products/prices/bundles from the previous session, and a tutorial placeholder. The backend requires one new dedicated API endpoint for the Step 3 atomic copy/create operation. The frontend introduces one new top-level component (`NewSessionSetup.js`) with sub-components for each step, a new route, and a navigation menu entry point.

## Technical Context

**Language/Version**: Python 3.14 (backend), JavaScript ES2022 / React 19.2 (frontend)
**Primary Dependencies**: Django 6.0 + Django REST Framework (backend), Material-UI v7 + React Router v6 + Axios (frontend)
**Storage**: PostgreSQL with `acted` schema (all models pre-exist; no migrations needed)
**Testing**: Django `APITestCase` (backend), Jest + React Testing Library (frontend)
**Target Platform**: Web application (desktop-first admin workflow)
**Project Type**: Web (Django backend + React frontend)
**Performance Goals**: Step 3 copy/create completes in < 5 seconds for typical session (~30 subjects, ~100 products)
**Constraints**: Step 3 must execute as atomic transaction; all admin endpoints restricted to superusers
**Scale/Scope**: Single-user admin workflow; ~30 subjects per session, ~100-200 products to copy

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-Driven Development | PASS | Backend: new service + endpoint tested with `APITestCase`. Frontend: new components tested with RTL. TDD phases tracked in todos. |
| II. Modular Architecture | PASS | Backend: new service in `catalog` app (session setup orchestration), new action endpoint on `store` app. Frontend: new component in `admin/new-session-setup/` folder. Follows existing modular patterns. |
| III. Security First | PASS | `IsSuperUser` permission on all new endpoints. Frontend guard via `useAuth()` + `<Navigate>` redirect. No new secrets or credentials. |
| IV. Performance Optimization | PASS | Step 3 uses bulk operations (`bulk_create`) for products, prices, bundles. `select_related`/`prefetch_related` for query optimization. |
| V. Code Quality & Conventions | PASS | Backend: snake_case, DRF patterns, ModelSerializer. Frontend: PascalCase components, camelCase props, MUI components. |

No violations. No complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/20260218-new-session-setup/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contracts.md # REST API contracts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── catalog/
│   ├── views/
│   │   └── session_setup_views.py     # New: Step 3 copy/create endpoint
│   ├── serializers/
│   │   └── session_setup_serializers.py  # New: request/response serializers
│   ├── services/
│   │   └── session_setup_service.py   # New: copy/create orchestration logic
│   └── urls.py                        # Modified: register new endpoint
└── store/                             # No changes (uses existing models/APIs)

frontend/react-Admin3/src/
├── components/
│   ├── Navigation/
│   │   └── NavigationMenu.js          # Modified: add "New Session Setup" row
│   └── admin/
│       └── new-session-setup/         # New folder
│           ├── NewSessionSetup.js     # Main wizard component (Stepper)
│           ├── StepExamSession.js     # Step 1: create exam session
│           ├── StepSubjects.js        # Step 2: transfer list
│           ├── StepMaterials.js       # Step 3: copy dialog
│           └── StepTutorials.js       # Step 4: placeholder
├── services/
│   └── sessionSetupService.js         # New: API calls for copy/create
└── App.js                             # Modified: add route
```

**Structure Decision**: Web application structure matching the existing `backend/` + `frontend/` layout. New backend code lives in the `catalog` app (session setup orchestrates across catalog + store). New frontend code in a dedicated `admin/new-session-setup/` folder following the existing admin component pattern.
