"""TutorialAttendance — per-registration attendance record.

One row per TutorialRegistration (OneToOne). Status is one of
ATTENDED / ABSENT / LATE / OTHER. When status is OTHER, ``reason`` must
be non-blank — enforced in ``clean()``.
"""
from django.core.exceptions import ValidationError
from django.db import models


class TutorialAttendance(models.Model):
    STATUS_ATTENDED = 'ATTENDED'
    STATUS_ABSENT = 'ABSENT'
    STATUS_LATE = 'LATE'
    STATUS_OTHER = 'OTHER'
    STATUS_CHOICES = [
        (STATUS_ATTENDED, 'Attended'),
        (STATUS_ABSENT, 'Absent'),
        (STATUS_LATE, 'Late'),
        (STATUS_OTHER, 'Other'),
    ]

    registration = models.OneToOneField(
        'tutorials.TutorialRegistration', on_delete=models.CASCADE,
        related_name='attendance',
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES)
    reason = models.TextField(blank=True, default='')
    recorded_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recorded_tutorial_attendance',
    )
    recorded_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_attendance"'
        verbose_name = 'Tutorial Attendance'
        verbose_name_plural = 'Tutorial Attendance'

    def clean(self):
        super().clean()
        if self.status == self.STATUS_OTHER and not (self.reason or '').strip():
            raise ValidationError({
                'reason': "Reason is required when status is OTHER.",
            })

    def __str__(self):
        return f"{self.registration} : {self.status}"
