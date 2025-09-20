"""
Examine marketing preference rule structure
"""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

import json
from rules_engine.models import ActedRule, MessageTemplate

# Find marketing preference rule
marketing_rule = ActedRule.objects.filter(rule_code__contains='marketing_preference', active=True).first()

if marketing_rule:
    print("=" * 60)
    print("MARKETING PREFERENCE RULE")
    print("=" * 60)
    print(f"Rule Code: {marketing_rule.rule_code}")
    print(f"Name: {marketing_rule.name}")
    print(f"Entry Point: {marketing_rule.entry_point}")
    print(f"Priority: {marketing_rule.priority}")
    print(f"Active: {marketing_rule.active}")
    print(f"Condition: {marketing_rule.condition}")
    print(f"Actions:")
    print(json.dumps(marketing_rule.actions, indent=2))

    # Find the associated message template
    for action in marketing_rule.actions:
        if action.get('type') == 'user_preference' and action.get('messageTemplateId'):
            template_id = action.get('messageTemplateId')
            template = MessageTemplate.objects.filter(id=template_id).first()
            if template:
                print("\n" + "=" * 60)
                print("ASSOCIATED MESSAGE TEMPLATE")
                print("=" * 60)
                print(f"Template ID: {template.id}")
                print(f"Name: {template.name}")
                print(f"Content Format: {template.content_format}")
                print(f"Content:")
                print(json.dumps(template.content, indent=2))
                break
else:
    print("Marketing preference rule not found!")