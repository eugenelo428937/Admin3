# Technical Debt Register: Legacy App Cleanup

**Created**: 2026-01-14
**Scope**: exam_sessions, exam_sessions_subjects, exam_sessions_subjects_products apps
**Objective**: Clean up obsolete code and consolidate to catalog/products apps

---

## Executive Summary

| App | Migration Status | Can Delete App? | Action |
|-----|-----------------|-----------------|--------|
| `exam_sessions` | Fully migrated to catalog | NO (40+ file references) | Clean unused imports only |
| `exam_sessions_subjects` | Model ACTIVE, FK updated | NO (critical FK dependencies) | Clean unused imports only |
| `exam_sessions_subjects_products` | Core to system | NO (30+ module dependencies) | Remove dead code only |

---

## DEBT-001: exam_sessions/admin.py - Empty Shell

**Category**: Code Quality
**Severity**: Low
**Location**: `backend/django_Admin3/exam_sessions/admin.py:9`

**Description**:
Empty admin.py with unused `admin` import. Admin registration moved to catalog/admin.py.

**Pylint Finding**: `W0611: Unused admin imported from django.contrib (unused-import)`

**Impact**:
- Technical: Unnecessary file/import
- Business: None

**Proposed Solution**:
Remove unused import or replace with comment-only file.

**Effort Estimate**: 5 minutes
**Priority**: Low

---

## DEBT-002: exam_sessions Test Files - Unused Imports

**Category**: Code Quality
**Severity**: Low
**Location**:
- `exam_sessions/tests/test_views.py:8` - Unused TestCase
- `exam_sessions/tests/test_models.py:11` - Unused ValidationError

**Description**:
Test files have unused imports that were likely left over from refactoring.

**Proposed Solution**:
Remove unused imports.

**Effort Estimate**: 5 minutes
**Priority**: Low

---

## DEBT-003: exam_sessions_subjects/views.py - Unused render Import

**Category**: Code Quality
**Severity**: Low
**Location**: `exam_sessions_subjects/views.py:1`

**Description**:
`render` imported from django.shortcuts but never used (DRF ViewSet doesn't need it).

**Proposed Solution**:
Remove unused import.

**Effort Estimate**: 2 minutes
**Priority**: Low

---

## DEBT-004: exam_sessions_subjects_products/models.py - Unused Re-exports

**Category**: Code Quality
**Severity**: Medium
**Location**: `exam_sessions_subjects_products/models.py:1-3`

**Pylint Finding**:
- `W0611: Unused ExamSessionSubjectProduct imported from models.exam_session_subject_product`
- `W0611: Unused ExamSessionSubjectProductVariation imported from models.exam_session_subject_product_variation`
- `W0611: Unused Price imported from models.price`

**Description**:
The `models.py` re-exports models from the `models/` directory for backward compatibility, but these re-exports may not be used anywhere.

**Impact**:
- Technical: Confusing module structure
- Business: None

**Proposed Solution**:
Verify if re-exports are used, remove if not. Consider adding `__all__` for explicit exports.

**Effort Estimate**: 15 minutes (requires verification)
**Priority**: Medium

---

## DEBT-005: exam_sessions_subjects_products/serializers.py - Multiple Unused Imports

**Category**: Code Quality
**Severity**: Medium
**Location**: `exam_sessions_subjects_products/serializers.py:5-9`

**Pylint Findings**:
- `Unused ProductVariationSerializer imported from products.serializers`
- `Unused Subject imported from subjects.models`
- `Unused Product, ProductVariation imported from products.models.products`
- `Unused TutorialEvent imported from tutorials.models`

**Description**:
Multiple imports left over from refactoring when serializers were consolidated.

**Proposed Solution**:
Remove all unused imports.

**Effort Estimate**: 10 minutes
**Priority**: Medium

---

## DEBT-006: exam_sessions_subjects_products/views.py - Unused Import

**Category**: Code Quality
**Severity**: Low
**Location**: `exam_sessions_subjects_products/views.py:11`

**Pylint/Vulture Finding**: `Unused ProductSearchResponseSerializer`

**Description**:
Import likely left from earlier version of unified search.

**Proposed Solution**:
Remove unused import.

**Effort Estimate**: 2 minutes
**Priority**: Low

---

## DEBT-007: QueryPerformanceMiddleware - Not Registered

**Category**: Architectural Debt
**Severity**: Medium
**Location**: `exam_sessions_subjects_products/middleware/query_performance.py`

**Vulture Finding**: Unused variables `exc_tb`, `exc_type`, `exc_val` at line 114

**Description**:
Complete middleware class (230+ lines) exists but is NOT registered in Django settings.
The `@monitor_query_performance()` decorator is still used in views.py but the middleware itself is dead code.

**Impact**:
- Technical: 230+ lines of unused code, confusing architecture
- Business: None (decorator still provides logging)

**Proposed Solution**:
Either:
1. Register middleware in settings if performance monitoring needed
2. Remove middleware class, keep decorator in a separate utils file
3. Remove entire file if monitoring not needed

**Effort Estimate**: 30 minutes
**Priority**: Medium

---

## DEBT-008: FuzzySearchService - Unused process Import

**Category**: Code Quality
**Severity**: Low
**Location**: `exam_sessions_subjects_products/services/fuzzy_search_service.py:14`

**Pylint/Vulture Finding**: `Unused process imported from fuzzywuzzy`

**Description**:
`process` is imported but individual fuzz functions are used instead.

**Proposed Solution**:
Remove unused import.

**Effort Estimate**: 2 minutes
**Priority**: Low

---

## DEBT-009: OptimizedSearchService - Unused FilterGroup Import

**Category**: Code Quality
**Severity**: Low
**Location**: `exam_sessions_subjects_products/services/optimized_search_service.py:14`

**Pylint Finding**: `Unused FilterGroup imported from products.models.filter_system`

**Description**:
Import left from refactoring.

**Proposed Solution**:
Remove unused import.

**Effort Estimate**: 2 minutes
**Priority**: Low

---

## DEBT-010: exam_session_subject_bundle_product.py - Unused Import

**Category**: Code Quality
**Severity**: Low
**Location**: `exam_sessions_subjects_products/models/exam_session_subject_bundle_product.py:3`

**Pylint Finding**: `Unused ExamSessionSubjectProduct imported from exam_session_subject_product`

**Description**:
Import not used in this file.

**Proposed Solution**:
Remove unused import.

**Effort Estimate**: 2 minutes
**Priority**: Low

---

## DEBT-011: analyze_query_performance.py Command - Unused Imports

**Category**: Code Quality
**Severity**: Low
**Location**: `exam_sessions_subjects_products/management/commands/analyze_query_performance.py:10-11`

**Pylint Findings**:
- `Unused connections imported from django.db`
- `Unused settings imported from django.conf`

**Description**:
Management command has unused imports.

**Proposed Solution**:
Remove unused imports.

**Effort Estimate**: 5 minutes
**Priority**: Low

---

## Migration Plan

### Phase 1: Clean Unused Imports (Low Risk)
**Estimated Effort**: 30 minutes

Files to modify:
1. `exam_sessions/admin.py` - Remove unused admin import
2. `exam_sessions/tests/test_views.py` - Remove unused TestCase
3. `exam_sessions/tests/test_models.py` - Remove unused ValidationError
4. `exam_sessions_subjects/views.py` - Remove unused render
5. `exam_sessions_subjects_products/serializers.py` - Remove all unused imports
6. `exam_sessions_subjects_products/views.py` - Remove ProductSearchResponseSerializer
7. `exam_sessions_subjects_products/services/fuzzy_search_service.py` - Remove unused process
8. `exam_sessions_subjects_products/services/optimized_search_service.py` - Remove FilterGroup
9. `exam_sessions_subjects_products/models/exam_session_subject_bundle_product.py` - Remove unused import
10. `exam_sessions_subjects_products/management/commands/analyze_query_performance.py` - Remove unused imports

### Phase 2: Handle QueryPerformanceMiddleware (Medium Risk)
**Estimated Effort**: 30 minutes

Decision needed:
- [ ] Option A: Register middleware in settings (if monitoring needed)
- [ ] Option B: Keep decorator only, remove middleware class
- [ ] Option C: Remove entire middleware file

### Phase 3: Verify models.py Re-exports (Medium Risk)
**Estimated Effort**: 15 minutes

Check if `exam_sessions_subjects_products/models.py` re-exports are used anywhere. If not, simplify.

---

## What NOT to Do

1. **Do NOT delete exam_sessions app** - 40+ files still import from it
2. **Do NOT delete exam_sessions_subjects app** - Critical FK dependencies
3. **Do NOT delete exam_sessions_subjects_products app** - 30+ module dependencies
4. **Do NOT move models between apps** - Would break migrations and FK references

---

## Success Metrics

- [ ] All pylint W0611 warnings resolved for these 3 apps
- [ ] All vulture "unused import" findings resolved for these 3 apps
- [ ] Zero functionality regression (all tests pass)
- [ ] Dead middleware code addressed

---

## Resolution Log

| Debt ID | Status | Resolved Date | Notes |
|---------|--------|---------------|-------|
| DEBT-001 | ✅ Resolved | 2026-01-14 | Removed unused admin import |
| DEBT-002 | ✅ Resolved | 2026-01-14 | Removed unused TestCase and ValidationError imports |
| DEBT-003 | ✅ Resolved | 2026-01-14 | Removed unused render import |
| DEBT-004 | N/A | - | Re-exports in models.py are for backward compat (kept) |
| DEBT-005 | ✅ Resolved | 2026-01-14 | Removed 5 unused imports from serializers.py |
| DEBT-006 | ✅ Resolved | 2026-01-14 | Removed ProductSearchResponseSerializer import |
| DEBT-007 | ✅ Resolved | 2026-01-14 | Removed 80 lines of dead QueryPerformanceMiddleware, kept decorator |
| DEBT-008 | ✅ Resolved | 2026-01-14 | Removed unused process import from fuzzywuzzy |
| DEBT-009 | ✅ Resolved | 2026-01-14 | Removed unused FilterGroup import |
| DEBT-010 | ✅ Resolved | 2026-01-14 | Removed unused ExamSessionSubjectProduct import |
| DEBT-011 | ✅ Resolved | 2026-01-14 | Removed unused connections and settings imports |

**Tests**: 82/82 passed (2 skipped)
