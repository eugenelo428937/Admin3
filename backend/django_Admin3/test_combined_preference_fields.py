"""
Test that combined preference sends all required fields
"""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

import json
from rules_engine.services.rule_engine import RuleEngine

# Test payload
payload = {
    'entryPoint': 'checkout_preference',
    'context': {
        'user': {
            'id': 'test_user',
            'email': 'test@example.com',
            'is_authenticated': True
        },
        'cart': {
            'items': [{'id': 1, 'product_name': 'Test Product'}],
            'has_digital': True,
            'total': 100
        }
    }
}

print("Testing combined preference fields...")
print("=" * 60)

engine = RuleEngine()
result = engine.execute(
    entry_point=payload['entryPoint'],
    context=payload['context']
)

if 'preference_prompts' in result:
    for prompt in result['preference_prompts']:
        if prompt.get('preferenceKey') == 'special_educational_needs':
            print("Special Educational Needs Preference Found!")
            print("-" * 60)
            print(f"Input Type: {prompt.get('inputType')}")
            print(f"Checkbox Label: {prompt.get('checkboxLabel')}")
            print(f"Textarea Label: {prompt.get('textareaLabel')}")
            print(f"Textarea Placeholder: {prompt.get('textareaPlaceholder')}")
            print(f"Default Value: {prompt.get('default')}")
            print("-" * 60)
            print("Full preference object:")
            print(json.dumps(prompt, indent=2))
            break
else:
    print("No preference_prompts found!")

print("\nThis preference will be saved as a single entry in acted_order_user_preferences")
print("with preference_key='special_educational_needs' and value as JSON object:")
print('{"special_needs": true/false, "details": "user text"}')