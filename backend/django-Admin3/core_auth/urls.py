# core_auth/urls.py
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import AuthViewSet

auth_login = AuthViewSet.as_view({
    'post': 'login'
})

auth_register = AuthViewSet.as_view({
    'post': 'register'
})

auth_refresh = AuthViewSet.as_view({
    'post': 'refresh_token'
})

urlpatterns = [
    path('login/', auth_login, name='auth-login'),
    path('register/', auth_register, name='auth-register'),
    path('refresh/', auth_refresh, name='auth-refresh'),    
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),    
]
