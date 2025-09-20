#!/usr/bin/env python
"""Simple test to verify user_preference action works"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from rules_engine.services.rule_engine import RuleEngine
from rules_engine.models import ActedRule, MessageTemplate, UserPreference
from rules_engine.services.action_handlers.user_preference_handler import UserPreferenceHandler

User = get_user_model()

def test_user_preference_action():
    """Test user_preference action in rules engine"""
    print("Testing user_preference action in rules engine...")

    # Clean up existing test data
    User.objects.filter(username='testuser_pref_action').delete()
    ActedRule.objects.filter(rule_id__in=['marketing_preference_rule', 'marketing_preference_rule_v1']).delete()
    MessageTemplate.objects.filter(name__in=['marketing_pref_template', 'marketing_preference_template']).delete()

    # Create test user
    user = User.objects.create_user(
        username='testuser_pref_action',
        email='testaction@example.com'
    )
    print(f"[OK] Created user: {user.username}")

    # Create a message template for preference
    template = MessageTemplate.objects.create(
        name='marketing_pref_template',
        title='Marketing Preferences',
        content='Choose your marketing preferences',
        content_format='json',
        json_content={
            'title': 'Marketing and other emails',
            'content': 'You can choose to receive marketing...',
            'input': {
                'type': 'radio',
                'options': [
                    {'value': 'yes', 'label': 'I am happy to receive marketing'},
                    {'value': 'no', 'label': "I don't want to receive marketing"}
                ],
                'default': 'yes'
            }
        },
        message_type='info'
    )
    print(f"[OK] Created template: {template.name}")

    # Create a preference rule
    pref_rule = ActedRule.objects.create(
        rule_id='marketing_preference_rule',
        name='Marketing Preference Rule',
        entry_point='checkout_preference',
        priority=10,
        active=True,
        condition={'type': 'always_true'},
        actions=[{
            'type': 'user_preference',
            'id': 'pref_marketing',
            'messageTemplateId': template.id,
            'preferenceKey': 'marketing_emails',
            'title': 'Marketing and other emails',
            'content': 'You can choose to receive marketing...',
            'inputType': 'radio',
            'options': [
                {'value': 'yes', 'label': 'I am happy to receive marketing'},
                {'value': 'no', 'label': "I don't want to receive marketing"}
            ],
            'default': 'yes',
            'required': False,
            'displayMode': 'inline',
            'blocking': False
        }]
    )
    print(f"[OK] Created rule: {pref_rule.name}")

    # Test handler exists
    handler = UserPreferenceHandler()
    assert handler is not None, "Handler should exist"
    print("[OK] UserPreferenceHandler exists")

    # Execute rules engine
    rule_engine = RuleEngine()
    context = {
        'user': {'id': user.id},
        'entryPoint': 'checkout_preference'
    }

    results = rule_engine.execute('checkout_preference', context)
    print(f"[OK] Rules engine executed, results keys: {list(results.keys())}")

    # Check that preference action was returned
    assert 'preferences' in results, f"Expected 'preferences' in results, got: {list(results.keys())}"
    assert len(results['preferences']) == 1, f"Expected 1 preference, got: {len(results['preferences'])}"

    preference = results['preferences'][0]
    assert preference['type'] == 'user_preference', f"Expected type 'user_preference', got: {preference.get('type')}"
    assert preference['displayMode'] == 'inline', f"Expected displayMode 'inline', got: {preference.get('displayMode')}"
    assert preference['preferenceKey'] == 'marketing_emails', f"Expected preferenceKey 'marketing_emails', got: {preference.get('preferenceKey')}"
    assert preference['inputType'] == 'radio', f"Expected inputType 'radio', got: {preference.get('inputType')}"
    assert preference['blocking'] == False, f"Expected blocking False, got: {preference.get('blocking')}"
    assert preference['required'] == False, f"Expected required False, got: {preference.get('required')}"

    print("[OK] All preference attributes verified correctly")

    # Test save preference method
    save_action = {
        'type': 'user_preference',
        'preferenceKey': 'test_save_preference',
        'value': {'choice': 'yes'},
        'inputType': 'radio',
        'displayMode': 'inline',
        'blocking': False
    }

    save_context = {
        'user': {'id': user.id},
        'rule': pref_rule,
        'messageTemplate': template
    }

    save_result = handler.save_preference(save_action, save_context)
    assert save_result['success'] == True, f"Expected save success True, got: {save_result.get('success')}"
    print("[OK] Save preference method works")

    # Verify in database
    saved_preference = UserPreference.objects.get(
        user=user,
        rule=pref_rule,
        preference_key='test_save_preference'
    )
    assert saved_preference.preference_value['choice'] == 'yes', "Saved preference value incorrect"
    assert saved_preference.input_type == 'radio', "Saved input type incorrect"
    print("[OK] Preference saved to database correctly")

    # Cleanup
    saved_preference.delete()
    pref_rule.delete()
    template.delete()
    user.delete()
    print("[OK] Cleanup completed")

    print("\n[PASS] User preference action test PASSED!")

if __name__ == '__main__':
    try:
        test_user_preference_action()
    except Exception as e:
        print(f"\n[FAIL] Test FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)