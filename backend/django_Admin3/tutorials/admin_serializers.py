"""Serializers for the tutorials admin panel.

Convention: API field names mirror raw Django model fields. The only
synthesised value is ``instructor.name`` (composed from staff.user).
"""
from rest_framework import serializers

from catalog.exam_session.models import ExamSession
from catalog.subject.models import Subject
from tutorials.models import (
    TutorialEvents,
    TutorialInstructor,
    TutorialLocation,
    TutorialRegistration,
    TutorialSessions,
    TutorialVenue,
)


class _SubjectMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['code', 'description']


class _SittingMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSession
        fields = ['id', 'session_code', 'start_date', 'end_date']


class _LocationMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialLocation
        fields = ['id', 'name']


class _VenueMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialVenue
        fields = ['id', 'name']


class _InstructorMiniSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = TutorialInstructor
        fields = ['id', 'name']

    def get_name(self, obj):
        if obj.staff and obj.staff.user:
            return obj.staff.user.get_full_name() or obj.staff.user.username
        return f'Instructor #{obj.id}'


class AdminTutorialSessionEmbeddedSerializer(serializers.ModelSerializer):
    venue = _VenueMiniSerializer(read_only=True)
    instructors = _InstructorMiniSerializer(many=True, read_only=True)
    enrolled_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = TutorialSessions
        fields = [
            'id', 'title', 'sequence', 'start_date', 'end_date',
            'venue', 'instructors', 'enrolled_count',
        ]


class AdminTutorialEventListSerializer(serializers.ModelSerializer):
    subject = serializers.SerializerMethodField()
    exam_session = serializers.SerializerMethodField()
    location = _LocationMiniSerializer(read_only=True)
    venue = _VenueMiniSerializer(read_only=True)
    main_instructor = _InstructorMiniSerializer(read_only=True)
    all_instructors = serializers.SerializerMethodField()
    sessions = AdminTutorialSessionEmbeddedSerializer(many=True, read_only=True)
    enrolled_distinct = serializers.IntegerField(read_only=True)

    class Meta:
        model = TutorialEvents
        fields = [
            'id', 'code',
            'subject', 'exam_session',
            'start_date', 'end_date',
            'location', 'venue',
            'main_instructor', 'all_instructors',
            'finalisation_date',
            'enrolled_distinct',
            'sessions',
        ]

    def get_subject(self, obj):
        ess = getattr(obj.store_product, 'exam_session_subject', None) if obj.store_product_id else None
        subject = getattr(ess, 'subject', None) if ess else None
        return _SubjectMiniSerializer(subject).data if subject else None

    def get_exam_session(self, obj):
        ess = getattr(obj.store_product, 'exam_session_subject', None) if obj.store_product_id else None
        es = getattr(ess, 'exam_session', None) if ess else None
        return _SittingMiniSerializer(es).data if es else None

    def get_all_instructors(self, obj):
        # Aggregate main + every session instructor, deduplicated by id,
        # preserving deterministic order (main first, then by instructor id).
        seen, out = set(), []
        if obj.main_instructor_id:
            seen.add(obj.main_instructor_id)
            out.append(_InstructorMiniSerializer(obj.main_instructor).data)
        for sess in obj.sessions.all():
            for instr in sess.instructors.all():
                if instr.id not in seen:
                    seen.add(instr.id)
                    out.append(_InstructorMiniSerializer(instr).data)
        return out


class FilterOptionsSerializer(serializers.Serializer):
    subjects = _SubjectMiniSerializer(many=True, read_only=True)
    locations = _LocationMiniSerializer(many=True, read_only=True)
    venues = _VenueMiniSerializer(many=True, read_only=True)
    instructors = _InstructorMiniSerializer(many=True, read_only=True)
    sittings = _SittingMiniSerializer(many=True, read_only=True)
    event_codes = serializers.ListField(
        child=serializers.CharField(), read_only=True,
    )


class _StudentMiniSerializer(serializers.Serializer):
    student_ref = serializers.IntegerField(read_only=True)
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()

    def get_first_name(self, obj):
        return obj.user.first_name if obj.user_id else ''

    def get_last_name(self, obj):
        return obj.user.last_name if obj.user_id else ''


class _SessionDetailSerializer(serializers.ModelSerializer):
    venue = _VenueMiniSerializer(read_only=True)
    tutorial_event = serializers.SerializerMethodField()

    class Meta:
        model = TutorialSessions
        fields = ['id', 'title', 'start_date', 'end_date', 'venue', 'tutorial_event']

    def get_tutorial_event(self, obj):
        return {'id': obj.tutorial_event_id, 'code': obj.tutorial_event.code}


class AdminRosterRowSerializer(serializers.Serializer):
    registration_id = serializers.IntegerField(source='id', read_only=True)
    student = serializers.SerializerMethodField()
    current_status = serializers.SerializerMethodField()
    current_reason = serializers.SerializerMethodField()

    def get_student(self, reg):
        return _StudentMiniSerializer(reg.student).data

    def get_current_status(self, reg):
        try:
            return reg.attendance.status
        except AttributeError:
            return None

    def get_current_reason(self, reg):
        try:
            return reg.attendance.reason
        except AttributeError:
            return ''


class AdminAttendanceGetSerializer(serializers.Serializer):
    session = _SessionDetailSerializer(read_only=True)
    attendance_enabled = serializers.BooleanField(read_only=True)
    registrations = AdminRosterRowSerializer(many=True, read_only=True)


class _AdminAttendanceItemSerializer(serializers.Serializer):
    registration_id = serializers.IntegerField()
    status = serializers.ChoiceField(
        choices=['ATTENDED', 'ABSENT', 'LATE', 'OTHER'],
    )
    reason = serializers.CharField(allow_blank=True, default='')

    def validate(self, attrs):
        if attrs['status'] == 'OTHER' and not attrs.get('reason', '').strip():
            raise serializers.ValidationError({
                'reason': 'Required when status is OTHER.',
            })
        return attrs


class AdminAttendanceSaveSerializer(serializers.Serializer):
    """Save body for POST attendance. ``session`` injected by the view."""
    items = _AdminAttendanceItemSerializer(many=True)

    def __init__(self, *args, session=None, **kwargs):
        self._session = session
        super().__init__(*args, **kwargs)

    def validate_items(self, items):
        if self._session is None:
            return items
        ids = [item['registration_id'] for item in items]
        valid_ids = set(
            TutorialRegistration.objects
            .filter(tutorial_session=self._session, id__in=ids)
            .values_list('id', flat=True)
        )
        bad = [i for i in ids if i not in valid_ids]
        if bad:
            raise serializers.ValidationError(
                f'registration(s) {bad} do not belong to this session',
            )
        return items
