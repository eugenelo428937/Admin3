# backend/django_Admin3/core_auth/urls.py
from django.urls import path
from .views import AuthViewSet, send_test_email
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

auth_password_reset_request = AuthViewSet.as_view({
    'post': 'password_reset_request'
})

auth_password_reset_confirm = AuthViewSet.as_view({
    'post': 'password_reset_confirm'
})

# Account activation endpoints
auth_account_activation = AuthViewSet.as_view({
    'post': 'account_activation'
})

auth_send_account_activation = AuthViewSet.as_view({
    'post': 'send_account_activation'
})

# Email verification endpoints
auth_verify_email = AuthViewSet.as_view({
    'post': 'verify_email'
})

auth_send_email_verification = AuthViewSet.as_view({
    'post': 'send_email_verification'
})

urlpatterns = [
    path('login/', auth_viewset, name='auth-viewset'),
    path('register/', auth_register, name='auth-register'),
    path('refresh/', auth_refresh, name='auth-refresh'),
    path('logout/', auth_logout, name='auth-logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('csrf/', auth_csrf, name='auth-csrf'),
    path('test-email/', send_test_email, name='test-email'),
    path('password_reset_request/', auth_password_reset_request, name='auth-password-reset-request'),
    path('password_reset_confirm/', auth_password_reset_confirm, name='auth-password-reset-confirm'),
    
    # Account activation endpoints
    path('activate/', auth_account_activation, name='auth-account-activation'),
    path('send_activation/', auth_send_account_activation, name='auth-send-account-activation'),
    
    # Email verification endpoints  
    path('verify_email/', auth_verify_email, name='auth-verify-email'),
    path('send_email_verification/', auth_send_email_verification, name='auth-send-email-verification'),
]
