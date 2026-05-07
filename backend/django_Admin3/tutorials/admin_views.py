"""Admin views for the Tutorials admin panel.

All endpoints require ``IsSuperUser``. See
``docs/superpowers/specs/2026-05-07-tutorial-event-admin-design.md``.
"""
from django.db.models import Count, Prefetch, Q
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination

from catalog.permissions import IsSuperUser
from tutorials.admin_filters import apply_event_filters
from tutorials.admin_serializers import AdminTutorialEventListSerializer
from tutorials.models import TutorialEvents, TutorialSessions


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
