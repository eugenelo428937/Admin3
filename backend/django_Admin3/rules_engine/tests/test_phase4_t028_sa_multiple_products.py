#!/usr/bin/env python
"""
Phase 4 Test Script: T028 - SA Customer Multiple Mixed Products

Scenario: SA customer adds Printed (R500) + Digital (R300 × 2)
Expected: net=R1100, VAT(15%)=R165, gross=R1265
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
    print("Phase 4 Test: T028 - SA Customer Multiple Mixed Products")
    print("=" * 80)

    # Create test user
    print("\n1. Creating test user...")
    user, created = User.objects.get_or_create(
        username='test_sa_t028',
        defaults={'email': 'sa_t028@test.com'}
    )
    print(f"   User: {user.username} ({'created' if created else 'existing'})")

    # Get or create cart
    print("\n2. Creating cart...")
    cart, created = Cart.objects.get_or_create(user=user)
    print(f"   Cart ID: {cart.id} ({'new' if created else 'existing'})")

    # Clear existing items
    cart.items.all().delete()
    print("   Cleared existing cart items")

    # Find products
    print("\n3. Finding products...")
    printed_product = ExamSessionSubjectProduct.objects.filter(
        variations__product_product_variation__product_variation__variation_type='Printed'
    ).distinct().first()
    digital_product = ExamSessionSubjectProduct.objects.filter(
        variations__product_product_variation__product_variation__variation_type='eBook'
    ).distinct().first()

    if not printed_product or not digital_product:
        print("   ERROR: Products not found!")
        print(f"   Printed: {'Found' if printed_product else 'NOT FOUND'}")
        print(f"   Digital: {'Found' if digital_product else 'NOT FOUND'}")
        print("   Run: python manage.py import_subjects")
        return False

    print(f"   Printed: {printed_product.product.fullname}")
    print(f"   Digital: {digital_product.product.fullname}")

    # Add Printed product (R500)
    print("\n4. Adding Printed product (R500, qty 1)...")
    item1 = CartItem.objects.create(
        cart=cart,
        product=printed_product,
        quantity=1,
        actual_price=Decimal('500.00'),
        item_type='product'
    )
    print(f"   Item 1 ID: {item1.id}")

    # Add Digital product (R300 × 2 = R600)
    print("\n5. Adding Digital product (R300, qty 2)...")
    item2 = CartItem.objects.create(
        cart=cart,
        product=digital_product,
        quantity=2,
        actual_price=Decimal('300.00'),
        item_type='product'
    )
    print(f"   Item 2 ID: {item2.id}")

    # Calculate VAT
    print("\n6. Calculating VAT for ZA (South Africa)...")
    result = cart.calculate_vat_for_all_items(country_code='ZA', update_items=True)

    # Display results
    print("\n7. Results:")
    print(f"   Success: {result['success']}")

    if result['success']:
        print(f"   Total Net:   R{result['total_net_amount']}")
        print(f"   Total VAT:   R{result['total_vat_amount']}")
        print(f"   Total Gross: R{result['total_gross_amount']}")

        # Check item details
        item1.refresh_from_db()
        item2.refresh_from_db()

        print(f"\n   Item 1 (Printed):")
        print(f"   - Net:        R{item1.actual_price * item1.quantity}")
        print(f"   - VAT Amount: R{item1.vat_amount}")
        print(f"   - VAT Rate:   {float(item1.vat_rate) * 100}%")
        print(f"   - Gross:      R{item1.gross_amount}")

        print(f"\n   Item 2 (Digital × 2):")
        print(f"   - Net:        R{item2.actual_price * item2.quantity}")
        print(f"   - VAT Amount: R{item2.vat_amount}")
        print(f"   - VAT Rate:   {float(item2.vat_rate) * 100}%")
        print(f"   - Gross:      R{item2.gross_amount}")

        # VAT Breakdown
        print(f"\n   VAT Breakdown:")
        for breakdown in result['vat_breakdown']:
            print(f"   - {breakdown['region']}: R{breakdown['amount']} ({breakdown['rate']}) - {breakdown['item_count']} items")

        # Validation
        print("\n8. Validation:")
        expected_net = Decimal('1100.00')
        expected_vat = Decimal('165.00')
        expected_gross = Decimal('1265.00')

        checks = [
            (result['total_net_amount'] == expected_net, f"Net amount: R{expected_net}"),
            (result['total_vat_amount'] == expected_vat, f"VAT amount: R{expected_vat}"),
            (result['total_gross_amount'] == expected_gross, f"Gross amount: R{expected_gross}"),
            (item1.vat_region == 'SA', "Item 1 VAT region: SA"),
            (item2.vat_region == 'SA', "Item 2 VAT region: SA"),
            (item1.vat_rate == Decimal('0.1500'), "Item 1 VAT rate: 15%"),
            (item2.vat_rate == Decimal('0.1500'), "Item 2 VAT rate: 15%"),
            (len(result['vat_breakdown']) == 1, "Single VAT region in breakdown"),
            (result['vat_breakdown'][0]['item_count'] == 2, "2 items in breakdown")
        ]

        all_passed = True
        for passed, description in checks:
            status = "PASS" if passed else "FAIL"
            print(f"   {status}: {description}")
            if not passed:
                all_passed = False

        if all_passed:
            print("\nTEST PASSED: T028 - SA Customer Multiple Mixed Products")
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
