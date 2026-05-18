from django.urls import path

from administrate.views.webhooks import AdministrateWebhookView


def _webhook_route(entity_path: str, *, name: str):
    """Build the per-entity URL pattern.

    Phase 6 (2026-05-18): each entity gets its own URL path so the
    inbox row records which domain a delivery was for. Handler dispatch
    is still keyed off `webhook_type_name` (which Administrate echoes
    via the `webhook_id` -> WebhookRegistration lookup); the URL
    segment is for routing + audit, not for handler selection.

    Implemented via `.as_view(entity_type=...)` which sets the class
    attribute per-route — single view class, three URL patterns, three
    distinct `entity_type` values on persisted inbox rows.
    """
    return path(
        f'webhooks/<str:route_token>/{entity_path}/',
        AdministrateWebhookView.as_view(entity_type=entity_path),
        name=name,
    )


urlpatterns = [
    _webhook_route('event',   name='administrate-event-webhook'),
    _webhook_route('session', name='administrate-session-webhook'),
    _webhook_route('learner', name='administrate-learner-webhook'),
]
