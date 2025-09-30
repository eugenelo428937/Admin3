#!/usr/bin/env python
"""
Setup script for product_list_mount delivery message rule
TDD GREEN Phase - Implement the rule to make the test pass
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import ActedRule, RuleEntryPoint
import json

def setup_product_list_delivery_rule():
    """Create the product_list_mount delivery message rule"""
    print("Setting up product_list_mount delivery message rule...")

    # First, ensure the entry point exists
    entry_point, created = RuleEntryPoint.objects.get_or_create(
        code='product_list_mount',
        defaults={
            'name': 'Product List Mount',
            'description': 'Rules executed when the product list component mounts',
            'is_active': True
        }
    )

    if created:
        print(f"Created entry point: {entry_point.code}")
    else:
        print(f"Entry point already exists: {entry_point.code}")

    # Define the rule specification
    rule_spec = {
        'rule_id': 'product_list_delivery_info_v1',
        'name': 'Product List Delivery Information',
        'entry_point': 'product_list_mount',
        'priority': 10,
        'active': True,
        'version': 1,
        'rules_fields_id': '',  # Empty string for no schema validation (database constraint requires non-null)
        'condition': {"always": True},  # Always true condition (explicitly supported by rules engine)
        'actions': [
            {
                'type': 'display_message',
                'title': 'Delivery of study materials',
                'content': ('Please order your study materials well in advance of when you would like to use them. '
                          'Our materials are printed to order and even material despatched to the UK may take 2 weeks '
                          'or longer to be delivered. All of our printed products are also available as eBooks and so '
                          'you may wish to consider these to avoid delivery delays and any despatch costs. Orders for '
                          'eBooks are usually processed in 2-3 working days.'),
                'messageType': 'info',
                'display_type': 'alert'
            }
        ],
        'stop_processing': False
    }

    # Check if rule already exists
    existing_rule = ActedRule.objects.filter(
        rule_id=rule_spec['rule_id']
    ).first()

    if existing_rule:
        print(f"Rule {rule_spec['rule_id']} already exists. Updating...")

        # Update existing rule
        existing_rule.name = rule_spec['name']
        existing_rule.entry_point = rule_spec['entry_point']
        existing_rule.priority = rule_spec['priority']
        existing_rule.active = rule_spec['active']
        existing_rule.version = rule_spec['version']
        existing_rule.rules_fields_id = rule_spec['rules_fields_id']
        existing_rule.condition = rule_spec['condition']
        existing_rule.actions = rule_spec['actions']
        existing_rule.stop_processing = rule_spec['stop_processing']
        existing_rule.save()

        print(f"Updated rule: {existing_rule.rule_id}")
        rule = existing_rule
    else:
        # Create new rule
        rule = ActedRule.objects.create(**rule_spec)
        print(f"Created new rule: {rule.rule_id}")

    # Display rule details
    print("\nRule Details:")
    print(f"  Rule ID: {rule.rule_id}")
    print(f"  Name: {rule.name}")
    print(f"  Entry Point: {rule.entry_point}")
    print(f"  Priority: {rule.priority}")
    print(f"  Active: {rule.active}")
    print(f"  Version: {rule.version}")
    print(f"  Condition: {rule.condition}")
    print(f"  Actions: {json.dumps(rule.actions, indent=2)}")
    print(f"  Stop Processing: {rule.stop_processing}")

    return rule

if __name__ == '__main__':
    try:
        rule = setup_product_list_delivery_rule()
        print("\nSUCCESS: Product list delivery rule setup complete!")
        print("TDD GREEN Phase: Rule implemented - test should now pass")

    except Exception as e:
        print(f"Error setting up rule: {e}")
        import traceback
        traceback.print_exc()