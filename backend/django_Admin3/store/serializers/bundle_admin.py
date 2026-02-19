"""Admin serializers for store bundles.

Provides the full list of fields needed by the admin UI — unlike
BundleListSerializer which is a lightweight public-facing serializer
missing subject_code, exam_session_code, and components_count.
"""
from rest_framework import serializers
from store.models import Bundle


class StoreBundleAdminListSerializer(serializers.ModelSerializer):
    """Admin list serializer with full fields for store bundles.

    Includes subject_code, exam_session_code, and components_count
    that the admin frontend expects but BundleListSerializer omits.
    """
    name = serializers.CharField(read_only=True)
    subject_code = serializers.CharField(
        source='exam_session_subject.subject.code',
        read_only=True
    )
    exam_session_code = serializers.CharField(
        source='exam_session_subject.exam_session.session_code',
        read_only=True
    )
    components_count = serializers.SerializerMethodField()
    bundle_template_name = serializers.CharField(
        source='bundle_template.bundle_name',
        read_only=True
    )

    class Meta:
        model = Bundle
        fields = [
            'id', 'name', 'bundle_template_name', 'subject_code',
            'exam_session_code', 'is_active', 'display_order',
            'components_count', 'override_name', 'override_description',
            'bundle_template', 'exam_session_subject',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_components_count(self, obj):
        return obj.bundle_products.count()
