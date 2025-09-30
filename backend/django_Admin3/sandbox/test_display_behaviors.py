#!/usr/bin/env python3
"""Test both inline and modal display behaviors for acknowledge rules."""
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

print("Testing acknowledge rule display behaviors...\n")

# Test 1: Terms & Conditions (inline display)
print("=== Test 1: Terms & Conditions (should be inline) ===")
terms_context = {
    "cart": {
        "id": 123,
        "items": [
            {
                "id": 1,
                "quantity": 1,
                "actual_price": "249.00",
                "product_id": 3261,
                "product_code": "MAT",
                "product_name": "Materials",
                "product_type": "material",
                "subject_code": "CP1",
                "current_product": 1,
                "exam_session_code": "25S",
                "is_marking": False,
                "has_expired_deadline": False,
                "expired_deadlines_count": 0,
                "marking_paper_count": 0,
                "metadata": {
                    "variationId": 100,
                    "variationName": "Printed Materials"
                }
            }
        ],
        "total": 249.0,
        "has_marking": False,
        "has_material": True,
        "has_tutorial": False,
        "has_digital": False,
        "session_key": "test-session",
        "created_at": "2025-09-16T12:00:00Z",
        "updated_at": "2025-09-16T12:00:00Z"
    },
    "user": {
        "id": 1,
        "region": "UK",
        "email": "test@example.com"
    },
    "session": {
        "ip_address": "127.0.0.1",
        "session_id": "test-session-123"
    }
}

rule_engine = RuleEngine()

try:
    result = rule_engine.execute("checkout_terms", terms_context)
    print(f"[OK] Executed checkout_terms successfully")
    print(f"  Messages returned: {len(result.get('messages', []))}")

    for msg in result.get('messages', []):
        msg_type = msg.get('type', 'unknown')
        display_type = msg.get('display_type', 'not set')
        title = msg.get('title', 'Untitled')
        print(f"  - {title} (type: {msg_type}, display: {display_type})")

except Exception as e:
    print(f"[FAIL] Failed: {str(e)}")

print()

# Test 2: Digital Content (modal display)
print("=== Test 2: Digital Content (should be modal) ===")
digital_context = {
    "cart": {
        "id": 124,
        "items": [
            {
                "id": 2,
                "quantity": 1,
                "actual_price": "249.00",
                "product_id": 3261,
                "product_code": "OC",
                "product_name": "Online Classroom",
                "product_type": "tutorial",
                "subject_code": "CP1",
                "current_product": 1,
                "exam_session_code": "25S",
                "is_marking": False,
                "has_expired_deadline": False,
                "expired_deadlines_count": 0,
                "marking_paper_count": 0,
                "metadata": {
                    "variationId": 746,
                    "variationName": "The Hub (VLE)"
                }
            }
        ],
        "total": 249.0,
        "has_marking": False,
        "has_material": False,
        "has_tutorial": True,
        "has_digital": True,  # This should trigger digital content rule
        "session_key": "test-session",
        "created_at": "2025-09-16T12:00:00Z",
        "updated_at": "2025-09-16T12:00:00Z"
    },
    "user": {
        "id": 1,
        "region": "UK",
        "email": "test@example.com"
    },
    "session": {
        "ip_address": "127.0.0.1",
        "session_id": "test-session-124"
    }
}

try:
    result = rule_engine.execute("checkout_terms", digital_context)
    print(f"[OK] Executed checkout_terms successfully")
    print(f"  Messages returned: {len(result.get('messages', []))}")

    for msg in result.get('messages', []):
        msg_type = msg.get('type', 'unknown')
        display_type = msg.get('display_type', 'not set')
        title = msg.get('title', 'Untitled')
        print(f"  - {title} (type: {msg_type}, display: {display_type})")

except Exception as e:
    print(f"[FAIL] Failed: {str(e)}")

print("\n=== Summary ===")
print("Expected behavior:")
print("- Terms & Conditions: inline display (shown in checkout step)")
print("- Digital Content: modal display (shown in popup modal)")
print("- Both can appear together if cart has digital products")