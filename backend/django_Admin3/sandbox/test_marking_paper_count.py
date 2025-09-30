#!/usr/bin/env python3
"""
Test script to verify marking paper count is used correctly in expired deadlines message
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


def test_marking_paper_count():
    """Test expired marking deadlines message with actual paper counts."""

    print("=== Testing Marking Paper Count in Expired Deadlines Message ===\n")

    # Test context with marking products with different paper counts vs expired counts
    test_context = {
        'cart': {
            'id': 1,
            'has_marking': True,
            'has_material': False,
            'has_tutorial': False,
            'total': 80.00,
            'discount': 0,
            'session_key': 'test_session',
            'created_at': '2025-01-15T10:00:00Z',
            'updated_at': '2025-01-15T10:00:00Z',
            'items': [
                # CB1 Mock Exam Marking: 2 expired out of 5 total papers
                {
                    'id': 1,
                    'product_id': 80,
                    'product_name': 'CB1 Mock Exam Marking',
                    'product_code': 'CB1-MARK',
                    'product_type': 'marking',
                    'subject_code': 'CB1',
                    'exam_session_code': 'APR25',
                    'quantity': 1,
                    'price_type': 'standard',
                    'actual_price': '30.00',
                    'current_product': 80,
                    'is_marking': True,
                    'has_expired_deadline': True,
                    'expired_deadlines_count': 2,
                    'marking_paper_count': 5,  # 2 out of 5 papers expired
                    'metadata': {
                        'variationId': 1,
                        'variationName': 'Standard'
                    }
                },
                # CB2 Series X Assignment Marking: 1 expired out of 3 total papers
                {
                    'id': 2,
                    'product_id': 85,
                    'product_name': 'CB2 Series X Assignment Marking',
                    'product_code': 'CB2-MARK',
                    'product_type': 'marking',
                    'subject_code': 'CB2',
                    'exam_session_code': 'APR25',
                    'quantity': 1,
                    'price_type': 'standard',
                    'actual_price': '25.00',
                    'current_product': 85,
                    'is_marking': True,
                    'has_expired_deadline': True,
                    'expired_deadlines_count': 1,
                    'marking_paper_count': 3,  # 1 out of 3 papers expired
                    'metadata': {
                        'variationId': 2,
                        'variationName': 'Standard'
                    }
                }
            ]
        }
    }

    print("Test Context:")
    print("  - CB1 Mock Exam Marking: 2 expired out of 5 total papers")
    print("  - CB2 Series X Assignment Marking: 1 expired out of 3 total papers")
    print("  - Expected format: '- Product Name (X/Y deadlines expired)'")
    print()

    rule_engine = RuleEngine()
    result = rule_engine.execute("checkout_start", test_context)

    print("Results:")
    print(f"  Success: {result.get('success', False)}")
    print(f"  Messages count: {len(result.get('messages', []))}")
    print()

    if result.get('messages'):
        for i, message in enumerate(result['messages']):
            if message.get('template_id') == 10:  # Expired marking deadlines template
                print(f"Expired Marking Deadlines Message:")
                print(f"  Title: {message.get('content', {}).get('title', 'N/A')}")
                content = message.get('content', {}).get('message', '')
                print(f"  Message: {content}")
                print()

                # Check if the format includes correct paper counts
                if '2/5 deadlines expired' in content and '1/3 deadlines expired' in content:
                    print("✅ SUCCESS: Message correctly uses actual paper counts!")
                else:
                    print("❌ FAILED: Message doesn't show correct paper count format")
                break
    else:
        print("❌ No messages returned")

    print("\n=== Test Complete ===")


if __name__ == '__main__':
    test_marking_paper_count()