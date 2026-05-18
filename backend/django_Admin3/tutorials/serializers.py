"""
Tutorial serializers.

Updated 2026-01-16: Migrated to use store_product FK
as part of T087 legacy app cleanup.
Updated 2026-02-05: Added TutorialSessionsSerializer for sessions API.
Updated 2026-02-06: Added FK serializers for instructor, venue, location.
"""
from rest_framework import serializers
from staff.models import Staff
from .models import (
    TutorialEvents, TutorialSessions,
    TutorialCourseTemplate, TutorialInstructor,
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
    instructors = TutorialInstructorSerializer(many=True, read_only=True)
    instructor_ids = serializers.PrimaryKeyRelatedField(
        queryset=TutorialInstructor.objects.all(),
        source='instructors',
        write_only=True,
        required=False,
        many=True,
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
        fields = ['id', 'title', 'instructors', 'instructor_ids',
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
    instructors = TutorialInstructorSerializer(many=True, read_only=True)
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
    # Phase 5b (2026-05-16): the underlying columns are now DateTime
    # (`lms_start_date` / `lms_end_date`), but the consumer pact
    # contract at /api/tutorials/list/ expects date-only `start_date`
    # / `end_date` strings. DRF's DateField refuses to auto-coerce
    # DateTime to Date ("may mean losing timezone information"), so
    # we expose explicit SerializerMethodFields for reads and a write
    # path via lms_*_input that accepts a date (input is date-only,
    # converted to midnight UTC at serializer-validation time).
    start_date = serializers.SerializerMethodField()
    end_date = serializers.SerializerMethodField()
    # Write-side: accept a date input, write to the DateTime column.
    # Used by POST/PUT/PATCH; not surfaced on reads (write_only=True).
    lms_start_date_input = serializers.DateField(
        source='lms_start_date', required=False, allow_null=True, write_only=True,
    )
    lms_end_date_input = serializers.DateField(
        source='lms_end_date', required=False, allow_null=True, write_only=True,
    )

    @staticmethod
    def _to_date_iso(value):
        """Tolerant of date / datetime / None. Post-write the in-memory
        instance still holds whatever DRF's DateField validated (a date),
        not the DateTime Django produces after a fresh fetch."""
        if value is None:
            return None
        if hasattr(value, 'date') and callable(value.date):
            return value.date().isoformat()
        return value.isoformat()

    def get_start_date(self, obj):
        return self._to_date_iso(obj.lms_start_date)

    def get_end_date(self, obj):
        return self._to_date_iso(obj.lms_end_date)

    def to_internal_value(self, data):
        # Accept the legacy 'start_date' / 'end_date' input keys as date
        # inputs writing to lms_start_date / lms_end_date — preserves the
        # write contract for existing callers (the consumer pact only does
        # GET, but the test suite exercises POST too).
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'start_date' in data and 'lms_start_date_input' not in data:
            data['lms_start_date_input'] = data.pop('start_date')
        if 'end_date' in data and 'lms_end_date_input' not in data:
            data['lms_end_date_input'] = data.pop('end_date')
        return super().to_internal_value(data)

    class Meta:
        model = TutorialEvents
        fields = [
            'id', 'code', 'venue', 'venue_id', 'location', 'location_id',
            'is_soldout', 'finalisation_date', 'remain_space',
            'start_date', 'end_date', 'store_product',
            'lms_start_date_input', 'lms_end_date_input',
            'created_at', 'updated_at',
            'store_product_code', 'subject_code', 'instructors',
        ]
