from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamSessionSubjectProductViewSet

router = DefaultRouter()
router.register('', ExamSessionSubjectProductViewSet)

urlpatterns = [
    path('current/list/', ExamSessionSubjectProductViewSet.as_view({'get': 'list_products'}), name='current-products-list'),
    path('current/default-search-data/', ExamSessionSubjectProductViewSet.as_view({'get': 'default_search_data'}), name='current-default-search-data'),
    path('search/', ExamSessionSubjectProductViewSet.as_view({'post': 'unified_search'}), name='unified-product-search'),
    path('', include(router.urls)),
]