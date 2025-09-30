#!/usr/bin/env python3
"""Update display types for acknowledge rules."""
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

def update_rule_display_type(rule_id, display_type):
    """Update the display_type for a rule's user_acknowledge action."""
    rule = ActedRule.objects.filter(rule_id=rule_id).first()
    if not rule:
        print(f"Rule {rule_id} not found")
        return False

    # Update the display_type in the actions
    updated_actions = []
    for action in rule.actions:
        if action.get('type') == 'user_acknowledge':
            action['display_type'] = display_type
            print(f"Updated {rule_id} display_type to '{display_type}'")
        updated_actions.append(action)

    rule.actions = updated_actions
    rule.save()
    return True

print("Updating display types for acknowledge rules...\n")

# Update terms & conditions rule to use inline display
update_rule_display_type('rule_checkout_terms_acknowledgment_v1', 'inline')

# Update digital content rule to use modal display (confirm it's modal)
update_rule_display_type('rule_digital_content_acknowledgment_v1', 'modal')

print("\nUpdated rules:")
print("- Terms & Conditions: inline display")
print("- Digital Content: modal display")

# Verify the changes
print("\nVerifying updates:")
for rule_id, expected_type in [
    ('rule_checkout_terms_acknowledgment_v1', 'inline'),
    ('rule_digital_content_acknowledgment_v1', 'modal')
]:
    rule = ActedRule.objects.filter(rule_id=rule_id).first()
    if rule:
        for action in rule.actions:
            if action.get('type') == 'user_acknowledge':
                actual_type = action.get('display_type', 'not set')
                status = "OK" if actual_type == expected_type else "FAIL"
                print(f"  {rule_id}: {actual_type} [{status}]")
                break