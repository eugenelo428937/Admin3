#!/usr/bin/env python3
"""
Test rules execution with proper context format
"""

import os
import sys
import django
from django.conf import settings

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.services.rule_engine import RuleEngine
from rules_engine.models.acted_rules_fields import ActedRulesFields
import json

def test_checkout_start_execution():
    print("=== TESTING CHECKOUT_START RULES EXECUTION ===\n")

    # Check what schema is expected
    try:
        schema_checkout_countries = ActedRulesFields.objects.get(fields_id="checkout_context_with_countries_v1")
        print("Schema for checkout_context_with_countries_v1:")
        print(json.dumps(schema_checkout_countries.schema, indent=2))
        print()
    except ActedRulesFields.DoesNotExist:
        print("Schema checkout_context_with_countries_v1 not found")

    try:
        schema_checkout = ActedRulesFields.objects.get(fields_id="checkout_context_v1")
        print("Schema for checkout_context_v1:")
        print(json.dumps(schema_checkout.schema, indent=2))
        print()
    except ActedRulesFields.DoesNotExist:
        print("Schema checkout_context_v1 not found")

    # Test with a proper context that includes current_product
    context_with_current_product = {
        'cart': {
            'id': 1,
            'items': [{
                'id': 1,
                'product_name': 'CS1 Study Guide',
                'subject_code': 'CS1',
                'variation_name': 'eBook',
                'actual_price': '75.00',
                'quantity': 1,
                'current_product': {
                    'id': 100,
                    'subject_code': 'CS1',
                    'product_name': 'CS1 Study Guide'
                }
            }],
            'total': 75,
            'user': None,
            'session_key': None,
            'has_marking': False,
            'has_material': False,
            'has_tutorial': False
        }
    }

    print("Testing with current_product in context:")
    engine = RuleEngine()
    result = engine.execute('checkout_start', context_with_current_product)

    print(f"Success: {result.get('success', False)}")
    print(f"Rules evaluated: {result.get('rules_evaluated', 0)}")
    print(f"Messages count: {len(result.get('messages', []))}")

    if result.get('messages'):
        print("\nMessages:")
        for i, msg in enumerate(result.get('messages', [])):
            print(f"  Message {i+1}:")
            print(f"    Type: {msg.get('message_type')}")
            print(f"    Display Type: {msg.get('display_type')}")
            print(f"    Template ID: {msg.get('template_id')}")
            if 'content' in msg:
                content = msg['content']
                if isinstance(content, dict):
                    print(f"    Title: {content.get('title', 'No title')}")
                    print(f"    Message: {content.get('message', 'No message')[:50]}...")
                else:
                    print(f"    Content: {str(content)[:50]}...")

    if result.get('schema_validation_errors'):
        print(f"\nSchema validation errors: {len(result.get('schema_validation_errors', []))}")
        for error in result.get('schema_validation_errors', []):
            print(f"  - Rule: {error.get('rule_id')}")
            print(f"    Error: {error.get('error')}")

    print("\n" + "="*50)

if __name__ == '__main__':
    test_checkout_start_execution()