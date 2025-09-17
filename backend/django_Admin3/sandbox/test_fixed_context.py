#!/usr/bin/env python3
"""
Test rules execution with the fixed context format from frontend
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
import json

def test_fixed_context():
    print("=== TESTING FIXED FRONTEND CONTEXT FORMAT ===\n")

    # Use the same context format as the updated frontend
    context = {
        'cart': {
            'id': 1,
            'items': [{
                'id': 1,
                'current_product': 100,  # This should be an integer
                'product_type': 'material',
                'product_id': 100,
                'product_name': 'CS1 Study Guide',
                'subject_code': 'CS1',
                'product_code': 'CS1-eBook',
                'quantity': 1,
                'price_type': 'standard',
                'actual_price': '75.00',
                'is_marking': False,
                'exam_session_code': 'CURRENT',
                'has_expired_deadline': False,
                'metadata': {
                    'variationId': 1,
                    'variationName': 'eBook'
                }
            }],
            'total': 75.0,
            'user': None,
            'session_key': None,
            'has_marking': False,
            'has_material': True,
            'has_tutorial': False,
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z',
            'discount': 0
        }
    }

    print("Testing with fixed context:")
    print(json.dumps(context, indent=2))
    print()

    engine = RuleEngine()
    result = engine.execute('checkout_start', context)

    print(f"Success: {result.get('success', False)}")
    print(f"Blocked: {result.get('blocked', False)}")
    print(f"Rules evaluated: {result.get('rules_evaluated', 0)}")
    print(f"Messages count: {len(result.get('messages', []))}")
    print(f"Execution time: {result.get('execution_time_ms', 0):.2f}ms")

    if result.get('messages'):
        print("\nMessages:")
        for i, msg in enumerate(result.get('messages', [])):
            print(f"  Message {i+1}:")
            print(f"    Type: {msg.get('message_type', 'N/A')}")
            print(f"    Display Type: {msg.get('display_type', 'N/A')}")
            print(f"    Template ID: {msg.get('template_id', 'N/A')}")
            if 'content' in msg:
                content = msg['content']
                if isinstance(content, dict):
                    print(f"    Title: {content.get('title', 'No title')}")
                    message = content.get('message', 'No message')
                    print(f"    Message: {message[:100]}{'...' if len(message) > 100 else ''}")
                else:
                    print(f"    Content: {str(content)[:50]}...")

    if result.get('schema_validation_errors'):
        print(f"\nSchema validation errors: {len(result.get('schema_validation_errors', []))}")
        for error in result.get('schema_validation_errors', []):
            print(f"  - Rule: {error.get('rule_id')}")
            print(f"    Error: {error.get('error')}")

    print("\n" + "="*60)

if __name__ == '__main__':
    test_fixed_context()