
# Implementation Plan: Fix Cart Synchronization Issue

**Branch**: `001-epic-4-story` | **Date**: 2025-10-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-epic-4-story/spec.md`

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
Fix synchronization inconsistency between tutorial summary bar and shopping cart where adding multiple tutorials sequentially results in only the last tutorial appearing in the cart. Root cause investigation indicates potential race conditions in concurrent state updates between TutorialChoiceContext, CartContext, and localStorage. Solution involves implementing atomic state updates, proper operation queueing, and ensuring correct timing of cart API calls with state management operations.

## Technical Context
**Language/Version**: React 18 (JavaScript/ES6+), Django 5.1 (Python 3.11) backend
**Primary Dependencies**: React Context API, Material-UI, Django REST Framework, localStorage API
**Storage**: localStorage (client-side draft state), PostgreSQL via Django ORM (backend cart persistence)
**Testing**: Jest + React Testing Library (frontend), Django test framework (backend API)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web (frontend: React SPA, backend: Django REST API)
**Performance Goals**: Cart sync within 2s on page load, add-to-cart operations within 3s
**Constraints**: <200ms p95 for state updates, maintain backward compatibility with existing localStorage data, no breaking changes to Context API signatures
**Scale/Scope**: Multi-tutorial selection workflows (typically 1-3 tutorials per subject), concurrent state management across 3 React contexts

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Test-Driven Development (MANDATORY from CLAUDE.md)
- ✅ **RED Phase**: Write failing integration tests for multi-tutorial addition workflows
- ✅ **GREEN Phase**: Implement minimal fix to make tests pass (atomic state updates, operation queueing)
- ✅ **REFACTOR Phase**: Clean up implementation while keeping tests green
- ✅ **Test Coverage**: Minimum 80% coverage for new/modified code (Context methods, container logic)

### Integration Testing Requirements
- ✅ Integration tests for multi-tutorial workflows (2+ tutorials added sequentially)
- ✅ Integration tests for page refresh state restoration
- ✅ Integration tests for cart operations from summary bar
- ✅ Unit tests for race condition handling and API failure rollback

### Backward Compatibility
- ✅ No breaking changes to Context API method signatures
- ✅ Existing localStorage data structure supported (migration if needed)
- ✅ All existing tutorial selection workflows continue to function

### Performance Standards
- ✅ Cart synchronization within 2 seconds of page load
- ✅ Add-to-cart operations within 3 seconds under normal conditions
- ✅ State updates < 200ms p95 latency

**GATE STATUS**: PASS - All constitutional requirements identified and will be verified during implementation

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

**Structure Decision**: Option 2 (Web application) - Project uses existing frontend/react-Admin3/ and backend/django_Admin3/ structure

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

### Investigation Phase (Phase 1 of Implementation)
1. **Add Debug Logging** (TDD: Write logging tests first)
   - Contract test: Verify console.log calls occur at each state transition
   - Add logging to TutorialSelectionDialog.onConfirm
   - Add logging to TutorialChoiceContext.addTutorialChoice
   - Add logging to TutorialSummaryBarContainer.handleAddToCart
   - Add logging to CartContext.addToCart/updateCartItem

2. **Reproduce Bug with Logging Enabled**
   - Integration test: Automated test reproducing exact bug scenario
   - Manual test: Follow quickstart.md Scenario 1
   - Capture and analyze timestamp sequences
   - Document root cause findings

### Fix Implementation Phase (Phase 2 of Implementation)
3. **Write Failing Contract Tests** (TDD RED phase)
   - TutorialChoiceContext contract tests (8 tests from contract.md)
   - CartContext contract tests (7 tests from contract.md)
   - All tests must fail before implementation

4. **Write Failing Integration Tests** (TDD RED phase)
   - Multi-tutorial addition test (Scenario 1)
   - Page refresh persistence test (Scenario 2)
   - Rapid sequential addition test (Scenario 5)
   - Tests must fail, documenting current bug

5. **Implement Atomic State Updates** (TDD GREEN phase)
   - Modify handleAddToCart to build complete payload before API call
   - Implement snapshot-based rollback for error handling
   - Update CartContext methods to preserve atomicity
   - Tests should now pass

6. **Implement localStorage Debouncing** (TDD GREEN phase)
   - Add 300ms debounce to localStorage writes in TutorialChoiceContext
   - Write unit tests for debounce behavior
   - Verify no rapid write conflicts

7. **Refactor and Clean Up** (TDD REFACTOR phase)
   - Remove debug logging code
   - Extract helper functions for readability
   - Add inline comments explaining fix rationale
   - All tests must remain passing

### Testing and Validation Phase (Phase 3 of Implementation)
8. **Run Full Test Suite**
   - Execute all contract tests (should pass)
   - Execute all integration tests (should pass)
   - Verify 80%+ code coverage on modified files
   - Fix any failing tests

9. **Manual Quickstart Validation**
   - Execute all 5 scenarios from quickstart.md
   - Measure performance (cart sync < 2s, add-to-cart < 3s)
   - Verify no console errors
   - Document any issues found

10. **Cross-Browser Testing**
    - Test on Chrome, Firefox, Safari
    - Verify localStorage compatibility
    - Verify performance targets met on all browsers

**Ordering Strategy**:
- **Phase 1 (Investigation)**: Sequential (logging → reproduce → analyze)
- **Phase 2 (Fix)**: TDD order (tests → implementation → refactor)
- **Phase 3 (Validation)**: Sequential (unit → integration → manual → browsers)

**Parallelization Opportunities** [P]:
- Contract tests can be written in parallel (TutorialChoiceContext [P], CartContext [P])
- Integration tests can be written in parallel (different scenarios)
- Browser testing can be done in parallel (Chrome [P], Firefox [P], Safari [P])

**Estimated Output**: 15-20 numbered, ordered tasks in tasks.md

**Critical Dependencies**:
- Task 3 depends on Task 2 (root cause must be confirmed)
- Tasks 5-6 depend on Task 3-4 (tests must exist and fail)
- Task 7 depends on Tasks 5-6 (implementation must be complete)
- Tasks 8-10 depend on Task 7 (code must be clean)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

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
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (TDD requirements identified)
- [x] Post-Design Constitution Check: PASS (no constitutional violations in design)
- [x] All NEEDS CLARIFICATION resolved (Technical Context complete)
- [x] Complexity deviations documented (None - straightforward bug fix within existing architecture)

**Artifacts Generated**:
- [x] research.md (Phase 0) - Root cause analysis, patterns research, implementation recommendations
- [x] data-model.md (Phase 1) - Entity structures, state flows, validation rules
- [x] contracts/tutorial-choice-context.contract.md (Phase 1) - API contract with 8 contract tests
- [x] contracts/cart-context.contract.md (Phase 1) - API contract with 7 contract tests
- [x] quickstart.md (Phase 1) - 5 test scenarios with success criteria
- [x] CLAUDE.md updated (Phase 1) - Added React 18, Django 5.1, Context API, localStorage context

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
