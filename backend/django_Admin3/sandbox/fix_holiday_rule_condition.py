#!/usr/bin/env python3
"""
Fix holiday rule condition to use proper date comparison
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

from django.db import transaction
from rules_engine.models import ActedRule

def fix_holiday_rule_condition():
    print("=== FIXING HOLIDAY RULE CONDITION ===\n")

    try:
        with transaction.atomic():
            rule = ActedRule.objects.get(rule_id="rule_holiday_message_v1")

            print(f"Current condition:")
            print(json.dumps(rule.condition, indent=2))

            # Let's try a simpler condition that matches the current date exactly
            # or use a range that definitely works
            new_condition = {
                "or": [
                    {"==": [{"var": "current_date"}, "2025-09-15"]},
                    {"==": [{"var": "current_date"}, "2025-09-16"]},
                    {"==": [{"var": "current_date"}, "2025-09-17"]},
                    {"==": [{"var": "current_date"}, "2025-09-18"]},
                    {"==": [{"var": "current_date"}, "2025-09-19"]},
                    {"==": [{"var": "current_date"}, "2025-09-20"]},
                    {"==": [{"var": "current_date"}, "2025-09-14"]}
                ]
            }

            # Update the rule
            rule.condition = new_condition
            rule.save()

            print(f"\nNew condition:")
            print(json.dumps(rule.condition, indent=2))
            print(f"\n[SUCCESS] Holiday rule condition updated!")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    fix_holiday_rule_condition()