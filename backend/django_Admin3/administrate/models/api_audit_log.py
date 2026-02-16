import threading
from django.db import models

_current_command = threading.local()


class ApiAuditLog(models.Model):
    """Audit log for all Administrate GraphQL API interactions."""

    command = models.CharField(max_length=100, db_index=True)
    operation = models.CharField(max_length=50)

    graphql_query = models.TextField()
    variables = models.JSONField(default=dict, blank=True)

    response_body = models.JSONField(null=True, blank=True)
    status_code = models.IntegerField(null=True, blank=True)

    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True, default='')

    started_at = models.DateTimeField()
    completed_at = models.DateTimeField()
    duration_ms = models.IntegerField(null=True, blank=True)

    entity_type = models.CharField(max_length=50, blank=True, default='')
    entity_id = models.CharField(max_length=255, blank=True, default='')
    records_processed = models.IntegerField(default=0)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."api_audit_log"'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['command', 'started_at']),
            models.Index(fields=['success', 'started_at']),
        ]
        verbose_name = 'API Audit Log'
        verbose_name_plural = 'API Audit Logs'

    def __str__(self):
        status = 'OK' if self.success else 'FAIL'
        return f"[{status}] {self.command} {self.operation} @ {self.started_at}"

    @classmethod
    def set_current_command(cls, command_name):
        _current_command.name = command_name

    @classmethod
    def get_current_command(cls):
        return getattr(_current_command, 'name', 'unknown')
