#!/usr/bin/env python3
"""
Update ASET warning rule to use new generic template processor
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

from django.db import transaction
from rules_engine.models import ActedRule

def update_aset_rule_to_generic():
    print("=== UPDATING ASET WARNING RULE TO GENERIC TEMPLATE PROCESSOR ===\n")

    try:
        with transaction.atomic():
            rule = ActedRule.objects.get(rule_id="rule_aset_warning_v1")

            print(f"Found rule: {rule.name}")

            # Show current context_mapping
            current_actions = rule.actions
            current_context_mapping = current_actions[0].get('context_mapping', {})

            print(f"\nCURRENT context_mapping:")
            print(json.dumps(current_context_mapping, indent=2))

            # Create new generic context_mapping using filter type
            new_context_mapping = {
                "subject_code": {
                    "type": "filter",
                    "source": "cart.items",
                    "condition": {
                        "product_id": {"in": [72, 73]}
                    },
                    "extract": "subject_code"
                }
            }

            print(f"\nNEW context_mapping (generic):")
            print(json.dumps(new_context_mapping, indent=2))

            # Update the rule's context_mapping
            updated_actions = rule.actions.copy()
            if updated_actions and len(updated_actions) > 0:
                updated_actions[0]["context_mapping"] = new_context_mapping
                rule.actions = updated_actions

                # Update metadata to indicate the change
                metadata = rule.metadata.copy()
                metadata["updated_to_generic"] = True
                metadata["updated_by"] = "generic_template_processor"
                metadata["update_date"] = "2025-09-15"
                rule.metadata = metadata

                rule.save()

                print(f"\n[SUCCESS] ASET warning rule updated!")
                print(f"[OK] Replaced hardcoded JSONPath expression with generic filter mechanism")
                print(f"[OK] Now uses: type='filter', source='cart.items', condition, extract")

                return rule
            else:
                print("[ERROR] No actions found in rule")
                return None

    except ActedRule.DoesNotExist:
        print("[ERROR] ASET warning rule not found!")
        return None
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return None

def show_comparison():
    print("\n" + "="*80)
    print("BEFORE vs AFTER COMPARISON")
    print("="*80)

    print("\nBEFORE (Old hardcoded approach):")
    print("""
    In rule_engine.py:
    if var_name == 'subject_code':
        cart_items = context.get('cart', {}).get('items', [])
        for item in cart_items:
            if item.get('product_id') in [72, 73]:
                subject_code = item.get('subject_code', 'SUBJECT')
                content = content.replace(placeholder, subject_code)

    In database context_mapping:
    {
      "subject_code": "{{cart.items[?(@.product_id==72 || @.product_id==73)].subject_code | [0]}}"
    }
    """)

    print("\nAFTER (New generic approach):")
    print("""
    In rule_engine.py:
    processor = TemplateProcessor()
    content, title = processor.process_variables(content, title, context_mapping, context)

    In database context_mapping:
    {
      "subject_code": {
        "type": "filter",
        "source": "cart.items",
        "condition": {"product_id": {"in": [72, 73]}},
        "extract": "subject_code"
      }
    }
    """)

    print("\n[BENEFITS]:")
    print("- No more hardcoded logic in rule_engine.py")
    print("- Configurable through database context_mapping")
    print("- Can easily change product IDs, extract field, or condition")
    print("- Supports complex filtering conditions")
    print("- Reusable for other similar use cases")

if __name__ == '__main__':
    updated_rule = update_aset_rule_to_generic()
    if updated_rule:
        show_comparison()
    else:
        print("\n[FAILED] Could not update ASET rule")