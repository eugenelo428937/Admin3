from django.db import models
from .user_profile import UserProfile

class UserProfileAddress(models.Model):
    ADDRESS_TYPE_CHOICES = [
        ('HOME', 'Home'),
        ('WORK', 'Work'),
    ]
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='addresses')
    address_type = models.CharField(max_length=8, choices=ADDRESS_TYPE_CHOICES)
    
    # Store address as JSON to support different country formats
    address_data = models.JSONField(
        default=dict,
        help_text="Address data in JSON format to support different country address structures"
    )
    
    # Keep core fields for easy querying
    country = models.CharField(max_length=64, help_text="Country name for easy filtering")
    
    # For work addresses only
    company = models.CharField(max_length=64, blank=True, null=True)  # Only for work
    department = models.CharField(max_length=64, blank=True, null=True)  # Only for work

    class Meta:
        db_table = '"acted"."user_profile_address"'
        verbose_name = 'User Profile Address'
        verbose_name_plural = 'User Profile Addresses'

    def __str__(self):
        return f"{self.user_profile.user.username} - {self.address_type} address"
    
    def get_address_field(self, field_name):
        """Get a specific address field from the JSON data"""
        return self.address_data.get(field_name, '')
    
    def get_formatted_address(self):
        """Get a formatted address string based on the address data"""
        if not self.address_data:
            return ""
        
        # Basic formatting - can be enhanced based on country-specific formats
        address_parts = []
        
        # Common fields that might exist
        for field in ['building', 'street', 'address', 'district', 'town', 'city', 'county', 'state', 'postal_code', 'postcode']:
            value = self.address_data.get(field)
            if value:
                address_parts.append(str(value))
        
        return ', '.join(address_parts)
    
    @property
    def postal_code(self):
        """Get postal code from address data (supports multiple field names)"""
        return self.address_data.get('postal_code') or self.address_data.get('postcode', '')
    
    @property
    def city(self):
        """Get city from address data (supports multiple field names)"""
        return self.address_data.get('city') or self.address_data.get('town', '')
    
    @property
    def state_province(self):
        """Get state/province from address data"""
        return self.address_data.get('state') or self.address_data.get('county', '')
