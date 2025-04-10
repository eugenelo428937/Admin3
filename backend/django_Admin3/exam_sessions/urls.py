# exam_sessions/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamSessionViewSet

router = DefaultRouter()
router.register('', ExamSessionViewSet)

urlpatterns = [
    path('', include(router.urls))
]
