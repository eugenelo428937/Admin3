"""
Staff model.

Links Django auth_user to the tutorial system.
Represents an internal staff member who may serve various roles.
"""
from django.conf import settings
from django.db import models


class Staff(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."staff"'
        verbose_name = 'Staff'
        verbose_name_plural = 'Staff'

    def __str__(self):
        full_name = self.user.get_full_name()
        return full_name if full_name else self.user.username
