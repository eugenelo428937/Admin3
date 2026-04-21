"""Lightweight read-only serializer for the unified Purchasable parent.

Used by cart.serializers.CartItemSerializer and
orders.serializers.OrderItemSerializer to expose the nested `purchasable`
object on each line during the dual-emit phase (Task 18).

Intentionally minimal — exposes only the subset of fields the frontend
needs today. GenericItem-specific fields (validity_period_days,
stock_tracked) are not included; add them later if/when the frontend
requires them.
"""
from rest_framework import serializers

from store.models import Purchasable


class PurchasableSerializer(serializers.ModelSerializer):
    """Read-only nested representation of a Purchasable.

    Items are created on cart/order lines via a `purchasable_id` FK; this
    serializer is never used on the write path.
    """

    class Meta:
        model = Purchasable
        fields = [
            'id',
            'kind',
            'code',
            'name',
            'description',
            'dynamic_pricing',
        ]
        read_only_fields = fields
