@echo off
echo ============================================================
echo TDD TESTS WITH SQLITE (Bypasses PostgreSQL issues)
echo ============================================================
echo.
echo Choose test stage to run:
echo.
echo 1. Stage 1: Entry Points (9 tests)
echo 2. Stage 2: Schema Validation (13 tests)
echo 3. Stage 3: Condition Logic (11 tests)  
echo 4. Stage 4: Rule Integration (9 tests)
echo 5. All stages (42 tests)
echo 6. Single test method (quick check)
echo.
set /p choice="Enter choice (1-6): "

if "%choice%"=="1" (
    echo Running Stage 1 with SQLite...
    python manage.py test rules_engine.tests.test_stage1_rule_entry_point --verbosity=2 --settings=django_Admin3.settings.test_settings
) else if "%choice%"=="2" (
    echo Running Stage 2 with SQLite...
    python manage.py test rules_engine.tests.test_stage2_rule_fields --verbosity=2 --settings=django_Admin3.settings.test_settings
) else if "%choice%"=="3" (
    echo Running Stage 3 with SQLite...
    python manage.py test rules_engine.tests.test_stage3_rules_condition --verbosity=2 --settings=django_Admin3.settings.test_settings
) else if "%choice%"=="4" (
    echo Running Stage 4 with SQLite...
    python manage.py test rules_engine.tests.test_stage4_rule_integration --verbosity=2 --settings=django_Admin3.settings.test_settings
) else if "%choice%"=="5" (
    echo Running all TDD stages with SQLite...
    python manage.py test rules_engine.tests --verbosity=2 --settings=django_Admin3.settings.test_settings
) else if "%choice%"=="6" (
    echo Running single test method...
    python manage.py test rules_engine.tests.test_stage1_rule_entry_point.Stage1RuleEntryPointTests.test_entry_point_creation_success --verbosity=2 --settings=django_Admin3.settings.test_settings
) else (
    echo Invalid choice.
)

echo.
echo ============================================================
echo Test execution completed.
echo Expected: Tests should FAIL (TDD RED phase)
echo ============================================================
pause