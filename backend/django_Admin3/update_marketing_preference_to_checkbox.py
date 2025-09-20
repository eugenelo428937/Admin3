"""
Update marketing preference rule to use single checkbox
"""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

import json
from rules_engine.models import ActedRule

# Find the marketing preference rule
rule = ActedRule.objects.filter(rule_code__contains='marketing_preference').first()

if rule:
    print(f"Found rule: {rule.rule_code}")
    print(f"Current actions:")
    print(json.dumps(rule.actions, indent=2))

    # Update the actions to use checkbox instead of radio buttons
    updated_actions = [
        {
            "id": "marketing_emails_preference",
            "type": "user_preference",
            "title": "Marketing and other emails",
            "content": "You can choose to receive marketing and other information relevant to the courses you are interested in. You can opt out of marketing at any time, either by emailing us or clicking the Unsubscribe link on future emails. We will not share your marketing information outside of the BPP Professional Education Group.",
            "default": True,  # Default to checked
            "options": [
                {
                    "label": "I am happy to receive marketing and product information from ActEd",
                    "value": True
                }
            ],
            "blocking": False,
            "required": False,
            "inputType": "checkbox",
            "displayMode": "inline",
            "preferenceKey": "marketing_emails",
            "messageTemplateId": 21
        }
    ]

    # Update the rule
    rule.actions = updated_actions
    rule.save()

    print("\nRule updated successfully!")
    print("New actions:")
    print(json.dumps(rule.actions, indent=2))

else:
    print("Marketing preference rule not found!")