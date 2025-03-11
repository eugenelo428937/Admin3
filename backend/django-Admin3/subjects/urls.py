from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet

router = DefaultRouter()
router.register(r'', SubjectViewSet, basename='subject')

app_name = 'subjects'

urlpatterns = [    
    path('', include(router.urls)),    
]
