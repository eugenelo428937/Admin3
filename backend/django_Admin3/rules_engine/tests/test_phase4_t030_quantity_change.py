#!/usr/bin/env python
"""
Phase 4 Test Script: T030 - Quantity Change Recalculation

Scenario: UK customer adds product (£50, qty 1), then updates to qty 3
Expected: VAT scales from £10 to £30
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
# Note: Cart now uses store.Product (T087 legacy app cleanup)

User = get_user_model()

def run_test():
    print("=" * 80)
    print("Phase 4 Test: T030 - Quantity Change Recalculation")
    print("=" * 80)

    # Create test user
    print("\n1. Creating test user...")
    user, created = User.objects.get_or_create(
        username='test_uk_t030',
        defaults={'email': 'uk_t030@test.com'}
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

    # Add item with quantity 1
    print("\n4. Adding item to cart (£50, qty 1)...")
    item = CartItem.objects.create(
        cart=cart,
        product=essp,
        quantity=1,
        actual_price=Decimal('50.00'),
        item_type='product'
    )
    print(f"   Item ID: {item.id}")

    # Initial VAT calculation
    print("\n5. Initial VAT calculation (qty 1)...")
    result1 = cart.calculate_vat_for_all_items(country_code='GB', update_items=True)

    print(f"   Total Net:   £{result1['total_net_amount']}")
    print(f"   Total VAT:   £{result1['total_vat_amount']}")
    print(f"   Total Gross: £{result1['total_gross_amount']}")

    item.refresh_from_db()
    initial_vat_calculated_at = item.vat_calculated_at

    # Update quantity to 3
    print("\n6. Updating quantity to 3...")
    item.quantity = 3
    item.save()
    print(f"   New quantity: {item.quantity}")

    # Recalculate VAT
    print("\n7. Recalculating VAT (qty 3)...")
    result2 = cart.calculate_vat_for_all_items(country_code='GB', update_items=True)

    print(f"   Total Net:   £{result2['total_net_amount']}")
    print(f"   Total VAT:   £{result2['total_vat_amount']}")
    print(f"   Total Gross: £{result2['total_gross_amount']}")

    # Check item details
    item.refresh_from_db()
    print(f"\n   Item Details After Update:")
    print(f"   - Quantity:   {item.quantity}")
    print(f"   - VAT Region: {item.vat_region}")
    print(f"   - VAT Rate:   {float(item.vat_rate) * 100}%")
    print(f"   - VAT Amount: £{item.vat_amount}")
    print(f"   - Gross:      £{item.gross_amount}")
    print(f"   - Recalculated: {item.vat_calculated_at > initial_vat_calculated_at}")

    # Validation
    print("\n8. Validation:")

    # Initial state (qty 1)
    checks_initial = [
        (result1['total_net_amount'] == Decimal('50.00'), "Initial net: £50.00"),
        (result1['total_vat_amount'] == Decimal('10.00'), "Initial VAT: £10.00"),
        (result1['total_gross_amount'] == Decimal('60.00'), "Initial gross: £60.00"),
    ]

    # Updated state (qty 3)
    checks_updated = [
        (result2['total_net_amount'] == Decimal('150.00'), "Updated net: £150.00 (50×3)"),
        (result2['total_vat_amount'] == Decimal('30.00'), "Updated VAT: £30.00 (scaled 3x)"),
        (result2['total_gross_amount'] == Decimal('180.00'), "Updated gross: £180.00"),
        (item.vat_region == 'UK', "VAT region: UK"),
        (item.vat_rate == Decimal('0.2000'), "VAT rate: 20%"),
        (item.vat_calculated_at > initial_vat_calculated_at, "VAT timestamp updated")
    ]

    print("\n   Initial State Checks:")
    all_passed = True
    for passed, description in checks_initial:
        status = "PASS" if passed else "FAIL"
        print(f"   {status}: {description}")
        if not passed:
            all_passed = False

    print("\n   Updated State Checks:")
    for passed, description in checks_updated:
        status = "PASS" if passed else "FAIL"
        print(f"   {status}: {description}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\nTEST PASSED: T030 - Quantity Change Recalculation")
    else:
        print("\nTEST FAILED: Some validations did not pass")

    return all_passed

if __name__ == '__main__':
    try:
        success = run_test()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\nEXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
