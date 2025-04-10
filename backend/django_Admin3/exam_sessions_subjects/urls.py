from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamSessionSubjectViewSet

router = DefaultRouter()
router.register('', ExamSessionSubjectViewSet)

urlpatterns = [
    path('', include(router.urls)),
]