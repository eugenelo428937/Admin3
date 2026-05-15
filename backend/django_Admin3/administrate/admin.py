from django.contrib import admin

from administrate.models import WebhookInbox


@admin.register(WebhookInbox)
class WebhookInboxAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'webhook_type_name', 'entity_external_id', 'status',
        'attempts', 'received_at', 'applied_at',
    )
    list_filter = ('status', 'webhook_type_name', 'entity_type')
    search_fields = ('entity_external_id', 'administrate_webhook_id')
    ordering = ('-received_at',)
    # Only `status` is writable so operators can manually flip dead -> received.
    # Everything else is the auditable receipt and must not be edited.
    readonly_fields = (
        'administrate_webhook_id', 'administrate_event_timestamp',
        'webhook_type_name', 'entity_type', 'entity_external_id',
        'raw_payload', 'raw_headers', 'error_message', 'attempts',
        'task_id', 'received_at', 'last_attempted_at', 'applied_at',
    )
