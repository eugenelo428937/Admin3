#!/usr/bin/env python
"""
Phase 4 Test Script: T027 - UK Customer Single Digital Product

Scenario: UK customer adds single digital product (£50)
Expected: net=£50, VAT(20%)=£10, gross=£60
"""
import os
import sys
import django

# Setup Django - adjust path since we're in rules_engine/tests/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from decimal import Decimal
from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

User = get_user_model()

def run_test():
    print("=" * 80)
    print("Phase 4 Test: T027 - UK Customer Single Digital Product")
    print("=" * 80)

    # Create test user
    print("\n1. Creating test user...")
    user, created = User.objects.get_or_create(
        username='test_uk_t027',
        defaults={'email': 'uk_t027@test.com'}
    )
    print(f"   User: {user.username} ({'created' if created else 'existing'})")

    # Get or create cart
    print("\n2. Creating cart...")
    cart, created = Cart.objects.get_or_create(user=user)
    print(f"   Cart ID: {cart.id} ({'new' if created else 'existing'})")

    # Clear existing items
    cart.items.all().delete()
    print("   Cleared existing cart items")

    # Find a Digital product (eBook variation)
    print("\n3. Finding Digital product...")
    essp = ExamSessionSubjectProduct.objects.filter(
        variations__product_product_variation__product_variation__variation_type='eBook'
    ).distinct().first()

    if not essp:
        print("   ERROR: No Digital products found!")
        print("   Run: python manage.py import_subjects")
        return False

    print(f"   Product: {essp.product.fullname}")

    # Add item to cart
    print("\n4. Adding item to cart...")
    item = CartItem.objects.create(
        cart=cart,
        product=essp,
        quantity=1,
        actual_price=Decimal('50.00'),
        item_type='product'
    )
    print(f"   Item ID: {item.id}")
    print(f"   Quantity: {item.quantity}")
    print(f"   Price: £{item.actual_price}")

    # Calculate VAT
    print("\n5. Calculating VAT for GB (UK)...")
    result = cart.calculate_vat_for_all_items(country_code='GB', update_items=True)

    # Display results
    print("\n6. Results:")
    print(f"   Success: {result['success']}")

    if result['success']:
        print(f"   Total Net:   £{result['total_net_amount']}")
        print(f"   Total VAT:   £{result['total_vat_amount']}")
        print(f"   Total Gross: £{result['total_gross_amount']}")

        # Check item details
        item.refresh_from_db()
        print(f"\n   Item Details:")
        print(f"   - VAT Region: {item.vat_region}")
        print(f"   - VAT Rate:   {float(item.vat_rate) * 100}%")
        print(f"   - VAT Amount: £{item.vat_amount}")
        print(f"   - Gross:      £{item.gross_amount}")

        # Validation
        print("\n7. Validation:")
        expected_net = Decimal('50.00')
        expected_vat = Decimal('10.00')
        expected_gross = Decimal('60.00')

        checks = [
            (result['total_net_amount'] == expected_net, f"Net amount: £{expected_net}"),
            (result['total_vat_amount'] == expected_vat, f"VAT amount: £{expected_vat}"),
            (result['total_gross_amount'] == expected_gross, f"Gross amount: £{expected_gross}"),
            (item.vat_region == 'UK', "VAT region: UK"),
            (item.vat_rate == Decimal('0.2000'), "VAT rate: 20%")
        ]

        all_passed = True
        for passed, description in checks:
            status = "PASS" if passed else "FAIL"
            print(f"   {status}: {description}")
            if not passed:
                all_passed = False

        if all_passed:
            print("\nTEST PASSED: T027 - UK Customer Single Digital Product")
        else:
            print("\nTEST FAILED: Some validations did not pass")

        return all_passed
    else:
        print(f"   ERROR: {result.get('error', 'Unknown error')}")
        return False

if __name__ == '__main__':
    try:
        success = run_test()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\nEXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
