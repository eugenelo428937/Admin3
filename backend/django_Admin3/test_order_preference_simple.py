#!/usr/bin/env python
"""Simple test to verify OrderUserPreference model works"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from cart.models import ActedOrder, OrderUserPreference
from rules_engine.models import ActedRule, MessageTemplate

User = get_user_model()

def test_order_user_preference_creation():
    """Test creating an order user preference"""
    print("Testing OrderUserPreference model creation...")

    # Clean up existing test data
    User.objects.filter(username='test_order_pref_user').delete()
    ActedRule.objects.filter(rule_id='test_order_pref_rule').delete()
    MessageTemplate.objects.filter(name='order_pref_tmpl').delete()

    # Create test user
    user = User.objects.create_user(
        username='test_order_pref_user',
        email='testorder@example.com'
    )
    print(f"[OK] Created user: {user.username}")

    # Create test order
    order = ActedOrder.objects.create(
        user=user,
        total_amount=100.00
    )
    print(f"[OK] Created order ID: {order.id}")

    # Create test rule
    rule = ActedRule.objects.create(
        rule_id='test_order_pref_rule',
        name='Test Order Preference Rule',
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

    # Create test message template
    template = MessageTemplate.objects.create(
        name='order_pref_tmpl',
        title='Marketing Preferences',
        content='Choose your marketing preferences',
        content_format='json',
        json_content={
            'title': 'Marketing Preferences',
            'content': 'Choose your marketing preferences'
        },
        message_type='info'
    )
    print(f"[OK] Created template: {template.name}")

    # Create order user preference
    preference = OrderUserPreference.objects.create(
        order=order,
        rule=rule,
        template=template,
        preference_type='marketing',
        preference_key='marketing_emails',
        preference_value={'choice': 'yes', 'timestamp': '2025-01-18T10:00:00Z'},
        input_type='radio',
        display_mode='inline',
        title='Marketing Preferences',
        content_summary='User chose to receive marketing emails'
    )
    print(f"[OK] Created order preference: {preference}")

    # Verify attributes
    assert preference.order == order, "Order mismatch"
    assert preference.rule == rule, "Rule mismatch"
    assert preference.template == template, "Template mismatch"
    assert preference.preference_key == 'marketing_emails', "Preference key mismatch"
    assert preference.preference_value['choice'] == 'yes', "Preference value mismatch"
    assert preference.input_type == 'radio', "Input type mismatch"
    assert preference.display_mode == 'inline', "Display mode mismatch"
    assert preference.preference_type == 'marketing', "Preference type mismatch"
    print("[OK] All attributes verified correctly")

    # Test display value method
    display_value = preference.get_display_value()
    assert display_value == 'yes', f"Display value mismatch: expected 'yes', got '{display_value}'"
    print(f"[OK] Display value method works: {display_value}")

    # Test checkbox type
    pref_checkbox = OrderUserPreference.objects.create(
        order=order,
        rule=ActedRule.objects.create(
            rule_id='test_checkbox_order',
            name='Checkbox Order Rule',
            entry_point='checkout_preference',
            priority=20,
            active=True,
            condition={'type': 'always_true'},
            actions=[]
        ),
        preference_key='checkbox_pref',
        preference_value={'selections': ['email', 'sms', 'post']},
        input_type='checkbox',
        title='Communication Channels'
    )
    checkbox_display = pref_checkbox.get_display_value()
    assert checkbox_display == 'email, sms, post', f"Checkbox display value incorrect: {checkbox_display}"
    print(f"[OK] Checkbox display value works: {checkbox_display}")

    # Cleanup
    preference.delete()
    pref_checkbox.delete()
    template.delete()
    ActedRule.objects.filter(rule_id__in=['test_order_pref_rule', 'test_checkbox_order']).delete()
    order.delete()
    user.delete()
    print("[OK] Cleanup completed")

    print("\n[PASS] OrderUserPreference model test PASSED!")

if __name__ == '__main__':
    try:
        test_order_user_preference_creation()
    except Exception as e:
        print(f"\n[FAIL] Test FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)