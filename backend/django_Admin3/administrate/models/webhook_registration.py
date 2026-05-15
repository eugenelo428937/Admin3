from django.db import models


class WebhookRegistration(models.Model):
    """Local mapping of Administrate outbound-hook IDs to handler-routing keys.

    Administrate's webhook payload metadata only echoes the opaque
    `webhook_id` (Relay base64 of `OutboundHook:<n>`), not a human-readable
    webhook type. To dispatch inbound deliveries to the right handler we
    need that mapping locally — keeping it in our own table lets the
    inbound path stay round-trip-free.

    Populated by `administrate_webhooks register` after every successful
    `webhooks { create | update }` mutation: we get the `id` back in the
    response and persist the row alongside the spec's `type_name`.
    """

    administrate_webhook_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=120)
    webhook_type_name = models.CharField(max_length=80)
    lifecycle_state = models.CharField(max_length=20, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."webhook_registrations"'

    def __str__(self):
        return f"{self.name} [{self.webhook_type_name}]"
