"""
Test both marketing and special needs preference rules
"""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

import json
from rules_engine.services.rule_engine import RuleEngine

# Test payload for checkout_preference
payload = {
    'entryPoint': 'checkout_preference',
    'context': {
        'user': {
            'id': 'anonymous',
            'email': None,
            'is_authenticated': False
        },
        'cart': {
            'items': [
                {
                    'id': 527,
                    'current_product': 2550,
                    'product_id': 71,
                    'product_name': 'Additional Mock Pack',
                    'product_code': 'AMP',
                    'subject_code': 'SP9',
                    'exam_session_code': '25A',
                    'product_type': 'material',
                    'quantity': 1,
                    'price_type': 'standard',
                    'actual_price': '37.00',
                    'metadata': {
                        'variationId': 314,
                        'variationName': 'Vitalsource eBook'
                    },
                    'is_marking': False,
                    'has_expired_deadline': False,
                    'expired_deadlines_count': 0,
                    'marking_paper_count': 0
                }
            ],
            'has_digital': True,
            'total': 37.0
        }
    }
}

print("=" * 80)
print("TESTING BOTH PREFERENCE RULES AT CHECKOUT_PREFERENCE")
print("=" * 80)

engine = RuleEngine()
result = engine.execute(
    entry_point=payload['entryPoint'],
    context=payload['context']
)

print("Execution result:")
print(json.dumps(result, indent=2))

print("\n" + "=" * 80)
print("PREFERENCE PROMPTS ANALYSIS")
print("=" * 80)

if 'preference_prompts' in result:
    prompts = result['preference_prompts']
    print(f"Total preference prompts: {len(prompts)}")

    for i, prompt in enumerate(prompts, 1):
        print(f"\n--- Preference {i} ---")
        print(f"Preference Key: {prompt.get('preferenceKey')}")
        print(f"Title: {prompt.get('title')}")
        print(f"Input Type: {prompt.get('inputType')}")
        print(f"Default: {prompt.get('default')}")
        print(f"Required: {prompt.get('required')}")
        print(f"Options: {len(prompt.get('options', []))} options")

        for j, option in enumerate(prompt.get('options', []), 1):
            print(f"  Option {j}: {option.get('label')} = {option.get('value')}")

        content = prompt.get('content', '')
        if content:
            truncated_content = content[:100] + "..." if len(content) > 100 else content
            print(f"Content preview: {truncated_content}")

else:
    print("No preference_prompts found in result!")

print("\n" + "=" * 80)
print("RULES EXECUTED")
print("=" * 80)

if 'rules_executed' in result:
    executed_rules = result['rules_executed']
    print(f"Total rules executed: {len(executed_rules)}")
    for rule in executed_rules:
        print(f"- {rule}")
else:
    print("No rules_executed information found!")

print("\n" + "=" * 80)
print("SUCCESS STATUS")
print("=" * 80)
print(f"Success: {result.get('success', 'Unknown')}")

if 'errors' in result and result['errors']:
    print("Errors:")
    for error in result['errors']:
        print(f"- {error}")
else:
    print("No errors found!")