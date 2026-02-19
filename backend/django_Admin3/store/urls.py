"""
URL configuration for the store API.

Endpoints:
- /api/store/products/              - Store Products (list, retrieve, create, update, delete)
- /api/store/products/{id}/prices/  - Product prices
- /api/store/prices/                - Prices (list, retrieve, create, update, delete)
- /api/store/bundles/               - Bundles (list, retrieve, create, update, delete)
- /api/store/bundles/{id}/products/ - Bundle products
- /api/store/bundle-products/       - BundleProducts (list, retrieve, create, update, delete)

Admin endpoints (IsSuperUser on all actions):
- /api/store/admin-products/        - Admin store products (unfiltered, with catalog fields)
- /api/store/admin-bundles/         - Admin store bundles (unfiltered, with full fields)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from store.views import (
    ProductViewSet, PriceViewSet, BundleViewSet, BundleProductViewSet,
    StoreProductAdminViewSet, StoreBundleAdminViewSet,
)

app_name = 'store'

# Create router and register ViewSets
router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'prices', PriceViewSet, basename='price')
router.register(r'bundles', BundleViewSet, basename='bundle')
router.register(r'bundle-products', BundleProductViewSet, basename='bundle-product')

# Admin ViewSets
router.register(r'admin-products', StoreProductAdminViewSet, basename='admin-product')
router.register(r'admin-bundles', StoreBundleAdminViewSet, basename='admin-bundle')

urlpatterns = [
    path('', include(router.urls)),
]
