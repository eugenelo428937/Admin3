"""
Test script to verify cart unique constraint fix
Ensures that adding multiple products to cart uses the same cart instance
"""
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from cart.models import Cart
from django.db import IntegrityError

User = get_user_model()

def test_unique_cart_constraint():
    """Test that only one cart can exist per user"""

    print("Testing unique cart constraint for authenticated users...\n")

    # Get or create test user
    user, created = User.objects.get_or_create(
        username='test_cart_user',
        defaults={'email': 'test_cart@example.com'}
    )

    if created:
        user.set_password('testpass123')
        user.save()
        print(f"✓ Created test user: {user.username}")
    else:
        print(f"✓ Using existing test user: {user.username}")

    # Clean up any existing carts for this user
    existing_carts = Cart.objects.filter(user=user)
    count = existing_carts.count()
    if count > 0:
        existing_carts.delete()
        print(f"✓ Cleaned up {count} existing cart(s)")

    # Test 1: Create first cart using get_or_create
    print("\nTest 1: First cart creation")
    cart1, created1 = Cart.objects.get_or_create(user=user)
    print(f"  Cart ID: {cart1.id}, Created: {created1}")
    assert created1 == True, "First cart should be created"
    print("  ✓ First cart created successfully")

    # Test 2: Try to get_or_create again - should return existing cart
    print("\nTest 2: Second get_or_create (should return existing cart)")
    cart2, created2 = Cart.objects.get_or_create(user=user)
    print(f"  Cart ID: {cart2.id}, Created: {created2}")
    assert created2 == False, "Second call should NOT create a new cart"
    assert cart1.id == cart2.id, "Should return the same cart instance"
    print("  ✓ Returned existing cart (no new cart created)")

    # Test 3: Try to manually create a duplicate cart - should fail
    print("\nTest 3: Attempt to create duplicate cart (should fail)")
    try:
        duplicate_cart = Cart.objects.create(user=user)
        print(f"  ✗ FAILED: Duplicate cart was created! ID: {duplicate_cart.id}")
        print("  This means the unique constraint is NOT working!")
        return False
    except IntegrityError as e:
        print(f"  ✓ Duplicate cart creation blocked by database constraint")
        print(f"  Error message: {str(e)[:100]}...")

    # Test 4: Verify only one cart exists
    print("\nTest 4: Verify cart count")
    cart_count = Cart.objects.filter(user=user).count()
    print(f"  Total carts for user: {cart_count}")
    assert cart_count == 1, f"Should have exactly 1 cart, but found {cart_count}"
    print("  ✓ Exactly one cart exists for user")

    # Clean up
    print("\nCleaning up test data...")
    Cart.objects.filter(user=user).delete()
    print("  ✓ Test cart deleted")

    print("\n" + "="*60)
    print("✓ ALL TESTS PASSED!")
    print("="*60)
    print("\nThe unique constraint is working correctly.")
    print("Multiple cart additions will now use the same cart instance.")
    return True

if __name__ == '__main__':
    try:
        success = test_unique_cart_constraint()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ TEST FAILED WITH ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
