#!/usr/bin/env python
"""
Debug why digital consent rule condition is not matching despite has_digital=True
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from cart.models import Cart, CartItem
from cart.views import CartViewSet
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from django.contrib.auth import get_user_model
from rules_engine.services.rule_engine import rule_engine
from rules_engine.models import ActedRule
import json
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

def debug_digital_consent_rule():
    print("=== DEBUGGING DIGITAL CONSENT RULE CONDITION ===\n")

    try:
        # Get the digital consent rule
        digital_rules = ActedRule.objects.filter(
            name__icontains='digital',
            entry_point='checkout_terms',
            active=True
        ).order_by('priority')

        print(f"Found {digital_rules.count()} digital rules in checkout_terms:")
        for rule in digital_rules:
            print(f"  Rule ID: {rule.id}")
            print(f"  Name: {rule.name}")
            print(f"  Rule ID field: {rule.rule_id}")
            print(f"  Priority: {rule.priority}")
            print(f"  Condition: {json.dumps(rule.condition, indent=2)}")
            print(f"  Active: {rule.active}")
            print("  ---")

        if not digital_rules.exists():
            print("No digital rules found!")
            return

        # Create test scenario
        user = User.objects.first()
        if not user:
            print("No users found")
            return

        print(f"\nTesting with user: {user.email}")

        # Create cart with digital item
        oc_products = list(ExamSessionSubjectProduct.objects.filter(
            product__code='OC'
        ).select_related('product')[:1])

        if not oc_products:
            print("No OC products found")
            return

        oc_product = oc_products[0]
        print(f"Using OC product: {oc_product.id} - {oc_product.product.fullname}")

        cart = Cart.objects.create(user=user)
        cart_item = CartItem.objects.create(
            cart=cart,
            product=oc_product,
            quantity=1,
            item_type='product'
        )

        # Update cart flags
        cart_view = CartViewSet()
        cart_view._update_cart_flags(cart)
        cart.refresh_from_db()

        print(f"\nCart {cart.id} has_digital: {cart.has_digital}")

        # Build context exactly like the acknowledgment transfer method does
        cart_items = cart.items.all().select_related('product__product', 'product__exam_session_subject__subject')
        total = sum(item.actual_price or 0 for item in cart_items)

        context = {
            'cart': {
                'id': cart.id,
                'user_id': cart.user.id if cart.user else None,
                'has_digital': cart.has_digital,  # Use cart's has_digital flag
                'total': float(total),
                'items': []
            },
            'user': {
                'id': user.id,
                'email': user.email,
                'is_authenticated': True
            },
            'session': {
                'ip_address': '127.0.0.1',
                'session_id': 'debug_session'
            },
            'acknowledgments': {}
        }

        print(f"\nContext being sent to rules engine:")
        print(json.dumps(context, indent=2))

        # Execute rules engine with detailed logging
        print(f"\n=== EXECUTING RULES ENGINE ===")
        result = rule_engine.execute('checkout_terms', context)

        print(f"Rules engine result:")
        print(f"  Success: {result.get('success')}")
        print(f"  Error: {result.get('error')}")
        print(f"  Rules executed: {len(result.get('rules_executed', []))}")

        for rule_exec in result.get('rules_executed', []):
            print(f"\n  Rule execution:")
            print(f"    Rule ID: {rule_exec.get('rule_id')}")
            print(f"    Condition result: {rule_exec.get('condition_result')}")
            print(f"    Execution time: {rule_exec.get('execution_time_ms')}ms")
            print(f"    Error: {rule_exec.get('error')}")

        print(f"\nMessages generated: {len(result.get('messages', []))}")
        for message in result.get('messages', []):
            print(f"  Template ID: {message.get('template_id')}")
            print(f"  Content keys: {list(message.get('content', {}).keys())}")

        # Test the condition manually
        print(f"\n=== MANUAL CONDITION TESTING ===")
        digital_rule = digital_rules.first()
        condition = digital_rule.condition

        print(f"Digital rule condition: {json.dumps(condition, indent=2)}")

        # Test JSONLogic condition manually
        if condition.get('type') == 'jsonlogic':
            import jsonlogic
            logic_expr = condition.get('expr')
            print(f"JSONLogic expression: {json.dumps(logic_expr, indent=2)}")

            try:
                # Test the condition with our context
                result_manual = jsonlogic.jsonLogic(logic_expr, context)
                print(f"Manual JSONLogic evaluation result: {result_manual}")

                # Test specific parts
                if '==' in logic_expr:
                    var_path = logic_expr['=='][0]['var'] if 'var' in logic_expr['=='][0] else None
                    expected_value = logic_expr['=='][1]

                    if var_path:
                        # Extract the value from context
                        actual_value = context
                        for part in var_path.split('.'):
                            if part in actual_value:
                                actual_value = actual_value[part]
                            else:
                                actual_value = None
                                break

                        print(f"Variable path: {var_path}")
                        print(f"Expected value: {expected_value}")
                        print(f"Actual value: {actual_value}")
                        print(f"Types - Expected: {type(expected_value)}, Actual: {type(actual_value)}")
                        print(f"Comparison result: {actual_value == expected_value}")

            except Exception as e:
                print(f"Error in manual JSONLogic evaluation: {e}")

        # Clean up
        cart.delete()
        print(f"\nCleaned up test cart")

    except Exception as e:
        print(f"Debug failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    debug_digital_consent_rule()