from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .admin_views import (
    MarkerAdminViewSet,
    MarkingPaperFeedbackAdminViewSet,
    MarkingPaperGradingAdminViewSet,
    MarkingPaperSubmissionAdminViewSet,
)
from .views import MarkingPaperViewSet

router = DefaultRouter()
router.register(r'papers', MarkingPaperViewSet, basename='markingpaper')

admin_router = DefaultRouter()
admin_router.register(
    r'admin-markers', MarkerAdminViewSet, basename='marker-admin',
)
admin_router.register(
    r'admin-submissions', MarkingPaperSubmissionAdminViewSet,
    basename='marking-submission-admin',
)
admin_router.register(
    r'admin-gradings', MarkingPaperGradingAdminViewSet,
    basename='marking-grading-admin',
)
admin_router.register(
    r'admin-feedback', MarkingPaperFeedbackAdminViewSet,
    basename='marking-feedback-admin',
)

urlpatterns = [
    path('', include(admin_router.urls)),
    path('', include(router.urls)),
]
