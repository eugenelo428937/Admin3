#!/usr/bin/env python3
"""
Debug holiday rule condition
"""

import os
import sys
import django
import json

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import ActedRule

def debug_holiday_rule():
    print("=== DEBUGGING HOLIDAY RULE ===\n")

    # Get the holiday rule
    try:
        rule = ActedRule.objects.get(rule_id="rule_holiday_message_v1")
        print(f"Rule found: {rule.name}")
        print(f"Entry point: {rule.entry_point}")
        print(f"Active: {rule.active}")
        print(f"Priority: {rule.priority}")

        print("\nRule condition:")
        print(json.dumps(rule.condition, indent=2))

        print("\nRule actions:")
        print(json.dumps(rule.actions, indent=2))

        # Test the condition manually
        print("\n=== TESTING CONDITION ===")
        context = {"current_date": "2025-09-15"}
        print(f"Context: {context}")

        # Import jsonlogic
        import jsonlogic

        result = jsonlogic.jsonLogic(rule.condition, context)
        print(f"Condition result: {result}")

        # Test date comparisons separately
        print("\n=== INDIVIDUAL TESTS ===")
        test_condition_1 = {">=": [{"var": "current_date"}, "2025-09-14"]}
        test_condition_2 = {"<=": [{"var": "current_date"}, "2025-09-20"]}

        result1 = jsonlogic.jsonLogic(test_condition_1, context)
        result2 = jsonlogic.jsonLogic(test_condition_2, context)

        print(f"current_date >= 2025-09-14: {result1}")
        print(f"current_date <= 2025-09-20: {result2}")
        print(f"Both conditions: {result1 and result2}")

    except ActedRule.DoesNotExist:
        print("Holiday rule not found!")
        return
    except Exception as e:
        print(f"Error: {e}")
        return

if __name__ == '__main__':
    debug_holiday_rule()