"""
Create special educational needs preference rule
"""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

import json
from rules_engine.models import ActedRule, MessageTemplate

# Create message template first
template_name = "special_needs_preference_template"
template_content = "Do you have a special educational need or health condition? If you have a special educational need or health condition that you would like us to be aware of, please click this box. You are very welcome to tell us more about this in the Important notes box below. Someone from ActEd will contact you to establish what additional support we may be able to provide for you."

template = MessageTemplate.objects.create(
    name=template_name,
    content_format="json",
    content=template_content,
    is_active=True
)

print(f"Created message template ID: {template.id}")

# Create the ActedRule
rule_data = {
    "rule_code": "special_needs_preference_rule_v1",
    "name": "Special Educational Needs Preference Rule",
    "description": "Preference rule to collect special educational needs information from users",
    "entry_point": "checkout_preference",
    "priority": 90,  # Slightly lower priority than marketing preference (100)
    "active": True,
    "condition": {"type": "always_true"},
    "actions": [
        {
            "id": "special_needs_preference",
            "type": "user_preference",
            "title": "Do you have a special educational need or health condition?",
            "content": "Do you have a special educational need or health condition? If you have a special educational need or health condition that you would like us to be aware of, please click this box. You are very welcome to tell us more about this in the Important notes box below. Someone from ActEd will contact you to establish what additional support we may be able to provide for you.",
            "default": "no",
            "options": [
                {
                    "label": "Yes, I have a special educational need or health condition",
                    "value": "yes"
                },
                {
                    "label": "No, I do not have a special educational need or health condition",
                    "value": "no"
                }
            ],
            "blocking": False,
            "required": False,
            "inputType": "radio",
            "displayMode": "inline",
            "preferenceKey": "special_educational_needs",
            "messageTemplateId": template.id
        }
    ],
    "stop_processing": False  # Allow other rules to continue processing
}

rule = ActedRule.objects.create(**rule_data)

print(f"Created ActedRule: {rule.rule_code}")
print(f"Rule ID: {rule.id}")
print(f"Entry Point: {rule.entry_point}")
print(f"Priority: {rule.priority}")
print("Rule actions:")
print(json.dumps(rule.actions, indent=2))