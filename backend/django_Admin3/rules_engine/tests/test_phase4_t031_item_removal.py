#!/usr/bin/env python
"""
Phase 4 Test Script: T031 - Item Removal Recalculation

Scenario: UK customer adds 2 products (£50 + £100), then removes first
Expected: VAT updates from £30 to £20
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
    print("Phase 4 Test: T031 - Item Removal Recalculation")
    print("=" * 80)

    # Create test user
    print("\n1. Creating test user...")
    user, created = User.objects.get_or_create(
        username='test_uk_t031',
        defaults={'email': 'uk_t031@test.com'}
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
    products = list(ExamSessionSubjectProduct.objects.filter(
        variations__product_product_variation__product_variation__variation_type__in=['eBook', 'Printed']
    ).distinct()[:2])

    if len(products) < 2:
        print("   ERROR: Need at least 2 products!")
        print("   Run: python manage.py import_subjects")
        return False

    print(f"   Product 1: {products[0].product.fullname}")
    print(f"   Product 2: {products[1].product.fullname}")

    # Add first item (£50)
    print("\n4. Adding Item 1 (£50, qty 1)...")
    item1 = CartItem.objects.create(
        cart=cart,
        product=products[0],
        quantity=1,
        actual_price=Decimal('50.00'),
        item_type='product'
    )
    print(f"   Item 1 ID: {item1.id}")

    # Add second item (£100)
    print("\n5. Adding Item 2 (£100, qty 1)...")
    item2 = CartItem.objects.create(
        cart=cart,
        product=products[1],
        quantity=1,
        actual_price=Decimal('100.00'),
        item_type='product'
    )
    print(f"   Item 2 ID: {item2.id}")

    # Initial VAT calculation
    print("\n6. Initial VAT calculation (2 items)...")
    result1 = cart.calculate_vat_for_all_items(country_code='GB', update_items=True)

    print(f"   Total Net:   £{result1['total_net_amount']}")
    print(f"   Total VAT:   £{result1['total_vat_amount']}")
    print(f"   Total Gross: £{result1['total_gross_amount']}")
    print(f"   Items:       {len(result1['items'])}")

    item1.refresh_from_db()
    item2.refresh_from_db()
    print(f"\n   Item 1 VAT: £{item1.vat_amount}")
    print(f"   Item 2 VAT: £{item2.vat_amount}")

    # Remove first item
    print("\n7. Removing Item 1...")
    item1_id = item1.id
    item1.delete()
    print(f"   Deleted item {item1_id}")

    # Recalculate VAT
    print("\n8. Recalculating VAT (1 item remaining)...")
    result2 = cart.calculate_vat_for_all_items(country_code='GB', update_items=True)

    print(f"   Total Net:   £{result2['total_net_amount']}")
    print(f"   Total VAT:   £{result2['total_vat_amount']}")
    print(f"   Total Gross: £{result2['total_gross_amount']}")
    print(f"   Items:       {len(result2['items'])}")

    # Check remaining item
    item2.refresh_from_db()
    print(f"\n   Item 2 Details:")
    print(f"   - VAT Amount: £{item2.vat_amount}")
    print(f"   - Gross:      £{item2.gross_amount}")

    # Validation
    print("\n9. Validation:")

    # Initial state (2 items)
    checks_initial = [
        (result1['total_net_amount'] == Decimal('150.00'), "Initial net: £150.00 (50+100)"),
        (result1['total_vat_amount'] == Decimal('30.00'), "Initial VAT: £30.00 (10+20)"),
        (result1['total_gross_amount'] == Decimal('180.00'), "Initial gross: £180.00"),
        (len(result1['items']) == 2, "2 items in result")
    ]

    # After removal (1 item)
    checks_removal = [
        (result2['total_net_amount'] == Decimal('100.00'), "Updated net: £100.00 (item2 only)"),
        (result2['total_vat_amount'] == Decimal('20.00'), "Updated VAT: £20.00 (item2 only)"),
        (result2['total_gross_amount'] == Decimal('120.00'), "Updated gross: £120.00"),
        (len(result2['items']) == 1, "1 item in result"),
        (result2['items'][0]['cart_item_id'] == item2.id, "Remaining item is item2"),
        (cart.items.count() == 1, "1 item in cart")
    ]

    print("\n   Initial State Checks:")
    all_passed = True
    for passed, description in checks_initial:
        status = "PASS" if passed else "FAIL"
        print(f"   {status}: {description}")
        if not passed:
            all_passed = False

    print("\n   After Removal Checks:")
    for passed, description in checks_removal:
        status = "PASS" if passed else "FAIL"
        print(f"   {status}: {description}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\nTEST PASSED: T031 - Item Removal Recalculation")
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
