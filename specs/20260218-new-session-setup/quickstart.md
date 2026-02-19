# Quickstart: New Session Setup Wizard

**Branch**: `20260218-new-session-setup`
**Date**: 2026-02-18

## Prerequisites

- Django backend running on `127.0.0.1:8888`
- React frontend running on `127.0.0.1:3000`
- PostgreSQL database with existing `acted` schema
- Superuser account for testing

## Development Setup

No additional dependencies or migrations are required. All database
tables already exist.

```bash
# Backend (from backend/django_Admin3/)
python manage.py runserver 8888

# Frontend (from frontend/react-Admin3/)
npm start
```

## Build Sequence

### Phase 1: Backend (Step 3 endpoint)

1. Create `catalog/services/session_setup_service.py`
   - `SessionSetupService.copy_products_and_bundles()` method
   - Transaction-wrapped copy logic
   - Unit tests first (TDD RED phase)

2. Create `catalog/serializers/session_setup_serializers.py`
   - `CopyProductsRequestSerializer`
   - `CopyProductsResponseSerializer`

3. Create `catalog/views/session_setup_views.py`
   - `SessionSetupViewSet` with `copy_products` action
   - `IsSuperUser` permission

4. Register endpoint in `catalog/urls.py`
   - `POST /api/catalog/session-setup/copy-products/`

### Phase 2: Frontend (Navigation + Routing)

5. Modify `NavigationMenu.js`
   - Add "New Session Setup" button between row1 and row2
   - Use `navViewAll` variant with `NavigateNextIcon`

6. Modify `App.js`
   - Add route: `/admin/new-session-setup`
   - Add route: `/admin/new-session-setup/:sessionId`
   - Import `NewSessionSetup` component

### Phase 3: Frontend (Wizard Steps)

7. Create `NewSessionSetup.js` (parent)
   - MUI `Stepper` with 4 steps
   - State management for step navigation
   - Session ID in URL after Step 1

8. Create `StepExamSession.js` (Step 1)
   - Reuse form pattern from ExamSessionForm.js
   - Fields: session_code, start_date, end_date
   - On save: create exam session, update URL, advance step

9. Create `StepSubjects.js` (Step 2)
   - MUI Transfer List (custom built)
   - Left panel: active subjects from catalog
   - Right panel: assigned subjects
   - "Copy from {previous}" button
   - On save: bulk create ESS records, advance step

10. Create `StepMaterials.js` (Step 3)
    - Dialog with "Proceed" / "Set up later"
    - "Proceed": call copy-products endpoint
    - Show success summary with counts
    - Advance to Step 4

11. Create `StepTutorials.js` (Step 4)
    - "Upload" button (disabled / Coming Soon)
    - "Set up later" button
    - Redirect to `/admin/exam-sessions` on completion

### Phase 4: Frontend Service

12. Create `sessionSetupService.js`
    - `getPreviousSession(currentSessionId)`
    - `copyProducts(newSessionId, previousSessionId)`
    - `getSessionSubjects(sessionId)`

## Test Verification

```bash
# Backend tests
cd backend/django_Admin3
python manage.py test catalog.tests.test_session_setup

# Frontend tests
cd frontend/react-Admin3
npm test -- --testPathPattern=new-session-setup
```

## Manual Testing Checklist

1. Log in as superuser
2. Open admin mega menu
3. Click "New Session Setup"
4. Step 1: Enter session code, dates, save
5. Step 2: Assign subjects (try copy from previous), save
6. Step 3: Click "Proceed" to copy products
7. Step 4: Click "Set up later"
8. Verify records in admin list pages:
   - `/admin/exam-sessions`
   - `/admin/exam-session-subjects`
   - `/admin/store-products`
   - `/admin/prices`
   - `/admin/store-bundles`
