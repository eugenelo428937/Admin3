from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    remarks = models.TextField(max_length=500, blank=True, null=True)      

    def __str__(self):
        return self.user.username
