from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, ProductTypeViewSet, ProductSubtypeViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'product-types', ProductTypeViewSet, basename='product-type')
router.register(r'product-subtypes', ProductSubtypeViewSet, basename='product-subtype')

urlpatterns = [
    path('', include(router.urls)),
]
