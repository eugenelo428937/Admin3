from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import TutorialEventViewSet, TutorialEventListView

router = DefaultRouter()
router.register(r'events', TutorialEventViewSet)

urlpatterns = [
    path('list/', TutorialEventListView.as_view(), name='tutorial-event-list'),
] + router.urls
