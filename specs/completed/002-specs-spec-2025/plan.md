
# Implementation Plan: VAT Calculation - Phase 2 Custom Functions

**Branch**: `002-specs-spec-2025` | **Date**: 2025-10-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/work/Documents/Code/Admin3/specs/002-specs-spec-2025/spec.md`

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
Implement three granular custom functions for the Rules Engine to enable dynamic VAT calculations without hardcoded Python logic. These functions (`lookup_region`, `lookup_vat_rate`, `calculate_vat_amount`) will query database models (UtilsCountryRegion, UtilsCountrys) and perform Decimal calculations with proper rounding, enabling finance administrators to update VAT rates through Django admin without code deployments.

## Technical Context
**Language/Version**: Python 3.14+ (Django 5.1)
**Primary Dependencies**: Django ORM, Python Decimal library, Rules Engine FUNCTION_REGISTRY
**Storage**: PostgreSQL (existing UtilsCountrys, UtilsCountryRegion models from Phase 1)
**Testing**: Django TestCase, 100% code coverage requirement for custom functions
**Target Platform**: Django backend service (existing Admin3 application)
**Project Type**: Web (backend-only for this phase, frontend exists but unchanged)
**Performance Goals**: < 5ms per function call (1-2ms calculations, 3-5ms database queries)
**Constraints**: Decimal precision (2 places, ROUND_HALF_UP), no exceptions raised, safe defaults
**Scale/Scope**: 3 custom functions, ~150 LOC implementation, 20+ test scenarios, used in cart calculations

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Test-Driven Development (TDD) - MANDATORY**:
- ✅ **RED Phase First**: All 3 custom functions will have failing tests written before implementation
- ✅ **Test Coverage**: 100% code coverage required (exceeds 80% minimum)
- ✅ **Test Organization**: Tests in `backend/django_Admin3/rules_engine/tests/test_vat_custom_functions.py`
- ✅ **TDD Workflow**: RED → GREEN → REFACTOR cycle for each function

**Database Best Practices**:
- ✅ **ORM Only**: Django ORM queries, no raw SQL
- ✅ **Query Optimization**: select_related for foreign keys, proper indexing
- ✅ **Safe Queries**: DoesNotExist exceptions handled, safe defaults returned

**Performance Requirements**:
- ✅ **Latency Target**: < 5ms per function (specified in FR-048)
- ✅ **No N+1 Queries**: Efficient queries even in loops (FR-049)

**Code Quality**:
- ✅ **Decimal Precision**: ROUND_HALF_UP for monetary calculations
- ✅ **Error Handling**: No unhandled exceptions, graceful degradation
- ✅ **Logging**: Warnings for unexpected database states

**Status**: ✅ **PASS** - No constitutional violations. Follows TDD, database, and code quality standards.

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

**Structure Decision**: Option 2 (Web application) - Backend only for Phase 2, frontend exists but unchanged

**Implementation Location**:
- Functions: `backend/django_Admin3/rules_engine/custom_functions.py` (append to existing)
- Tests: `backend/django_Admin3/rules_engine/tests/test_vat_custom_functions.py` (new file)

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
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Follow TDD methodology strictly (RED → GREEN → REFACTOR)

**Task Breakdown by Function** (3 functions × TDD cycle):

1. **RED Phase Tasks** (one per function):
   - Task: Write failing test for `lookup_region` (8 test scenarios from contract)
   - Task: Write failing test for `lookup_vat_rate` (6 test scenarios from contract)
   - Task: Write failing test for `calculate_vat_amount` (6 test scenarios from contract)

2. **GREEN Phase Tasks** (one per function):
   - Task: Implement `lookup_region` function (minimal code to pass tests)
   - Task: Implement `lookup_vat_rate` function (minimal code to pass tests)
   - Task: Implement `calculate_vat_amount` function (minimal code to pass tests)

3. **REFACTOR Phase Tasks** (combined):
   - Task: Refactor all three functions (optimize queries, improve readability)
   - Task: Verify 100% test coverage

4. **Integration Tasks**:
   - Task: Register functions in FUNCTION_REGISTRY
   - Task: Run quickstart.md verification
   - Task: Performance validation (< 5ms target)

**Ordering Strategy**:
- Strict TDD order: RED → GREEN → REFACTOR for each function
- Sequential within function (can't implement before test fails)
- Functions can be done in parallel after RED phase [P]
- Final integration tasks are sequential

**Estimated Output**: ~12-15 numbered, ordered tasks in tasks.md

**File Organization**:
- All tests in: `backend/django_Admin3/rules_engine/tests/test_vat_custom_functions.py`
- All functions in: `backend/django_Admin3/rules_engine/custom_functions.py`
- Registry update in same file as functions

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
- [x] Phase 0: Research complete (/plan command) ✅ 2025-10-12
- [x] Phase 1: Design complete (/plan command) ✅ 2025-10-12
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅ 2025-10-12
- [ ] Phase 3: Tasks generated (/tasks command) - NEXT STEP
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅ (none existed)
- [x] Complexity deviations documented ✅ (none exist)

**Artifacts Generated**:
- [x] research.md - Research decisions and best practices
- [x] data-model.md - Custom functions and database model documentation
- [x] contracts/ - Function contracts (3 files)
  - lookup_region_contract.md
  - lookup_vat_rate_contract.md
  - calculate_vat_amount_contract.md
- [x] quickstart.md - Verification script and integration guide
- [x] CLAUDE.md - Updated with Phase 2 context

**Ready for /tasks Command**: ✅ YES

---
*Based on TDD Constitution from CLAUDE.md - 100% test coverage enforced*
