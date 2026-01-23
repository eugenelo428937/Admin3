from django.db import models
from django.contrib.auth.models import User


class EmailSettings(models.Model):
    """Global email system configuration and settings."""

    SETTING_TYPES = [
        ('smtp', 'SMTP Configuration'),
        ('queue', 'Queue Settings'),
        ('tracking', 'Tracking Settings'),
        ('template', 'Template Settings'),
        ('security', 'Security Settings'),
        ('performance', 'Performance Settings'),
        ('integration', 'Integration Settings'),
    ]

    key = models.CharField(max_length=100, unique=True, help_text="Setting key")
    setting_type = models.CharField(max_length=20, choices=SETTING_TYPES, default='template')
    display_name = models.CharField(max_length=200, help_text="Human-readable setting name")
    description = models.TextField(blank=True, help_text="Setting description and purpose")

    # Value storage
    value = models.JSONField(help_text="Setting value (can be string, number, object, etc.)")
    default_value = models.JSONField(default=dict, blank=True, help_text="Default value for this setting")

    # Validation and constraints
    is_required = models.BooleanField(default=False, help_text="Setting is required for system operation")
    is_sensitive = models.BooleanField(default=False, help_text="Setting contains sensitive information")
    validation_rules = models.JSONField(default=dict, blank=True, help_text="Validation rules for the setting value")

    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'utils_email_settings'
        ordering = ['setting_type', 'key']
        verbose_name = 'Email Setting'
        verbose_name_plural = 'Email Settings'

    def __str__(self):
        return f"{self.display_name} ({self.key})"

    @classmethod
    def get_setting(cls, key, default=None):
        """Get a setting value by key."""
        try:
            setting = cls.objects.get(key=key, is_active=True)
            return setting.value
        except cls.DoesNotExist:
            return default

    @classmethod
    def set_setting(cls, key, value, setting_type='template', display_name=None, description=None, user=None):
        """Set a setting value."""
        setting, created = cls.objects.get_or_create(
            key=key,
            defaults={
                'setting_type': setting_type,
                'display_name': display_name or key.replace('_', ' ').title(),
                'description': description or '',
                'value': value,
                'updated_by': user,
            }
        )
        if not created:
            setting.value = value
            setting.updated_by = user
            setting.save()
        return setting
