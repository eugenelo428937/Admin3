#!/usr/bin/env python3
"""Test that schema validation errors are now fixed."""
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

# Create test context similar to what would be sent from frontend
# with actual integer variationId
test_context = {
    "cart": {
        "id": 123,
        "items": [
            {
                "id": 1,
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
                    "variationId": 746,  # Now using actual integer ID
                    "variationName": "The Hub (VLE)"
                }
            }
        ],
        "total": 249.0,
        "has_marking": False,
        "has_material": False,
        "has_tutorial": True,
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

# Test the rules that were failing
rule_engine = RuleEngine()

print("Testing rules with fixed schema validation...\n")

# Test checkout_start entry point (where the errors were occurring)
try:
    result = rule_engine.execute("checkout_start", test_context)
    print("[OK] checkout_start rules executed successfully!")
    print(f"   Messages returned: {len(result.get('messages', []))}")
    if result.get('messages'):
        for msg in result['messages']:
            print(f"   - {msg.get('title', 'Untitled')}: {msg.get('type', 'unknown type')}")
except Exception as e:
    print(f"[FAIL] checkout_start rules failed: {str(e)}")

print()

# Test checkout_terms entry point as well
try:
    result = rule_engine.execute("checkout_terms", test_context)
    print("[OK] checkout_terms rules executed successfully!")
    print(f"   Messages returned: {len(result.get('messages', []))}")
    if result.get('messages'):
        for msg in result['messages']:
            print(f"   - {msg.get('title', 'Untitled')}: {msg.get('type', 'unknown type')}")
except Exception as e:
    print(f"[FAIL] checkout_terms rules failed: {str(e)}")