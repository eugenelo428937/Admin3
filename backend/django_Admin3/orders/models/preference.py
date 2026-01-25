from django.db import models
from .order import Order


class OrderPreference(models.Model):
    PREFERENCE_TYPE_CHOICES = [
        ('marketing', 'Marketing Preferences'),
        ('communication', 'Communication Preferences'),
        ('delivery', 'Delivery Preferences'),
        ('notification', 'Notification Preferences'),
        ('custom', 'Custom Preference'),
    ]

    INPUT_TYPE_CHOICES = [
        ('radio', 'Radio Button'),
        ('checkbox', 'Checkbox'),
        ('text', 'Text Input'),
        ('textarea', 'Text Area'),
        ('select', 'Dropdown Select'),
        ('custom', 'Custom Input'),
    ]

    DISPLAY_MODE_CHOICES = [
        ('inline', 'Inline Display'),
        ('modal', 'Modal Dialog'),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='user_preferences',
        help_text="Associated order for this preference"
    )

    # Rules engine references
    rule = models.ForeignKey(
        'rules_engine.ActedRule',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    template = models.ForeignKey(
        'rules_engine.MessageTemplate',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    # Preference identification
    preference_type = models.CharField(max_length=50, choices=PREFERENCE_TYPE_CHOICES, default='custom')
    preference_key = models.CharField(max_length=100, help_text="Unique key identifying this preference")
    preference_value = models.JSONField(default=dict, help_text="User's preference value(s)")

    # Input metadata
    input_type = models.CharField(max_length=20, choices=INPUT_TYPE_CHOICES, default='text')
    display_mode = models.CharField(max_length=20, choices=DISPLAY_MODE_CHOICES, default='inline')

    # Content
    title = models.CharField(max_length=255, help_text="Title displayed to user")
    content_summary = models.TextField(blank=True)

    # Behavioral flags
    is_submitted = models.BooleanField(default=True)

    # Audit fields
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Rules engine context
    rules_engine_context = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = '"acted"."order_user_preferences"'
        managed = False
        verbose_name = 'Order Preference'
        verbose_name_plural = 'Order Preferences'
        unique_together = ['order', 'rule', 'preference_key']
        indexes = [
            models.Index(fields=['order', 'preference_type']),
            models.Index(fields=['preference_key']),
            models.Index(fields=['submitted_at']),
        ]

    def __str__(self):
        return f"Order #{self.order.id} preference: {self.preference_key}"

    def get_display_value(self):
        if self.input_type == 'radio':
            return self.preference_value.get('choice', '')
        elif self.input_type == 'checkbox':
            selections = self.preference_value.get('selections', [])
            return ', '.join(selections) if selections else ''
        elif self.input_type in ['text', 'textarea']:
            return self.preference_value.get('text', '')
        elif self.input_type == 'select':
            return self.preference_value.get('selected', '')
        return str(self.preference_value)
