from django.urls import path, include
from rest_framework.routers import DefaultRouter
from email_system import views
from email_system import batch_views

router = DefaultRouter()
router.register(r'settings', views.EmailSettingsViewSet)
router.register(r'templates', views.EmailTemplateViewSet)
router.register(r'attachments', views.EmailAttachmentViewSet)
router.register(r'template-attachments', views.EmailTemplateAttachmentViewSet)
router.register(r'queue', views.EmailQueueViewSet)
router.register(r'placeholders', views.EmailContentPlaceholderViewSet)
router.register(r'content-rules', views.EmailContentRuleViewSet)
router.register(r'template-content-rules', views.EmailTemplateContentRuleViewSet)
router.register(r'closing-salutations', views.ClosingSalutationViewSet)
router.register(r'mjml-elements', views.EmailMjmlElementViewSet)

urlpatterns = [
    path('batch/send/', batch_views.send_batch, name='email-batch-send'),
    path('batch/<uuid:batch_id>/', batch_views.query_batch, name='email-batch-query'),
    path('', include(router.urls)),
]
