from rest_framework import serializers
from email_system.models import EmailBatch, EmailQueue


class EmailBatchListSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(
        source='template.display_name', read_only=True, default=None
    )

    class Meta:
        model = EmailBatch
        fields = [
            'batch_id', 'template', 'template_name', 'requested_by',
            'status', 'total_items', 'sent_count', 'error_count',
            'created_at', 'completed_at',
        ]
        read_only_fields = fields


class EmailBatchEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailQueue
        fields = [
            'id', 'queue_id', 'to_emails', 'subject',
            'status', 'sent_at', 'error_message',
        ]
        read_only_fields = fields
