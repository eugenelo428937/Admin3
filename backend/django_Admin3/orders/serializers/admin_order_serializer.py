from rest_framework import serializers
from orders.models import Order, OrderContact, OrderPreference, OrderAcknowledgment
from orders.serializers.order_serializer import OrderItemSerializer, PaymentSerializer


class OrderContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderContact
        fields = [
            'id',
            'home_phone', 'home_phone_country',
            'mobile_phone', 'mobile_phone_country',
            'work_phone', 'work_phone_country',
            'email_address',
            'created_at', 'updated_at',
        ]


class OrderPreferenceSerializer(serializers.ModelSerializer):
    display_value = serializers.SerializerMethodField()

    class Meta:
        model = OrderPreference
        fields = [
            'id',
            'preference_type', 'preference_key', 'preference_value',
            'input_type', 'display_mode',
            'title', 'content_summary',
            'is_submitted',
            'submitted_at', 'updated_at',
            'display_value',
        ]

    def get_display_value(self, obj):
        return obj.get_display_value()


class OrderAcknowledgmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderAcknowledgment
        fields = [
            'id',
            'acknowledgment_type', 'rule_id', 'template_id',
            'title', 'content_summary',
            'is_accepted', 'accepted_at',
            'content_version',
            'acknowledgment_data',
        ]


class AdminOrderListSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField()
    item_codes = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'created_at', 'total_amount',
            'student', 'item_codes', 'item_count',
        ]

    def get_student(self, obj):
        u = obj.user
        student = getattr(u, 'student', None)
        return {
            'student_ref': student.student_ref if student else None,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
        }

    def get_item_codes(self, obj):
        codes = []
        for item in obj.items.all():
            if item.purchasable_id:
                codes.append(item.purchasable.code)
        return codes

    def get_item_count(self, obj):
        return len(obj.items.all())


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    user_contact = serializers.SerializerMethodField()
    user_preferences = OrderPreferenceSerializer(many=True, read_only=True)
    user_acknowledgments = OrderAcknowledgmentSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'created_at', 'updated_at',
            'subtotal', 'vat_amount', 'total_amount',
            'vat_rate', 'vat_country', 'vat_calculation_type',
            'calculations_applied',
            'student',
            'items', 'payments',
            'user_contact', 'user_preferences', 'user_acknowledgments',
        ]

    def get_student(self, obj):
        u = obj.user
        student = getattr(u, 'student', None)
        return {
            'student_ref': student.student_ref if student else None,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
        }

    def get_user_contact(self, obj):
        # Use list() so the prefetch_related('user_contact') cache is honored.
        contacts = list(obj.user_contact.all())
        contact = contacts[0] if contacts else None
        return OrderContactSerializer(contact).data if contact else None
