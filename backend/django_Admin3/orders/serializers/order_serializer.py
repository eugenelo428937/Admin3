from rest_framework import serializers
from orders.models import Order, OrderItem, Payment
from store.serializers import PurchasableSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()
    # Task 23: `item_type` is now a read-only @property on OrderItem derived
    # from the unified `purchasable` FK. Kept as a SerializerMethodField for
    # serializer shape stability.
    item_type = serializers.SerializerMethodField()
    # Task 18: unified catalog parent nested object (the sole catalog
    # reference now that the legacy FKs are gone in Release B).
    purchasable = PurchasableSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'item_type', 'item_name', 'quantity', 'price_type',
            'actual_price', 'net_amount', 'vat_amount', 'gross_amount',
            'vat_rate', 'is_vat_exempt', 'metadata',
            # Task 18: unified purchasable nested object
            'purchasable',
        ]

    def get_item_type(self, obj):
        """Emit item_type derived from purchasable via the model @property."""
        return obj.item_type

    def get_item_name(self, obj):
        """Emit the display name, derived from the purchasable-backed model
        @properties (`product`, `marking_voucher`, `item_type`).
        """
        item_type = obj.item_type
        voucher = obj.marking_voucher
        product = obj.product
        if item_type == 'marking_voucher' and voucher is not None:
            return voucher.name
        if product is not None:
            return str(product)
        return None


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
