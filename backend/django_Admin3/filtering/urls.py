"""
Filtering URL configuration.

Filter system endpoints:
- /api/products/product-categories/all/  - Three-level category tree
- /api/products/product-groups/tree/     - Product group tree
- /api/products/product-groups/<id>/products/ - Products by group
- /api/products/product-group-filters/   - Product group filters
- /api/products/filter-configuration/    - Dynamic filter configuration
"""
from django.urls import path

from .views import (
    product_group_tree,
    product_group_three_level_tree,
    products_by_group,
    product_group_filters,
    filter_configuration,
)

urlpatterns = [
    path('product-categories/all/', product_group_three_level_tree, name='product-group-three-level-tree'),
    path('product-groups/tree/', product_group_tree, name='product-group-tree'),
    path('product-groups/<int:group_id>/products/', products_by_group, name='products-by-group'),
    path('product-group-filters/', product_group_filters, name='product-group-filters'),
    path('filter-configuration/', filter_configuration, name='filter-configuration'),
]
