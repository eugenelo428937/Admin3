#!/usr/bin/env python
"""
Simple test to verify separate acknowledgment storage
"""

import os
import sys
import django
from datetime import datetime

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

from cart.models import OrderUserAcknowledgment

def check_recent_acknowledgments():
    """Check the most recent acknowledgments"""

    # Get the 10 most recent acknowledgments
    recent_acks = OrderUserAcknowledgment.objects.all().order_by('-id')[:10]

    print(f"\nTotal acknowledgments in database: {OrderUserAcknowledgment.objects.count()}")
    print(f"Showing most recent {min(10, recent_acks.count())} acknowledgments:")
    print("="*80)

    # Group by order
    orders_dict = {}
    for ack in recent_acks:
        order_id = ack.order_id
        if order_id not in orders_dict:
            orders_dict[order_id] = []
        orders_dict[order_id].append(ack)

    for order_id, acks in orders_dict.items():
        print(f"\nOrder ID: {order_id}")
        print(f"  Number of acknowledgments: {len(acks)}")

        for i, ack in enumerate(acks, 1):
            print(f"\n  Acknowledgment {i}:")
            print(f"    - ID: {ack.id}")
            print(f"    - Type: {ack.acknowledgment_type}")
            print(f"    - Rule ID: {ack.rule_id}")
            print(f"    - Template ID: {ack.template_id}")
            print(f"    - Title: {ack.title}")

            # Check acknowledgment_data for ack_key
            if ack.acknowledgment_data:
                ack_key = ack.acknowledgment_data.get('ack_key', 'N/A')
                message_id = ack.acknowledgment_data.get('message_id', 'N/A')
                entry_point = ack.acknowledgment_data.get('entry_point', 'N/A')
                print(f"    - Ack Key: {ack_key}")
                print(f"    - Message ID: {message_id}")
                print(f"    - Entry Point: {entry_point}")

            # Check rules_engine_context for original_message_id
            if ack.rules_engine_context:
                original_msg_id = ack.rules_engine_context.get('original_message_id', 'N/A')
                ack_key_from_context = ack.rules_engine_context.get('ack_key', 'N/A')
                print(f"    - Original Message ID (from context): {original_msg_id}")
                print(f"    - Ack Key (from context): {ack_key_from_context}")

    print("\n" + "="*80)
    print("Analysis:")

    # Check if recent orders have multiple acknowledgments
    for order_id, acks in orders_dict.items():
        if len(acks) > 1:
            print(f"  [GOOD] Order {order_id} has {len(acks)} separate acknowledgment rows")
            unique_types = set([a.acknowledgment_type for a in acks])
            print(f"         Types: {', '.join(unique_types)}")
        else:
            print(f"  [INFO] Order {order_id} has only 1 acknowledgment row")

if __name__ == '__main__':
    check_recent_acknowledgments()