import uuid
from django.db import models


class EmailBatch(models.Model):
    BATCH_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('completed_with_errors', 'Completed with Errors'),
        ('failed', 'Failed'),
    ]

    batch_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        'email_system.EmailTemplate',
        on_delete=models.PROTECT,
        related_name='batches',
    )
    requested_by = models.CharField(max_length=200)
    notify_email = models.EmailField()
    status = models.CharField(max_length=30, choices=BATCH_STATUS_CHOICES, default='pending')
    total_items = models.IntegerField(default=0)
    sent_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    api_key = models.ForeignKey(
        'email_system.ExternalApiKey',
        on_delete=models.PROTECT,
        related_name='batches',
    )

    class Meta:
        db_table = 'utils_email_batch'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['api_key', 'created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'Batch {self.batch_id} ({self.status}) - {self.total_items} items'
