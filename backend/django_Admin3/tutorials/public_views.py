"""Public (no-login) attendance endpoints gated by a signed magic-link token.

Reuses the admin serializers and the shared save service so the public
flow produces results identical to the admin path.
"""
from __future__ import annotations

import logging

from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from tutorials.admin_serializers import (
    AdminAttendanceGetSerializer, AdminAttendanceSaveSerializer,
)
from tutorials.models import (
    TutorialAttendanceLinkAccess, TutorialInstructor, TutorialRegistration,
    TutorialSessions,
)
from tutorials.services.attendance_link import (
    AttendanceLinkPayload, AttendanceLinkSigner, ExpiredLink, InvalidLink,
)
from tutorials.services.attendance_save_service import (
    CrossSessionRegistration, save_attendance_items,
)

log = logging.getLogger(__name__)


def _client_ip(request) -> str | None:
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or None


def _user_agent(request) -> str:
    return (request.META.get('HTTP_USER_AGENT') or '')[:512]


def _log_access(*, session_id: int, instructor_id, action: str, request, detail: dict | None = None):
    TutorialAttendanceLinkAccess.objects.create(
        session_id=session_id,
        instructor_id=instructor_id,
        action=action,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
        detail=detail or {},
    )


class _TokenAuthMixin:
    signer = AttendanceLinkSigner()

    def _verify(self, token: str, request) -> AttendanceLinkPayload | Response:
        try:
            return self.signer.unsign(token)
        except ExpiredLink:
            log.warning(
                'public attendance rejected: expired ip=%s ua=%s',
                _client_ip(request), _user_agent(request),
            )
            return Response({'code': 'token_expired'}, status=410)
        except InvalidLink:
            log.warning(
                'public attendance rejected: invalid ip=%s ua=%s',
                _client_ip(request), _user_agent(request),
            )
            return Response({'code': 'invalid_token'}, status=400)


class PublicAttendanceView(_TokenAuthMixin, APIView):
    permission_classes = [AllowAny]

    def _build_payload(self, session, instructor):
        registrations = (
            TutorialRegistration.objects
            .filter(tutorial_session=session)
            .select_related('student__user', 'attendance')
            .order_by('student__user__last_name', 'student__user__first_name')
        )
        data = AdminAttendanceGetSerializer({
            'session': session,
            'attendance_enabled': True,
            'registrations': registrations,
        }).data
        data['instructor'] = {'id': instructor.id, 'name': str(instructor)}
        return data

    def get(self, request, token: str):
        result = self._verify(token, request)
        if isinstance(result, Response):
            return result
        payload = result
        session = get_object_or_404(TutorialSessions, id=payload.session_id)
        instructor = get_object_or_404(TutorialInstructor, id=payload.instructor_id)
        _log_access(
            session_id=session.id, instructor_id=instructor.id,
            action='view', request=request,
        )
        return Response(self._build_payload(session, instructor))

    def post(self, request, token: str):
        result = self._verify(token, request)
        if isinstance(result, Response):
            return result
        payload = result
        session = get_object_or_404(TutorialSessions, id=payload.session_id)
        instructor = get_object_or_404(TutorialInstructor, id=payload.instructor_id)

        ser = AdminAttendanceSaveSerializer(data=request.data, session=session)
        ser.is_valid(raise_exception=True)
        recorded_by = None
        if instructor.staff_id and instructor.staff.user_id:
            recorded_by = instructor.staff.user
        try:
            save_attendance_items(
                session=session,
                recorded_by=recorded_by,
                items=ser.validated_data['items'],
            )
        except CrossSessionRegistration as exc:
            _log_access(
                session_id=session.id, instructor_id=instructor.id,
                action='reject', request=request,
                detail={'reason': 'cross_session', 'message': str(exc)},
            )
            return Response({'code': 'cross_session', 'detail': str(exc)}, status=400)

        _log_access(
            session_id=session.id, instructor_id=instructor.id,
            action='save', request=request,
            detail={'count': len(ser.validated_data['items'])},
        )
        session.refresh_from_db()
        return Response(self._build_payload(session, instructor))
