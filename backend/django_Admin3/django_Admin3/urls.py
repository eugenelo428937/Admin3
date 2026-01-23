"""
URL configuration for django_Admin3 project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from utils.health_check import health_check
from utils.views import country_list

urlpatterns = [
    path('admin/doc/', include('django.contrib.admindocs.urls')),  # Must be before admin/
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/auth/', include('core_auth.urls')),
    path('api/users/', include('users.urls')),
    path('api/students/', include('students.urls')),
    # Filter system endpoints (product groups, filter configuration)
    path('api/products/', include('filtering.urls')),
    path('api/cart/', include('cart.urls')),
    path('api/rules/', include('rules_engine.urls')),
    path('api/utils/', include('utils.urls')),
    path('api/countries/', country_list, name='country_list'),
    path('api/markings/', include('marking.urls')),
    path('api/marking-vouchers/', include('marking_vouchers.urls')),
    path('api/tutorials/', include('tutorials.urls')),
    # Catalog API - consolidated catalog endpoints (002-catalog-api-consolidation)
    path('api/catalog/', include('catalog.urls')),
    # Search API - product search endpoints (002-catalog-api-consolidation)
    path('api/search/', include('search.urls')),
    # Store API - purchasable items (20250115-store-app-consolidation)
    path('api/store/', include('store.urls')),
]
