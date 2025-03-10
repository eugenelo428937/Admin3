# exam_sessions/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamSessionViewSet
from . import views

router = DefaultRouter()
router.register(r'exam-sessions', ExamSessionViewSet, basename='exam-sessions')  # Add basename parameter

urlpatterns = [
    path('', include(router.urls)),
    path('csrf/', views.get_csrf_token, name='csrf'),
]
