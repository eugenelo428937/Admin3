# Implementation Plan: Global Tutorial Summary Bars Architecture

**Branch**: `001-docs-stories-epic` | **Date**: 2025-10-07 | **Spec**: [ARCHITECTURE_CORRECTION_GLOBAL_SUMMARY_BARS.md](./ARCHITECTURE_CORRECTION_GLOBAL_SUMMARY_BARS.md)
**Input**: Architecture correction specification + Implementation plan

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path → ✅ Loaded architecture correction docs
2. Fill Technical Context → ✅ React 18, Django 5.1, Material-UI v5
3. Fill Constitution Check section → ✅ TDD-first, SOLID principles
4. Evaluate Constitution Check section → ✅ PASS (follows BMAD TDD principles)
5. Execute Phase 0 → research.md → ✅ Architecture correction research complete
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md → ✅ COMPLETE
7. Re-evaluate Constitution Check → ✅ PASS (No violations introduced)
8. Plan Phase 2 → Task generation approach → ✅ COMPLETE
9. STOP - Ready for /tasks command ✅
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

---

## Summary

**Primary Requirement**: Refactor tutorial summary bars from incorrect architecture (separate `/tutorials` route with `TutorialProductList.js`) to correct architecture (global context-driven component visible across all routes).

**Technical Approach**:
- Create `TutorialSummaryBarContainer.js` as global component controlled by `TutorialChoiceContext`
- Integrate at App/Layout level for cross-route visibility
- Remove incorrect `TutorialProductList.js` implementation
- Update navigation to use filtered ProductList instead of separate route
- Implement vertical stacking with flexbox positioning

**Core Principle**: Tutorials are products, not a separate page. Summary bars are global UI elements, not list-managed components.

---

## Technical Context

**Language/Version**:
- **Frontend**: JavaScript (ES6+), React 18.2
- **Backend**: Python 3.11, Django 5.1

**Primary Dependencies**:
- **Frontend**: Material-UI v5 (@mui/material), React Router v6, Axios
- **Backend**: Django REST Framework, PostgreSQL

**Storage**:
- **Frontend**: localStorage (draft choices), React Context API (runtime state)
- **Backend**: PostgreSQL (ACTEDDBDEV01)

**Testing**:
- **Frontend**: Jest, React Testing Library (@testing-library/react)
- **Backend**: pytest, Django TestCase

**Target Platform**:
- **Web**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile**: iOS Safari 14+, Android Chrome 90+
- **Responsive**: 320px (mobile) to 1920px+ (desktop)

**Project Type**: Web application (frontend + backend)

**Performance Goals**:
- Component render time: <50ms for summary bar updates
- Context state updates: <16ms (60fps)
- No layout shift on summary bar mount/unmount

**Constraints**:
- Must maintain 100% backward compatibility with Epic 1 (Tutorial Cart Integration)
- Must preserve all existing tutorial selection functionality
- Summary bars must not block SpeedDial or other UI elements
- Must work across all routes (/, /products, /cart, /checkout)

**Scale/Scope**:
- Affects 4 React components (2 new, 2 modified)
- Updates 1 context (TutorialChoiceContext)
- Removes 1 incorrect component (TutorialProductList)
- ~500-600 lines of new/modified code
- 15-20 test cases (unit + integration)

---

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**TDD-First Enforcement** (from CLAUDE.md):
- ✅ **RED Phase Required**: All features must start with failing tests
- ✅ **GREEN Phase Gated**: Implementation only after test failure confirmed
- ✅ **REFACTOR Phase Documented**: Code improvements tracked in todos
- ✅ **80% Coverage Minimum**: New code must meet coverage threshold

**SOLID Principles** (from spec.md FR-001 to FR-003):
- ✅ **Single Responsibility**: Each component has one clear purpose
  - `TutorialSummaryBarContainer`: Monitor context, render bars, handle actions
  - `TutorialSelectionSummaryBar`: Display one subject's summary
  - `TutorialChoiceContext`: Manage choice state
- ✅ **Open/Closed**: Context extensible without modification
- ✅ **Dependency Inversion**: Components depend on context interface, not implementation

**Simplicity Gates**:
- ✅ **No Over-Engineering**: Using existing patterns (Context API, flexbox positioning)
- ✅ **No Premature Abstraction**: One container, one bar component, minimal indirection
- ✅ **Clear Responsibility Boundaries**: No prop drilling, no duplicate state management

**Violations Requiring Justification**: NONE

---

## Project Structure

### Documentation (this feature)
```
specs/001-docs-stories-epic/
├── plan-global-summary-bars.md              # ✅ This file (/plan command output)
├── spec.md                                  # ✅ Original feature spec
├── research.md                              # ✅ Architecture correction research (Phase 0)
├── ARCHITECTURE_CORRECTION_GLOBAL_SUMMARY_BARS.md  # ✅ Correct architecture spec
├── IMPLEMENTATION_PLAN_CORRECT_ARCHITECTURE.md     # ✅ Detailed implementation guide
├── data-model.md                            # ✅ Phase 1 output (context state model)
├── quickstart.md                            # ✅ Phase 1 output (manual test guide)
├── contracts/                               # ✅ Phase 1 output (component contracts)
│   ├── TutorialSummaryBarContainer.contract.md
│   └── TutorialSelectionSummaryBar.contract.md
└── tasks.md                                 # ⏳ Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
# Web application structure (frontend + backend)
frontend/react-Admin3/
├── src/
│   ├── components/
│   │   ├── Product/
│   │   │   ├── ProductList.js                      # ✅ Existing (no changes needed)
│   │   │   └── ProductCard/
│   │   │       └── Tutorial/
│   │   │           ├── TutorialProductCard.js     # ✅ Existing (minimal changes)
│   │   │           ├── TutorialSummaryBarContainer.js  # 🆕 NEW (Phase 1)
│   │   │           └── TutorialSelectionSummaryBar.js  # ✅ Existing (already correct)
│   │   └── Layout/
│   │       └── MainLayout.js or App.js            # 🔧 MODIFIED (add container)
│   ├── contexts/
│   │   └── TutorialChoiceContext.js               # 🔧 MODIFIED (add product data)
│   └── __tests__/
│       └── components/
│           └── Product/
│               └── ProductCard/
│                   └── Tutorial/
│                       ├── TutorialSummaryBarContainer.test.js  # 🆕 NEW
│                       └── TutorialSelectionSummaryBar.test.js  # ✅ Existing
└── tests/

backend/django_Admin3/
└── [No changes needed for this feature]
```

**Structure Decision**: Web application (Option 2) - Frontend React + Backend Django

---

## Phase 0: Outline & Research ✅ COMPLETE

### Research Complete (Documented in ARCHITECTURE_CORRECTION_GLOBAL_SUMMARY_BARS.md)

**Decision: Global Context-Driven Architecture**
- **What was chosen**: TutorialSummaryBarContainer as App-level component
- **Rationale**:
  - Summary bars must persist across route changes
  - Context API provides single source of truth
  - No prop drilling or parent component coupling
  - Clean separation: ProductList doesn't know about summary bars
- **Alternatives considered**:
  - ❌ List-managed (TutorialProductList): Violates "tutorials are products" principle
  - ❌ Route-based (/tutorials): Creates artificial separation
  - ❌ Portal-based: Unnecessary complexity for fixed positioning

**Decision: Product Data Storage in Context**
- **What was chosen**: Store minimal product metadata in choice objects
- **Rationale**:
  - Enables Add to Cart without API calls
  - Reduces coupling between summary bar and product list
  - Data already available when choice is created
- **Alternatives considered**:
  - ❌ Fetch on Add to Cart: Adds latency and complexity
  - ❌ Global product cache: Over-engineering for this use case
  - ❌ No product data: Cannot build cart payload

**Decision: Dialog Management via Context**
- **What was chosen**: Add dialog state to TutorialChoiceContext
- **Rationale**:
  - Edit button needs to open correct card's dialog
  - Context already manages choice state
  - Avoids event emitter complexity
- **Alternatives considered**:
  - ❌ Event emitter: Additional dependency
  - ❌ URL parameters: Breaks UX flow
  - ❌ Container-managed dialog: Duplicates dialog logic

**Output**: ✅ research.md complete (see ARCHITECTURE_CORRECTION_GLOBAL_SUMMARY_BARS.md)

---

## Phase 1: Design & Contracts ✅ COMPLETE

See detailed design in separate files:
- **data-model.md**: Complete state model for TutorialChoiceContext enhancements
- **contracts/**: Component contracts for TutorialSummaryBarContainer
- **quickstart.md**: 6 manual tests for quick validation

---

## Phase 2: Task Planning Approach ✅ COMPLETE
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data-model.md, quickstart.md)
- TDD order: Contract tests → Implementation → Integration tests
- Parallel execution markers [P] for independent tasks

**Task Structure**:
```
T001: [P] Create failing contract test for TutorialSummaryBarContainer rendering
T002: [P] Create failing contract test for handleAddToCart
T003: [P] Create failing contract test for handleEdit
T004: [P] Create failing contract test for handleRemove
T005: Update TutorialChoiceContext with dialog state (openEditDialog, closeEditDialog)
T006: Update TutorialChoiceContext to store product metadata in choices
T007: Implement TutorialSummaryBarContainer component (make tests pass)
T008: Integrate TutorialSummaryBarContainer in App.js or MainLayout
T009: Update TutorialProductCard to use context dialog state
T010: Create integration test for cross-page visibility
T011: Create integration test for vertical stacking
T012: Manual validation with quickstart.md (all 6 tests)
T013: Remove TutorialProductList.js and update navigation
T014: Full test suite execution (41 existing + 15 new = 56 tests)
T015: Update documentation (CLAUDE.md, Epic 2 completion notes)
```

**Ordering Strategy**:
1. Contract tests first (T001-T004) - all can run in parallel [P]
2. Context updates (T005-T006) - prerequisite for implementation
3. Component implementation (T007) - makes contract tests pass
4. Integration (T008-T009) - connects pieces
5. Integration tests (T010-T011) - validate end-to-end
6. Validation (T012) - manual quickstart testing
7. Cleanup (T013) - remove incorrect implementation
8. Final validation (T014-T015) - ensure no regressions

**Estimated Output**: 15 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

---

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run tests, execute quickstart.md, manual validation with T033 checklist)

---

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | No complexity violations detected    |

**Justification**: This refactoring reduces complexity by:
- Removing incorrect TutorialProductList.js (eliminates duplication)
- Using existing Context API pattern (no new abstractions)
- Fixed positioning with flexbox (simplest stacking solution)
- Dialog state in context (avoids event emitter complexity)

---

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning approach described (/plan command) ✅
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅ (TDD-first, SOLID principles, no over-engineering)
- [x] Post-Design Constitution Check: PASS ✅ (Re-evaluated after Phase 1)
- [x] All NEEDS CLARIFICATION resolved ✅ (Architecture correction research complete)
- [x] Complexity deviations documented ✅ (None - architecture simplifies codebase)

---

**Plan Status**: ✅ **READY FOR TASKS GENERATION**

**Next Step**: Run `/tasks` to break down this plan into actionable TDD tasks

---

*Based on BMAD TDD Constitution (CLAUDE.md) - Test-first development required for all implementations*
