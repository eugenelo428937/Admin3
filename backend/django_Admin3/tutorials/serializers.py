"""
Tutorial serializers.

Updated 2026-01-16: Migrated to use store_product FK
as part of T087 legacy app cleanup.
Updated 2026-02-05: Added TutorialSessionsSerializer for sessions API.
"""
from rest_framework import serializers
from .models import TutorialEvents, TutorialSessions


class TutorialSessionsSerializer(serializers.ModelSerializer):
    """Serializer for TutorialSessions model per API contract."""

    class Meta:
        model = TutorialSessions
        fields = ['id', 'title', 'location', 'venue',
                  'start_date', 'end_date', 'sequence', 'url']


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
