"""
Update special educational needs preference rule to use checkbox and add textbox
"""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

import json
from rules_engine.models import ActedRule

# Find the special needs rule
rule = ActedRule.objects.filter(rule_code="special_needs_preference_rule_v1").first()

if rule:
    print(f"Found rule: {rule.rule_code}")

    # Update the actions to use checkbox instead of radio buttons
    updated_actions = [
        {
            "id": "special_needs_preference",
            "type": "user_preference",
            "title": "Do you have a special educational need or health condition?",
            "content": "Do you have a special educational need or health condition? If you have a special educational need or health condition that you would like us to be aware of, please click this box. You are very welcome to tell us more about this in the Important notes box below. Someone from ActEd will contact you to establish what additional support we may be able to provide for you.",
            "default": False,  # Checkbox default to unchecked
            "options": [
                {
                    "label": "If you have a special educational need or health condition that you would like us to be aware of, please click this box",
                    "value": True
                }
            ],
            "blocking": False,
            "required": False,
            "inputType": "checkbox",
            "displayMode": "inline",
            "preferenceKey": "special_educational_needs",
            "messageTemplateId": 23
        },
        {
            "id": "special_needs_remarks",
            "type": "user_preference",
            "title": "Additional Information",
            "content": "Please provide any additional details about your special educational need or health condition and how we might be able to help:",
            "default": "",
            "blocking": False,
            "required": False,
            "inputType": "textarea",
            "displayMode": "inline",
            "preferenceKey": "special_educational_needs_remarks",
            "placeholder": "Please tell us more about your special educational need or health condition and how we might be able to help...",
            "messageTemplateId": 23
        }
    ]

    # Update the rule
    rule.actions = updated_actions
    rule.save()

    print("Rule updated successfully!")
    print("New actions:")
    print(json.dumps(rule.actions, indent=2))

else:
    print("Special needs preference rule not found!")