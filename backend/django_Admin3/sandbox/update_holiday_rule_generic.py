#!/usr/bin/env python3
"""
Update Holiday Message rule to use new generic template processor
Shows different approaches for programmatic variable generation
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

def update_holiday_rule_context_mapping():
    print("=== UPDATING HOLIDAY RULE WITH GENERIC CONTEXT MAPPING ===\n")

    try:
        with transaction.atomic():
            rule = ActedRule.objects.get(rule_id="rule_holiday_message_v1")

            # Example of different approaches for context_mapping
            examples = {

                # Approach 1: Static values (current approach)
                "static_approach": {
                    "date1": "14/09/2025",
                    "date2": "20/09/2025"
                },

                # Approach 2: Function-based date formatting
                "function_approach": {
                    "date1": {
                        "type": "function",
                        "function": "format_date",
                        "args": ["2025-09-14", "%d/%m/%Y"]
                    },
                    "date2": {
                        "type": "function",
                        "function": "format_date",
                        "args": ["2025-09-20", "%d/%m/%Y"]
                    }
                },

                # Approach 3: Context-based (dates from context)
                "context_approach": {
                    "date1": {
                        "type": "context",
                        "path": "holiday_start_date"
                    },
                    "date2": {
                        "type": "context",
                        "path": "holiday_end_date"
                    }
                },

                # Approach 4: Mixed approach with expressions
                "expression_approach": {
                    "date1": "14/09/2025",  # Static
                    "date2": {
                        "type": "context",
                        "path": "page.holiday_end_date"
                    },
                    "current_year": {
                        "type": "expression",
                        "expression": "current_date"
                    }
                }
            }

            # Let's use the function approach for demonstration
            chosen_approach = examples["function_approach"]

            # Update the rule's context_mapping
            actions = rule.actions.copy()
            if actions and len(actions) > 0:
                actions[0]["context_mapping"] = chosen_approach
                rule.actions = actions
                rule.save()

                print(f"Updated rule actions:")
                print(json.dumps(actions, indent=2))

                print(f"\n[SUCCESS] Holiday rule updated with generic context mapping!")
                print(f"New context_mapping uses function-based date formatting")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

def show_subject_code_conversion():
    print("\n=== SUBJECT_CODE CONVERSION EXAMPLE ===\n")

    print("OLD hardcoded approach:")
    print("""
    if var_name == 'subject_code':
        cart_items = context.get('cart', {}).get('items', [])
        for item in cart_items:
            if item.get('product_id') in [72, 73]:
                subject_code = item.get('subject_code', 'SUBJECT')
                # ... replace logic
    """)

    print("NEW generic approach:")
    subject_code_mapping = {
        "subject_code": {
            "type": "filter",
            "source": "cart.items",
            "condition": {
                "product_id": {"in": [72, 73]}
            },
            "extract": "subject_code"
        }
    }

    print("Context mapping configuration:")
    print(json.dumps(subject_code_mapping, indent=2))

def show_more_examples():
    print("\n=== MORE EXAMPLES ===\n")

    examples = {
        "user_greeting": {
            "user_name": {
                "type": "context",
                "path": "user.first_name"
            },
            "user_full_name": {
                "type": "function",
                "function": "join",
                "args": ["$user.first_name", "$user.last_name"]
            }
        },

        "cart_summary": {
            "item_count": {
                "type": "function",
                "function": "array_length",
                "args": ["$cart.items"]
            },
            "first_item_name": {
                "type": "context",
                "path": "cart.items.0.product_name"
            }
        },

        "dynamic_dates": {
            "formatted_date": {
                "type": "function",
                "function": "format_date",
                "args": ["$current_date", "%d/%m/%Y"]
            },
            "timestamp": {
                "type": "function",
                "function": "current_timestamp",
                "args": []
            }
        }
    }

    for category, mapping in examples.items():
        print(f"\n{category.upper()}:")
        print(json.dumps(mapping, indent=2))

if __name__ == '__main__':
    update_holiday_rule_context_mapping()
    show_subject_code_conversion()
    show_more_examples()