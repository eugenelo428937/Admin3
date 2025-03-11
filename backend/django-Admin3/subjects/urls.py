from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet
from . import views

router = DefaultRouter()
router.register(r'', SubjectViewSet, basename='subject')

app_name = 'subjects'

urlpatterns = [
    path('', include(router.urls)),
    path('bulk-import/', views.bulk_import_subjects,
         name='subject-bulk-import'),
]
