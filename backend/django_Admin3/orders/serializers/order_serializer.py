from rest_framework import serializers
from orders.models import Order, OrderItem, Payment
from store.serializers import PurchasableSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()
    # Task 19: convert item_type to SerializerMethodField so it falls back to
    # the purchasable-derived shim when the legacy item_type column is empty.
    item_type = serializers.SerializerMethodField()
    # Task 18: dual-emit unified catalog parent.
    # Alongside the legacy product / marking_voucher / item_type fields so the
    # frontend can migrate progressively. Becomes the sole reference after
    # Release B (Tasks 22–24) drops the legacy FKs.
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
        """Emit legacy item_type if set, else derive from purchasable.kind via shim."""
        return obj.item_type_shim

    def get_item_name(self, obj):
        """Emit the display name — legacy @property reads obj.product/marking_voucher
        directly, but we also fall back to purchasable-derived shims for new rows.
        """
        item_type = obj.item_type_shim
        voucher = obj.marking_voucher or obj.marking_voucher_shim
        product = obj.product or obj.product_shim
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
