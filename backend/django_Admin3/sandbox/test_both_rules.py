#!/usr/bin/env python3
"""
Test script to verify both ASET and expired marking deadlines rules trigger together
"""
import os
import sys
import django

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.services.rule_engine import RuleEngine


def test_both_rules():
    """Test both ASET and expired marking deadlines rules together."""

    print("=== Testing Both ASET and Expired Marking Deadlines Rules ===\n")

    # Test context with both ASET products (72, 73) and marking products with expired deadlines
    test_context = {
        'cart': {
            'id': 1,
            'has_marking': True,
            'has_material': False,
            'has_tutorial': False,
            'total': 150.00,
            'discount': 0,
            'session_key': 'test_session',
            'created_at': '2025-01-15T10:00:00Z',
            'updated_at': '2025-01-15T10:00:00Z',
            'items': [
                # ASET product that should trigger ASET warning
                {
                    'id': 1,
                    'product_id': 72,  # ASET product ID
                    'product_name': 'CB1 ASET',
                    'product_code': 'CB1-ASET',
                    'product_type': 'aset',
                    'subject_code': 'CB1',
                    'exam_session_code': 'APR25',
                    'quantity': 1,
                    'price_type': 'standard',
                    'actual_price': '50.00',
                    'current_product': 72,
                    'is_marking': False,
                    'has_expired_deadline': False,
                    'expired_deadlines_count': 0,
                    'metadata': {
                        'variationId': 1,
                        'variationName': 'Standard'
                    }
                },
                # Marking product with expired deadlines
                {
                    'id': 2,
                    'product_id': 80,
                    'product_name': 'CB1 Mock Exam Marking',
                    'product_code': 'CB1-MARK',
                    'product_type': 'marking',
                    'subject_code': 'CB1',
                    'exam_session_code': 'APR25',
                    'quantity': 2,
                    'price_type': 'standard',
                    'actual_price': '30.00',
                    'current_product': 80,
                    'is_marking': True,
                    'has_expired_deadline': True,
                    'expired_deadlines_count': 2,
                    'marking_paper_count': 5,
                    'metadata': {
                        'variationId': 2,
                        'variationName': 'Standard'
                    }
                },
                # Another marking product with expired deadlines
                {
                    'id': 3,
                    'product_id': 85,
                    'product_name': 'CB2 Series X Assignment Marking',
                    'product_code': 'CB2-MARK',
                    'product_type': 'marking',
                    'subject_code': 'CB2',
                    'exam_session_code': 'APR25',
                    'quantity': 3,
                    'price_type': 'standard',
                    'actual_price': '25.00',
                    'current_product': 85,
                    'is_marking': True,
                    'has_expired_deadline': True,
                    'expired_deadlines_count': 1,
                    'marking_paper_count': 3,
                    'metadata': {
                        'variationId': 3,
                        'variationName': 'Standard'
                    }
                }
            ]
        }
    }

    print("Test Context:")
    print(f"  - Cart has ASET product (ID: 72)")
    print(f"  - Cart has marking products with expired deadlines (IDs: 80, 85)")
    print(f"  - Expected: Both ASET warning AND expired deadlines warning")
    print()

    rule_engine = RuleEngine()
    result = rule_engine.execute("checkout_start", test_context)

    print("Results:")
    print(f"  Success: {result.get('success', False)}")
    print(f"  Rules evaluated: {result.get('rules_evaluated', 0)}")
    print(f"  Messages count: {len(result.get('messages', []))}")
    print()

    if result.get('messages'):
        for i, message in enumerate(result['messages']):
            print(f"Message {i+1}:")
            print(f"  Type: {message.get('message_type', 'N/A')}")
            print(f"  Display: {message.get('display_type', 'N/A')}")
            print(f"  Template ID: {message.get('template_id', 'N/A')}")

            content = message.get('content', {})
            if isinstance(content, dict):
                title = content.get('title', 'No title')
                message_text = content.get('message', 'No message')
                print(f"  Title: {title}")
                print(f"  Message: {message_text[:100]}...")
            else:
                print(f"  Content: {str(content)[:100]}...")
            print()
    else:
        print("  No messages returned")

    print("=== Test Complete ===")


if __name__ == '__main__':
    test_both_rules()