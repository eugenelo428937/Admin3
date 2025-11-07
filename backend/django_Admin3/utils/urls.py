from django.urls import path
from .views import address_lookup_proxy, health_check, postcoder_address_lookup, address_retrieve

urlpatterns = [
    # Existing endpoint - NOW USING POSTCODER (swapped 2025-11-05)
    path('address-lookup/', postcoder_address_lookup, name='address_lookup_proxy'),

    # Original getaddress.io endpoint (kept for rollback)
    path('getaddress-lookup/', address_lookup_proxy, name='getaddress_lookup_proxy'),

    # NEW Postcoder.com endpoint (dual-method architecture)
    path('postcoder-address-lookup/', postcoder_address_lookup, name='postcoder_address_lookup'),

    # NEW Postcoder.com retrieve endpoint (get full address by ID)
    path('address-retrieve/', address_retrieve, name='address_retrieve'),

    # Health check
    path('health/', health_check, name='health_check'),
]
