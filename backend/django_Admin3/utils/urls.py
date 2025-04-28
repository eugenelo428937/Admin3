from django.urls import path
from .views import address_lookup_proxy

urlpatterns = [
    path('address-lookup/', address_lookup_proxy, name='address_lookup_proxy'),
]
