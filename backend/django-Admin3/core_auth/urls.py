# backend/django-Admin3/core_auth/urls.py
from django.urls import path
from .views import AuthViewSet
from rest_framework_simplejwt.views import TokenRefreshView

auth_viewset = AuthViewSet.as_view({
    'get': 'csrf',
    'post': 'login'
})

auth_register = AuthViewSet.as_view({
    'post': 'register'
})

auth_refresh = AuthViewSet.as_view({
    'post': 'refresh_token'
})

auth_logout = AuthViewSet.as_view({
    'post': 'logout'
})

auth_csrf = AuthViewSet.as_view({
    'get': 'csrf'
})

urlpatterns = [
    path('login/', auth_viewset, name='auth-viewset'),
    path('register/', auth_register, name='auth-register'),
    path('refresh/', auth_refresh, name='auth-refresh'),
    path('logout/', auth_logout, name='auth-logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('csrf/', auth_csrf, name='auth-csrf'),
]
