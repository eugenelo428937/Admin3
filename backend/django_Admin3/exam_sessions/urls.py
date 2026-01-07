"""
Exam sessions URL configuration.

DEPRECATED: This module now delegates to catalog.views.ExamSessionViewSet.
Legacy URLs are preserved for backward compatibility with existing clients.

New code should use /api/catalog/exam-sessions/ instead.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import from catalog for Strangler Fig pattern (backward compatibility)
from catalog.views import ExamSessionViewSet

router = DefaultRouter()
router.register('', ExamSessionViewSet)

urlpatterns = [
    path('', include(router.urls))
]
