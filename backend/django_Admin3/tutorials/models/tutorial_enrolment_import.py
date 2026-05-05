"""TutorialEnrolmentImport — audit record per CSV import batch.

Captures who uploaded the file, when, the resulting status, summary
counters, and the full JSON report from the importer service. Rows are
immutable once written; lifecycle is tracked via ``status``.
"""
from django.db import models


class TutorialEnrolmentImport(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_DRY_RUN = 'DRY_RUN'
    STATUS_COMMITTED = 'COMMITTED'
    STATUS_FAILED = 'FAILED'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_DRY_RUN, 'Dry run'),
        (STATUS_COMMITTED, 'Committed'),
        (STATUS_FAILED, 'Failed'),
    ]

    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        'auth.User', on_delete=models.PROTECT, related_name='tutorial_imports',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    total_rows = models.IntegerField(default=0)
    created_count = models.IntegerField(default=0)
    reactivated_count = models.IntegerField(default=0)
    deactivated_count = models.IntegerField(default=0)
    unmatched_count = models.IntegerField(default=0)
    report = models.JSONField(default=dict, blank=True)
    committed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_enrolment_imports"'
        ordering = ['-uploaded_at']
        verbose_name = 'Tutorial Enrolment Import'
        verbose_name_plural = 'Tutorial Enrolment Imports'

    def __str__(self):
        return f"{self.filename} [{self.status}]"
