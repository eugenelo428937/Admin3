from django.urls import path
from .views import address_lookup_proxy, address_lookup_proxy_hk, health_check

urlpatterns = [
    path('address-lookup/', address_lookup_proxy, name='address_lookup_proxy'),
    path('address-lookup-hk/', address_lookup_proxy_hk, name='address_lookup_hk'),
    path('health/', health_check, name='health_check'),
]
