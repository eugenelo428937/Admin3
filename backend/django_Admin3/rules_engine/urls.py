from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RulesEngineViewSet, RuleViewSet, MessageTemplateViewSet,
    HolidayCalendarViewSet, UserAcknowledgmentViewSet
)

router = DefaultRouter()
router.register(r'engine', RulesEngineViewSet, basename='rules-engine')
router.register(r'rules', RuleViewSet)
router.register(r'templates', MessageTemplateViewSet)
router.register(r'holidays', HolidayCalendarViewSet)
router.register(r'acknowledgments', UserAcknowledgmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 