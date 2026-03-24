"""
Team model.

Represents an organizational group of staff members (e.g., department, team).
Teams can have a default sign-off text for email salutations.
"""
from django.db import models


class Team(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique identifier slug, e.g. 'acted_main'",
    )
    display_name = models.CharField(
        max_length=200,
        help_text="External-facing name, e.g. 'THE ACTUARIAL EDUCATION COMPANY (ActEd)'",
    )
    default_sign_off_text = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="Default sign-off for salutations, e.g. 'Kind Regards'",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'staff'
        db_table = '"acted"."team"'
        verbose_name = 'Team'
        verbose_name_plural = 'Teams'
        ordering = ['name']

    def __str__(self):
        return self.display_name
