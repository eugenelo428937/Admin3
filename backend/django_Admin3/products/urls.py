from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet

router = DefaultRouter()
router.register('', ProductViewSet)  # No basename needed if queryset is defined

# Remove the app_name to avoid namespace conflicts
# app_name = 'products'  

urlpatterns = [
    path('', include(router.urls)),
]
