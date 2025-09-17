#!/usr/bin/env python
"""
Debug script to investigate digital consent rule issue
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import ActedRule
from django.db import connection

def debug_digital_consent_rules():
    print("=== DIGITAL CONSENT RULE INVESTIGATION ===\n")

    # Find the digital consent rule
    digital_consent_rules = ActedRule.objects.filter(name__icontains='digital').order_by('-created_at')
    print(f'Digital consent rules found: {digital_consent_rules.count()}')
    for rule in digital_consent_rules:
        print(f'Rule ID: {rule.id}, Name: {rule.name}, Entry Point: {rule.entry_point}')
        print(f'Active: {rule.active}, Priority: {rule.priority}')
        print(f'Condition: {rule.condition}')
        print(f'Actions: {rule.actions}')
        print('---')

    # Also check by entry point
    checkout_rules = ActedRule.objects.filter(entry_point='checkout_terms', active=True).order_by('priority', 'created_at')
    print(f'\nAll active checkout_terms rules: {checkout_rules.count()}')
    for rule in checkout_rules:
        print(f'Rule ID: {rule.id}, Name: {rule.name}, Priority: {rule.priority}')
        print(f'Condition: {rule.condition}')
        print(f'Actions: {rule.actions}')
        print('---')

    # Check recent acknowledgments in acted_order_user_acknowledgments
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, acknowledgment_type, rule_id, template_id, title, is_accepted, accepted_at, order_id, acknowledgment_data
            FROM acted_order_user_acknowledgments
            ORDER BY accepted_at DESC
            LIMIT 10
        """)
        acknowledgments = cursor.fetchall()

        print(f'\nRecent order acknowledgments: {len(acknowledgments)}')
        for ack in acknowledgments:
            print(f'ID: {ack[0]}, Type: {ack[1]}, Rule ID: {ack[2]}, Template ID: {ack[3]}')
            print(f'Title: {ack[4]}, Accepted: {ack[5]}, Accepted At: {ack[6]}')
            print(f'Order ID: {ack[7]}, Data: {ack[8]}')
            print('---')

    # Also check acted_rules_user_acknowledgments
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, acknowledgment_type, rule_id, message_template_id, is_selected, acknowledged_at, user_id
            FROM acted_rules_user_acknowledgments
            ORDER BY acknowledged_at DESC
            LIMIT 10
        """)
        user_acknowledgments = cursor.fetchall()

        print(f'\nRecent user acknowledgments: {len(user_acknowledgments)}')
        for ack in user_acknowledgments:
            print(f'ID: {ack[0]}, Type: {ack[1]}, Rule ID: {ack[2]}, Template ID: {ack[3]}')
            print(f'Selected: {ack[4]}, Acknowledged At: {ack[5]}, User ID: {ack[6]}')
            print('---')

if __name__ == '__main__':
    debug_digital_consent_rules()