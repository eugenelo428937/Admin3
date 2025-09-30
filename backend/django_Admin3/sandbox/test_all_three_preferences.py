"""
Test all three preference rules together
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
print("TESTING ALL THREE PREFERENCE RULES")
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

    print("\n" + "=" * 80)
    print("PREFERENCE RULES EXECUTION ORDER (by priority)")
    print("=" * 80)

    for rule_exec in result.get('rules_executed', []):
        print(f"Priority {rule_exec.get('priority')}: {rule_exec.get('rule_id')}")

    print("\n" + "=" * 80)
    print("PREFERENCE PROMPTS DETAILS")
    print("=" * 80)

    for i, prompt in enumerate(result.get('preference_prompts', []), 1):
        print(f"\n--- Preference {i}: {prompt.get('preferenceKey')} ---")
        print(f"Title: {prompt.get('title')}")
        print(f"Input Type: {prompt.get('inputType')}")
        print(f"Default: {prompt.get('default')}")

        if prompt.get('inputType') == 'checkbox' and prompt.get('options'):
            print(f"Checkbox Label: {prompt.get('options')[0].get('label')}")
        elif prompt.get('inputType') == 'combined_checkbox_textarea':
            print(f"Checkbox Label: {prompt.get('checkboxLabel')}")
            print(f"Textarea Label: {prompt.get('textareaLabel')}")

        content = prompt.get('content', '')
        if isinstance(content, str):
            content_preview = content[:80] + "..." if len(content) > 80 else content
            print(f"Content: {content_preview}")

    print("\n" + "=" * 80)
    print("DATABASE STORAGE SUMMARY")
    print("=" * 80)
    print("Each preference will be stored as a single entry in acted_order_user_preferences:")
    print()
    print("1. special_educational_needs:")
    print("   Value: {\"special_needs\": true/false, \"details\": \"text\"}")
    print()
    print("2. employer_feedback:")
    print("   Value: true/false (boolean)")
    print()
    print("3. marketing_emails:")
    print("   Value: true/false (boolean)")

else:
    print("[FAILED] Rule execution failed!")
    print(f"Errors: {result.get('errors')}")