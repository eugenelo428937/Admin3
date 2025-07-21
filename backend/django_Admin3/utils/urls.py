from django.urls import path
from .views import address_lookup_proxy, health_check

urlpatterns = [
    path('address-lookup/', address_lookup_proxy, name='address_lookup_proxy'),
    path('health/', health_check, name='health_check'),
]
