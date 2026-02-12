"""
TutorialInstructor model.

A staff member authorized to lead tutorial sessions.
Has an active/inactive status for scheduling purposes.
"""
from django.db import models


class TutorialInstructor(models.Model):
    staff = models.OneToOneField(
        'tutorials.Staff',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_instructors"'
        verbose_name = 'Tutorial Instructor'
        verbose_name_plural = 'Tutorial Instructors'

    def __str__(self):
        if self.staff:
            return str(self.staff)
        return f"Instructor #{self.id}"
