from rest_framework import serializers
from orders.models import OrderContact, OrderPreference, OrderAcknowledgment


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
