# students/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .admin_views import StudentAdminViewSet

router = DefaultRouter()
router.register(r'', views.StudentViewSet)

admin_router = DefaultRouter()
admin_router.register(r'', StudentAdminViewSet, basename='student-admin')

urlpatterns = [
    path('admin-students/', include(admin_router.urls)),
    path('', include(router.urls)),
]
