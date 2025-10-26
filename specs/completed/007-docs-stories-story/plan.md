
# Implementation Plan: Extract Long Methods from FiltersSlice

**Branch**: `007-docs-stories-story` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-docs-stories-story/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
This feature refactors the filtersSlice.js (currently 532 lines) into smaller, focused modules to address the God Object code smell. The primary requirement is to split filter state management into three dedicated modules (base filters, navigation filters, and selectors) while maintaining 100% backward compatibility with all existing imports. The refactoring will improve code maintainability, testability, and developer experience by reducing the main slice to ~100-150 lines and organizing code by single responsibility.

## Technical Context
**Language/Version**: JavaScript ES6+, React 18
**Primary Dependencies**: Redux Toolkit (@reduxjs/toolkit), reselect (for memoized selectors)
**Storage**: Redux store (in-memory state management)
**Testing**: Jest + React Testing Library
**Target Platform**: Web browsers (modern ES6+ support)
**Project Type**: web (frontend only - React application)
**Performance Goals**: URL sync < 5ms (currently 0.069ms avg), selector memoization for optimal re-renders
**Constraints**: Zero breaking changes, all 96 existing tests must pass, module size < 200 lines each
**Scale/Scope**: 5 filter types, 45+ actions, 15+ selectors across 4 new modules (baseFilters, navigationFilters, selectors, main slice)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: No project-specific constitution defined (template not filled)
**Default Principles Applied**:
- ✅ **Test-First (TDD)**: All refactoring will follow RED-GREEN-REFACTOR cycle
- ✅ **Zero Breaking Changes**: Existing imports must work identically
- ✅ **Single Responsibility**: Each module has one clear purpose
- ✅ **Backward Compatibility**: Public API remains unchanged

**Initial Check**: PASS - This is a refactoring task that improves code quality without changing behavior

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - Frontend React app with existing structure at `/frontend/react-Admin3/`

**Actual Project Structure** (existing):
```
frontend/react-Admin3/
├── src/
│   ├── store/
│   │   ├── slices/
│   │   │   ├── filtersSlice.js (CURRENT - 532 lines, to be refactored)
│   │   │   ├── baseFilters.slice.js (NEW - core filter actions)
│   │   │   ├── navigationFilters.slice.js (NEW - navbar filter actions)
│   │   │   └── filterSelectors.js (NEW - all selectors)
│   │   ├── middleware/
│   │   │   └── urlSyncMiddleware.js (existing - not modified)
│   │   └── index.js (existing - not modified)
│   └── __tests__/
│       └── store/
│           └── slices/
│               ├── filtersSlice.test.js (existing - 43 tests)
│               ├── baseFilters.test.js (NEW)
│               ├── navigationFilters.test.js (NEW)
│               └── filterSelectors.test.js (NEW)
```

## Phase 0: Outline & Research ✅ COMPLETE

**Status**: All technical context clarified, no unknowns remain

**Research Completed**:
1. ✅ Redux Toolkit slice composition patterns (decision: reducer composition with re-exports)
2. ✅ Selector organization and memoization (decision: centralized selectors module)
3. ✅ Test strategy for refactored modules (decision: unit tests per module + integration)
4. ✅ Module boundaries and responsibilities (decision: split by domain and usage pattern)
5. ✅ Backward compatibility strategy (decision: facade pattern with re-exports)
6. ✅ Migration path and rollback plan (decision: feature branch with comprehensive testing)

**Output**: ✅ research.md created with all decisions documented

**Key Findings**:
- No breaking changes required - re-export pattern maintains all existing imports
- Module split: baseFilters (core), navigationFilters (navbar), selectors (accessors), main (facade)
- Testing approach: 30-40 new module tests + all 96 existing tests must pass
- Performance maintained through selector memoization and efficient composition

## Phase 1: Design & Contracts ✅ COMPLETE

**Status**: All design artifacts created, contracts defined

**Design Artifacts Created**:
1. ✅ **data-model.md**: Documented state distribution across modules, validation rules, module contracts
2. ✅ **contracts/** directory:
   - `baseFilters-module-contract.md`: 35 reducer functions, initial state, ~35 test requirements
   - `navigationFilters-module-contract.md`: 5 navigation actions, drill-down patterns, ~15 test requirements
   - `filterSelectors-module-contract.md`: 15+ selectors with memoization strategy, ~25 test requirements
3. ✅ **quickstart.md**: 10-step verification guide for post-implementation testing
4. ✅ **CLAUDE.md**: Updated with Redux Toolkit, React 18, and reselect context

**Module Design Summary**:

**Base Filters Module** (`baseFilters.slice.js`):
- Initial state: 14 state properties (filters, search, pagination, UI, loading, metadata)
- 35 reducer functions: set (7), toggle (5), remove (5), clear (2), pagination (2), UI (2), loading/error (3), utility (4), filter counts (1)
- Estimated ~180 lines

**Navigation Filters Module** (`navigationFilters.slice.js`):
- No separate state (operates on base filter state)
- 5 reducer functions: navSelectSubject, navViewAllProducts, navSelectProductGroup, navSelectProduct, navSelectModeOfDelivery
- Special clearing behaviors for drill-down UX
- Estimated ~100 lines

**Filter Selectors Module** (`filterSelectors.js`):
- 11 basic selectors (direct state access)
- 2 validation selectors
- 3 derived selectors (memoized with createSelector)
- Estimated ~150 lines

**Main Filters Slice** (`filtersSlice.js`):
- Combines all modules via spread operator
- Re-exports all 40+ actions
- Re-exports all 16+ selectors
- Adds validation actions (validateFilters, clearValidationErrors)
- Estimated ~120 lines (down from 532)

**Test Requirements**:
- Base filters: ~35 unit tests
- Navigation filters: ~15 unit tests
- Selectors: ~25 unit tests
- Integration: 43 existing tests must pass
- **Total**: ~118 tests (75 new + 43 existing)

**Post-Design Constitution Check**: ✅ PASS
- Single Responsibility maintained: Each module has one clear purpose
- Zero Breaking Changes: All exports maintained via re-export pattern
- Test-First Ready: All contracts define test requirements before implementation
- Performance maintained: Memoization strategy documented

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

The `/tasks` command will generate tasks following strict TDD (RED-GREEN-REFACTOR) principles:

### Task Categories

**1. Test Tasks (RED phase)**:
- Base filters unit tests (35 tests): `baseFilters.test.js`
- Navigation filters unit tests (15 tests): `navigationFilters.test.js`
- Selectors unit tests (25 tests): `filterSelectors.test.js`
- Each test task must be marked [P] (parallel) as tests are independent

**2. Implementation Tasks (GREEN phase)**:
- Create `baseFilters.slice.js` module
- Create `navigationFilters.slice.js` module
- Create `filterSelectors.js` module
- Refactor `filtersSlice.js` to use modules
- Each implementation task follows corresponding test task

**3. Integration Tasks**:
- Verify all 43 existing tests pass
- Run quickstart verification steps
- Performance validation (URL sync < 5ms)

**4. Refactoring Tasks (REFACTOR phase)**:
- Code review for module separation
- Documentation updates
- Line count verification (each module < 200 lines)

### Task Ordering Strategy

**Strict TDD Order**:
1. Write failing tests for base filters → Implement base filters module
2. Write failing tests for navigation filters → Implement navigation filters module
3. Write failing tests for selectors → Implement selectors module
4. Write failing tests for main slice integration → Refactor main slice
5. Verify all existing tests pass → Fix any regressions
6. Run quickstart validation → Fix any issues

**Dependency Order**:
- Base filters module first (no dependencies)
- Navigation filters module second (uses base filter state)
- Selectors module third (reads all state)
- Main slice refactor last (combines all modules)

**Parallelization**:
- Test files: Mark [P] - can be written in parallel
- Implementation: Sequential (must follow TDD cycle)
- Verification: Sequential (must run after implementation)

### Estimated Output

**Total Tasks**: ~18-22 tasks

**Task Breakdown**:
1. Setup and verification (2 tasks)
2. Base filters: Write tests + Implement (2 tasks)
3. Navigation filters: Write tests + Implement (2 tasks)
4. Selectors: Write tests + Implement (2 tasks)
5. Main slice: Write integration tests + Refactor (2 tasks)
6. Verification: Existing tests + Quickstart + Performance (3 tasks)
7. Refactoring: Code review + Documentation + Line count check (3 tasks)
8. Completion: Commit and review (2 tasks)

**Example Task Structure**:
```markdown
## Task 1: Write Base Filters Unit Tests [P]
- Create baseFilters.test.js
- Write 35 test cases covering all reducers
- Tests should FAIL (no implementation yet)
- Verify tests run and fail as expected

## Task 2: Implement Base Filters Module
- Create baseFilters.slice.js
- Implement baseFiltersInitialState
- Implement baseFiltersReducers (35 functions)
- Run tests - should now PASS
- Verify module is < 200 lines
```

### TDD Enforcement

**Each implementation task must**:
1. Reference the test task it makes pass
2. Run tests before implementation (verify RED)
3. Implement minimal code to pass tests (GREEN)
4. Refactor for clarity while keeping tests green (REFACTOR)
5. Report test status (passing/failing)

**IMPORTANT**: This phase is executed by the `/tasks` command, NOT by `/plan`

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning approach described (/plan command - describe approach only) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [ ] Phase 4: Implementation execution (manual or via /implement) - NEXT STEP
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved (none existed) ✅
- [x] Complexity deviations documented (none - straightforward refactoring) ✅

**Artifacts Generated**:
- [x] research.md (6 research questions + findings)
- [x] data-model.md (state distribution, module contracts)
- [x] contracts/baseFilters-module-contract.md
- [x] contracts/navigationFilters-module-contract.md
- [x] contracts/filterSelectors-module-contract.md
- [x] quickstart.md (10-step verification guide)
- [x] CLAUDE.md updated (agent context)
- [x] tasks.md (17 implementation tasks with TDD workflow)

**Ready For**: Implementation execution (T001-T017)

---
*Based on Constitution v2.1.1 - See `.specify/memory/constitution.md`*
*No project-specific constitution defined - using default principles*
