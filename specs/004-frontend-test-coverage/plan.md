# Implementation Plan: Frontend Test Coverage - Modular Reorganization

**Branch**: `004-frontend-test-coverage` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-frontend-test-coverage/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded spec.md - Modular test reorganization with 80% coverage target
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ All technical details resolved from existing infrastructure
   → Detect Project Type: web (frontend + backend)
   → Set Structure Decision: Option 2 (Web application)
3. Fill the Constitution Check section
   → ✅ TDD principles align with test coverage goals
4. Evaluate Constitution Check section
   → ✅ PASS - No violations, test-first approach maintained
5. Execute Phase 0 → research.md
   → ✅ Complete - See research.md
6. Execute Phase 1 → data-model.md, quickstart.md
   → ✅ Complete - See generated artifacts
7. Re-evaluate Constitution Check
   → ✅ PASS - Design maintains simplicity
8. Plan Phase 2 → Describe task generation approach
   → ✅ Complete - See below
9. STOP - Ready for /tasks command
   → ✅ Ready
```

## Summary

This plan establishes a modular test suite reorganization for the React frontend, targeting 80% coverage across four foundational modules: services (16 files), hooks (8 files), contexts (3 files), and utils (7 files). The approach uses existing Jest + React Testing Library infrastructure with established patterns from working test files.

## Technical Context
**Language/Version**: JavaScript/ES6+ (React 19.1.0)
**Primary Dependencies**: Jest, @testing-library/react 16.3.0, MSW 2.11.6
**Storage**: N/A (frontend testing)
**Testing**: Jest (via react-scripts), React Testing Library
**Target Platform**: Web browser (Chrome, Firefox, Safari, Edge)
**Project Type**: web (frontend testing within existing React application)
**Performance Goals**: Tests complete in <5 minutes total
**Constraints**: Must work with existing global mocks in setupTests.js
**Scale/Scope**: 34 source files requiring tests across 4 modules

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Test-First Development | ✅ PASS | Project is specifically about writing tests |
| Simplicity | ✅ PASS | Using existing patterns, no new frameworks |
| Library-First | N/A | Testing infrastructure, not new libraries |
| Observability | ✅ PASS | Coverage reports provide visibility |

**Initial Constitution Check**: ✅ PASS
**Post-Design Constitution Check**: ✅ PASS

## Project Structure

### Documentation (this feature)
```
specs/004-frontend-test-coverage/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output - test patterns research
├── data-model.md        # Phase 1 output - test entity definitions
├── quickstart.md        # Phase 1 output - test commands guide
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (test files to create/improve)
```
frontend/react-Admin3/src/
├── services/__tests__/
│   ├── authService.test.js          # NEW
│   ├── bundleService.test.js        # NEW
│   ├── cartService.test.js          # NEW (improve existing mock)
│   ├── productService.test.js       # NEW
│   ├── httpService.test.js          # NEW
│   ├── searchService.test.js        # NEW
│   ├── tutorialService.test.js      # NEW
│   ├── userService.test.js          # NEW
│   ├── acknowledgmentService.test.js # NEW
│   ├── errorTrackingService.test.js # NEW
│   ├── examSessionService.test.js   # NEW
│   ├── loggerService.test.js        # NEW
│   ├── subjectService.test.js       # NEW
│   ├── phoneValidationService.test.js # EXISTS
│   ├── addressMetadataService.test.js # EXISTS
│   └── rulesEngineService.test.js   # EXISTS
│
├── hooks/__tests__/
│   ├── useApi.test.js               # NEW
│   ├── useProductCardHelpers.test.js # NEW
│   ├── useRulesEngineAcknowledgments.test.js # NEW
│   ├── useAuth.test.js              # EXISTS
│   ├── useCheckoutRulesEngine.test.js # EXISTS
│   ├── useCheckoutValidation.test.js # EXISTS
│   └── useProductsSearch.test.js    # EXISTS
│
├── contexts/__tests__/
│   ├── ProductContext.test.js       # NEW
│   ├── CartContext.test.js          # IMPROVE
│   └── TutorialChoiceContext.test.js # IMPROVE
│
└── utils/__tests__/
    ├── priceFormatter.test.js       # NEW
    ├── productCodeGenerator.test.js # NEW
    ├── rulesEngineUtils.test.js     # NEW
    ├── tutorialMetadataBuilder.test.js # NEW
    ├── vatUtils.test.js             # IMPROVE
    ├── PerformanceTracker.test.js   # IMPROVE
    └── filterUrlManager.test.js     # IMPROVE
```

**Structure Decision**: Option 2 (Web application) - Tests within existing frontend structure

## Phase 0: Outline & Research
**Status**: ✅ Complete

### Research Tasks Completed:
1. ✅ Analyzed existing test infrastructure (Jest + RTL)
2. ✅ Documented global mock patterns in setupTests.js
3. ✅ Identified `jest.unmock()` pattern for context tests
4. ✅ Cataloged all modules with coverage gaps
5. ✅ Established test file templates per module type
6. ✅ Determined priority order for implementation

**Output**: [research.md](./research.md) with all patterns documented

## Phase 1: Design & Contracts
**Status**: ✅ Complete

### Design Tasks Completed:
1. ✅ Documented test entities in data-model.md
2. ✅ Created test file templates for each module type
3. ✅ Established naming conventions and structure
4. ✅ Defined coverage targets per module (80%)
5. ✅ Created quickstart.md with test commands

**Output**:
- [data-model.md](./data-model.md) - Test entity definitions
- [quickstart.md](./quickstart.md) - Test commands and templates

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

Tasks will be organized by module priority with TDD approach:

**Tier 1: Critical Foundation (Highest Priority)**
- Services: authService, productService, httpService
- Contexts: ProductContext
- Utils: priceFormatter (quick win)

**Tier 2: Business Logic**
- Services: bundleService, cartService
- Utils: rulesEngineUtils, productCodeGenerator

**Tier 3: Supporting Functions**
- Services: searchService, tutorialService, userService
- Hooks: useApi, useProductCardHelpers, useRulesEngineAcknowledgments

**Tier 4: Coverage Improvement**
- Contexts: CartContext, TutorialChoiceContext
- Utils: vatUtils, PerformanceTracker, filterUrlManager

**Tier 5: Low Priority**
- Services: acknowledgmentService, errorTrackingService, examSessionService, loggerService, subjectService
- Utils: tutorialMetadataBuilder

### Ordering Strategy
- TDD order: Create test file → Verify initial failures → Verify coverage
- Module order: Services → Contexts → Utils → Hooks
- Priority order: Critical → Business → Supporting → Improvement → Low
- Mark [P] for parallel execution (independent files within same tier)

### Estimated Output
- **25-30 tasks** covering all modules
- Each task creates/improves one test file
- Verification task after each tier

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD)
**Phase 5**: Validation (run coverage reports, verify 80% per module)

## Complexity Tracking
*No violations requiring justification*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - 30 tasks in tasks.md
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none needed)

---
*Ready for `/tasks` command to generate tasks.md*
