import uuid
from django.db import models


class ExternalApiKey(models.Model):
    id = models.AutoField(primary_key=True)
    key_hash = models.CharField(max_length=64, unique=True, help_text='SHA-256 hash of the API key')
    key_prefix = models.CharField(max_length=8, help_text='First 8 chars for admin identification')
    name = models.CharField(max_length=200, help_text='Display name for this API key')
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='api_keys',
        help_text='Django user linked to this API key',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'utils_external_api_key'
        verbose_name = 'External API Key'
        verbose_name_plural = 'External API Keys'

    def __str__(self):
        return f'{self.name} ({self.key_prefix}...)'
