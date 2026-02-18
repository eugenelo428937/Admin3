"""
URL configuration for the store API.

Endpoints:
- /api/store/products/              - Store Products (list, retrieve, create, update, delete)
- /api/store/products/{id}/prices/  - Product prices
- /api/store/prices/                - Prices (list, retrieve, create, update, delete)
- /api/store/bundles/               - Bundles (list, retrieve, create, update, delete)
- /api/store/bundles/{id}/products/ - Bundle products
- /api/store/bundle-products/       - BundleProducts (list, retrieve, create, update, delete)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from store.views import ProductViewSet, PriceViewSet, BundleViewSet, BundleProductViewSet

app_name = 'store'

# Create router and register ViewSets
router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'prices', PriceViewSet, basename='price')
router.register(r'bundles', BundleViewSet, basename='bundle')
router.register(r'bundle-products', BundleProductViewSet, basename='bundle-product')

urlpatterns = [
    path('', include(router.urls)),
]
