from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CheckoutView, OrderViewSet
from .admin_views import AdminOrderViewSet

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='orders')

admin_router = DefaultRouter()
admin_router.register(r'', AdminOrderViewSet, basename='admin-orders')

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('admin/', include(admin_router.urls)),
    path('', include(router.urls)),
]
