from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, product_group_tree, product_group_three_level_tree, product_group_filters, products_by_group

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = [    
    path('product-categories/all/', product_group_three_level_tree, name='product-group-three-level-tree'),
    path('product-groups/tree/', product_group_tree, name='product-group-tree'),
    path('product-groups/<int:group_id>/products/', products_by_group, name='products-by-group'),
    path('product-group-filters/', product_group_filters, name='product-group-filters'),
    path('', include(router.urls)),
]
