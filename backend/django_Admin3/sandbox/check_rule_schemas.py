#!/usr/bin/env python3
"""Check which schemas are being used by the failing rules."""
import os
import sys
import django
import json

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import ActedRule, ActedRulesFields

# Get the rules
rule_ids = [
    'rule_uk_import_tax_warning_v1',
    'rule_expired_marking_deadlines_v1',
    'rule_aset_warning_v1'
]

for rule_id in rule_ids:
    rule = ActedRule.objects.filter(rule_id=rule_id).first()
    if rule:
        print(f"\nRule: {rule.rule_id}")
        print(f"  Name: {rule.name}")
        print(f"  Fields ID: {rule.rules_fields_id}")

        # Get the schema
        if rule.rules_fields_id:
            schema_obj = ActedRulesFields.objects.filter(fields_id=rule.rules_fields_id).first()
            if schema_obj:
                print(f"  Schema found: {schema_obj.name}")
                # Check variationId type in schema
                cart_items = schema_obj.schema.get('properties', {}).get('cart', {}).get('properties', {}).get('items', {})
                if 'items' in cart_items:
                    metadata = cart_items['items'].get('properties', {}).get('metadata', {})
                    if metadata:
                        variation_id = metadata.get('properties', {}).get('variationId', {})
                        print(f"  variationId type in schema: {variation_id.get('type', 'not defined')}")
            else:
                print(f"  Schema NOT found for {rule.rules_fields_id}")
    else:
        print(f"\nRule {rule_id} not found")