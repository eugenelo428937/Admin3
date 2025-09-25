#!/usr/bin/env python3
"""
Debug script to isolate the transaction management error in checkout.
"""

import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.db import transaction
from cart.models import Cart
from django.contrib.auth.models import User

def test_transaction_imports():
    """Test all the imports that happen within the transaction block"""
    print("=== Testing transaction block imports ===")

    try:
        user = User.objects.get(email='eugenelo4005@bpp.com')
        cart = Cart.objects.get(user=user)

        print(f"User: {user.email}")
        print(f"Cart: {cart.id} with {cart.items.count()} items")

        with transaction.atomic():
            print("1. Testing basic imports...")

            # Test import 1: rules_engine.services.rule_engine
            try:
                from rules_engine.services.rule_engine import rule_engine
                print("✅ rules_engine.services.rule_engine imported successfully")
            except Exception as e:
                print(f"❌ Error importing rules_engine.services.rule_engine: {e}")
                raise

            # Test import 2: rules_engine.services.rule_engine (corrected)
            try:
                from rules_engine.services.rule_engine import rule_engine as engine2
                print("✅ rules_engine.services.rule_engine imported successfully (second import)")
            except Exception as e:
                print(f"❌ Error importing rules_engine.services.rule_engine (second): {e}")
                raise

            # Test import 3: rules_engine.custom_functions
            try:
                from rules_engine.custom_functions import calculate_vat_standard
                print("✅ rules_engine.custom_functions imported successfully")
            except Exception as e:
                print(f"❌ Error importing rules_engine.custom_functions: {e}")
                raise

            # Test import 4: rules_engine.models
            try:
                from rules_engine.models import ActedRule
                print("✅ rules_engine.models imported successfully")
            except Exception as e:
                print(f"❌ Error importing rules_engine.models: {e}")
                raise

            print("✅ All imports successful within transaction block")

    except Exception as e:
        print(f"❌ Transaction error: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

def test_vat_calculation():
    """Test VAT calculation specifically"""
    print("\n=== Testing VAT calculation ===")

    try:
        user = User.objects.get(email='eugenelo4005@bpp.com')
        cart = Cart.objects.get(user=user)

        from rules_engine.custom_functions import calculate_vat_standard

        # Format cart items for VAT calculation
        cart_items_for_vat = [
            {
                'id': item.id,
                'product_id': item.product.product.id,
                'subject_code': item.product.exam_session_subject.subject.code,
                'product_name': item.product.product.fullname,
                'product_code': item.product.product.code,
                'product_type': getattr(item.product, 'type', None),
                'quantity': item.quantity,
                'price_type': item.price_type,
                'actual_price': str(item.actual_price) if item.actual_price else '0',
                'metadata': item.metadata
            }
            for item in cart.items.all()
        ]

        print(f"Cart items for VAT calculation: {len(cart_items_for_vat)}")

        # Calculate VAT using standard UK VAT rate (20%)
        vat_params = {
            'function': 'calculate_vat_standard',
            'vat_rate': 0.2,
            'description': 'Standard UK VAT at 20%',
            'threshold_amount': 0,
            'exempt_product_types': ['book', 'educational_material']
        }

        vat_result = calculate_vat_standard(cart_items_for_vat, vat_params)
        print(f"✅ VAT calculation successful: {vat_result}")

    except Exception as e:
        print(f"❌ VAT calculation error: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    print("Debug Transaction Management Error")
    print("=" * 50)

    success1 = test_transaction_imports()
    success2 = test_vat_calculation()

    if success1 and success2:
        print("\n✅ All tests passed - transaction should work")
    else:
        print("\n❌ Tests failed - transaction will likely fail")
        sys.exit(1)