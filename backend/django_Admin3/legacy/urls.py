"""URL configuration for the legacy archive."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LegacyProductSearchView
from .admin_views import LegacyOrderAdminViewSet

admin_router = DefaultRouter()
admin_router.register(r'', LegacyOrderAdminViewSet, basename='legacy-order-admin')

urlpatterns = [
    path('products/', LegacyProductSearchView.as_view(), name='legacy-product-search'),
    path('admin-orders/', include(admin_router.urls)),
]
