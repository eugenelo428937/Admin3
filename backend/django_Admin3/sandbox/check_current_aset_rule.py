#!/usr/bin/env python3
"""
Check current ASET warning rule configuration
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

def check_aset_rule():
    print("=== CURRENT ASET WARNING RULE ===\n")

    try:
        rule = ActedRule.objects.get(rule_id="rule_aset_warning_v1")

        print(f"Rule ID: {rule.rule_id}")
        print(f"Name: {rule.name}")
        print(f"Entry Point: {rule.entry_point}")
        print(f"Active: {rule.active}")
        print(f"Priority: {rule.priority}")
        print(f"Version: {rule.version}")

        print(f"\nCondition:")
        print(json.dumps(rule.condition, indent=2))

        print(f"\nActions:")
        print(json.dumps(rule.actions, indent=2))

        print(f"\nMetadata:")
        print(json.dumps(rule.metadata, indent=2))

    except ActedRule.DoesNotExist:
        print("ASET warning rule not found!")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

    return rule

if __name__ == '__main__':
    check_aset_rule()