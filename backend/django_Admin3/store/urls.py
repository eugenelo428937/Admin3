"""
URL configuration for the store API.

Endpoints:
- /api/store/products/              - Store Products (list, retrieve)
- /api/store/products/{id}/prices/  - Product prices
- /api/store/prices/                - Prices (list, retrieve)
- /api/store/bundles/               - Bundles (list, retrieve)
- /api/store/bundles/{id}/products/ - Bundle products
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from store.views import ProductViewSet, PriceViewSet, BundleViewSet

app_name = 'store'

# Create router and register ViewSets
router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'prices', PriceViewSet, basename='price')
router.register(r'bundles', BundleViewSet, basename='bundle')

urlpatterns = [
    path('', include(router.urls)),
]
