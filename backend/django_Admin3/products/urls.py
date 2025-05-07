from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, product_group_tree, product_group_three_level_tree, product_group_filters

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = [    
    path('product-categories/all/', product_group_three_level_tree, name='product-group-three-level-tree'),
    path('product-groups/tree/', product_group_tree, name='product-group-tree'),
    path('', include(router.urls)),
    path('product-group-filters/', product_group_filters, name='product-group-filters'),
]
