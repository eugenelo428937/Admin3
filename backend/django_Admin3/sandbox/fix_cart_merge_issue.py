#!/usr/bin/env python3
"""
Fix script to manually merge anonymous cart items into user's authenticated cart.
This addresses the issue where user has items in an anonymous cart but their authenticated cart is empty.
"""

import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from cart.models import Cart, CartItem
from django.contrib.auth.models import User

def fix_cart_merge_for_user(user_email):
    """Fix cart merge for a specific user"""
    print(f"=== Fixing cart merge for {user_email} ===")

    try:
        user = User.objects.get(email=user_email)
        print(f"Found user: {user.email} (ID: {user.id})")
    except User.DoesNotExist:
        print(f"❌ User {user_email} not found")
        return False

    # Get user's authenticated cart
    user_cart, created = Cart.objects.get_or_create(user=user)
    print(f"User cart ID: {user_cart.id} (created: {created})")
    print(f"User cart items: {user_cart.items.count()}")

    # Find anonymous carts with items (potential carts that should be merged)
    anonymous_carts_with_items = Cart.objects.filter(
        user__isnull=True,
        session_key__isnull=False
    ).exclude(items__isnull=True)

    print(f"\nFound {anonymous_carts_with_items.count()} anonymous carts with items:")

    candidate_cart = None
    for cart in anonymous_carts_with_items:
        items_count = cart.items.count()
        print(f"  Cart {cart.id} - Session: {cart.session_key} - Items: {items_count}")

        if items_count > 0:
            # Show the items in this cart
            print(f"    Items:")
            for item in cart.items.all():
                try:
                    product_name = item.product.product.fullname if hasattr(item.product, 'product') else 'Unknown'
                    print(f"      - Product: {product_name} (ID: {item.product_id}), Qty: {item.quantity}")
                except:
                    print(f"      - Product ID: {item.product_id}, Qty: {item.quantity}")

            # If this is the only cart with items, or if we haven't found a candidate yet
            if candidate_cart is None:
                candidate_cart = cart

    if not candidate_cart:
        print("❌ No anonymous cart with items found to merge")
        return False

    print(f"\n🔄 Merging items from anonymous cart {candidate_cart.id} into user cart {user_cart.id}")

    # Manual merge logic (simplified version of merge_guest_cart)
    merged_items = 0
    for item in candidate_cart.items.all():
        print(f"  Merging item: Product {item.product_id}, Qty: {item.quantity}")

        # Check if user already has this item
        existing_item = CartItem.objects.filter(
            cart=user_cart,
            product=item.product,
            price_type=item.price_type
        ).first()

        if existing_item:
            # Add quantity to existing item
            old_qty = existing_item.quantity
            existing_item.quantity += item.quantity
            existing_item.save()
            print(f"    ✅ Updated existing item quantity: {old_qty} → {existing_item.quantity}")
        else:
            # Create new item in user cart
            new_item = CartItem.objects.create(
                cart=user_cart,
                product=item.product,
                price_type=item.price_type,
                quantity=item.quantity,
                actual_price=item.actual_price,
                metadata=item.metadata
            )
            print(f"    ✅ Created new item in user cart (ID: {new_item.id})")

        merged_items += 1

    # Delete the anonymous cart after successful merge
    if merged_items > 0:
        candidate_cart.delete()
        print(f"🗑️  Deleted anonymous cart {candidate_cart.id}")

        # Update cart flags
        user_cart.refresh_from_db()
        print(f"✅ Merge complete! User cart now has {user_cart.items.count()} items")
        return True
    else:
        print("❌ No items were merged")
        return False

if __name__ == "__main__":
    # Fix for the specific user
    user_email = "eugenelo4005@bpp.com"
    success = fix_cart_merge_for_user(user_email)

    if success:
        print(f"\n✅ Cart merge fix completed successfully for {user_email}")
        print("The user should now be able to checkout with their items.")
    else:
        print(f"\n❌ Cart merge fix failed for {user_email}")
        sys.exit(1)