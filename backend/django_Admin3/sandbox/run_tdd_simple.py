#!/usr/bin/env python
"""
Simple TDD Test Runner with SQLite
Bypasses PostgreSQL migration issues by using SQLite for testing
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.conf import settings

def setup_test_environment():
    """Setup simple test environment"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.test_settings')
    django.setup()

def run_tdd_tests():
    """Run TDD tests with simple SQLite setup"""
    
    print("=" * 60)
    print("TDD TESTS - SIMPLIFIED RUNNER")
    print("Using SQLite to avoid PostgreSQL migration issues")
    print("=" * 60)
    
    # Setup environment
    setup_test_environment()
    
    test_commands = [
        ['test', 'rules_engine.tests.test_stage1_rule_entry_point', '--verbosity=2'],
        ['test', 'rules_engine.tests.test_stage2_rule_fields', '--verbosity=2'],
        ['test', 'rules_engine.tests.test_stage3_rules_condition', '--verbosity=2'],
        ['test', 'rules_engine.tests.test_stage4_rule_integration', '--verbosity=2'],
    ]
    
    stage_names = [
        "Stage 1: Entry Points",
        "Stage 2: Schema Validation", 
        "Stage 3: Condition Logic",
        "Stage 4: Rule Integration"
    ]
    
    print("Available test stages:")
    for i, stage in enumerate(stage_names, 1):
        print(f"{i}. {stage}")
    
    print("5. Run all stages")
    print("6. Just show commands")
    
    try:
        choice = input("\nEnter choice (1-6): ")
        
        if choice in ['1', '2', '3', '4']:
            idx = int(choice) - 1
            print(f"\nRunning {stage_names[idx]}...")
            print("=" * 60)
            
            sys.argv = ['manage.py'] + test_commands[idx]
            execute_from_command_line(sys.argv)
            
        elif choice == '5':
            print("\nRunning all TDD stages...")
            print("=" * 60)
            
            for i, cmd in enumerate(test_commands):
                print(f"\n>>> {stage_names[i]}")
                print("-" * 40)
                sys.argv = ['manage.py'] + cmd
                try:
                    execute_from_command_line(sys.argv)
                except SystemExit:
                    continue  # Continue with next stage
                    
        elif choice == '6':
            print("\nManual test commands (using test_settings):")
            print("=" * 60)
            for i, cmd in enumerate(test_commands):
                cmd_str = ' '.join(cmd).replace('test_settings', 'django_Admin3.settings.test_settings')
                print(f"\n{stage_names[i]}:")
                print(f"python manage.py {cmd_str} --settings=django_Admin3.settings.test_settings")
        
        else:
            print("Invalid choice")
            
    except KeyboardInterrupt:
        print("\nTest execution cancelled")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    run_tdd_tests()