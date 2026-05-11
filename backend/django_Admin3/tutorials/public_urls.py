"""URL patterns for the public (no-login) tutorial attendance endpoints.

Mounted under ``/api/tutorials/public/`` from ``tutorials.urls``.
"""
from django.urls import path

from .public_views import PublicAttendanceView

urlpatterns = [
    path('attendance/<str:token>/', PublicAttendanceView.as_view(), name='public-attendance'),
]
