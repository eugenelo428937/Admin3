
# Implementation Plan: Phase 4 - Cart VAT Integration

**Branch**: `004-phase-4` | **Date**: 2025-01-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/work/Documents/Code/Admin3/specs/004-phase-4/spec.md`

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

Phase 4 integrates the Phase 3 composite VAT rules engine with the shopping cart system to provide real-time VAT calculations for cart items. This phase enables customers to see accurate VAT breakdowns based on their country, product types, and applicable regional rules before proceeding to checkout.

**Primary Requirements**:
- Calculate VAT for each cart item using Phase 3 rules engine at `cart_calculate_vat` entry point
- Display VAT-exclusive prices (net price prominent, VAT as separate line item)
- Recalculate VAT when cart modified (add/remove/quantity/country changes)
- Lock VAT rates at order creation with timestamp
- Display error messages with retry capability when VAT calculation fails
- Retain historical VAT data for 2 years for tax audit compliance

**Technical Approach**:
- Extend existing `Cart` and `CartItem` models with VAT calculation fields
- Integrate with Phase 3 `RuleEngine.execute()` at `cart_calculate_vat` entry point
- Store VAT results in cart for caching between modifications
- Create VAT audit trail using existing `VATAudit` model
- Update cart views API to include VAT calculations in responses
- Implement error handling with retry functionality in frontend

## Technical Context
**Language/Version**: Python 3.11, Django 5.1, React 18
**Primary Dependencies**: Django REST Framework, PostgreSQL, Phase 3 Rules Engine, Material-UI
**Storage**: PostgreSQL (existing `acted_carts`, `acted_cart_items`, `vat_audit` tables)
**Testing**: pytest (backend), Jest + React Testing Library (frontend), TDD methodology (RED-GREEN-REFACTOR)
**Target Platform**: Web application (backend API + React SPA)
**Project Type**: web (backend/frontend structure with Django REST + React)
**Performance Goals**: <50ms VAT calculation per cart item, support concurrent calculations for multiple users
**Constraints**: VAT recalculation only on cart modification (cached between changes), 2-year data retention for compliance, must use Phase 3 composite rules without modification
**Scale/Scope**: Existing Admin3 codebase with cart, vat, rules_engine apps; extends 3 models (Cart, CartItem, VATAudit); 6 API endpoints; 4 React components

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: PASS ✅

The project constitution is a template placeholder. Following Django project standards and TDD enforcement rules from CLAUDE.md:

**TDD Compliance**:
- ✅ Tests written before implementation (RED phase)
- ✅ Minimal implementation to pass tests (GREEN phase)
- ✅ Refactoring with tests green (REFACTOR phase)
- ✅ 80% minimum test coverage for new code
- ✅ Phase tracking in TodoWrite tool

**Project Standards**:
- ✅ Extends existing Django apps (cart, vat, rules_engine) - no new projects
- ✅ Uses existing Phase 3 rules engine - no architectural changes
- ✅ Follows Django REST Framework patterns
- ✅ Maintains existing model relationships

**No Violations Detected** - proceeding to Phase 0

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

**Structure Decision**: Option 2 (Web application) - Django REST backend + React frontend detected in Technical Context

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

The `/tasks` command will generate tasks following TDD methodology (RED → GREEN → REFACTOR) with strict test-first approach:

1. **Backend Model Migrations** (Phase RED):
   - T001: Create migration for CartItem VAT fields [P]
   - T002: Create migration for Cart error tracking fields [P]
   - T003: Write model tests for CartItem VAT validations (RED phase - tests fail)
   - T004: Write model tests for Cart VAT calculations (RED phase - tests fail)

2. **Backend Model Implementation** (Phase GREEN):
   - T005: Implement CartItem VAT fields and constraints
   - T006: Implement Cart.calculate_vat_for_all_items() method
   - T007: Implement Cart VAT error tracking
   - T008: Verify model tests pass (GREEN phase)

3. **Backend Signals** (Phase RED → GREEN):
   - T009: Write signal tests for cart modification triggers (RED phase)
   - T010: Implement post_save signal for CartItem → VAT recalculation
   - T011: Implement post_delete signal for CartItem → VAT recalculation
   - T012: Verify signal tests pass (GREEN phase)

4. **Backend API Serializers** (Phase RED → GREEN):
   - T013: Write serializer tests for CartWithVAT response format (RED phase)
   - T014: Implement CartItemVATSerializer
   - T015: Implement CartTotalsSerializer
   - T016: Update CartSerializer with VAT fields
   - T017: Verify serializer tests pass (GREEN phase)

5. **Backend API Endpoints** (Phase RED → GREEN):
   - T018: Write API contract tests for GET /api/cart/ with VAT (RED phase)
   - T019: Write API contract tests for POST /api/cart/items/ with VAT recalc (RED phase)
   - T020: Write API contract tests for PATCH /api/cart/items/{id}/ with VAT recalc (RED phase)
   - T021: Write API contract tests for DELETE /api/cart/items/{id}/ with VAT recalc (RED phase)
   - T022: Write API contract tests for POST /api/cart/vat/recalculate/ (RED phase)
   - T023: Implement CartViewSet.list() with VAT calculations
   - T024: Implement CartItemViewSet with VAT recalculation triggers
   - T025: Implement /api/cart/vat/recalculate/ endpoint
   - T026: Verify all API contract tests pass (GREEN phase)

6. **Backend Integration Tests** (Phase RED → GREEN):
   - T027: Write integration test: UK customer single digital product (RED phase)
   - T028: Write integration test: SA customer multiple mixed products (RED phase)
   - T029: Write integration test: ROW customer zero VAT (RED phase)
   - T030: Write integration test: Quantity change recalculation (RED phase)
   - T031: Write integration test: Item removal recalculation (RED phase)
   - T032: Write integration test: Error handling and retry (RED phase)
   - T033: Verify all integration tests pass (GREEN phase)

7. **Backend Management Command** (Phase RED → GREEN):
   - T034: Write tests for cleanup_vat_audit command (RED phase)
   - T035: Implement cleanup_vat_audit management command (2-year retention)
   - T036: Verify command tests pass (GREEN phase)

8. **Frontend Components** (Phase RED → GREEN):
   - T037: Write tests for CartVATDisplay component (RED phase)
   - T038: Write tests for CartItemWithVAT component (RED phase)
   - T039: Write tests for CartVATError component with retry button (RED phase)
   - T040: Write tests for CartTotals component with VAT breakdown (RED phase)
   - T041: Implement CartVATDisplay component (Material-UI)
   - T042: Implement CartItemWithVAT component
   - T043: Implement CartVATError component with retry functionality
   - T044: Implement CartTotals component with VAT breakdown
   - T045: Verify all frontend component tests pass (GREEN phase)

9. **Frontend Integration** (Phase RED → GREEN):
   - T046: Write tests for Cart page with VAT integration (RED phase)
   - T047: Update Cart page to display VAT calculations
   - T048: Integrate retry button with API recalculate endpoint
   - T049: Verify Cart page integration tests pass (GREEN phase)

10. **Refactoring & Optimization** (Phase REFACTOR):
    - T050: Refactor duplicate VAT calculation logic
    - T051: Optimize database queries (select_related, prefetch_related)
    - T052: Add logging for VAT calculation errors
    - T053: Verify all tests still pass after refactoring

11. **Documentation & Validation**:
    - T054: Update API documentation with VAT endpoints
    - T055: Execute quickstart.md manual test scenarios
    - T056: Run full test suite with coverage (>80% target)
    - T057: Performance testing (VAT calculation <50ms per item)

**Ordering Strategy**:
- Strict TDD order: RED (failing tests) → GREEN (minimal implementation) → REFACTOR
- Dependency order: Migrations → Models → Signals → Serializers → Views → Frontend
- Mark [P] for parallel execution (independent migrations)
- Mark [RED]/[GREEN]/[REFACTOR] phases explicitly

**Parallel Execution Opportunities**:
- T001, T002 (migrations can run in parallel)
- T041-T044 (frontend components can be implemented in parallel after tests written)
- T055-T057 (validation tasks can run in parallel)

**Estimated Output**: 57 numbered, ordered tasks in tasks.md with explicit TDD phase markers

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
- [x] Phase 0: Research complete (/plan command) ✅
  - research.md created with 7 research questions resolved
  - All NEEDS CLARIFICATION from Technical Context resolved
  - Phase 3 integration approach documented
- [x] Phase 1: Design complete (/plan command) ✅
  - data-model.md created (2 model modifications, 9 new fields)
  - contracts/cart-vat-api.yaml created (6 API endpoints)
  - quickstart.md created (6 manual test scenarios)
  - CLAUDE.md updated with Phase 4 tech stack
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
  - 57 tasks outlined with TDD phases (RED → GREEN → REFACTOR)
  - Parallel execution opportunities identified
  - Ordering strategy defined
- [x] Phase 3: Tasks generated (/tasks command) ✅
  - tasks.md created with 57 ordered tasks
  - TDD phases marked (RED → GREEN → REFACTOR)
  - Parallel execution opportunities identified (4 groups)
  - Dependency graph documented
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
  - No architectural changes
  - Extends existing Django apps
  - Follows TDD methodology
- [x] Post-Design Constitution Check: PASS ✅
  - Design maintains existing patterns
  - No new complexity introduced
  - Uses Phase 3 rules engine as-is
- [x] All NEEDS CLARIFICATION resolved ✅
  - All Technical Context questions answered in research.md
  - No ambiguities remaining for implementation
- [x] Complexity deviations documented ✅
  - No deviations - follows existing patterns

**Artifacts Generated**:
- `/Users/work/Documents/Code/Admin3/specs/004-phase-4/plan.md` (this file)
- `/Users/work/Documents/Code/Admin3/specs/004-phase-4/research.md`
- `/Users/work/Documents/Code/Admin3/specs/004-phase-4/data-model.md`
- `/Users/work/Documents/Code/Admin3/specs/004-phase-4/contracts/cart-vat-api.yaml`
- `/Users/work/Documents/Code/Admin3/specs/004-phase-4/quickstart.md`
- `/Users/work/Documents/Code/Admin3/specs/004-phase-4/tasks.md` (57 tasks)
- `/Users/work/Documents/Code/Admin3/CLAUDE.md` (updated)

---
*Based on Django project standards and TDD enforcement from CLAUDE.md*
