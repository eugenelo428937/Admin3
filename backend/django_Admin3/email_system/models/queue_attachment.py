"""Per-queue-item dynamic attachment.

Distinct from :class:`email_system.models.EmailAttachment` (which is keyed
by ``name`` and shared across templates via ``EmailTemplateAttachment``):
``EmailQueueAttachment`` carries bytes that are unique to *one* queue row
(e.g. a tutorial-session-specific xlsx generated at enqueue time).
Lifecycle is FK-CASCADE to the queue row.
"""
from __future__ import annotations

from django.db import models

from .queue import EmailQueue


class EmailQueueAttachment(models.Model):
    """A single binary attachment bound to one ``EmailQueue`` row."""

    queue_item = models.ForeignKey(
        EmailQueue,
        on_delete=models.CASCADE,
        related_name='dynamic_attachments',
        help_text='Queue row this attachment belongs to.',
    )
    filename = models.CharField(
        max_length=255,
        help_text='Filename shown to the recipient.',
    )
    content = models.BinaryField(
        help_text='Raw attachment bytes.',
    )
    mime_type = models.CharField(
        max_length=120,
        default='application/octet-stream',
        help_text='MIME type of the attachment.',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'utils_email_queue_attachment'
        ordering = ['queue_item_id', 'id']
        verbose_name = 'Email Queue Attachment'
        verbose_name_plural = 'Email Queue Attachments'

    @property
    def size_bytes(self) -> int:
        """Length of ``content`` in bytes (handles ``memoryview``)."""
        if self.content is None:
            return 0
        return len(bytes(self.content))

    def __str__(self) -> str:
        return f'{self.filename} ({self.size_bytes} bytes)'
