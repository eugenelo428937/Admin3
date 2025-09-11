"""
TDD Test Runner for Rules Engine Stages
Verifies TDD RED phase by running all stage tests and confirming failures
"""

import os
import sys
import django
from django.test.utils import get_runner
from django.conf import settings
from django.core.management import call_command


def setup_django():
    """Setup Django environment for testing"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
    django.setup()


def run_stage_tests():
    """Run all TDD stage tests and verify RED phase"""
    setup_django()
    
    print("🔴 TDD RED PHASE VERIFICATION")
    print("=" * 50)
    print("Running Rules Engine TDD tests to verify initial failures...")
    print("(This confirms TDD methodology - tests should FAIL initially)")
    print()
    
    # Test modules to run - all rules engine tests
    test_modules = [
        'rules_engine.tests.test_imports_refactor',
        'rules_engine.tests.test_stage1_rule_entry_point',
        'rules_engine.tests.test_stage2_rule_fields', 
        'rules_engine.tests.test_stage3_rules_condition',
        'rules_engine.tests.test_stage4_rule_integration',
        'rules_engine.tests.test_stage5_rule_actions',
        'rules_engine.tests.test_stage6_rule_execution',
        'rules_engine.tests.test_stage7_end_to_end',
        'rules_engine.tests.test_stage8_serializers',
        'rules_engine.tests.test_stage9_views',
        'rules_engine.tests.test_stage10_end_to_end_api',
        'rules_engine.tests.test_tdd_guard_verification',
        'rules_engine.tests.test_user_acknowledgment_refactor'
    ]
    
    total_tests = 0
    total_failures = 0
    total_errors = 0
    
    for module in test_modules:
        print(f"\n📋 Running {module}...")
        print("-" * 40)
        
        try:
            # Run tests for this module
            from django.test.runner import DiscoverRunner
            runner = DiscoverRunner(verbosity=2, interactive=False, keepdb=False)
            
            # Run specific test module
            result = runner.run_tests([module])
            
            # Count results
            total_tests += result.testsRun if hasattr(result, 'testsRun') else 0
            total_failures += len(result.failures) if hasattr(result, 'failures') else 0
            total_errors += len(result.errors) if hasattr(result, 'errors') else 0
            
        except Exception as e:
            print(f"❌ Error running {module}: {e}")
            total_errors += 1
    
    print("\n" + "=" * 50)
    print("🔴 TDD RED PHASE SUMMARY")
    print("=" * 50)
    print(f"📊 Total Tests: {total_tests}")
    print(f"❌ Failures: {total_failures}")
    print(f"🚨 Errors: {total_errors}")
    
    if total_failures > 0 or total_errors > 0:
        print("\n✅ TDD RED PHASE CONFIRMED!")
        print("Tests are failing as expected for TDD methodology.")
        print("Next step: Implement features to make tests GREEN.")
    else:
        print("\n⚠️  WARNING: Tests are passing!")
        print("This suggests implementations already exist.")
        print("TDD RED phase not confirmed.")
    
    print("\n📝 TDD NEXT STEPS:")
    print("1. 🔴 RED: Write failing tests (COMPLETED)")
    print("2. 🟢 GREEN: Write minimal code to make tests pass")
    print("3. 🔵 REFACTOR: Improve code while keeping tests green")
    print("\n" + "=" * 50)
    
    return total_tests, total_failures, total_errors


if __name__ == "__main__":
    run_stage_tests()