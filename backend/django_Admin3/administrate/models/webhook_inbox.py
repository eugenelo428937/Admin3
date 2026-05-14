from django.db import models


class WebhookInbox(models.Model):
    """Durable receipt log for inbound Administrate webhook deliveries.

    One row per Administrate-side delivery, deduped by (webhook_id,
    entity_external_id, event_timestamp). Lifecycle:

        received -> processing -> applied
                 \\-> duplicate
                  \\-> failed -> processing (retry) -> applied
                              \\-> dead (manual replay required)
    """

    STATUS_RECEIVED = 'received'
    STATUS_PROCESSING = 'processing'
    STATUS_APPLIED = 'applied'
    STATUS_DUPLICATE = 'duplicate'
    STATUS_FAILED = 'failed'
    STATUS_DEAD = 'dead'

    STATUS_CHOICES = [
        (STATUS_RECEIVED, 'Received'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_APPLIED, 'Applied'),
        (STATUS_DUPLICATE, 'Duplicate'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_DEAD, 'Dead'),
    ]

    administrate_webhook_id = models.CharField(max_length=64, db_index=True)
    administrate_event_timestamp = models.DateTimeField(db_index=True)
    webhook_type_name = models.CharField(max_length=80)
    entity_type = models.CharField(max_length=40)
    entity_external_id = models.CharField(max_length=64, db_index=True)

    raw_payload = models.JSONField()
    raw_headers = models.JSONField(default=dict)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_RECEIVED,
        db_index=True,
    )
    error_message = models.TextField(blank=True, default='')
    attempts = models.PositiveSmallIntegerField(default=0)
    task_id = models.CharField(max_length=64, blank=True, default='')

    received_at = models.DateTimeField(auto_now_add=True)
    applied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."webhook_inbox"'
        constraints = [
            models.UniqueConstraint(
                fields=[
                    'administrate_webhook_id',
                    'entity_external_id',
                    'administrate_event_timestamp',
                ],
                name='uniq_webhook_inbox_delivery',
            ),
        ]
        indexes = [
            models.Index(fields=['status', 'received_at']),
            models.Index(fields=['entity_type', 'entity_external_id']),
        ]

    def __str__(self):
        return (
            f'<WebhookInbox #{self.pk} {self.webhook_type_name} '
            f'{self.entity_external_id} {self.status}>'
        )
