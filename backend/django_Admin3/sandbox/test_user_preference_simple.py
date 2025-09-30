#!/usr/bin/env python
"""Simple test to verify UserPreference model works"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from rules_engine.models import UserPreference, ActedRule

User = get_user_model()

def test_user_preference_creation():
    """Test creating a user preference"""
    print("Testing UserPreference model creation...")

    # Create test user (delete if exists)
    User.objects.filter(username='test_preference_user').delete()
    user = User.objects.create_user(
        username='test_preference_user',
        email='test@example.com'
    )
    print(f"[OK] Created user: {user.username}")

    # Create test rule (delete if exists)
    ActedRule.objects.filter(rule_id='test_pref_rule').delete()
    rule = ActedRule.objects.create(
        rule_id='test_pref_rule',
        name='Test Preference Rule',
        entry_point='checkout_preference',
        priority=10,
        active=True,
        condition={'type': 'always_true'},
        actions=[{
            'type': 'user_preference',
            'id': 'pref_marketing',
            'title': 'Marketing Preferences',
            'content': 'Choose your preferences',
            'input_type': 'radio',
            'options': [
                {'value': 'yes', 'label': 'Yes, send me marketing'},
                {'value': 'no', 'label': 'No marketing please'}
            ],
            'required': False,
            'display_mode': 'inline'
        }]
    )
    print(f"[OK] Created rule: {rule.name}")

    # Create user preference
    preference = UserPreference.objects.create(
        user=user,
        rule=rule,
        preference_key='marketing_emails',
        preference_value={'choice': 'yes', 'timestamp': '2025-01-18T10:00:00Z'},
        input_type='radio',
        display_mode='inline'
    )
    print(f"[OK] Created preference: {preference}")

    # Verify attributes
    assert preference.user == user, "User mismatch"
    assert preference.rule == rule, "Rule mismatch"
    assert preference.preference_key == 'marketing_emails', "Preference key mismatch"
    assert preference.preference_value['choice'] == 'yes', "Preference value mismatch"
    assert preference.input_type == 'radio', "Input type mismatch"
    assert preference.display_mode == 'inline', "Display mode mismatch"
    print("[OK] All attributes verified correctly")

    # Test display value method
    display_value = preference.get_display_value()
    assert display_value == 'yes', f"Display value mismatch: expected 'yes', got '{display_value}'"
    print(f"[OK] Display value method works: {display_value}")

    # Cleanup
    preference.delete()
    rule.delete()
    user.delete()
    print("[OK] Cleanup completed")

    print("\n[PASS] UserPreference model test PASSED!")

if __name__ == '__main__':
    try:
        test_user_preference_creation()
    except Exception as e:
        print(f"\n[FAIL] Test FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)