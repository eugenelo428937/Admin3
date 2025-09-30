#!/usr/bin/env python
"""
Debug script to test session acknowledgment flow
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.test.client import RequestFactory
from django.contrib.sessions.middleware import SessionMiddleware
from django.contrib.auth import get_user_model
from rules_engine.views import rules_acknowledge
from cart.models import ActedOrder
from cart.views import CartViewSet
import json

User = get_user_model()

# Create mock request for acknowledgment
factory = RequestFactory()

# Test 1: Can we save acknowledgments to session correctly?
print("=== TEST 1: Session Acknowledgment Storage ===")
request = factory.post('/api/rules/acknowledge/', {
    'ackKey': 'terms_conditions_v1',
    'message_id': 11,
    'acknowledged': True,
    'entry_point_location': 'checkout_terms'
})

# Add session middleware
middleware = SessionMiddleware(lambda r: None)
middleware.process_request(request)
request.session.save()

# Call the acknowledge function
response = rules_acknowledge(request)
print(f"Response status: {response.status_code}")
print(f"Response data: {response.data}")

# Check if session was updated
print(f"Session acknowledgments: {request.session.get('user_acknowledgments', [])}")

# Test 2: Can we transfer session acknowledgments to order?
print("\n=== TEST 2: Session to Order Transfer ===")

# Get user 60 (the user from orders 127, 128)
try:
    user = User.objects.get(id=60)
    print(f"Found user: {user.email}")

    # Create test order
    order = ActedOrder.objects.create(user=user, total_amount=100.00)
    print(f"Created test order: {order.id}")

    # Setup cart view for testing the transfer method
    cart_view = CartViewSet()

    # Mock authenticated request
    request.user = user

    # Transfer session acknowledgments
    cart_view._transfer_session_acknowledgments_to_order(request, order)

    # Check if acknowledgments were created
    from cart.models import OrderUserAcknowledgment
    order_acks = OrderUserAcknowledgment.objects.filter(order=order)
    print(f"Order acknowledgments created: {order_acks.count()}")

    for ack in order_acks:
        print(f"  - {ack.acknowledgment_type}: {ack.title}")
        print(f"    Accepted: {ack.is_accepted}")
        print(f"    Data: {json.dumps(ack.acknowledgment_data, indent=2)}")

    # Clean up
    order_acks.delete()
    order.delete()

except User.DoesNotExist:
    print("User 60 not found")
except Exception as e:
    print(f"Error in test: {e}")

print("\n=== TEST 3: Check what happened during real orders 127/128 checkout ===")

# This would require examining the actual Django logs during checkout
# For now, let's just check if there were any recent session acknowledgments

try:
    # Look at recent orders and their acknowledgments
    recent_orders = ActedOrder.objects.filter(id__in=[126, 127, 128]).order_by('id')

    for order in recent_orders:
        acks = order.user_acknowledgments.all()
        print(f"Order {order.id} (created {order.created_at}): {acks.count()} acknowledgments")
        for ack in acks:
            print(f"  - {ack.acknowledgment_type}: {ack.is_accepted} at {ack.accepted_at}")

except Exception as e:
    print(f"Error checking recent orders: {e}")