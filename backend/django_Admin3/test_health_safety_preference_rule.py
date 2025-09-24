#!/usr/bin/env python3
"""
Test script for Health and Safety Preference rule
Tests the rule execution with different scenarios
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

def test_health_safety_preference_rule():
    """Test the health and safety preference rule with various scenarios."""

    rule_engine = RuleEngine()

    print("=== Testing Health and Safety Preference Rule ===\n")

    # Test Case 1: Cart with tutorials (should trigger rule)
    print("Test Case 1: Cart with tutorials (SHOULD TRIGGER)")
    context1 = {
        "cart": {
            "has_tutorial": True,
            "has_material": False,
            "has_marking": False,
            "items": [{"product_type": "tutorial"}]
        },
        "user": {
            "id": "test_user_1"
        }
    }

    result1 = rule_engine.execute("checkout_preference", context1)
    print(f"Rule triggered: {'Yes' if result1.get('preference_prompts') else 'No'}")
    if result1.get('preference_prompts'):
        for prompt in result1['preference_prompts']:
            print(f"  Preference: {prompt.get('title')}")
            print(f"  Key: {prompt.get('preferenceKey')}")
            print(f"  Default: {prompt.get('default')}")
            print(f"  Input Type: {prompt.get('inputType')}")
    print()

    # Test Case 2: Cart without tutorials (should NOT trigger rule)
    print("Test Case 2: Cart without tutorials (SHOULD NOT TRIGGER)")
    context2 = {
        "cart": {
            "has_tutorial": False,
            "has_material": True,
            "has_marking": False,
            "items": [{"product_type": "material"}]
        },
        "user": {
            "id": "test_user_2"
        }
    }

    result2 = rule_engine.execute("checkout_preference", context2)
    print(f"Rule triggered: {'Yes' if result2.get('preference_prompts') else 'No'}")
    if result2.get('preference_prompts'):
        # Check if our specific rule is in the prompts
        health_safety_prompt = next((p for p in result2['preference_prompts']
                                   if p.get('preferenceKey') == 'health_safety_notification'), None)
        print(f"  Health & Safety prompt found: {'Yes' if health_safety_prompt else 'No'}")
    print()

    # Test Case 3: Mixed cart with tutorials and materials (should trigger rule)
    print("Test Case 3: Mixed cart with tutorials and materials (SHOULD TRIGGER)")
    context3 = {
        "cart": {
            "has_tutorial": True,
            "has_material": True,
            "has_marking": False,
            "items": [{"product_type": "tutorial"}, {"product_type": "material"}]
        },
        "user": {
            "id": "test_user_3"
        }
    }

    result3 = rule_engine.execute("checkout_preference", context3)
    print(f"Rule triggered: {'Yes' if result3.get('preference_prompts') else 'No'}")
    if result3.get('preference_prompts'):
        # Check if our specific rule is in the prompts
        health_safety_prompt = next((p for p in result3['preference_prompts']
                                   if p.get('preferenceKey') == 'health_safety_notification'), None)
        print(f"  Health & Safety prompt found: {'Yes' if health_safety_prompt else 'No'}")
        if health_safety_prompt:
            print(f"  Title: {health_safety_prompt.get('title')}")
            content = health_safety_prompt.get('content', '')
            print(f"  Content: {content[:50] if isinstance(content, str) else str(content)[:50]}...")
    print()

    # Test Case 4: Empty cart (should NOT trigger rule)
    print("Test Case 4: Empty cart (SHOULD NOT TRIGGER)")
    context4 = {
        "cart": {
            "has_tutorial": False,
            "has_material": False,
            "has_marking": False,
            "items": []
        },
        "user": {
            "id": "test_user_4"
        }
    }

    result4 = rule_engine.execute("checkout_preference", context4)
    print(f"Rule triggered: {'Yes' if result4.get('preference_prompts') else 'No'}")
    print()

    print("=== Test Summary ===")
    print("Test Case 1: Cart with tutorials -> Should show health & safety preference")
    print("Test Case 2: Cart without tutorials -> Should NOT show health & safety preference")
    print("Test Case 3: Mixed cart with tutorials -> Should show health & safety preference")
    print("Test Case 4: Empty cart -> Should NOT show health & safety preference")

if __name__ == '__main__':
    test_health_safety_preference_rule()