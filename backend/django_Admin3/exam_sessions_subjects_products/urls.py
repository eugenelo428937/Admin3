from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamSessionSubjectProductViewSet

router = DefaultRouter()
router.register('', ExamSessionSubjectProductViewSet)

urlpatterns = [
    path('', include(router.urls)),
]