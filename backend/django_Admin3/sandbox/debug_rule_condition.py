#!/usr/bin/env python
"""
Debug script to test rule condition evaluation
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import ActedRule
from rules_engine.services.rule_engine import ConditionEvaluator, RuleEngine
import json

# Get the problematic rule
rule = ActedRule.objects.filter(
    rule_id='rule_checkout_terms_acknowledgment_v1',
    active=True
).first()

if not rule:
    print("Rule not found!")
    sys.exit(1)

print(f"Rule found: {rule.rule_id}")
print(f"Condition: {json.dumps(rule.condition, indent=2)}")

# Test condition evaluator directly
evaluator = ConditionEvaluator()

# Test with empty context
empty_context = {}
result1 = evaluator.evaluate(rule.condition, empty_context)
print(f"\nTest 1 - Empty context:")
print(f"  Context: {empty_context}")
print(f"  Result: {result1}")

# Test with typical checkout context
checkout_context = {
    "user": {
        "id": 60,
        "email": "eugene.lo1115@gmail.com",
        "is_authenticated": True
    },
    "cart": {
        "items": []
    }
}
result2 = evaluator.evaluate(rule.condition, checkout_context)
print(f"\nTest 2 - Checkout context:")
print(f"  Context: {json.dumps(checkout_context, indent=2)}")
print(f"  Result: {result2}")

# Test the specific condition directly
always_true_condition = {"always": True}
result3 = evaluator.evaluate(always_true_condition, {})
print(f"\nTest 3 - Direct always true test:")
print(f"  Condition: {always_true_condition}")
print(f"  Result: {result3}")

# Test through full rule engine
print(f"\nTest 4 - Full rule engine execution:")
engine = RuleEngine()
full_result = engine.execute("checkout_terms", checkout_context)
print(f"  Rules evaluated: {full_result.get('rules_evaluated', 0)}")
print(f"  Messages: {len(full_result.get('messages', []))}")
print(f"  Blocked: {full_result.get('blocked', False)}")

# Check if there's specific logic handling the condition
print(f"\nRule Actions: {json.dumps(rule.actions, indent=2)}")