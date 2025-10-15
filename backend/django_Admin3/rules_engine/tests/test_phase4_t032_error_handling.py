#!/usr/bin/env python
"""
Phase 4 Test Script: T032 - Error Handling and Retry

Scenario: Simulate rules engine error → fallback to 0% VAT → retry → success
Expected: Error flags set, then cleared on successful retry
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
from unittest.mock import patch

User = get_user_model()

def run_test():
    print("=" * 80)
    print("Phase 4 Test: T032 - Error Handling and Retry")
    print("=" * 80)

    # Create test user
    print("\n1. Creating test user...")
    user, created = User.objects.get_or_create(
        username='test_uk_t032',
        defaults={'email': 'uk_t032@test.com'}
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
    print("\n4. Adding item to cart (£50)...")
    item = CartItem.objects.create(
        cart=cart,
        product=essp,
        quantity=1,
        actual_price=Decimal('50.00'),
        item_type='product'
    )
    print(f"   Item ID: {item.id}")

    # Test Phase 1: Simulate error
    print("\n5. PHASE 1: Simulating rules engine error...")
    with patch('rules_engine.services.rule_engine.RuleEngine.execute') as mock_execute:
        mock_execute.side_effect = Exception("Rules engine connection failed")

        result_error = cart.calculate_vat_for_all_items(country_code='GB', update_items=True)

        print(f"   Success: {result_error['success']}")
        print(f"   Error: {result_error.get('error', 'None')}")

        # Check cart error flags
        cart.refresh_from_db()
        print(f"\n   Cart Error Flags:")
        print(f"   - vat_calculation_error: {cart.vat_calculation_error}")
        print(f"   - error_message: {cart.vat_calculation_error_message}")

        # Check fallback behavior (0% VAT)
        item.refresh_from_db()
        print(f"\n   Item Fallback (0% VAT):")
        print(f"   - VAT Region: {item.vat_region}")
        print(f"   - VAT Rate:   {float(item.vat_rate) * 100}%")
        print(f"   - VAT Amount: £{item.vat_amount}")
        print(f"   - Gross:      £{item.gross_amount}")

        # Save error state for validation
        error_cart_flag = cart.vat_calculation_error
        error_cart_message = cart.vat_calculation_error_message
        error_item_region = item.vat_region
        error_item_rate = item.vat_rate
        error_item_amount = item.vat_amount

    # Test Phase 2: Successful retry
    print("\n6. PHASE 2: Retrying with successful calculation...")
    result_success = cart.calculate_vat_for_all_items(country_code='GB', update_items=True)

    print(f"   Success: {result_success['success']}")
    print(f"   Total Net:   £{result_success['total_net_amount']}")
    print(f"   Total VAT:   £{result_success['total_vat_amount']}")
    print(f"   Total Gross: £{result_success['total_gross_amount']}")

    # Check cart error flags cleared
    cart.refresh_from_db()
    print(f"\n   Cart Error Flags After Retry:")
    print(f"   - vat_calculation_error: {cart.vat_calculation_error}")
    print(f"   - error_message: {cart.vat_calculation_error_message}")

    # Check item correct VAT
    item.refresh_from_db()
    print(f"\n   Item After Successful Retry:")
    print(f"   - VAT Region: {item.vat_region}")
    print(f"   - VAT Rate:   {float(item.vat_rate) * 100}%")
    print(f"   - VAT Amount: £{item.vat_amount}")
    print(f"   - Gross:      £{item.gross_amount}")

    # Validation
    print("\n7. Validation:")

    # Error state checks (using saved error state values)
    checks_error = [
        (result_error['success'] == False, "Error result marked as failed"),
        ('error' in result_error, "Error message present in result"),
        (error_cart_flag == True, "Cart error flag set during error"),
        (error_cart_message is not None, "Cart error message stored"),
        (error_item_region == 'ROW', "Fallback to ROW region"),
        (error_item_rate == Decimal('0.0000'), "Fallback to 0% VAT"),
        (error_item_amount == Decimal('0.00'), "Fallback VAT amount is £0.00")
    ]

    # Success state checks (after retry)
    checks_success = [
        (result_success['success'] == True, "Retry marked as successful"),
        (result_success['total_vat_amount'] == Decimal('10.00'), "Correct VAT after retry: £10.00"),
        (cart.vat_calculation_error == False, "Cart error flag cleared after retry"),
        (cart.vat_calculation_error_message is None, "Cart error message cleared after retry"),
        (item.vat_region == 'UK', "Correct VAT region: UK"),
        (item.vat_rate == Decimal('0.2000'), "Correct VAT rate: 20%"),
        (item.vat_amount == Decimal('10.00'), "Correct VAT amount: £10.00")
    ]

    print("\n   Error State Checks:")
    all_passed = True
    for passed, description in checks_error:
        status = "PASS" if passed else "FAIL"
        print(f"   {status}: {description}")
        if not passed:
            all_passed = False

    print("\n   Success State Checks (After Retry):")
    for passed, description in checks_success:
        status = "PASS" if passed else "FAIL"
        print(f"   {status}: {description}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\nTEST PASSED: T032 - Error Handling and Retry")
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
