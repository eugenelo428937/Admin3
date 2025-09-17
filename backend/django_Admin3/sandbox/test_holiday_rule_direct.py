#!/usr/bin/env python3
"""
Test holiday rule using Django rules engine directly
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

from rules_engine.services.rule_engine import RuleEngine

def test_holiday_rule():
    print("=== TESTING HOLIDAY RULE WITH RULES ENGINE ===\n")

    engine = RuleEngine()

    context = {
        "current_date": "2025-09-15",
        "page": {
            "name": "home",
            "path": "/"
        }
    }

    print(f"Entry Point: home_page_mount")
    print(f"Context: {json.dumps(context, indent=2)}")

    try:
        result = engine.execute("home_page_mount", context)
        print(f"\nResult:")
        print(f"Success: {result.get('success')}")
        print(f"Messages: {len(result.get('messages', []))}")
        print(f"Rules evaluated: {result.get('rules_evaluated')}")

        if result.get('messages'):
            for i, msg in enumerate(result['messages']):
                print(f"\nMessage {i+1}:")
                print(f"  Type: {msg.get('message_type')}")
                print(f"  Title: {msg.get('content', {}).get('title')}")
                print(f"  Content: {msg.get('content', {}).get('message')}")

        if result.get('rules_executed'):
            for rule_exec in result['rules_executed']:
                print(f"\nRule Executed:")
                print(f"  Rule ID: {rule_exec.get('rule_id')}")
                print(f"  Condition Result: {rule_exec.get('condition_result')}")
                print(f"  Actions Executed: {rule_exec.get('actions_executed')}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_holiday_rule()