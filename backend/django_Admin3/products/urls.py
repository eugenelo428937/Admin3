"""
Products URL configuration.

PARTIAL DEPRECATION: Product catalog endpoints now delegate to catalog.views.
Filter system endpoints remain in this module (not part of catalog consolidation).

Catalog-delegated (use /api/catalog/ for new code):
- /api/products/products/ -> catalog.views.ProductViewSet
- /api/products/bundles/ -> catalog.views.BundleViewSet
- /api/products/navigation-data/ -> catalog.views.navigation_data
- /api/products/search/ -> catalog.views.fuzzy_search
- /api/products/advanced-search/ -> catalog.views.advanced_product_search

Filter system (stays in products app):
- /api/products/product-categories/all/
- /api/products/product-groups/tree/
- /api/products/product-groups/<id>/products/
- /api/products/product-group-filters/
- /api/products/filter-configuration/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import from catalog for Strangler Fig pattern (backward compatibility)
from catalog.views import (
    ProductViewSet,
    BundleViewSet,
    navigation_data,
    fuzzy_search,
    advanced_product_search,
)

# Filter system views remain in products app (not migrated)
from .views import (
    product_group_tree,
    product_group_three_level_tree,
    product_group_filters,
    products_by_group,
    filter_configuration,
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'bundles', BundleViewSet, basename='bundle')

urlpatterns = [
    # Filter system endpoints (stay in products app)
    path('product-categories/all/', product_group_three_level_tree, name='product-group-three-level-tree'),
    path('product-groups/tree/', product_group_tree, name='product-group-tree'),
    path('product-groups/<int:group_id>/products/', products_by_group, name='products-by-group'),
    path('product-group-filters/', product_group_filters, name='product-group-filters'),
    path('filter-configuration/', filter_configuration, name='filter-configuration'),

    # Catalog-delegated endpoints (backward compatibility)
    path('navigation-data/', navigation_data, name='navigation-data'),
    path('search/', fuzzy_search, name='fuzzy-search'),
    path('advanced-search/', advanced_product_search, name='advanced-product-search'),

    # Router URLs (ViewSets)
    path('', include(router.urls)),
]
