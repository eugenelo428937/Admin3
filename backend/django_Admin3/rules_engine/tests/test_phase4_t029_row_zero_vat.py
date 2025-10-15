#!/usr/bin/env python
"""
Phase 4 Test Script: T029 - ROW Customer Zero VAT

Scenario: ROW customer (US) adds product (£100)
Expected: region=ROW, rate=0%, VAT=£0, gross=£100
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
    print("Phase 4 Test: T029 - ROW Customer Zero VAT")
    print("=" * 80)

    # Create test user
    print("\n1. Creating test user...")
    user, created = User.objects.get_or_create(
        username='test_us_t029',
        defaults={'email': 'us_t029@test.com'}
    )
    print(f"   User: {user.username} ({'created' if created else 'existing'})")

    # Get or create cart
    print("\n2. Creating cart...")
    cart, created = Cart.objects.get_or_create(user=user)
    print(f"   Cart ID: {cart.id} ({'new' if created else 'existing'})")

    # Clear existing items
    cart.items.all().delete()
    print("   Cleared existing cart items")

    # Find a product
    print("\n3. Finding product...")
    essp = ExamSessionSubjectProduct.objects.filter(
        variations__product_product_variation__product_variation__variation_type='eBook'
    ).distinct().first()

    if not essp:
        print("   ERROR: No products found!")
        print("   Run: python manage.py import_subjects")
        return False

    print(f"   Product: {essp.product.fullname}")

    # Add item to cart
    print("\n4. Adding item to cart (£100)...")
    item = CartItem.objects.create(
        cart=cart,
        product=essp,
        quantity=1,
        actual_price=Decimal('100.00'),
        item_type='product'
    )
    print(f"   Item ID: {item.id}")
    print(f"   Quantity: {item.quantity}")
    print(f"   Price: £{item.actual_price}")

    # Calculate VAT for US (ROW)
    print("\n5. Calculating VAT for US (Rest of World)...")
    result = cart.calculate_vat_for_all_items(country_code='US', update_items=True)

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

        # VAT Breakdown
        print(f"\n   VAT Breakdown:")
        for breakdown in result['vat_breakdown']:
            print(f"   - {breakdown['region']}: £{breakdown['amount']} ({breakdown['rate']})")

        # Validation
        print("\n7. Validation:")
        expected_net = Decimal('100.00')
        expected_vat = Decimal('0.00')
        expected_gross = Decimal('100.00')

        checks = [
            (result['total_net_amount'] == expected_net, f"Net amount: £{expected_net}"),
            (result['total_vat_amount'] == expected_vat, f"VAT amount: £{expected_vat}"),
            (result['total_gross_amount'] == expected_gross, f"Gross amount: £{expected_gross}"),
            (item.vat_region == 'ROW', "VAT region: ROW"),
            (item.vat_rate == Decimal('0.0000'), "VAT rate: 0%"),
            (item.vat_amount == Decimal('0.00'), "VAT amount: £0.00"),
            (item.gross_amount == item.actual_price, "Gross equals net (no VAT added)")
        ]

        all_passed = True
        for passed, description in checks:
            status = "PASS" if passed else "FAIL"
            print(f"   {status}: {description}")
            if not passed:
                all_passed = False

        if all_passed:
            print("\nTEST PASSED: T029 - ROW Customer Zero VAT")
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
