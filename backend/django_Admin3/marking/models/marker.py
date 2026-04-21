"""
Marker model.

Represents a person who marks student submissions. May be internal staff
or an external contractor; `initial` is the marker's short display initial
used on grading records.
"""
from django.conf import settings
from django.db import models


class Marker(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='marker',
    )
    initial = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."markers"'
        verbose_name = 'Marker'
        verbose_name_plural = 'Markers'

    def __str__(self):
        name = self.user.get_full_name() or self.user.username
        return f'{self.initial} ({name})'
