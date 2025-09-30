#!/usr/bin/env python
"""
Simple test script for product_list_mount delivery rule
TDD RED Phase - Verify rule doesn't exist yet
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import ActedRule

def test_product_list_delivery_rule():
    """Test if the product_list_mount delivery rule exists"""
    print("Testing for product_list_mount delivery rule...")

    # Check if delivery rule exists for product_list_mount
    delivery_rules = ActedRule.objects.filter(
        entry_point='product_list_mount',
        active=True
    )

    print(f"Found {delivery_rules.count()} active rules for product_list_mount entry point")

    # Check specifically for delivery-related rule
    delivery_rule = delivery_rules.filter(name__icontains='delivery').first()

    if delivery_rule:
        print("SUCCESS: Delivery rule found:")
        print(f"   Rule ID: {delivery_rule.rule_id}")
        print(f"   Name: {delivery_rule.name}")
        print(f"   Entry Point: {delivery_rule.entry_point}")
        print(f"   Active: {delivery_rule.active}")
        print(f"   Priority: {delivery_rule.priority}")
        print(f"   Condition: {delivery_rule.condition}")
        print(f"   Actions: {delivery_rule.actions}")
        return True
    else:
        print("EXPECTED FAILURE: No delivery rule found for product_list_mount")
        print("   This is expected in RED phase of TDD")
        return False

if __name__ == '__main__':
    try:
        rule_exists = test_product_list_delivery_rule()
        if not rule_exists:
            print("\nTDD RED PHASE: Test correctly fails - rule doesn't exist yet")
            print("   Next step: Implement the rule (GREEN phase)")
        else:
            print("\nUnexpected: Rule already exists!")

    except Exception as e:
        print(f"Error running test: {e}")
        import traceback
        traceback.print_exc()