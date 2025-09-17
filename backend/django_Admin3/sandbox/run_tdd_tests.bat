@echo off
echo ============================================================
echo RULES ENGINE TDD TEST RUNNER
echo ============================================================
echo.
echo Choose which tests to run:
echo.
echo 1. Stage 1: Entry Points (9 tests)
echo 2. Stage 2: Schema Validation (13 tests)  
echo 3. Stage 3: Condition Logic (11 tests)
echo 4. Stage 4: Rule Integration (9 tests)
echo 5. All Stages (42 tests)
echo 6. Verify Test Coverage (no database required)
echo.
set /p choice="Enter choice (1-6): "

if "%choice%"=="1" (
    echo Running Stage 1 Tests...
    python manage.py test rules_engine.tests.test_stage1_rule_entry_point --verbosity=2
) else if "%choice%"=="2" (
    echo Running Stage 2 Tests...
    python manage.py test rules_engine.tests.test_stage2_rule_fields --verbosity=2
) else if "%choice%"=="3" (
    echo Running Stage 3 Tests...
    python manage.py test rules_engine.tests.test_stage3_rules_condition --verbosity=2
) else if "%choice%"=="4" (
    echo Running Stage 4 Tests...
    python manage.py test rules_engine.tests.test_stage4_rule_integration --verbosity=2
) else if "%choice%"=="5" (
    echo Running All TDD Tests...
    python manage.py test rules_engine.tests --verbosity=2
) else if "%choice%"=="6" (
    echo Verifying Test Coverage...
    python rules_engine\tests\verify_tdd_red_phase.py
) else (
    echo Invalid choice. Please run again.
)

echo.
echo Test execution completed.
pause