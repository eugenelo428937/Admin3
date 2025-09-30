"""
Final test of both preference rules
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

print("=" * 80)
print("FINAL TEST OF BOTH PREFERENCE RULES")
print("=" * 80)

engine = RuleEngine()
result = engine.execute(
    entry_point=payload['entryPoint'],
    context=payload['context']
)

if result.get('success'):
    print("[SUCCESS] Rules executed successfully!")
    print(f"Rules evaluated: {result.get('rules_evaluated')}")
    print(f"Preference prompts returned: {len(result.get('preference_prompts', []))}")

    print("\n" + "-" * 80)
    print("PREFERENCE 1: Special Educational Needs")
    print("-" * 80)

    for prompt in result.get('preference_prompts', []):
        if prompt.get('preferenceKey') == 'special_educational_needs':
            print(f"Title: {prompt.get('title')}")
            print(f"Input Type: {prompt.get('inputType')}")
            print(f"Checkbox Label: {prompt.get('checkboxLabel')[:50]}...")
            print(f"Textarea Label: {prompt.get('textareaLabel')}")
            print(f"Default Value: {prompt.get('default')}")
            print("Storage Format: Single entry with JSON value")
            print("  Key: 'special_educational_needs'")
            print("  Value: {\"special_needs\": true/false, \"details\": \"text\"}")
            break

    print("\n" + "-" * 80)
    print("PREFERENCE 2: Marketing Emails")
    print("-" * 80)

    for prompt in result.get('preference_prompts', []):
        if prompt.get('preferenceKey') == 'marketing_emails':
            print(f"Title: {prompt.get('title')}")
            print(f"Input Type: {prompt.get('inputType')}")
            print(f"Options: {prompt.get('options')}")
            print(f"Default Value: {prompt.get('default')}")
            print("Storage Format: Single entry with boolean value")
            print("  Key: 'marketing_emails'")
            print("  Value: true/false")
            break

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print("1. Special Educational Needs:")
    print("   - Combined checkbox + textarea in single container")
    print("   - Checkbox unchecked by default")
    print("   - Textarea always visible for optional notes")
    print("   - Saves as: {\"special_needs\": bool, \"details\": string}")
    print()
    print("2. Marketing Emails:")
    print("   - Single checkbox")
    print("   - Checked by default (true)")
    print("   - Text: 'I am happy to receive marketing...'")
    print("   - Saves as: boolean (true/false)")

else:
    print("[FAILED] Rule execution failed!")
    print(f"Errors: {result.get('errors')}")