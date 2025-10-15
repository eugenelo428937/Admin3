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

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/auth/', include('core_auth.urls')),
    path('api/users/', include('users.urls')),
    path('api/students/', include('students.urls')),
    path('api/exam-sessions/', include('exam_sessions.urls')),
    # path('api/subjects/', include('subjects.urls')),
    # Include exam_sessions_subjects_products FIRST for current/list/ endpoints
    path('api/products/', include('exam_sessions_subjects_products.urls')),
    # Then include products for other product endpoints
    path('api/products/', include('products.urls')),
    # path('api/', include('products.urls')),
    path('api/', include('subjects.urls')),
    path('api/exam-sessions-subjects/', include('exam_sessions_subjects.urls')),
    path('api/exam-sessions-subjects-products/', include('exam_sessions_subjects_products.urls')),
    path('api/cart/', include('cart.urls')),
    path('api/rules/', include('rules_engine.urls')),
    path('api/utils/', include('utils.urls')),
    path('api/countries/', include('country.urls')),
    path('api/markings/', include('marking.urls')),
    path('api/marking-vouchers/', include('marking_vouchers.urls')),
    path('api/tutorials/', include('tutorials.urls')),
]
