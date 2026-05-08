"""Admin views for the Tutorials admin panel.

All endpoints require ``IsSuperUser``. See
``docs/superpowers/specs/2026-05-07-tutorial-event-admin-design.md``.
"""
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.exam_session.models import ExamSession
from catalog.permissions import IsSuperUser
from catalog.subject.models import Subject
from tutorials.admin_filters import apply_event_filters
from tutorials.admin_serializers import (
    AdminAttendanceGetSerializer,
    AdminAttendanceSaveSerializer,
    AdminTutorialEventListSerializer,
    FilterOptionsSerializer,
)
from tutorials.models import (
    TutorialAttendance,
    TutorialEvents,
    TutorialInstructor,
    TutorialLocation,
    TutorialRegistration,
    TutorialSessions,
    TutorialVenue,
)


ALLOWED_ORDERING = {
    'start_date', '-start_date',
    'end_date', '-end_date',
    'code', '-code',
}


class AdminTutorialEventPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200


class AdminTutorialEventViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/tutorials/admin/events/ — paginated, filtered."""
    permission_classes = [IsSuperUser]
    pagination_class = AdminTutorialEventPagination
    serializer_class = AdminTutorialEventListSerializer

    def get_queryset(self):
        sessions_qs = (
            TutorialSessions.objects
            .order_by('sequence')
            .select_related('venue')
            .prefetch_related('instructors__staff__user')
            .annotate(
                enrolled_count=Count(
                    'registrations',
                    filter=Q(registrations__is_active=True),
                ),
            )
        )
        qs = (
            TutorialEvents.objects
            .filter(cancelled=False)
            .select_related(
                'venue', 'location', 'main_instructor__staff__user',
                'store_product__exam_session_subject__subject',
                'store_product__exam_session_subject__exam_session',
            )
            .prefetch_related(Prefetch('sessions', queryset=sessions_qs))
            .annotate(
                enrolled_distinct=Count(
                    'sessions__registrations__student',
                    filter=Q(sessions__registrations__is_active=True),
                    distinct=True,
                ),
            )
        )
        qs = apply_event_filters(qs, self.request.query_params)
        ordering = self.request.query_params.get('ordering')
        if ordering and ordering in ALLOWED_ORDERING:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('start_date')
        return qs

    @action(detail=False, methods=['get'], url_path='filter-options')
    def filter_options(self, request):
        subjects = (
            Subject.objects
            .filter(active=True)
            .order_by('code')
        )
        locations = TutorialLocation.objects.filter(is_active=True).order_by('name')
        venues = TutorialVenue.objects.all().order_by('name')
        instructors = (
            TutorialInstructor.objects
            .filter(is_active=True, staff__isnull=False)
            .select_related('staff__user')
        )
        sittings = ExamSession.objects.order_by('-start_date')
        # Distinct event codes for the typeahead combobox in the filter bar.
        event_codes = list(
            TutorialEvents.objects
            .order_by('code')
            .values_list('code', flat=True)
            .distinct()
        )

        data = FilterOptionsSerializer({
            'subjects': subjects,
            'locations': locations,
            'venues': venues,
            'instructors': instructors,
            'sittings': sittings,
            'event_codes': event_codes,
        }).data
        return Response(data)


class AdminTutorialAttendanceView(APIView):
    """GET /api/tutorials/admin/sessions/<id>/attendance/."""

    permission_classes = [IsSuperUser]

    def _get_session(self, session_id):
        return get_object_or_404(
            TutorialSessions.objects
            .select_related('venue', 'tutorial_event')
            .filter(tutorial_event__cancelled=False),
            id=session_id,
        )

    def _attendance_enabled(self, session):
        today = timezone.now().date()
        start = session.start_date
        if hasattr(start, 'date'):
            start = start.date()
        return today >= start

    def _build_payload(self, session):
        registrations = (
            TutorialRegistration.objects
            .filter(tutorial_session=session)
            .select_related('student__user', 'attendance')
            .order_by('student__user__last_name', 'student__user__first_name')
        )
        data = AdminAttendanceGetSerializer({
            'session': session,
            'attendance_enabled': self._attendance_enabled(session),
            'registrations': registrations,
        }).data
        return data

    def get(self, request, session_id: int):
        session = self._get_session(session_id)
        return Response(self._build_payload(session))

    def post(self, request, session_id: int):
        session = self._get_session(session_id)
        if not self._attendance_enabled(session):
            return Response(
                {
                    'detail': 'Session has not started.',
                    'code': 'not_yet_open',
                },
                status=409,
            )
        ser = AdminAttendanceSaveSerializer(data=request.data, session=session)
        ser.is_valid(raise_exception=True)
        with transaction.atomic():
            for item in ser.validated_data['items']:
                TutorialAttendance.objects.update_or_create(
                    registration_id=item['registration_id'],
                    defaults={
                        'status': item['status'],
                        'reason': item['reason'],
                        'recorded_by': request.user,
                        'recorded_at': timezone.now(),
                    },
                )
        session.refresh_from_db()
        return Response(self._build_payload(session))
