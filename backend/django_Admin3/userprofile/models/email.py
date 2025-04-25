from django.db import models
from .user_profile import UserProfile

class ActedUserProfileEmail(models.Model):
    EMAIL_TYPE_CHOICES = [
        ('PERSONAL', 'Personal'),
        ('WORK', 'Work'),
    ]
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='emails')
    email_type = models.CharField(max_length=16, choices=EMAIL_TYPE_CHOICES)
    email = models.EmailField(max_length=128)

    class Meta:
        db_table = 'acted_user_profile_email'
        verbose_name = 'User Profile Email'
        verbose_name_plural = 'User Profile Emails'

    def __str__(self):
        return f"{self.user_profile.user.username} - {self.email_type} email"
