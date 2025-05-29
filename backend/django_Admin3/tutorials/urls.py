from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import EventViewSet, SessionViewSet, TutorialEventListView

router = DefaultRouter()
router.register(r'events', EventViewSet)
router.register(r'sessions', SessionViewSet)

urlpatterns = [
    path('list/', TutorialEventListView.as_view(), name='tutorial-event-list'),
] + router.urls
