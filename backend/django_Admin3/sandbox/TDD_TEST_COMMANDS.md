# TDD Test Commands Reference

## Prerequisites
```cmd
cd backend/django_Admin3
.\.venv\Scripts\activate
```

## Individual Stage Tests

### Stage 1: Entry Points (9 tests)
```cmd
python manage.py test rules_engine.tests.test_stage1_rule_entry_point --verbosity=2
```
**Tests:** Entry point creation, storage, lookup, validation, performance ordering

### Stage 2: Schema Validation (13 tests)  
```cmd
python manage.py test rules_engine.tests.test_stage2_rule_fields --verbosity=2
```
**Tests:** JSON schema storage, context validation, type checking, constraints

### Stage 3: Condition Logic (11 tests)
```cmd
python manage.py test rules_engine.tests.test_stage3_rules_condition --verbosity=2
```
**Tests:** Simple/compound conditions, AND/OR logic, nested conditions, operators

### Stage 4: Rule Integration (9 tests)
```cmd
python manage.py test rules_engine.tests.test_stage4_rule_integration --verbosity=2
```
**Tests:** Rule integration, inactive filtering, priority ordering, metadata

## All Tests
```cmd
python manage.py test rules_engine.tests --verbosity=2
```
**Total:** 42 comprehensive TDD tests

## Test Coverage Verification (No Database)
```cmd
python rules_engine\tests\verify_tdd_red_phase.py
```
**Shows:** Test count, coverage analysis, TDD phase status

## Batch File Runner
```cmd
run_tdd_tests.bat
```
**Interactive menu** for selecting which tests to run

## Expected Results (TDD RED Phase)
- ❌ **Tests should FAIL initially** (confirming TDD methodology)
- ⚠️ **Failures indicate missing implementation** (this is correct!)
- ✅ **Test structure and coverage verified**

## TDD Workflow
1. **🔴 RED:** Run tests → See failures → Confirms TDD approach
2. **🟢 GREEN:** Implement minimal code → Make tests pass
3. **🔵 REFACTOR:** Improve code → Keep tests passing

## Troubleshooting

### Database Issues
If you get database errors, try:
```cmd
python manage.py test --keepdb rules_engine.tests.test_stage1_rule_entry_point
```

### Test Database Creation
If prompted about test database creation, type `yes` to continue.

### Virtual Environment
Make sure you're in the virtual environment:
```cmd
.\.venv\Scripts\activate
```