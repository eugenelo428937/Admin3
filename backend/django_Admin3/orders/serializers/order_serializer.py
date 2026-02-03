from rest_framework import serializers
from orders.models import Order, OrderItem, Payment


class OrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = [
            'id', 'item_type', 'item_name', 'quantity', 'price_type',
            'actual_price', 'net_amount', 'vat_amount', 'gross_amount',
            'vat_rate', 'is_vat_exempt', 'metadata',
        ]


class PaymentSerializer(serializers.ModelSerializer):
    is_successful = serializers.ReadOnlyField()

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_method', 'amount', 'currency',
            'transaction_id', 'status', 'is_successful',
            'error_message', 'error_code',
            'created_at', 'processed_at',
        ]


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'id', 'subtotal', 'vat_amount', 'total_amount',
            'vat_rate', 'vat_country', 'created_at',
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'subtotal', 'vat_amount', 'total_amount',
            'vat_rate', 'vat_country', 'vat_calculation_type',
            'created_at', 'updated_at',
            'items', 'payments',
        ]
