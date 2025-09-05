#!/usr/bin/env python
"""
Simple test runner for Rules Engine TDD stages
Run this from the backend/django_Admin3/ directory
"""

import os
import sys
import django
from django.test.utils import get_runner
from django.conf import settings

def setup_django():
    """Setup Django environment"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
    django.setup()

def run_tests():
    """Run TDD tests with simple output"""
    setup_django()
    
    print("=" * 60)
    print("RULES ENGINE TDD TESTS")
    print("=" * 60)
    
    # Test commands to show user
    test_commands = [
        {
            'name': 'Stage 1: Entry Points', 
            'command': 'python manage.py test rules_engine.tests.test_stage1_rule_entry_point --verbosity=2'
        },
        {
            'name': 'Stage 2: Schema Validation',
            'command': 'python manage.py test rules_engine.tests.test_stage2_rule_fields --verbosity=2'
        },
        {
            'name': 'Stage 3: Condition Logic',
            'command': 'python manage.py test rules_engine.tests.test_stage3_rules_condition --verbosity=2'
        },
        {
            'name': 'Stage 4: Rule Integration', 
            'command': 'python manage.py test rules_engine.tests.test_stage4_rule_integration --verbosity=2'
        },
        {
            'name': 'All Rules Engine Tests',
            'command': 'python manage.py test rules_engine.tests --verbosity=2'
        }
    ]
    
    print("COPY AND PASTE THESE COMMANDS TO RUN TESTS:")
    print("=" * 60)
    
    for i, test in enumerate(test_commands, 1):
        print(f"\n{i}. {test['name']}")
        print(f"   {test['command']}")
    
    print("\n" + "=" * 60)
    print("RECOMMENDED: Run tests one stage at a time to see TDD RED failures")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()