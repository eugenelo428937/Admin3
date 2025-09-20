"""
Debug script for marketing preference rule execution
"""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

import json
from rules_engine.models import ActedRule
from rules_engine.services.rule_engine import RuleEngine

# Test payload
payload = {
    'entryPoint': 'checkout_preference',
    'context': {
        'user': {'id': 'anonymous'},
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
            'total': 0
        }
    }
}

# Check rule exists
rule = ActedRule.objects.filter(rule_code__contains='marketing_preference', active=True).first()
if rule:
    print(f"Rule found: {rule.rule_code}")
    print(f"Entry point: {rule.entry_point}")
    print(f"Active: {rule.active}")
    print(f"Condition: {rule.condition}")
    print(f"Actions count: {len(rule.actions)}")

    # Test condition evaluation
    print("\nTesting condition evaluation...")
    context = payload['context']

    # Check if condition evaluates to true
    condition = rule.condition
    print(f"Condition type: {condition}")

    if condition is None or condition == {} or condition == True:
        print("Condition is empty/true - should always execute")
        condition_result = True
    else:
        print(f"Condition has logic: {condition}")
        condition_result = False

    print(f"Condition evaluates to: {condition_result}")

    # Test actual rule execution
    print("\n" + "="*50)
    print("Testing actual rule execution...")
    print("="*50)

    engine = RuleEngine()
    result = engine.execute(
        entry_point=payload['entryPoint'],
        context=payload['context']
    )

    print("\nExecution result:")
    print(json.dumps(result, indent=2))

    # Check specifically for preference_prompts
    print("\n" + "="*50)
    print("DEBUGGING preference_prompts:")
    print("="*50)
    if 'preference_prompts' in result:
        print(f"preference_prompts count: {len(result['preference_prompts'])}")
        if result['preference_prompts']:
            for idx, pref in enumerate(result['preference_prompts']):
                print(f"\nPreference {idx + 1}:")
                print(json.dumps(pref, indent=2))
        else:
            print("preference_prompts is empty!")

            # Debug further
            print("\n" + "="*50)
            print("DEBUGGING: Let's trace the action execution...")
            print("="*50)

            for action in rule.actions:
                print(f"\nAction type: {action.get('type')}")
                print(f"Action ID: {action.get('id')}")
                print(f"PreferenceKey: {action.get('preferenceKey')}")
                print(f"Required: {action.get('required')}")
                print(f"Blocking: {action.get('blocking')}")

                # Check if this is user_preference
                if action.get('type') == 'user_preference':
                    print("\nThis IS a user_preference action!")
                    print("Full action config:")
                    print(json.dumps(action, indent=2))
    else:
        print("preference_prompts key not in result!")

else:
    print("No marketing preference rule found!")