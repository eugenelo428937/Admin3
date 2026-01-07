"""
Subjects URL configuration.

DEPRECATED: This module now delegates to catalog.views.SubjectViewSet.
Legacy URLs are preserved for backward compatibility with existing clients.

New code should use /api/catalog/subjects/ instead.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import from catalog for Strangler Fig pattern (backward compatibility)
from catalog.views import SubjectViewSet

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')

urlpatterns = router.urls
