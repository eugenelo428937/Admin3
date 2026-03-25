from django.db import models
from django.contrib.auth.models import User


class MachineToken(models.Model):
    """Pre-provisioned authentication token for admin staff machines.

    Tokens are HMAC-SHA256 hashed with SECRET_KEY before storage.
    Raw tokens are shown once during creation and never stored.
    """
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='machine_tokens')
    machine_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = '"acted"."machine_tokens"'

    def __str__(self):
        return f"{self.machine_name} → {self.user.email}"
