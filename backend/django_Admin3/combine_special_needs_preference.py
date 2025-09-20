"""
Combine checkbox and textarea into single preference container
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

    # Update the actions to combine checkbox and textarea into one preference
    updated_actions = [
        {
            "id": "special_needs_preference",
            "type": "user_preference",
            "title": "Do you have a special educational need or health condition?",
            "content": "Do you have a special educational need or health condition? If you have a special educational need or health condition that you would like us to be aware of, please click this box. You are very welcome to tell us more about this in the Important notes box below. Someone from ActEd will contact you to establish what additional support we may be able to provide for you.",
            "default": {
                "special_needs": False,
                "details": ""
            },
            "inputType": "combined_checkbox_textarea",  # Special type for combined input
            "checkboxLabel": "If you have a special educational need or health condition that you would like us to be aware of, please click this box",
            "textareaLabel": "Important notes (optional):",
            "textareaPlaceholder": "Please tell us more about your special educational need or health condition and how we might be able to help...",
            "blocking": False,
            "required": False,
            "displayMode": "inline",
            "preferenceKey": "special_educational_needs",
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