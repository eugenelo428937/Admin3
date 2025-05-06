from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, ProductCategoryViewSet, ProductSubcategoryViewSet, all_product_categories

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'product-categories', ProductCategoryViewSet, basename='product-category')
router.register(r'product-subcategories', ProductSubcategoryViewSet, basename='product-subcategory')

urlpatterns = [
    path('product-categories/all/', all_product_categories, name='all-product-categories'),
    path('', include(router.urls)),
]
