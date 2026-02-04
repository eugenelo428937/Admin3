"""
Tutorial serializers.

Updated 2026-01-16: Migrated to use store_product FK
as part of T087 legacy app cleanup.
"""
from rest_framework import serializers
from .models import TutorialEvents


class TutorialEventsSerializer(serializers.ModelSerializer):
    # Use store_product.product_code as the identifier
    store_product_code = serializers.CharField(
        source='store_product.product_code',
        read_only=True
    )
    subject_code = serializers.CharField(
        source='store_product.exam_session_subject.subject.code',
        read_only=True
    )

    class Meta:
        model = TutorialEvents
        fields = '__all__'
        extra_fields = ['store_product_code', 'subject_code']
