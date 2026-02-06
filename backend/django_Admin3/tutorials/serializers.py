"""
Tutorial serializers.

Updated 2026-01-16: Migrated to use store_product FK
as part of T087 legacy app cleanup.
Updated 2026-02-05: Added TutorialSessionsSerializer for sessions API.
Updated 2026-02-06: Added FK serializers for instructor, venue, location.
"""
from rest_framework import serializers
from .models import (
    TutorialEvents, TutorialSessions,
    TutorialCourseTemplate, Staff, TutorialInstructor,
    TutorialLocation, TutorialVenue,
)


class TutorialLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialLocation
        fields = ['id', 'name', 'code', 'is_active']


class TutorialVenueSerializer(serializers.ModelSerializer):
    location = TutorialLocationSerializer(read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=TutorialLocation.objects.all(),
        source='location',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = TutorialVenue
        fields = ['id', 'name', 'description', 'location', 'location_id']


class TutorialInstructorSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='__str__', read_only=True)

    class Meta:
        model = TutorialInstructor
        fields = ['id', 'display_name', 'is_active']


class TutorialCourseTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialCourseTemplate
        fields = ['id', 'code', 'title', 'description', 'is_active']


class TutorialSessionsSerializer(serializers.ModelSerializer):
    """Serializer for TutorialSessions model per API contract."""
    instructor = TutorialInstructorSerializer(read_only=True)
    instructor_id = serializers.PrimaryKeyRelatedField(
        queryset=TutorialInstructor.objects.all(),
        source='instructor',
        write_only=True,
        required=False,
        allow_null=True,
    )
    venue = TutorialVenueSerializer(read_only=True)
    venue_id = serializers.PrimaryKeyRelatedField(
        queryset=TutorialVenue.objects.all(),
        source='venue',
        write_only=True,
        required=False,
        allow_null=True,
    )
    location = TutorialLocationSerializer(read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=TutorialLocation.objects.all(),
        source='location',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = TutorialSessions
        fields = ['id', 'title', 'instructor', 'instructor_id',
                  'venue', 'venue_id', 'location', 'location_id',
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
    instructor = TutorialInstructorSerializer(read_only=True)
    instructor_id = serializers.PrimaryKeyRelatedField(
        queryset=TutorialInstructor.objects.all(),
        source='instructor',
        write_only=True,
        required=False,
        allow_null=True,
    )
    venue = TutorialVenueSerializer(read_only=True)
    venue_id = serializers.PrimaryKeyRelatedField(
        queryset=TutorialVenue.objects.all(),
        source='venue',
        write_only=True,
        required=False,
        allow_null=True,
    )
    location = TutorialLocationSerializer(read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=TutorialLocation.objects.all(),
        source='location',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = TutorialEvents
        fields = '__all__'
        extra_fields = ['store_product_code', 'subject_code']
