"""
TeamStaff model.

Join table linking staff members to teams.
"""
from django.db import models


class TeamStaff(models.Model):
    team = models.ForeignKey(
        'staff.Team',
        on_delete=models.CASCADE,
        related_name='team_staff',
    )
    staff = models.ForeignKey(
        'staff.Staff',
        on_delete=models.CASCADE,
        related_name='team_memberships',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'staff'
        db_table = '"acted"."team_staff"'
        unique_together = ['team', 'staff']
        verbose_name = 'Team Staff'
        verbose_name_plural = 'Team Staff'

    def __str__(self):
        return f"{self.team} - {self.staff}"
