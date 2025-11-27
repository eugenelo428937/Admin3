# Tasks: Frontend Test Coverage - Modular Reorganization

**Input**: Design documents from `/specs/004-frontend-test-coverage/`
**Prerequisites**: plan.md (required), research.md, data-model.md, quickstart.md
**Branch**: `004-frontend-test-coverage`

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Found: Modular test reorganization plan
   → Extract: Jest + RTL, 4 modules, 80% coverage target
2. Load optional design documents:
   → ✅ data-model.md: Test entity definitions for 4 modules
   → ✅ research.md: Test patterns, priority rankings
   → ✅ quickstart.md: Test commands, templates
3. Generate tasks by category:
   → Setup: Verify test infrastructure
   → Tier 1: Critical foundation tests
   → Tier 2: Business logic tests
   → Tier 3: Supporting function tests
   → Tier 4: Coverage improvement tests
   → Tier 5: Low priority tests
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same module = can run parallel (independent files)
   → Validation tasks after each tier
5. Number tasks sequentially (T001-T030)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All 13 new service tests planned? ✅
   → All 3 new hook tests planned? ✅
   → All context tests (1 new, 2 improve) planned? ✅
   → All util tests (4 new, 3 improve) planned? ✅
9. Return: SUCCESS (30 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Setup & Verification

- [ ] T001 Verify Jest configuration supports module-specific coverage in `frontend/react-Admin3/jest.config.js`
- [ ] T002 [P] Create `__tests__` directory structure if missing in services, hooks, contexts, utils

---

## Phase 3.2: Tier 1 - Critical Foundation (Highest Priority)

**Services - Core Business Logic**
- [ ] T003 [P] Create authService tests in `frontend/react-Admin3/src/services/__tests__/authService.test.js` (10 functions: login, register, logout, etc.)
- [ ] T004 [P] Create productService tests in `frontend/react-Admin3/src/services/__tests__/productService.test.js` (21 functions: product catalog)
- [ ] T005 [P] Create httpService tests in `frontend/react-Admin3/src/services/__tests__/httpService.test.js` (7 functions: HTTP client wrapper)

**Contexts - State Management**
- [ ] T006 Create ProductContext tests in `frontend/react-Admin3/src/contexts/__tests__/ProductContext.test.js` (6 functions - only untested context)

**Utils - Quick Win**
- [ ] T007 [P] Create priceFormatter tests in `frontend/react-Admin3/src/utils/__tests__/priceFormatter.test.js` (1 function - simple, quick win)

**Tier 1 Validation**
- [ ] T008 Run Tier 1 coverage report: `npm test -- --coverage --watchAll=false --collectCoverageFrom='src/services/{auth,product,http}Service.js' --collectCoverageFrom='src/contexts/ProductContext.js' --collectCoverageFrom='src/utils/priceFormatter.js'`

---

## Phase 3.3: Tier 2 - Business Logic

**Services - Product Management**
- [ ] T009 [P] Create bundleService tests in `frontend/react-Admin3/src/services/__tests__/bundleService.test.js` (10 functions: bundle pricing, composition)
- [ ] T010 [P] Create cartService tests in `frontend/react-Admin3/src/services/__tests__/cartService.test.js` (7 functions: cart CRUD - improve existing mock)

**Utils - Complex Business Rules**
- [ ] T011 [P] Create rulesEngineUtils tests in `frontend/react-Admin3/src/utils/__tests__/rulesEngineUtils.test.js` (54 functions - complex, may need decomposition)
- [ ] T012 [P] Create productCodeGenerator tests in `frontend/react-Admin3/src/utils/__tests__/productCodeGenerator.test.js` (9 functions: product code generation)

**Tier 2 Validation**
- [ ] T013 Run Tier 2 coverage report: `npm test -- --coverage --watchAll=false --collectCoverageFrom='src/services/{bundle,cart}Service.js' --collectCoverageFrom='src/utils/{rulesEngineUtils,productCodeGenerator}.js'`

---

## Phase 3.4: Tier 3 - Supporting Functions

**Services - Secondary Features**
- [ ] T014 [P] Create searchService tests in `frontend/react-Admin3/src/services/__tests__/searchService.test.js` (6 functions: product search)
- [ ] T015 [P] Create tutorialService tests in `frontend/react-Admin3/src/services/__tests__/tutorialService.test.js` (9 functions: tutorial management)
- [ ] T016 [P] Create userService tests in `frontend/react-Admin3/src/services/__tests__/userService.test.js` (4 functions: user profile)

**Hooks - Custom React Hooks**
- [ ] T017 [P] Create useApi tests in `frontend/react-Admin3/src/hooks/__tests__/useApi.test.js` (2 functions: generic API hook)
- [ ] T018 [P] Create useProductCardHelpers tests in `frontend/react-Admin3/src/hooks/__tests__/useProductCardHelpers.test.js` (9 functions: product card utilities)
- [ ] T019 [P] Create useRulesEngineAcknowledgments tests in `frontend/react-Admin3/src/hooks/__tests__/useRulesEngineAcknowledgments.test.js` (13 functions: rules acknowledgments)

**Tier 3 Validation**
- [ ] T020 Run Tier 3 coverage report for services and hooks modules

---

## Phase 3.5: Tier 4 - Coverage Improvement

**Contexts - Improve Existing Tests**
- [ ] T021 [P] Improve CartContext tests in `frontend/react-Admin3/src/contexts/__tests__/CartContext.test.js` (11 functions - add missing coverage)
- [ ] T022 [P] Improve TutorialChoiceContext tests in `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js` (44 functions - add missing coverage)

**Utils - Improve Existing Tests**
- [ ] T023 [P] Improve vatUtils tests in `frontend/react-Admin3/src/utils/__tests__/vatUtils.test.js` (6 functions - add edge cases)
- [ ] T024 [P] Improve PerformanceTracker tests in `frontend/react-Admin3/src/utils/__tests__/PerformanceTracker.test.js` (18 functions - add missing coverage)
- [ ] T025 [P] Improve filterUrlManager tests in `frontend/react-Admin3/src/utils/__tests__/filterUrlManager.test.js` (17 functions - add missing coverage)

**Tier 4 Validation**
- [ ] T026 Run Tier 4 coverage report and verify 80% target per module

---

## Phase 3.6: Tier 5 - Low Priority

**Services - Utility Services**
- [ ] T027 [P] Create low-priority service tests:
  - `acknowledgmentService.test.js` (10 functions)
  - `errorTrackingService.test.js` (1 function)
  - `examSessionService.test.js` (5 functions)
  - `loggerService.test.js` (3 functions)
  - `subjectService.test.js` (7 functions)

**Utils - Remaining**
- [ ] T028 [P] Create tutorialMetadataBuilder tests in `frontend/react-Admin3/src/utils/__tests__/tutorialMetadataBuilder.test.js` (6 functions)

---

## Phase 3.7: Final Validation

- [ ] T029 Run full coverage report: `npm test -- --coverage --watchAll=false`
- [ ] T030 Verify 80% coverage target met for each module:
  - services/ ≥ 80% lines, 80% functions, 70% branches
  - hooks/ ≥ 80% lines, 80% functions, 70% branches
  - contexts/ ≥ 80% lines, 80% functions, 70% branches
  - utils/ ≥ 80% lines, 80% functions, 70% branches

---

## Dependencies

```
Setup (T001-T002)
    │
    ▼
Tier 1 Critical (T003-T007) ──► T008 Validation
    │
    ▼
Tier 2 Business (T009-T012) ──► T013 Validation
    │
    ▼
Tier 3 Supporting (T014-T019) ──► T020 Validation
    │
    ▼
Tier 4 Improve (T021-T025) ──► T026 Validation
    │
    ▼
Tier 5 Low Priority (T027-T028)
    │
    ▼
Final Validation (T029-T030)
```

---

## Parallel Execution Examples

### Tier 1 - Launch T003-T005, T007 together:
```bash
# All service tests can run in parallel (different files)
Task: "Create authService tests in services/__tests__/authService.test.js"
Task: "Create productService tests in services/__tests__/productService.test.js"
Task: "Create httpService tests in services/__tests__/httpService.test.js"
Task: "Create priceFormatter tests in utils/__tests__/priceFormatter.test.js"
```

### Tier 3 - Launch T014-T019 together:
```bash
# Services and hooks can run in parallel
Task: "Create searchService tests"
Task: "Create tutorialService tests"
Task: "Create userService tests"
Task: "Create useApi tests"
Task: "Create useProductCardHelpers tests"
Task: "Create useRulesEngineAcknowledgments tests"
```

### Tier 4 - Launch T021-T025 together:
```bash
# Context and util improvements can run in parallel
Task: "Improve CartContext tests"
Task: "Improve TutorialChoiceContext tests"
Task: "Improve vatUtils tests"
Task: "Improve PerformanceTracker tests"
Task: "Improve filterUrlManager tests"
```

---

## Notes

- [P] tasks = different files, no dependencies
- Use `jest.unmock()` pattern for context tests (see quickstart.md)
- Use `__esModule: true` for ES module mocks
- Run `npm test -- --watchAll=false` after each task
- Commit after each task with descriptive message
- T011 (rulesEngineUtils) has 54 functions - may need to break into multiple sessions

---

## Test Patterns Reference

### Service Test Pattern
```javascript
jest.mock('../httpService', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

import serviceName from '../serviceName';
import httpService from '../httpService';
```

### Context Test Pattern
```javascript
// MUST be before imports
jest.unmock('../ContextName');
jest.mock('../../services/serviceName', () => ({...}));

import { ContextProvider, useContextHook } from '../ContextName';
```

### Hook Test Pattern
```javascript
import { renderHook, act, waitFor } from '@testing-library/react';
const { result } = renderHook(() => useHookName(), { wrapper });
```

---

## Validation Checklist

- [x] All 13 new service tests planned (T003-T005, T009-T010, T014-T016, T027)
- [x] All 3 new hook tests planned (T017-T019)
- [x] All context tests planned (T006 new, T021-T022 improve)
- [x] All util tests planned (T007, T011-T012, T023-T025, T028)
- [x] Tests come before validation tasks
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

---

## Summary

| Module | New Tests | Improve Tests | Total Functions |
|--------|-----------|---------------|-----------------|
| services/ | 13 files | 0 | ~100+ functions |
| hooks/ | 3 files | 0 | 24 functions |
| contexts/ | 1 file | 2 files | 61 functions |
| utils/ | 4 files | 3 files | 111 functions |
| **Total** | **21 files** | **5 files** | **~296 functions** |

**Target**: 80% coverage per module
**Estimated Tasks**: 30 (T001-T030)
**Parallel Opportunities**: ~20 tasks marked [P]
