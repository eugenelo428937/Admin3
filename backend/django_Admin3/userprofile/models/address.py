from django.db import models
from .user_profile import UserProfile

class ActedUserProfileAddress(models.Model):
    ADDRESS_TYPE_CHOICES = [
        ('HOME', 'Home'),
        ('WORK', 'Work'),
    ]
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='addresses')
    address_type = models.CharField(max_length=8, choices=ADDRESS_TYPE_CHOICES)
    building = models.CharField(max_length=64, blank=True, null=True)
    street = models.CharField(max_length=64)
    district = models.CharField(max_length=64, blank=True, null=True)
    town = models.CharField(max_length=64)
    county = models.CharField(max_length=32, blank=True, null=True)
    postcode = models.CharField(max_length=16)
    state = models.CharField(max_length=32, blank=True, null=True)
    country = models.CharField(max_length=64)
    company = models.CharField(max_length=64, blank=True, null=True)  # Only for work
    department = models.CharField(max_length=64, blank=True, null=True)  # Only for work

    class Meta:
        db_table = 'acted_user_profile_address'
        verbose_name = 'User Profile Address'
        verbose_name_plural = 'User Profile Addresses'

    def __str__(self):
        return f"{self.user_profile.user.username} - {self.address_type} address"
