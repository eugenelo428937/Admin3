from django.db import models
from .user_profile import UserProfile

class UserProfileContactNumber(models.Model):
    CONTACT_TYPE_CHOICES = [
        ('HOME', 'Home'),
        ('WORK', 'Work'),
        ('MOBILE', 'Mobile'),
    ]
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='contact_numbers')
    contact_type = models.CharField(max_length=8, choices=CONTACT_TYPE_CHOICES)
    number = models.CharField(max_length=32)
    country_code = models.CharField(max_length=2, blank=True, default='', help_text="ISO 3166-1 alpha-2 country code (e.g., 'HK', 'GB')")

    class Meta:
        db_table = 'acted_user_profile_contact_number'
        verbose_name = 'User Profile Contact Number'
        verbose_name_plural = 'User Profile Contact Numbers'

    def __str__(self):
        return f"{self.user_profile.user.username} - {self.contact_type} phone"
