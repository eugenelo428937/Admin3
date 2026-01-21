# Implementation Plan: Remove Legacy VAT App

**Branch**: `20260114-20260121-remove-legacy-vat` | **Date**: 2026-01-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/20260114-20260121-remove-legacy-vat/spec.md`

## Summary

Remove the legacy `vat` Django app which contains redundant code superseded by the Rules Engine's database-driven VAT calculation system. This involves:

1. Refactoring `VATOrchestrator` to directly access user profile for country (bypass `build_vat_context`)
2. Relocating `ip_geolocation.py` to `utils/services/`
3. Removing VATAudit model usage (replaced by `ActedRuleExecution`)
4. Dropping the `vat_audit` table via migration
5. Deleting the `vat` app and updating `INSTALLED_APPS`
6. Updating/removing tests that depend on vat app

## Technical Context

**Language/Version**: Python 3.14, Django 5.1 + Django REST Framework
**Primary Dependencies**: Rules Engine (`rules_engine` app), Cart Services (`cart` app), Utils (`utils` app)
**Storage**: PostgreSQL (existing `acted` schema, `vat_audit` table to be dropped)
**Testing**: `python manage.py test` with pytest patterns
**Target Platform**: Linux server (Django backend)
**Project Type**: Web application (backend refactoring only)
**Performance Goals**: VAT calculation < 100ms per cart (current baseline)
**Constraints**: Zero regression in VAT calculation accuracy; all existing tests must pass
**Scale/Scope**: ~500 lines of legacy code removal; 5 files to refactor

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-Driven Development | PASS | Tests updated before removing code; 80%+ coverage maintained |
| II. Modular Architecture | PASS | Maintains Django app separation; relocates utilities appropriately |
| III. Security First | PASS | No security changes; audit trail preserved via ActedRuleExecution |
| IV. Performance Optimization | PASS | Must verify <100ms VAT calculation is maintained |
| V. Code Quality & Conventions | PASS | Following Django/snake_case conventions |

**Gate Result**: PASSED - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/20260114-20260121-remove-legacy-vat/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Investigation findings
├── data-model.md        # Entity documentation
├── quickstart.md        # Implementation guide
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (affected areas)

```text
backend/django_Admin3/
├── vat/                           # TO BE DELETED
│   ├── models.py                  # VATAudit model (drop)
│   ├── context_builder.py         # build_vat_context (remove)
│   ├── ip_geolocation.py          # Relocate to utils/
│   ├── admin.py                   # VATAuditAdmin (remove)
│   ├── management/commands/       # cleanup_vat_audit.py (remove)
│   └── tests/                     # Update or remove
│
├── utils/
│   └── services/
│       └── ip_geolocation.py      # NEW: Relocated from vat/
│
├── cart/
│   └── services/
│       └── vat_orchestrator.py    # MODIFY: Remove vat app dependency
│
├── rules_engine/
│   └── custom_functions.py        # Already has lookup_region() (no change)
│
└── Admin3/
    └── settings/
        └── base.py                # MODIFY: Remove 'vat' from INSTALLED_APPS
```

**Structure Decision**: Backend-only refactoring. No frontend changes required. Migration created in `vat` app before deletion to drop table.

## Complexity Tracking

> No violations requiring justification. Simple code removal with dependency refactoring.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| VAT calculation regression | Low | High | Run full VAT test suite before/after each change |
| Missing import reference | Medium | Low | Grep for all `from vat.` imports before deletion |
| Test failures from removed fixtures | Medium | Medium | Update test fixtures incrementally |
| Migration failure on production | Low | High | Test migration on dev database first |

## Implementation Phases

### Phase 1: Preparation (Low Risk)
- Run existing VAT tests to establish baseline
- Document current `vat` app usage via grep analysis
- Create feature branch checkpoint

### Phase 2: Relocate IP Geolocation (Low Risk)
- Copy `vat/ip_geolocation.py` to `utils/services/`
- Update imports in `vat/context_builder.py` temporarily
- Add tests for relocated module

### Phase 3: Refactor VATOrchestrator (Medium Risk)
- Modify `_build_user_context()` to get country directly from UserProfile
- Remove `build_vat_context` import
- Run VAT calculation tests

### Phase 4: Remove VATAudit Usage (Medium Risk)
- Remove VATAudit.objects.create from `_create_audit_record()`
- Verify ActedRuleExecution captures audit data
- Update any admin views referencing VATAudit

### Phase 5: Create Migration (Medium Risk)
- Create migration to drop `vat_audit` table
- Test migration on development database
- Verify cart/order foreign key cleanup

### Phase 6: Delete VAT App (Low Risk)
- Remove `vat` from `INSTALLED_APPS`
- Delete `vat/` directory
- Run full test suite

### Phase 7: Cleanup Tests (Low Risk)
- Update tests that imported from vat app
- Remove obsolete test fixtures
- Verify 100% test pass rate
