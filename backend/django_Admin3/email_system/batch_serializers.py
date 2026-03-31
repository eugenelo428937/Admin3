from rest_framework import serializers


class BatchItemSerializer(serializers.Serializer):
    to_email = serializers.EmailField()
    cc_email = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        default=list,
    )
    subject_override = serializers.CharField(required=False, allow_blank=True)
    payload = serializers.DictField(required=False, default=dict)


class SendBatchRequestSerializer(serializers.Serializer):
    template_id = serializers.IntegerField()
    notify_emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        default=list,
        help_text='Additional recipients for the batch completion report',
    )
    items = BatchItemSerializer(many=True)


class BatchItemResponseSerializer(serializers.Serializer):
    to_email = serializers.CharField()
    queue_id = serializers.CharField(allow_null=True)
    is_success = serializers.BooleanField()
    error_response = serializers.DictField()


class SendBatchResponseSerializer(serializers.Serializer):
    batch_id = serializers.CharField()
    status = serializers.CharField()
    total_items = serializers.IntegerField()
    items = BatchItemResponseSerializer(many=True)


class QueryBatchResponseSerializer(serializers.Serializer):
    batch_id = serializers.CharField()
    status = serializers.CharField()
    is_success = serializers.BooleanField()
    total_items = serializers.IntegerField()
    sent_count = serializers.IntegerField()
    error_count = serializers.IntegerField()
    sent_items = serializers.ListField(child=serializers.CharField())
    error_items = serializers.ListField(child=serializers.DictField())
