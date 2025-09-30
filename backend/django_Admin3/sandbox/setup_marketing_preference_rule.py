#!/usr/bin/env python
"""
Setup Marketing Preference Rule
Creates the rule as specified in the requirements:
- Title: "Marketing and other emails"
- Content: "You can choose to receive marketing and other information..."
- Two radio button options with default option 1 checked
- Inline display, non-blocking
- Entry point: checkout_preference
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import ActedRule, MessageTemplate, RuleEntryPoint


def create_marketing_preference_rule():
    """Create the marketing preference rule as specified"""
    print("Creating marketing preference rule...")

    # Ensure checkout_preference entry point exists
    entry_point, created = RuleEntryPoint.objects.get_or_create(
        name='checkout_preference',
        defaults={
            'description': 'Executed during checkout preference step',
            'is_active': True
        }
    )
    if created:
        print(f"[OK] Created entry point: {entry_point.name}")
    else:
        print(f"[OK] Entry point exists: {entry_point.name}")

    # Create message template for marketing preferences
    template_content = """You can choose to receive marketing and other information relevant to the courses you are interested in. Please use the checkboxes below to let us know if you are happy to receive these communications. You can opt out of marketing at any time, either by emailing us or clicking the Unsubscribe link on future emails. We will not share your marketing information outside of the BPP Professional Education Group."""

    template, created = MessageTemplate.objects.get_or_create(
        name='marketing_preference_template',
        defaults={
            'title': 'Marketing and other emails',
            'content': template_content,
            'content_format': 'json',
            'json_content': {
                'title': 'Marketing and other emails',
                'content': template_content,
                'input': {
                    'type': 'radio',
                    'options': [
                        {
                            'value': 'yes',
                            'label': 'I am happy to receive marketing and product information from ActEd'
                        },
                        {
                            'value': 'no',
                            'label': "I don't want to receive marketing and product information from ActEd"
                        }
                    ],
                    'default': 'yes'
                }
            },
            'message_type': 'info',
            'is_active': True
        }
    )

    if created:
        print(f"[OK] Created message template: {template.name}")
    else:
        print(f"[OK] Message template exists: {template.name}")

    # Create the marketing preference rule
    rule, created = ActedRule.objects.get_or_create(
        rule_id='marketing_preference_rule_v1',
        defaults={
            'name': 'Marketing Preference Rule',
            'entry_point': 'checkout_preference',
            'priority': 100,  # Lower priority than blocking rules
            'active': True,
            'condition': {'type': 'always_true'},  # Always show preferences
            'actions': [{
                'type': 'user_preference',
                'id': 'marketing_emails_preference',
                'messageTemplateId': template.id,
                'preferenceKey': 'marketing_emails',
                'title': 'Marketing and other emails',
                'content': template_content,
                'inputType': 'radio',
                'options': [
                    {
                        'value': 'yes',
                        'label': 'I am happy to receive marketing and product information from ActEd'
                    },
                    {
                        'value': 'no',
                        'label': "I don't want to receive marketing and product information from ActEd"
                    }
                ],
                'default': 'yes',
                'displayMode': 'inline',
                'blocking': False,
                'required': False
            }],
            'stop_processing': False,
            'metadata': {
                'created_by': 'setup_marketing_preference_rule.py',
                'purpose': 'Collect marketing preferences during checkout',
                'version': '1.0'
            }
        }
    )

    if created:
        print(f"[OK] Created marketing preference rule: {rule.rule_id}")
        print(f"     Name: {rule.name}")
        print(f"     Entry Point: {rule.entry_point}")
        print(f"     Priority: {rule.priority}")
        print(f"     Active: {rule.active}")
        print(f"     Actions: {len(rule.actions)}")
    else:
        print(f"[OK] Marketing preference rule already exists: {rule.rule_id}")

    print("\n[PASS] Marketing preference rule setup completed!")
    return rule, template, entry_point


def test_rule_execution():
    """Test that the rule executes correctly"""
    print("\nTesting rule execution...")

    from rules_engine.services.rule_engine import RuleEngine
    from django.contrib.auth import get_user_model

    User = get_user_model()

    # Create test user if needed
    user, created = User.objects.get_or_create(
        username='test_marketing_pref_user',
        defaults={
            'email': 'test@example.com'
        }
    )
    if created:
        print(f"[OK] Created test user: {user.username}")

    # Execute rules engine
    rule_engine = RuleEngine()
    context = {
        'user': {'id': user.id},
        'entryPoint': 'checkout_preference'
    }

    results = rule_engine.execute('checkout_preference', context)

    print(f"[OK] Rules engine executed successfully")
    print(f"     Success: {results.get('success')}")
    print(f"     Rules evaluated: {results.get('rules_evaluated')}")
    print(f"     Preferences returned: {len(results.get('preferences', []))}")

    if results.get('preferences'):
        pref = results['preferences'][0]
        print(f"     Preference key: {pref.get('preferenceKey')}")
        print(f"     Input type: {pref.get('inputType')}")
        print(f"     Display mode: {pref.get('displayMode')}")
        print(f"     Options count: {len(pref.get('options', []))}")
        print(f"     Default value: {pref.get('default')}")

    # Clean up test user
    if created:
        user.delete()
        print(f"[OK] Cleaned up test user")

    print("\n[PASS] Rule execution test completed!")


if __name__ == '__main__':
    try:
        create_marketing_preference_rule()
        test_rule_execution()
    except Exception as e:
        print(f"\n[FAIL] Setup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)