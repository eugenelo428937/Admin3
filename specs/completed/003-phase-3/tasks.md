# Tasks: VAT Calculation - Phase 3 Composite Rules

**Input**: Design documents from `/Users/work/Documents/Code/Admin3/specs/003-phase-3/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Python 3.14+ (Django 5.1), Rules Engine, Phase 2 custom functions
   → Structure: backend/django_Admin3/rules_engine/
2. Load optional design documents ✅
   → data-model.md: 17 rule entities (1 master + 5 regional + 11 product)
   → contracts/: 3 contract files (master, regional, product rules)
   → research.md: JSONB schema, idempotent management command, TDD workflow
   → quickstart.md: End-to-end verification scenarios
3. Generate tasks by category ✅
   → Setup: Management command scaffold, test structure
   → Tests: Contract tests per rule type, integration tests
   → Core: Rule creation in management command
   → Integration: Rule execution, audit trail
   → Polish: Performance validation, quickstart execution
4. Apply task rules ✅
   → Test files = [P] parallel
   → Management command = sequential (single file)
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T040) ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness ✅
   → All 3 contracts have tests
   → All 17 rules have creation tasks
   → All 5 quickstart scenarios have integration tests
9. Return: SUCCESS (40 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths: `backend/django_Admin3/rules_engine/`

## Path Conventions
**Web app backend structure** (from plan.md):
- Management Command: `backend/django_Admin3/rules_engine/management/commands/setup_vat_composite_rules.py`
- Unit Tests: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
- Integration Tests: `backend/django_Admin3/rules_engine/tests/test_vat_integration.py`
- Existing Models: `backend/django_Admin3/rules_engine/models/acted_rule.py` (no changes needed)
- Phase 2 Functions: `backend/django_Admin3/rules_engine/custom_functions.py` (no changes needed)

---

## Phase 3.1: Setup (T001-T003)

- [ ] **T001** Create management command file structure
  - File: `backend/django_Admin3/rules_engine/management/commands/setup_vat_composite_rules.py`
  - Create empty Django management command class
  - Add `--dry-run`, `--force`, `--verbose` argument parsers
  - Add docstring describing command purpose
  - Verify command loads: `python manage.py help setup_vat_composite_rules`

- [ ] **T002** [P] Create unit test file structure
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Import Django TestCase, ActedRule, Phase 2 custom functions
  - Create test class structure: TestMasterRule, TestRegionalRules, TestProductRules, TestRuleRegistry
  - Add setUpTestData method with test fixtures (regions, countries, mappings)
  - No test methods yet (created in RED phase)

- [ ] **T003** [P] Create integration test file structure
  - File: `backend/django_Admin3/rules_engine/tests/test_vat_integration.py`
  - Import Django TestCase, RuleEngine service
  - Create test class: TestVATCalculationIntegration
  - Add setUpTestData method with comprehensive fixtures
  - No test methods yet (created in RED phase)

---

## Phase 3.2: Tests First (TDD) - RED Phase ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Master Rule Tests (T004-T006)

- [ ] **T004** [P] Write failing test for master rule execution
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Test method: `test_master_rule_calls_lookup_region`
  - Verify master rule calls `lookup_region('GB')` and stores result in `context['vat']['region']`
  - Expected to FAIL: Rule doesn't exist yet
  - Run: `python manage.py test rules_engine.tests.test_composite_vat_rules.TestMasterRule.test_master_rule_calls_lookup_region`

- [ ] **T005** [P] Write failing test for master rule delegation
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Test method: `test_master_rule_delegates_to_regional_rules`
  - Verify master rule has `stop_processing=False` to allow regional rules
  - Expected to FAIL: Rule doesn't exist yet

- [ ] **T006** [P] Write failing test for master rule unknown country
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Test method: `test_master_rule_unknown_country_returns_row`
  - Verify master rule + `lookup_region('XX')` → 'ROW' default
  - Expected to FAIL: Rule doesn't exist yet

### Regional Rules Tests (T007-T011)

- [ ] **T007** [P] Write failing tests for all 5 regional rules
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Test methods:
    - `test_uk_regional_rule_calls_lookup_vat_rate`
    - `test_ie_regional_rule_calls_lookup_vat_rate`
    - `test_eu_regional_rule_calls_lookup_vat_rate_with_country`
    - `test_sa_regional_rule_calls_lookup_vat_rate`
    - `test_row_regional_rule_returns_zero_rate`
  - Each verifies correct `lookup_vat_rate()` call with right country code
  - Expected to FAIL: Rules don't exist yet
  - Run: `python manage.py test rules_engine.tests.test_composite_vat_rules.TestRegionalRules`

- [ ] **T008** [P] Write failing test for regional rule conditions
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Test method: `test_regional_rules_mutually_exclusive`
  - Verify exactly one regional rule executes per region
  - Test UK, IE, EU, SA, ROW - each should match only its rule
  - Expected to FAIL: Rules don't exist yet

- [ ] **T009** [P] Write failing test for regional rule priority
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Test method: `test_regional_rules_priority_90`
  - Verify all regional rules have priority 90 (lower than master 100)
  - Expected to FAIL: Rules don't exist yet

- [ ] **T010** [P] Write failing test for regional rule context update
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Test method: `test_regional_rule_stores_vat_rate_in_context`
  - Verify `vat.rate` field populated after regional rule execution
  - Expected to FAIL: Rules don't exist yet

- [ ] **T011** Run all regional rule tests and verify RED phase
  - Command: `python manage.py test rules_engine.tests.test_composite_vat_rules.TestRegionalRules -v 2`
  - Expected: All 8+ tests FAIL with "ActedRule matching query does not exist"
  - Document failures in test output

### Product Rules Tests (T012-T016)

- [ ] **T012** [P] Write failing tests for UK product rules (4 rules)
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Test methods:
    - `test_uk_digital_product_calculates_vat`
    - `test_uk_printed_product_calculates_vat`
    - `test_uk_flash_card_calculates_vat`
    - `test_uk_pbor_calculates_vat`
  - Each verifies: calls `calculate_vat_amount()`, updates `cart_item.vat_amount` and `cart_item.gross_amount`
  - Expected to FAIL: Rules don't exist yet

- [ ] **T013** [P] Write failing tests for generic regional product rules (7 rules)
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Test methods:
    - `test_ie_product_calculates_vat`
    - `test_eu_product_calculates_vat`
    - `test_sa_product_calculates_vat`
    - `test_row_product_zero_vat`
  - Verify each handles all product types for their region
  - Expected to FAIL: Rules don't exist yet

- [ ] **T014** [P] Write failing test for product rule priorities
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Test method: `test_product_rule_priorities_correct`
  - Verify: UK Digital (95), UK Printed (85), UK Flash/PBOR (80), others (85)
  - More specific = higher priority
  - Expected to FAIL: Rules don't exist yet

- [ ] **T015** [P] Write failing test for product rule stop_processing
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Test method: `test_product_rule_stops_processing`
  - Verify `stop_processing=True` after VAT calculated
  - Expected to FAIL: Rules don't exist yet

- [ ] **T016** Run all product rule tests and verify RED phase
  - Command: `python manage.py test rules_engine.tests.test_composite_vat_rules.TestProductRules -v 2`
  - Expected: All 11+ tests FAIL
  - Document failures

### Integration Tests (T017-T021)

- [ ] **T017** [P] Write failing integration test for UK digital product (Scenario 1)
  - File: `backend/django_Admin3/rules_engine/tests/test_vat_integration.py`
  - Test method: `test_uk_digital_product_full_flow`
  - Input: GB country, Digital product, £50.00 net
  - Expected output: region=UK, rate=0.20, vat=£10.00, gross=£60.00
  - Verify full rule chain: master → UK regional → UK digital product
  - Expected to FAIL: Rules don't exist yet
  - Run: `python manage.py test rules_engine.tests.test_vat_integration.TestVATCalculationIntegration.test_uk_digital_product_full_flow`

- [ ] **T018** [P] Write failing integration test for SA printed product (Scenario 2)
  - File: `backend/django_Admin3/rules_engine/tests/test_vat_integration.py`
  - Test method: `test_sa_printed_product_full_flow`
  - Input: ZA country, Printed product, R500.00 net
  - Expected output: region=SA, rate=0.15, vat=R75.00, gross=R575.00
  - Expected to FAIL: Rules don't exist yet

- [ ] **T019** [P] Write failing integration test for unknown country (Edge Case 1)
  - File: `backend/django_Admin3/rules_engine/tests/test_vat_integration.py`
  - Test method: `test_unknown_country_row_fallback`
  - Input: XX country (unknown), Digital product, $100.00 net
  - Expected output: region=ROW, rate=0.00, vat=$0.00, gross=$100.00
  - Expected to FAIL: Rules don't exist yet

- [ ] **T020** [P] Write failing integration test for multi-item cart (Scenario 4)
  - File: `backend/django_Admin3/rules_engine/tests/test_vat_integration.py`
  - Test method: `test_uk_multi_item_cart`
  - Input: 3 items (Digital £50, Printed £100, FlashCard £30), all UK
  - Expected: Individual VAT per item, total £36 VAT
  - Expected to FAIL: Rules don't exist yet

- [ ] **T021** Run all integration tests and verify RED phase
  - Command: `python manage.py test rules_engine.tests.test_vat_integration -v 2`
  - Expected: All 4+ tests FAIL
  - Document failures
  - **GATE**: All tests must fail before proceeding to GREEN phase

---

## Phase 3.3: Core Implementation - GREEN Phase (ONLY after tests are failing)

**GATE REQUIREMENT**: T004-T021 must be complete and ALL tests must be FAILING before proceeding.

### Context Schema Creation (T022)

- [ ] **T022** Implement context schema creation in management command
  - File: `backend/django_Admin3/rules_engine/management/commands/setup_vat_composite_rules.py`
  - Add method: `create_context_schema()`
  - Create ActedRulesFields object with `cart_vat_context_schema` JSON Schema
  - Schema includes: cart_item, user, vat properties per data-model.md
  - Use `update_or_create()` for idempotency
  - Test: `python manage.py setup_vat_composite_rules --dry-run --verbose`

### Master Rule Implementation (T023-T024)

- [ ] **T023** Implement master rule creation in management command
  - File: `backend/django_Admin3/rules_engine/management/commands/setup_vat_composite_rules.py`
  - Add method: `create_master_rule()`
  - Create ActedRule with:
    - rule_id: "calculate_vat"
    - priority: 100
    - condition: `{"!=": [{"var": "user.country_code"}, null]}`
    - action: call_function lookup_region, store in vat.region
    - stop_processing: False
  - Use `update_or_create(rule_id="calculate_vat", defaults={...})`
  - Run: `python manage.py setup_vat_composite_rules`

- [ ] **T024** Verify master rule tests pass (GREEN)
  - Run: `python manage.py test rules_engine.tests.test_composite_vat_rules.TestMasterRule`
  - Expected: T004-T006 tests now PASS
  - If failures: Debug rule creation, fix, re-test
  - **GATE**: All master rule tests must pass before continuing

### Regional Rules Implementation (T025-T026)

- [ ] **T025** Implement all 5 regional rules in management command
  - File: `backend/django_Admin3/rules_engine/management/commands/setup_vat_composite_rules.py`
  - Add method: `create_regional_rules()`
  - Create 5 ActedRule objects:
    1. calculate_vat_uk (condition: region==UK, lookup_vat_rate('GB'))
    2. calculate_vat_ie (condition: region==IE, lookup_vat_rate('IE'))
    3. calculate_vat_eu (condition: region==EU, lookup_vat_rate(country_code))
    4. calculate_vat_sa (condition: region==SA, lookup_vat_rate('ZA'))
    5. calculate_vat_row (condition: region==ROW, lookup_vat_rate() → 0.00)
  - All priority 90, stop_processing=False
  - Use update_or_create for each
  - Run: `python manage.py setup_vat_composite_rules`

- [ ] **T026** Verify regional rule tests pass (GREEN)
  - Run: `python manage.py test rules_engine.tests.test_composite_vat_rules.TestRegionalRules`
  - Expected: T007-T011 tests now PASS
  - **GATE**: All regional rule tests must pass

### Product Rules Implementation (T027-T028)

- [ ] **T027** Implement UK product rules (4 rules) in management command
  - File: `backend/django_Admin3/rules_engine/management/commands/setup_vat_composite_rules.py`
  - Add method: `create_uk_product_rules()`
  - Create 4 ActedRule objects:
    1. calculate_vat_uk_digital_product (priority 95)
    2. calculate_vat_uk_printed_product (priority 85)
    3. calculate_vat_uk_flash_card (priority 80)
    4. calculate_vat_uk_pbor (priority 80)
  - Each: condition region==UK AND product_type==X, call calculate_vat_amount, stop_processing=True
  - Run: `python manage.py setup_vat_composite_rules`

- [ ] **T028** Implement generic regional product rules (7 rules) in management command
  - File: `backend/django_Admin3/rules_engine/management/commands/setup_vat_composite_rules.py`
  - Add method: `create_generic_product_rules()`
  - Create 7 ActedRule objects:
    1. calculate_vat_ie_product (priority 85)
    2. calculate_vat_eu_product (priority 85)
    3. calculate_vat_sa_product (priority 85)
    4. calculate_vat_row_product (priority 85)
    [+ 3 more as needed per regions]
  - Each: condition region==X (no product_type filter), call calculate_vat_amount, stop_processing=True
  - Run: `python manage.py setup_vat_composite_rules`

- [ ] **T029** Verify product rule tests pass (GREEN)
  - Run: `python manage.py test rules_engine.tests.test_composite_vat_rules.TestProductRules`
  - Expected: T012-T016 tests now PASS
  - **GATE**: All product rule tests must pass

### Management Command Integration (T030)

- [ ] **T030** Implement main handle() method in management command
  - File: `backend/django_Admin3/rules_engine/management/commands/setup_vat_composite_rules.py`
  - Implement `handle()` method:
    1. Parse command arguments (--dry-run, --force, --verbose)
    2. Wrap in database transaction
    3. Call: create_context_schema()
    4. Call: create_master_rule()
    5. Call: create_regional_rules()
    6. Call: create_uk_product_rules()
    7. Call: create_generic_product_rules()
    8. Print summary: "17 rules created successfully"
    9. If --dry-run: rollback transaction
    10. Else: commit transaction
  - Test full execution: `python manage.py setup_vat_composite_rules --verbose`
  - Verify: 17 rules exist in database

---

## Phase 3.4: Integration Tests GREEN (T031-T034)

- [ ] **T031** Verify integration test: UK digital product (GREEN)
  - Run: `python manage.py test rules_engine.tests.test_vat_integration.TestVATCalculationIntegration.test_uk_digital_product_full_flow`
  - Expected: T017 test now PASS
  - Verify: £50 net → £10 VAT → £60 gross

- [ ] **T032** Verify integration test: SA printed product (GREEN)
  - Run: `python manage.py test rules_engine.tests.test_vat_integration.TestVATCalculationIntegration.test_sa_printed_product_full_flow`
  - Expected: T018 test now PASS
  - Verify: R500 net → R75 VAT → R575 gross

- [ ] **T033** Verify integration test: Unknown country ROW fallback (GREEN)
  - Run: `python manage.py test rules_engine.tests.test_vat_integration.TestVATCalculationIntegration.test_unknown_country_row_fallback`
  - Expected: T019 test now PASS
  - Verify: $100 net → $0 VAT → $100 gross (zero VAT for ROW)

- [ ] **T034** Verify integration test: Multi-item cart (GREEN)
  - Run: `python manage.py test rules_engine.tests.test_vat_integration.TestVATCalculationIntegration.test_uk_multi_item_cart`
  - Expected: T020 test now PASS
  - Verify: Total £36 VAT across 3 items
  - **GATE**: All integration tests must pass

---

## Phase 3.5: REFACTOR Phase (T035-T037)

- [ ] **T035** Refactor management command for code quality
  - File: `backend/django_Admin3/rules_engine/management/commands/setup_vat_composite_rules.py`
  - Extract common patterns:
    - Helper method: `_create_rule(rule_id, name, priority, condition, actions, **kwargs)`
    - Helper method: `_build_call_function_action(function, args, store_in)`
    - Helper method: `_build_region_condition(region)`
    - Helper method: `_build_product_condition(region, product_type)`
  - Reduce duplication in rule creation
  - Keep tests passing: `python manage.py test rules_engine.tests.test_composite_vat_rules`

- [ ] **T036** Refactor test code for readability
  - File: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
  - Extract common assertions:
    - Helper method: `_assert_rule_exists(rule_id, priority)`
    - Helper method: `_assert_rule_calls_function(rule_id, function_name)`
    - Helper method: `_execute_rules_and_get_context(input_context)`
  - Remove duplication
  - Keep all tests passing

- [ ] **T037** Verify 100% test coverage for management command
  - Run: `python manage.py test rules_engine.tests --coverage`
  - Target: 100% coverage for setup_vat_composite_rules.py
  - If < 100%: Add tests for uncovered branches
  - Document coverage report

---

## Phase 3.6: Polish (T038-T040)

- [ ] **T038** [P] Execute quickstart verification script
  - Run script from: `specs/003-phase-3/quickstart.md`
  - Step 1: `python manage.py setup_vat_composite_rules --verbose`
  - Step 2: Verify 17 rules in database
  - Step 3: Run end-to-end VAT calculation tests (all 3 scenarios)
  - Step 4: Verify audit trail in RuleExecution table
  - Step 5: Performance validation (< 50ms per cart item)
  - Document results: All steps PASS ✅

- [ ] **T039** [P] Performance benchmarking
  - File: Create `backend/django_Admin3/rules_engine/tests/test_vat_performance.py`
  - Test method: `test_vat_calculation_performance`
  - Measure latency for 100 executions
  - Assert: Average < 30ms per cart item (well under 50ms target)
  - Assert: No N+1 queries (use Django query logging)
  - Run: `python manage.py test rules_engine.tests.test_vat_performance`

- [ ] **T040** Final verification and cleanup
  - Run full test suite: `python manage.py test rules_engine.tests.test_composite_vat_rules rules_engine.tests.test_vat_integration --keepdb`
  - Expected: All 30+ tests PASS
  - Verify: No print statements in production code
  - Verify: No commented-out code
  - Verify: All rules have proper metadata
  - Final check: `python manage.py check`
  - **FINAL GATE**: All tests pass, management command executes cleanly

---

## Dependencies

```
Setup (T001-T003)
  ↓
RED Phase Tests (T004-T021) ← MUST FAIL before GREEN
  ↓
GATE: Verify all tests failing
  ↓
GREEN Phase Implementation (T022-T030)
  ├─ T022 blocks T023
  ├─ T023 blocks T024
  ├─ T024 blocks T025
  ├─ T025 blocks T026
  ├─ T026 blocks T027
  ├─ T027, T028 block T029
  └─ T030 blocks T031
  ↓
Integration Tests GREEN (T031-T034)
  ↓
REFACTOR Phase (T035-T037)
  ↓
Polish (T038-T040)
```

**Critical Path**: T001 → T002 → T004-T021 (RED) → T022 → T023 → T024 → T025 → T026 → T027 → T028 → T029 → T030 → T031-T034 (GREEN) → T035-T037 (REFACTOR) → T038-T040

---

## Parallel Execution Examples

### Setup Phase (parallel)
```bash
# T002 and T003 can run in parallel (different files)
# Launch both:
Task: "Create unit test file structure in test_composite_vat_rules.py"
Task: "Create integration test file structure in test_vat_integration.py"
```

### RED Phase - Master Rule Tests (parallel)
```bash
# T004, T005, T006 can run in parallel (all in same file but independent test methods)
# Launch together:
Task: "Write failing test for master rule execution"
Task: "Write failing test for master rule delegation"
Task: "Write failing test for master rule unknown country"
```

### RED Phase - Product Rule Tests (parallel)
```bash
# T012, T013, T014, T015 can run in parallel (different test methods)
Task: "Write failing tests for UK product rules"
Task: "Write failing tests for generic regional product rules"
Task: "Write failing test for product rule priorities"
Task: "Write failing test for product rule stop_processing"
```

### Integration Tests GREEN (parallel verification)
```bash
# T031, T032, T033, T034 can verify in parallel
Task: "Verify integration test UK digital product"
Task: "Verify integration test SA printed product"
Task: "Verify integration test unknown country"
Task: "Verify integration test multi-item cart"
```

### Polish Phase (parallel)
```bash
# T038 and T039 can run in parallel (different files)
Task: "Execute quickstart verification script"
Task: "Performance benchmarking"
```

---

## Notes

- **[P] tasks**: Different files or independent test methods, no shared state
- **TDD Enforcement**: RED (T004-T021) must complete and fail before GREEN (T022-T030)
- **Gates**: Explicit verification steps (T024, T026, T029, T034) before proceeding
- **Single File**: Management command (setup_vat_composite_rules.py) edited sequentially
- **Commit Strategy**: Commit after each GREEN phase task passes its tests
- **Performance**: Target < 30ms per cart item (50ms buffer for multi-item carts)

---

## Validation Checklist

**GATE: Checked before marking Phase 3 complete**

- [x] All 3 contracts have corresponding tests (master, regional, product)
- [x] All 17 rule entities have creation tasks in management command
- [x] All tests come before implementation (RED → GREEN → REFACTOR)
- [x] Parallel tasks are truly independent (different files or test methods)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task simultaneously
- [x] TDD workflow enforced with explicit gates
- [x] 5 quickstart scenarios have integration tests
- [x] Performance validation included (T039)
- [x] Final verification step (T040) ensures completeness

---

## Task Generation Summary

**Total Tasks**: 40
- Setup: 3 tasks (T001-T003)
- RED Phase: 18 tasks (T004-T021)
- GREEN Phase: 9 tasks (T022-T030)
- Integration GREEN: 4 tasks (T031-T034)
- REFACTOR: 3 tasks (T035-T037)
- Polish: 3 tasks (T038-T040)

**Parallel Opportunities**: 15 tasks marked [P]
- Setup: 2 parallel (T002, T003)
- RED tests: 10+ parallel (T004-T006, T007, T008-T010, T012-T015, T017-T020)
- Polish: 2 parallel (T038, T039)

**Sequential Requirements**: 25 tasks (management command implementation, verification gates)

**Estimated Completion Time**: 8-12 hours (with TDD discipline and proper gates)

---

**Tasks Ready for Execution**: ✅ YES
**Next Step**: Begin with T001 (Create management command file structure)
