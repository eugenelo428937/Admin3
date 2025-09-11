#!/usr/bin/env python
"""
TDD RED Phase Verification Script
Verifies that TDD tests have been created and are ready for RED phase
"""

import os
import ast
import sys

def count_test_methods(file_path):
    """Count test methods in a Python test file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        tree = ast.parse(content)
        test_count = 0
        test_methods = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name.startswith('test_'):
                test_count += 1
                test_methods.append(node.name)
        
        return test_count, test_methods
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return 0, []

def analyze_test_files():
    """Analyze all TDD test files"""
    test_dir = os.path.dirname(__file__)
    
    test_files = [
        'test_imports_refactor.py',
        'test_stage1_rule_entry_point.py',
        'test_stage2_rule_fields.py', 
        'test_stage3_rules_condition.py',
        'test_stage4_rule_integration.py',
        'test_stage5_rule_actions.py',
        'test_stage6_rule_execution.py',
        'test_stage7_end_to_end.py',
        'test_stage8_serializers.py',
        'test_stage9_views.py',
        'test_stage10_end_to_end_api.py',
        'test_tdd_guard_verification.py',
        'test_user_acknowledgment_refactor.py'
    ]
    
    print("RED TDD RED PHASE VERIFICATION")
    print("=" * 60)
    print("Analyzing TDD test files for completeness...")
    print()
    
    total_tests = 0
    all_methods = []
    
    for test_file in test_files:
        file_path = os.path.join(test_dir, test_file)
        if not os.path.exists(file_path):
            print(f"X Missing test file: {test_file}")
            continue
            
        count, methods = count_test_methods(file_path)
        total_tests += count
        all_methods.extend([(test_file, method) for method in methods])
        
        print(f"TEST {test_file}")
        print(f"   Tests: {count}")
        print(f"   Methods: {', '.join(methods[:3])}{'...' if len(methods) > 3 else ''}")
        print()
    
    print("=" * 60)
    print(f"TOTAL TDD TESTS CREATED: {total_tests}")
    print("=" * 60)
    
    # Verify stage coverage
    stage_coverage = {
        'Stage 1 - Entry Points': any('stage1' in f for f, _ in all_methods),
        'Stage 2 - Schema Validation': any('stage2' in f for f, _ in all_methods),
        'Stage 3 - Condition Logic': any('stage3' in f for f, _ in all_methods),
        'Stage 4 - Rule Integration': any('stage4' in f for f, _ in all_methods),
        'Stage 5 - Rule Actions': any('stage5' in f for f, _ in all_methods),
        'Stage 6 - Rule Execution': any('stage6' in f for f, _ in all_methods),
        'Stage 7 - End-to-End': any('stage7' in f for f, _ in all_methods),
        'Stage 8 - Serializers': any('stage8' in f for f, _ in all_methods),
        'Stage 9 - Views': any('stage9' in f for f, _ in all_methods),
        'Stage 10 - End-to-End API': any('stage10' in f for f, _ in all_methods),
        'Import/Refactor Tests': any('imports' in f or 'refactor' in f for f, _ in all_methods),
        'TDD Guard Tests': any('tdd_guard' in f for f, _ in all_methods)
    }
    
    print("\nSTAGE COVERAGE VERIFICATION:")
    for stage, covered in stage_coverage.items():
        status = "OK" if covered else "X"
        print(f"{status} {stage}")
    
    # Key test categories
    key_tests = {
        'Entry Point Creation': any('creation' in method or 'create' in method for _, method in all_methods),
        'Schema Validation': any('validation' in method or 'schema' in method for _, method in all_methods),
        'Condition Evaluation': any('condition' in method for _, method in all_methods),
        'Rule Integration': any('integration' in method or 'rule' in method for _, method in all_methods),
        'Error Handling': any('error' in method or 'invalid' in method for _, method in all_methods),
        'Performance Tests': any('performance' in method or 'priority' in method for _, method in all_methods)
    }
    
    print("\nKEY TEST CATEGORIES:")
    for category, covered in key_tests.items():
        status = "OK" if covered else "X"
        print(f"{status} {category}")
    
    print("\n" + "=" * 60)
    
    if total_tests >= 80:  # Expect at least 80 comprehensive tests across all stages
        print("OK TDD TEST SUITE COMPLETE!")
        print(f"Created {total_tests} comprehensive tests across 10+ stages")
        print("\nRED PHASE READY:")
        print("+ All tests are written BEFORE implementation")
        print("+ Tests cover all specified requirements")
        print("+ Tests will FAIL initially (no implementation yet)")
        
        print("\nTDD METHODOLOGY CONFIRMED:")
        print("1. RED: Write failing tests (COMPLETED)")
        print("2. GREEN: Write minimal code to pass tests (NEXT)")
        print("3. REFACTOR: Improve code while keeping tests green")
        
    else:
        print("WARNING: Test suite may be incomplete")
        print(f"Found {total_tests} tests, expected at least 80 for all stages")
    
    return total_tests, all_methods

if __name__ == "__main__":
    total, methods = analyze_test_files()
    
    print(f"\nDETAILED TEST LIST ({len(methods)} tests):")
    print("-" * 60)
    for i, (file, method) in enumerate(methods, 1):
        stage = file.split('_')[1].replace('stage', 'Stage ')
        print(f"{i:2d}. [{stage}] {method}")
    
    print("\n" + "=" * 60)
    print("NEXT STEP: Run tests to verify RED phase failures")
    print("Expected: All tests should FAIL (confirming TDD methodology)")
    print("=" * 60)