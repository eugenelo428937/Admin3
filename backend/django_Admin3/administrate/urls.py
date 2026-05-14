from django.urls import path

from administrate.views.webhooks import AdministrateEventWebhookView

urlpatterns = [
    path(
        'webhooks/<str:route_token>/event/',
        AdministrateEventWebhookView.as_view(),
        name='administrate-event-webhook',
    ),
]
