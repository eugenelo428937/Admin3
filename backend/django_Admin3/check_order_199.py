#!/usr/bin/env python
"""
Check order 199 and related records in new models
"""
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from cart.models import ActedOrder, OrderUserContact, OrderDeliveryDetail

def check_order_199():
    """Check if order 199 exists and has related records"""

    print("=== Checking Order 199 ===")

    # Check if order exists
    try:
        order = ActedOrder.objects.get(id=199)
        print(f"SUCCESS: Order 199 found:")
        print(f"  - ID: {order.id}")
        print(f"  - User: {order.user}")
        print(f"  - Email: {order.email}")
        print(f"  - Total: {order.total}")
        print(f"  - Status: {order.status}")
        print(f"  - Created: {order.created_at}")

        # Check OrderUserContact records
        contact_records = OrderUserContact.objects.filter(order=order)
        print(f"\n=== OrderUserContact Records ===")
        print(f"Count: {contact_records.count()}")
        for contact in contact_records:
            print(f"  - Phone: {contact.mobile_phone}")
            print(f"  - Email: {contact.email_address}")
            print(f"  - Created: {contact.created_at}")

        # Check OrderDeliveryDetail records
        delivery_records = OrderDeliveryDetail.objects.filter(order=order)
        print(f"\n=== OrderDeliveryDetail Records ===")
        print(f"Count: {delivery_records.count()}")
        for delivery in delivery_records:
            print(f"  - Delivery Address: {delivery.delivery_address_line_1}")
            print(f"  - Invoice Address: {delivery.invoice_address_line_1}")
            print(f"  - Created: {delivery.created_at}")

        # Also check recent orders for comparison
        print(f"\n=== Recent Orders (last 5) ===")
        recent_orders = ActedOrder.objects.order_by('-id')[:5]
        for order_item in recent_orders:
            contact_count = OrderUserContact.objects.filter(order=order_item).count()
            delivery_count = OrderDeliveryDetail.objects.filter(order=order_item).count()
            print(f"Order {order_item.id}: Contact={contact_count}, Delivery={delivery_count}")

    except ActedOrder.DoesNotExist:
        print("ERROR: Order 199 not found")
        return False

    return True

if __name__ == "__main__":
    check_order_199()