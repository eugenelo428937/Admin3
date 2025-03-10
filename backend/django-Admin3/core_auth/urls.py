# core_auth/urls.py
from django.urls import path
from . import views

app_name = 'core_auth'

urlpatterns = [
    path('csrf/', views.get_csrf_token, name='csrf'),
]
