"""
Staff model.

Links Django auth_user to the internal staff system.
Represents an internal staff member who may serve various roles
(tutorial instructor, email signatory, team member, etc.).
"""
from django.conf import settings
from django.db import models


class Staff(models.Model):
    NAME_FORMAT_CHOICES = [
        ('full_name', 'Full Name'),
        ('first_name', 'First Name Only'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
    )
    job_title = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="e.g. 'Senior Tutor'",
    )
    name_format = models.CharField(
        max_length=20,
        choices=NAME_FORMAT_CHOICES,
        default='full_name',
        help_text="How this staff member's name appears in salutations",
    )
    show_job_title = models.BooleanField(
        default=False,
        help_text="Whether to display job title in email salutations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'staff'
        db_table = '"acted"."staff"'
        verbose_name = 'Staff'
        verbose_name_plural = 'Staff'

    def __str__(self):
        full_name = self.user.get_full_name()
        return full_name if full_name else self.user.username
