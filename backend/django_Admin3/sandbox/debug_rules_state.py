#!/usr/bin/env python3
"""
Debug script to check the current state of rules in the database
"""

import os
import sys
import django
from django.conf import settings

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models.acted_rule import ActedRule
from rules_engine.models.rule_entry_point import RuleEntryPoint

def debug_rules():
    print("=== DEBUGGING RULES STATE ===\n")

    # Check all entry points
    print("1. Available Entry Points:")
    entry_points = RuleEntryPoint.objects.all()
    for ep in entry_points:
        print(f"   - {ep.name}: {ep.description}")
    print()

    # Check all active rules
    print("2. All Active Rules:")
    active_rules = ActedRule.objects.filter(active=True)
    print(f"   Total active rules: {active_rules.count()}")

    for rule in active_rules:
        print(f"   Rule ID: {rule.rule_id}")
        print(f"   Name: {rule.name}")
        print(f"   Entry Point: {rule.entry_point}")
        print(f"   Priority: {rule.priority}")
        print(f"   Version: {rule.version}")
        print(f"   Actions: {[action.get('type', 'unknown') for action in rule.actions]}")
        print("   ---")

    print()

    # Check checkout_start specific rules
    print("3. Rules for 'checkout_start' entry point:")
    checkout_rules = ActedRule.objects.filter(
        active=True,
        entry_point='checkout_start'
    ).order_by('-priority', 'created_at')

    print(f"   Found {checkout_rules.count()} active rules for checkout_start")

    for rule in checkout_rules:
        print(f"   Rule: {rule.rule_id} ({rule.name})")
        print(f"   Priority: {rule.priority}")

        # Check if it has modal actions
        modal_actions = [action for action in rule.actions if action.get('type') == 'display_modal']
        if modal_actions:
            print(f"   ⚠️ HAS MODAL ACTIONS: {len(modal_actions)}")
            for action in modal_actions:
                print(f"      - Template ID: {action.get('messageTemplateId', 'N/A')}")
                print(f"      - Required: {action.get('required', False)}")
        else:
            print(f"   No modal actions")

        print("   ---")

    print()

    # Check for any rules that might have "default Message"
    print("4. Checking for rules with 'default' or empty content:")
    all_rules = ActedRule.objects.filter(active=True)

    for rule in all_rules:
        actions_with_modal = [action for action in rule.actions if action.get('type') == 'display_modal']
        if actions_with_modal:
            print(f"   Rule {rule.rule_id} has modal actions:")
            for action in actions_with_modal:
                template_id = action.get('messageTemplateId')
                print(f"      Template ID: {template_id}")

                # Try to get the template content
                try:
                    from rules_engine.models.message_template import MessageTemplate
                    if template_id:
                        try:
                            template = MessageTemplate.objects.get(id=template_id)
                            print(f"      Template Name: {template.name}")
                            if hasattr(template, 'json_content') and template.json_content:
                                title = template.json_content.get('title', 'No title')
                                message = template.json_content.get('message', 'No message')
                                print(f"      Title: {title}")
                                print(f"      Message: {message[:50]}...")
                            else:
                                print(f"      Content: {template.content[:50] if template.content else 'Empty'}...")
                        except MessageTemplate.DoesNotExist:
                            print(f"      ⚠️ Template {template_id} NOT FOUND!")
                except ImportError:
                    print("      Could not import MessageTemplate model")
            print()

    print("=== END DEBUG ===")

if __name__ == '__main__':
    debug_rules()