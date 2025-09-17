#!/usr/bin/env python3
"""
Script to set up Terms & Conditions rules and message templates
Run this after applying migrations: python setup_tc_rules.py
"""
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import (
    RuleEntryPoint, MessageTemplate, Rule, RuleAction
)

def setup_tc_templates_and_rules():
    """Set up T&C message templates and rules"""
    
    # 1. Ensure checkout_terms entry point exists
    entry_point, created = RuleEntryPoint.objects.get_or_create(
        code='checkout_terms',
        defaults={
            'name': 'Checkout Terms & Conditions',
            'description': 'Entry point for displaying Terms & Conditions during checkout step 3',
            'is_active': True
        }
    )
    
    if created:
        print(f"[+] Created entry point: {entry_point}")
    else:
        print(f"[=] Entry point already exists: {entry_point}")
    
    # 2. Create general T&C message template
    template, created = MessageTemplate.objects.get_or_create(
        name='general_terms_conditions',
        defaults={
            'title': 'Terms & Conditions',
            'content': """
            <div class="terms-conditions-content">
                <h4>Terms & Conditions</h4>
                <p>By completing this purchase, you agree to our Terms & Conditions which include:</p>
                <ul>
                    <li>Product delivery terms and conditions</li>
                    <li>Refund and cancellation policy</li>
                    <li>Academic integrity requirements</li>
                    <li>Data protection and privacy policy</li>
                </ul>
                <p>
                    You can view our full 
                    <a href="/terms-and-conditions" target="_blank">Terms & Conditions</a> 
                    and 
                    <a href="/privacy-policy" target="_blank">Privacy Policy</a>.
                </p>
                <p><strong>This acceptance is required to complete your order.</strong></p>
            </div>
            """,
            'message_type': 'terms',
            'variables': [],
            'is_active': True
        }
    )
    
    if created:
        print(f"[+] Created message template: {template}")
    else:
        print(f"[=] Message template already exists: {template}")
    
    # 3. Create general T&C rule (always triggers for checkout_terms)
    rule, created = Rule.objects.get_or_create(
        name='General Terms & Conditions Required',
        defaults={
            'description': 'Display general Terms & Conditions that must be accepted during checkout',
            'entry_point': entry_point,
            'trigger_type': None,  # Using new entry point system
            'priority': 10,  # High priority
            'is_active': True,
            'is_blocking': True,  # User must acknowledge before proceeding
            'success_criteria': 'all_conditions',
            'return_on_failure': False,
        }
    )
    
    if created:
        print(f"[+] Created rule: {rule}")
    else:
        print(f"[=] Rule already exists: {rule}")
    
    # 4. Create action for the rule
    action, created = RuleAction.objects.get_or_create(
        rule=rule,
        action_type='acknowledge',
        defaults={
            'message_template': template,
            'parameters': {
                'acknowledgment_type': 'required',
                'display_type': 'terms_checkbox',
                'checkbox_text': 'I agree to the Terms & Conditions',
                'is_required': True,
                'validation_message': 'You must accept the Terms & Conditions to complete your order.'
            },
            'execution_order': 1
        }
    )
    
    if created:
        print(f"[+] Created rule action: {action}")
    else:
        print(f"[=] Rule action already exists: {action}")
    
    print("\n[!] T&C setup completed successfully!")
    print(f"Entry Point: {entry_point.code}")
    print(f"Message Template: {template.name}")
    print(f"Rule: {rule.name}")
    print(f"Action: {action.action_type}")

if __name__ == '__main__':
    setup_tc_templates_and_rules()