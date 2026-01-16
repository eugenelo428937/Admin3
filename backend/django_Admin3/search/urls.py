"""
Search API URL Configuration.

Routes for the search app endpoints.
"""
from django.urls import path

from .views import (
    UnifiedSearchView,
    DefaultSearchDataView,
    FuzzySearchView,
    AdvancedFuzzySearchView,
)

app_name = 'search'

urlpatterns = [
    path('unified/', UnifiedSearchView.as_view(), name='unified-search'),
    path('default-data/', DefaultSearchDataView.as_view(), name='default-search-data'),
    path('fuzzy/', FuzzySearchView.as_view(), name='fuzzy-search'),
    path('advanced-fuzzy/', AdvancedFuzzySearchView.as_view(), name='advanced-fuzzy-search'),
]
