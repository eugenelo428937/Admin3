from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RulesEngineViewSet, MessageTemplateViewSet,
    HolidayCalendarViewSet, UserAcknowledgmentViewSet, ActedRuleViewSet,
    rules_by_entrypoint, rules_create, rules_execute, rules_acknowledge, rules_preferences
)

router = DefaultRouter()
router.register(r'engine', RulesEngineViewSet, basename='rules-engine')
# Obsolete RuleViewSet removed
# router.register(r'rules', RuleViewSet)
router.register(r'templates', MessageTemplateViewSet)
router.register(r'holidays', HolidayCalendarViewSet)
router.register(r'acknowledgments', UserAcknowledgmentViewSet)
router.register(r'acted-rules', ActedRuleViewSet, basename='acted-rules')

urlpatterns = [
    path('', include(router.urls)),
    # Stage 9 specific endpoints
    path('entrypoint/<str:entry_point>/', rules_by_entrypoint, name='rules-by-entrypoint'),
    path('create/', rules_create, name='rules-create'),
    path('execute/', rules_execute, name='rules-execute'),
    path('acknowledge/', rules_acknowledge, name='rules-acknowledge'),
    path('preferences/', rules_preferences, name='rules-preferences'),  # Stage 10 requirement
    path('<str:rule_id>/', ActedRuleViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='rules-detail'),
] 