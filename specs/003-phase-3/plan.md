
# Implementation Plan: VAT Calculation - Phase 3 Composite Rules

**Branch**: `003-phase-3` | **Date**: 2025-10-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/work/Documents/Code/Admin3/specs/003-phase-3/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅
   → Loaded: 78 functional requirements for composite rule hierarchy
2. Fill Technical Context ✅
   → Language: Python 3.11 (Django 5.1)
   → Dependencies: Rules Engine, Phase 2 custom functions
   → Storage: PostgreSQL (ActedRule, ActedRulesFields models)
3. Fill Constitution Check section ✅
   → TDD mandatory (from CLAUDE.md)
   → Test coverage: 80% minimum (100% target)
4. Evaluate Constitution Check ✅
   → Status: PASS (no violations)
5. Execute Phase 0 → research.md ✅
   → Completed (see research.md)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md ✅
   → Completed (see Phase 1 artifacts)
7. Re-evaluate Constitution Check ✅
   → Status: PASS (design follows TDD principles)
8. Plan Phase 2 → Task generation approach ✅
   → Strategy: TDD-first, rule-by-rule creation
9. STOP - Ready for /tasks command ✅
```

**IMPORTANT**: The /plan command STOPS at step 9. Phase 2 (tasks.md) is executed by /tasks command.

## Summary

Implement composite rule hierarchy for dynamic VAT calculations using Rules Engine. Create 17 rules (1 master + 5 regional + 11 product-specific) stored as JSONB in PostgreSQL. Master rule delegates to regional rules based on customer location, regional rules delegate to product-specific rules based on product type. All rules call Phase 2 custom functions (`lookup_region`, `lookup_vat_rate`, `calculate_vat_amount`) to perform database lookups and calculations. Finance administrators can modify VAT logic via Django admin without code deployments.

## Technical Context

**Language/Version**: Python 3.11+ (Django 5.1)
**Primary Dependencies**: Django ORM, Rules Engine (ActedRule model), Phase 2 custom functions, JSONLogic for condition evaluation
**Storage**: PostgreSQL with JSONB fields for rule definitions (ActedRule table), audit trail in RuleExecution table
**Testing**: Django TestCase, 80% minimum code coverage (target 100%), integration tests with full rule execution flow
**Target Platform**: Django backend service (existing Admin3 application)
**Project Type**: Web (backend-only for this phase, Rules Engine integration)
**Performance Goals**: < 50ms total VAT calculation time for typical cart (3-5 items)
**Constraints**: Rules must execute in priority order, context must pass through entire chain, no exceptions during rule execution
**Scale/Scope**: 17 total rules (1 master, 5 regional, 11 product-specific), support 5 regions (UK, IE, EU, SA, ROW), handle 4+ product types per region

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Test-Driven Development (TDD) - MANDATORY** (from CLAUDE.md):
- ✅ **RED Phase First**: Tests written before rule creation
- ✅ **Test Coverage**: 80% minimum (targeting 100%)
- ✅ **Test Organization**: Tests in `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
- ✅ **TDD Workflow**: RED → GREEN → REFACTOR cycle for each rule type

**Database Best Practices** (from CLAUDE.md):
- ✅ **ORM Only**: Django ORM for ActedRule CRUD operations
- ✅ **Query Optimization**: Proper indexing on entry_point, priority fields
- ✅ **Safe Queries**: Transaction-wrapped rule execution

**Performance Requirements**:
- ✅ **Latency Target**: < 50ms for full cart VAT calculation (FR-specific)
- ✅ **Rule Ordering**: Priority-based execution with deterministic fallback to creation date

**Code Quality**:
- ✅ **JSONB Validation**: Rules validated before saving to database
- ✅ **Error Handling**: Rules Engine handles execution failures gracefully
- ✅ **Audit Trail**: All rule executions logged in RuleExecution table

**Status**: ✅ **PASS** - No constitutional violations. Follows TDD, database, and Rules Engine best practices.

## Project Structure

### Documentation (this feature)
```
specs/003-phase-3/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── master_rule_contract.md
│   ├── regional_rules_contract.md
│   └── product_rules_contract.md
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (backend focus)
backend/django_Admin3/
├── rules_engine/
│   ├── models/
│   │   ├── acted_rule.py              # Existing (JSONB rule storage)
│   │   ├── acted_rules_fields.py      # Existing (JSON Schema validation)
│   │   └── rule_execution.py          # Existing (audit trail)
│   ├── services/
│   │   └── rule_engine.py             # Existing (rule execution orchestrator)
│   ├── custom_functions.py            # Phase 2 output (lookup_region, lookup_vat_rate, calculate_vat_amount)
│   ├── management/
│   │   └── commands/
│   │       └── setup_vat_composite_rules.py  # NEW (Phase 3 - rule creation script)
│   └── tests/
│       ├── test_vat_custom_functions.py      # Phase 2 output
│       ├── test_composite_vat_rules.py       # NEW (Phase 3 - rule execution tests)
│       └── test_vat_integration.py           # NEW (Phase 3 - end-to-end tests)
└── utils/
    └── models.py                      # Phase 1 output (UtilsRegion, UtilsCountrys, UtilsCountryRegion)
```

**Structure Decision**: Option 2 (Web application) - Backend only for Phase 3, no frontend changes

**Implementation Location**:
- Management Command: `backend/django_Admin3/rules_engine/management/commands/setup_vat_composite_rules.py`
- Tests: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
- Integration Tests: `backend/django_Admin3/rules_engine/tests/test_vat_integration.py`

## Phase 0: Outline & Research

### Research Goals

1. **Rules Engine Architecture Review**:
   - Understand ActedRule JSONB schema structure
   - Review JSONLogic condition evaluation
   - Study action types (call_function, update_context, stop_processing)
   - Analyze priority-based execution flow

2. **Rule Delegation Patterns**:
   - Research best practices for rule chaining
   - Understand context passing between rules
   - Study stopOnMatch and priority interaction
   - Review audit trail requirements

3. **Management Command Best Practices**:
   - Idempotent rule creation (get_or_create patterns)
   - Versioning strategy for rule updates
   - Rollback capabilities
   - Dry-run mode for testing

### Research Decisions

See `research.md` for detailed decisions on:
- Rule priority strategy (100 master, 90 regional, 80-95 product)
- Context structure for delegation
- JSONB schema validation approach
- Testing strategy (unit + integration)
- Management command idempotency patterns

**Output**: research.md with all technology choices documented

## Phase 1: Design & Contracts

### Entities Extracted from Spec

**Primary Entities**:
1. **Master Rule** (`calculate_vat`): Single entry point, delegates based on region
2. **Regional Rules** (5 rules): UK, IE, EU, SA, ROW - delegate based on product type
3. **Product Rules** (11 rules): Product-specific VAT calculation logic

**Data Structures**:
- ActedRule (JSONB): Rule definitions with conditions and actions
- ActedRulesFields (JSON Schema): Context validation schemas
- RuleExecution (audit): Execution history with context snapshots

### Contracts Generated

**Contract 1: Master Rule** (`contracts/master_rule_contract.md`):
- Input: Cart item, country code, user context
- Actions: Call `lookup_region()`, delegate to regional rule
- Output: Updated context with region field
- Priority: 100

**Contract 2: Regional Rules** (`contracts/regional_rules_contract.md`):
- Input: Cart item, country code, region (from master)
- Actions: Call `lookup_vat_rate()`, delegate to product rule or calculate default
- Output: Updated context with vat_rate field
- Priority: 90

**Contract 3: Product Rules** (`contracts/product_rules_contract.md`):
- Input: Cart item, vat_rate (from regional), net_amount
- Actions: Call `calculate_vat_amount()`, update cart item
- Output: Cart item with vat_amount and gross_amount
- Priority: 80-95 (higher for more specific product types)

### Test Scenarios from User Stories

**Integration Test Scenarios** (from spec.md acceptance scenarios):
1. UK customer purchases digital product → £10 VAT on £50 net
2. South Africa customer purchases printed material → R75 VAT on R500 net
3. EU customer purchases tutorial → Correct country-specific VAT
4. UK customer purchases multiple product types → Individual VAT per item
5. Ireland customer purchases PBOR product → €18.40 VAT on €80 net

**Edge Case Test Scenarios**:
1. Unknown region falls back to ROW (zero VAT)
2. Product type not matched by specific rule (regional default applied)
3. Zero net amount cart item (zero VAT returned)
4. Extremely high-value transaction (Decimal precision maintained)
5. Inactive country in database (safe default from Phase 2 functions)

### Quickstart Validation

See `quickstart.md` for:
- Management command execution: `python manage.py setup_vat_composite_rules`
- Rule verification queries
- End-to-end VAT calculation test with sample cart
- Performance validation script

### Agent Context Update

Run `.specify/scripts/bash/update-agent-context.sh claude` to update CLAUDE.md with:
- Phase 3 composite rules context
- Rule priority hierarchy
- Entry point: `cart_calculate_vat`
- Management command usage

**Output**: data-model.md, contracts/*, quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

**Source Documents**:
- Load `.specify/templates/tasks-template.md` as base
- Extract tasks from contracts (master, regional, product)
- Generate from quickstart.md validation steps
- Reference data-model.md for rule structure

**Task Categories**:
1. **Setup Tasks**: Create management command scaffold, test file structure
2. **Master Rule Tasks** (TDD cycle): RED → GREEN → REFACTOR
3. **Regional Rule Tasks** (5 rules × TDD cycle)
4. **Product Rule Tasks** (11 rules × TDD cycle)
5. **Integration Tasks**: End-to-end tests, quickstart verification, performance validation

### Ordering Strategy

**TDD-First Ordering**:
1. Setup: Create test file, management command scaffold
2. Master Rule:
   - RED: Write failing test for master rule execution
   - GREEN: Implement master rule JSON creation
   - REFACTOR: Optimize rule condition/action logic
3. Regional Rules (can be parallel [P] after master complete):
   - RED: Write failing tests for all 5 regional rules
   - GREEN: Implement all 5 regional rules
   - REFACTOR: Extract common patterns
4. Product Rules (can be parallel [P] after regional complete):
   - RED: Write failing tests for all 11 product rules
   - GREEN: Implement all 11 product rules
   - REFACTOR: Extract common patterns
5. Integration:
   - Integration tests (full flow)
   - Quickstart execution
   - Performance validation

**Dependency Graph**:
```
Setup Tasks
    ↓
Master Rule (TDD) ← Must complete first
    ↓
Regional Rules [P] ← Can be parallel
    ↓
Product Rules [P] ← Can be parallel
    ↓
Integration Tests ← Sequential
```

### Estimated Task Breakdown

**Estimated Output**: 35-40 numbered tasks in tasks.md

**Task Distribution**:
- Setup: 3 tasks
- Master Rule: 4 tasks (RED, GREEN, REFACTOR, verify)
- Regional Rules: 10 tasks (2 tasks × 5 rules: RED+GREEN, verify)
- Product Rules: 15-18 tasks (varies by complexity, some grouped)
- Integration: 5-7 tasks (end-to-end, quickstart, performance)

**File Organization**:
- Management Command: `setup_vat_composite_rules.py`
- Unit Tests: `test_composite_vat_rules.py`
- Integration Tests: `test_vat_integration.py`

**Parallel Execution Opportunities**:
- All regional rules (after master complete) [P]
- All product rules (after regional complete) [P]
- Some test scenarios (independent rule executions) [P]

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 2 (tasks.md)**: /tasks command creates numbered, ordered tasks
**Phase 3 (execution)**: Implement tasks following TDD cycle (RED → GREEN → REFACTOR)
**Phase 4 (validation)**: Run full test suite, execute quickstart.md, performance benchmarks
**Phase 5 (deployment)**: Run management command in staging, verify audit logs, production rollout

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No violations | All complexity justified by requirements |

**Status**: ✅ No constitutional violations identified

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
- [x] All NEEDS CLARIFICATION resolved ✅ (none existed in spec)
- [x] Complexity deviations documented ✅ (none exist)

**Artifacts Generated**:
- [x] research.md - Rule architecture and delegation patterns
- [x] data-model.md - Rule entity definitions and JSONB schemas
- [x] contracts/ - Rule contracts (3 contract types)
  - master_rule_contract.md
  - regional_rules_contract.md
  - product_rules_contract.md
- [x] quickstart.md - Management command execution and verification
- [x] CLAUDE.md - Updated with Phase 3 context

**Ready for /tasks Command**: ✅ YES

---
*Based on TDD Constitution from CLAUDE.md - 80% minimum coverage, 100% target*
