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
