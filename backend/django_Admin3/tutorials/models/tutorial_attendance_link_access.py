"""TutorialAttendanceLinkAccess — write-only audit log for the public attendance link.

Each call to a public attendance endpoint (view / save / upload / reject)
writes one row here. The table is never read by application code; it is
for ops forensics only.
"""
from django.db import models

ACTION_VIEW = 'view'
ACTION_SAVE = 'save'
ACTION_UPLOAD = 'upload'
ACTION_REJECT = 'reject'

ACTION_CHOICES = [
    (ACTION_VIEW, 'View'),
    (ACTION_SAVE, 'Save'),
    (ACTION_UPLOAD, 'Upload'),
    (ACTION_REJECT, 'Reject'),
]


class TutorialAttendanceLinkAccess(models.Model):
    """Audit row written on every public attendance endpoint call."""
    session = models.ForeignKey(
        'tutorials.TutorialSessions', on_delete=models.CASCADE,
        related_name='+',
    )
    instructor = models.ForeignKey(
        'tutorials.TutorialInstructor', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+',
    )
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)
    accessed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default='')
    detail = models.JSONField(default=dict, blank=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_attendance_link_access"'
        verbose_name = 'Tutorial Attendance Link Access'
        verbose_name_plural = 'Tutorial Attendance Link Accesses'
        indexes = [models.Index(fields=['session', 'accessed_at'])]

    def __str__(self):
        return f"LinkAccess(session={self.session_id}, action={self.action})"
