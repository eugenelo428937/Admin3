"""
Create employer feedback preference rule
"""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

import json
from rules_engine.models import ActedRule, MessageTemplate

# Create message template first
template_name = "employer_feedback_preference_template"
template_content = "Please be aware that where you are sponsored by your employer, ActEd will share feedback in relation to your attendance and performance with your employer. If you are self-funding then please let us know if we can share this information with your employer. If you are paying for this order but then claiming the cost back from your employer then we strongly recommend that you check whether you are required by your employer to give us consent before continuing."

template = MessageTemplate.objects.create(
    name=template_name,
    content_format="json",
    content=template_content,
    is_active=True
)

print(f"Created message template ID: {template.id}")

# Create the ActedRule
rule_data = {
    "rule_code": "employer_feedback_preference_rule_v1",
    "name": "Employer Feedback Preference Rule",
    "description": "Preference rule to collect consent for sharing information with employers",
    "entry_point": "checkout_preference",
    "priority": 95,  # Between special needs (90) and marketing (100)
    "active": True,
    "condition": {"type": "always_true"},
    "actions": [
        {
            "id": "employer_feedback_preference",
            "type": "user_preference",
            "title": "How we use your information",
            "content": "Please be aware that where you are sponsored by your employer, ActEd will share feedback in relation to your attendance and performance with your employer. If you are self-funding then please let us know if we can share this information with your employer. If you are paying for this order but then claiming the cost back from your employer then we strongly recommend that you check whether you are required by your employer to give us consent before continuing.",
            "default": False,  # Default to unchecked
            "options": [
                {
                    "label": "Please share tutorial attendance and assignment data with my employer",
                    "value": True
                }
            ],
            "blocking": False,
            "required": False,
            "inputType": "checkbox",
            "displayMode": "inline",
            "preferenceKey": "employer_feedback",
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