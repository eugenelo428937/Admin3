#!/usr/bin/env python
"""
Database Fix and TDD Test Runner
Fixes database migration issues and runs TDD tests
"""

import os
import subprocess
import sys

def run_command(cmd, description):
    """Run a command and show output"""
    print(f"\n{description}...")
    print(f"Running: {cmd}")
    print("-" * 50)
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.stdout:
            print("STDOUT:", result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
            
        return result.returncode == 0
    except Exception as e:
        print(f"Error: {e}")
        return False

def fix_database_issues():
    """Fix database migration and setup issues"""
    
    print("=" * 60)
    print("FIXING DATABASE ISSUES FOR TDD TESTS")
    print("=" * 60)
    
    # Step 1: Make sure we're in the right directory
    if not os.path.exists('manage.py'):
        print("ERROR: manage.py not found. Make sure you're in backend/django_Admin3/")
        return False
    
    # Step 2: Create fresh migrations for rules_engine
    success = run_command(
        "python manage.py makemigrations rules_engine",
        "Creating fresh migrations for rules_engine"
    )
    
    # Step 3: Show migration status
    run_command(
        "python manage.py showmigrations rules_engine",
        "Checking rules_engine migration status"
    )
    
    return success

def run_single_stage_test():
    """Run a single stage test to verify setup"""
    
    print("\n" + "=" * 60)
    print("RUNNING SINGLE STAGE TEST (TDD RED PHASE)")
    print("=" * 60)
    
    # Try to run just one test file
    success = run_command(
        "python manage.py test rules_engine.tests.test_stage1_rule_entry_point.Stage1RuleEntryPointTests.test_entry_point_creation_success --verbosity=2 --keepdb",
        "Running single test to verify setup"
    )
    
    if not success:
        print("\nTRYING ALTERNATIVE TEST APPROACH...")
        success = run_command(
            "python manage.py test rules_engine.tests.test_stage1_rule_entry_point --verbosity=2 --keepdb --debug-mode",
            "Running with debug mode"
        )
    
    return success

def show_manual_fix_steps():
    """Show manual steps if automated fix fails"""
    
    print("\n" + "=" * 60)
    print("MANUAL FIX STEPS (if automated fix failed)")
    print("=" * 60)
    
    steps = [
        "1. Check if you're in the right directory:",
        "   cd backend/django_Admin3",
        "",
        "2. Activate virtual environment:",
        "   .venv\\Scripts\\activate",
        "",
        "3. Try to create migrations:",
        "   python manage.py makemigrations rules_engine",
        "",
        "4. Check migration status:",
        "   python manage.py showmigrations",
        "",
        "5. If database issues persist, reset test database:",
        "   python manage.py flush --verbosity=0",
        "",
        "6. Run a simple test first:",
        "   python manage.py test rules_engine.tests.test_stage1_rule_entry_point.Stage1RuleEntryPointTests.test_entry_point_creation_success --verbosity=2",
        "",
        "7. If that works, run full stage:",
        "   python manage.py test rules_engine.tests.test_stage1_rule_entry_point --verbosity=2",
    ]
    
    for step in steps:
        print(step)

def main():
    """Main function to fix database and run tests"""
    
    print("TDD TEST DATABASE FIXER")
    print("=" * 60)
    
    # Try to fix database issues
    db_fixed = fix_database_issues()
    
    if db_fixed:
        print("\nDatabase issues appear to be resolved!")
        
        # Try to run a test
        test_success = run_single_stage_test()
        
        if test_success:
            print("\n" + "=" * 60)
            print("SUCCESS! TDD tests are ready to run")
            print("=" * 60)
            print("\nNow you can run full test suites:")
            print("python manage.py test rules_engine.tests.test_stage1_rule_entry_point --verbosity=2")
            print("python manage.py test rules_engine.tests --verbosity=2")
        else:
            print("\nTests still having issues. See manual steps below.")
            show_manual_fix_steps()
    else:
        print("\nAutomated fix failed. See manual steps below.")
        show_manual_fix_steps()

if __name__ == "__main__":
    main()