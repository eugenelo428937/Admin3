#!/usr/bin/env python3
"""
Test the expired marking deadlines rule execution
"""
import os
import sys
import django
import json

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.services.rule_engine import RuleEngine

def test_expired_marking_deadlines_rule():
    """Test the expired marking deadlines rule with mock data."""

    print("=== Testing Expired Marking Deadlines Rule ===")

    # Create test contexts
    test_cases = [
        {
            "name": "Cart with NO marking products",
            "context": {
                "cart": {
                    "id": 1,
                    "has_marking": False,
                    "has_material": True,
                    "has_tutorial": False,
                    "total": 120.00,
                    "items": [
                        {
                            "id": 1,
                            "product_id": 50,
                            "current_product": 50,
                            "product_name": "CB1 Study Text",
                            "product_type": "study_text",
                            "subject_code": "CB1",
                            "actual_price": "120.00",
                            "price_type": "standard",
                            "is_marking": False,
                            "has_expired_deadline": False,
                            "quantity": 1,
                            "metadata": {
                                "variationId": 1,
                                "variationName": "eBook"
                            }
                        }
                    ]
                }
            },
            "expected": "No messages (no marking products)"
        },
        {
            "name": "Cart with marking products but NO expired deadlines",
            "context": {
                "cart": {
                    "id": 2,
                    "has_marking": True,
                    "has_material": False,
                    "has_tutorial": False,
                    "total": 89.99,
                    "items": [
                        {
                            "id": 2,
                            "product_id": 80,
                            "current_product": 80,
                            "product_name": "CB1 Mock Exam Marking",
                            "product_type": "marking",
                            "subject_code": "CB1",
                            "actual_price": "29.99",
                            "price_type": "standard",
                            "is_marking": True,
                            "has_expired_deadline": False,
                            "quantity": 3,
                            "metadata": {
                                "variationId": 2,
                                "variationName": "Online"
                            }
                        }
                    ]
                }
            },
            "expected": "No messages (no expired deadlines)"
        },
        {
            "name": "Cart with marking products WITH expired deadlines",
            "context": {
                "cart": {
                    "id": 3,
                    "has_marking": True,
                    "has_material": False,
                    "has_tutorial": False,
                    "total": 159.98,
                    "items": [
                        {
                            "id": 3,
                            "product_id": 80,
                            "current_product": 80,
                            "product_name": "CB1 Mock Exam Marking",
                            "product_type": "marking",
                            "subject_code": "CB1",
                            "actual_price": "29.99",
                            "price_type": "standard",
                            "is_marking": True,
                            "has_expired_deadline": True,
                            "quantity": 3,
                            "metadata": {
                                "variationId": 2,
                                "variationName": "Online"
                            }
                        },
                        {
                            "id": 4,
                            "product_id": 85,
                            "current_product": 85,
                            "product_name": "CB2 Series X Assignment Marking",
                            "product_type": "marking",
                            "subject_code": "CB2",
                            "actual_price": "49.99",
                            "price_type": "standard",
                            "is_marking": True,
                            "has_expired_deadline": True,
                            "quantity": 3,
                            "metadata": {
                                "variationId": 3,
                                "variationName": "Assignment"
                            }
                        }
                    ]
                }
            },
            "expected": "Warning message with expired deadlines list"
        }
    ]

    rule_engine = RuleEngine()

    for test_case in test_cases:
        print(f"\n--- Test Case: {test_case['name']} ---")
        print(f"Expected: {test_case['expected']}")

        try:
            result = rule_engine.execute("checkout_start", test_case['context'])

            print(f"Rules evaluated: {result.get('rules_evaluated', 0)}")
            print(f"Messages count: {len(result.get('messages', []))}")

            if result.get('messages'):
                for i, message in enumerate(result['messages']):
                    print(f"Message {i+1}:")
                    print(f"  Type: {message.get('message_type', 'N/A')}")
                    print(f"  Display: {message.get('display_type', 'N/A')}")
                    print(f"  Template ID: {message.get('template_id', 'N/A')}")

                    content = message.get('content', {})
                    if isinstance(content, dict):
                        title = content.get('title', 'No title')
                        print(f"  Title: {title}")

                        # Check if we have the expected expired deadlines content
                        if 'json_content' in content:
                            json_content = content['json_content']
                            if 'content' in json_content:
                                for item in json_content['content']:
                                    if item.get('element') == 'ul':
                                        print(f"  List items: {item.get('text', [])}")
                                    elif item.get('element') == 'p':
                                        print(f"  Message: {item.get('text', '')}")
            else:
                print("  No messages returned")

        except Exception as e:
            print(f"ERROR: {str(e)}")
            import traceback
            traceback.print_exc()

    print("\n=== Test Complete ===")

if __name__ == '__main__':
    test_expired_marking_deadlines_rule()