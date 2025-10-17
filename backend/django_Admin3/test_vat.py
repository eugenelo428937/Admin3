#!/usr/bin/env python
"""Test VAT calculation"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from cart.models import Cart
from cart.services.vat_orchestrator import vat_orchestrator

# Get test cart
cart = Cart.objects.filter(items__isnull=False).first()
print(f'Testing cart {cart.id} with {cart.items.count()} items')

# Execute VAT calculation
result = vat_orchestrator.execute_vat_calculation(cart)

# Display results
print(f'\n=== VAT CALCULATION SUCCESS ===')
print(f'Status: {result["status"]}')
print(f'Region: {result["region"]}')
print(f'Net: {result["totals"]["net"]}')
print(f'VAT: {result["totals"]["vat"]}')
print(f'Gross: {result["totals"]["gross"]}')
print(f'Items processed: {len(result["items"])}')

for i, item in enumerate(result["items"], 1):
    print(f'  Item {i}: net={item["net_amount"]}, vat={item["vat_amount"]}, gross={item["gross_amount"]}')
