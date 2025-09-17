#!/usr/bin/env python
"""
Check existing rules to understand the rules_fields_id values
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import ActedRule, ActedRulesFields

def check_existing_rules():
    """Check existing rules to understand fields_id patterns"""
    print("Checking existing ActedRule records...")

    rules = ActedRule.objects.all()[:5]  # Get first 5 rules

    for rule in rules:
        print(f"\nRule: {rule.name}")
        print(f"  Rule ID: {rule.rule_id}")
        print(f"  Entry Point: {rule.entry_point}")
        print(f"  Rules Fields ID: {rule.rules_fields_id}")
        print(f"  Active: {rule.active}")

    print(f"\nTotal ActedRule records: {ActedRule.objects.count()}")

    # Check ActedRulesFields
    print(f"\nChecking ActedRulesFields...")
    fields = ActedRulesFields.objects.all()[:5]

    for field in fields:
        print(f"\nField: {field.fields_id}")
        print(f"  Active: {field.is_active}")
        print(f"  Schema keys: {list(field.schema.keys()) if field.schema else 'No schema'}")

    print(f"\nTotal ActedRulesFields records: {ActedRulesFields.objects.count()}")

if __name__ == '__main__':
    try:
        check_existing_rules()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()