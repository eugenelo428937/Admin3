# students/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

urlpatterns = [
    # Authentication endpoints
    path('csrf/', views.get_csrf_token, name='csrf'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('session/', views.get_session_info, name='session-info'),
    
    # Existing endpoints
    path('current/', views.get_current_student, name='current-student'),
    path('register/', views.register_student, name='register_student'),
]
