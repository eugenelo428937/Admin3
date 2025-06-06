from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamSessionSubjectProductViewSet

router = DefaultRouter()
router.register('', ExamSessionSubjectProductViewSet)

urlpatterns = [
    path('current/list/', ExamSessionSubjectProductViewSet.as_view({'get': 'list_products'}), name='current-products-list'),
    path('', include(router.urls)),
]