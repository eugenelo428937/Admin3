"""URL configuration for the legacy product archive."""
from django.urls import path
from .views import LegacyProductSearchView

urlpatterns = [
    path('products/', LegacyProductSearchView.as_view(), name='legacy-product-search'),
]
