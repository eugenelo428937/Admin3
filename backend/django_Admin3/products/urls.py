from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, BundleViewSet, product_group_tree, product_group_three_level_tree, product_group_filters, products_by_group, navbar_product_groups, distance_learning_dropdown, tutorial_dropdown, fuzzy_search, advanced_product_search, filter_configuration, navigation_data

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'bundles', BundleViewSet, basename='bundle')

urlpatterns = [
    path('product-categories/all/', product_group_three_level_tree, name='product-group-three-level-tree'),
    path('product-groups/tree/', product_group_tree, name='product-group-tree'),
    path('product-groups/<int:group_id>/products/', products_by_group, name='products-by-group'),
    path('product-group-filters/', product_group_filters, name='product-group-filters'),
    path('filter-configuration/', filter_configuration, name='filter-configuration'),
    path('navbar-product-groups/', navbar_product_groups, name='navbar-product-groups'),
    path('distance-learning-dropdown/', distance_learning_dropdown, name='distance-learning-dropdown'),
    path('tutorial-dropdown/', tutorial_dropdown, name='tutorial-dropdown'),
    path('navigation-data/', navigation_data, name='navigation-data'),  # Combined navigation endpoint
    path('search/', fuzzy_search, name='fuzzy-search'),
    path('advanced-search/', advanced_product_search, name='advanced-product-search'),
    path('', include(router.urls)),
]
