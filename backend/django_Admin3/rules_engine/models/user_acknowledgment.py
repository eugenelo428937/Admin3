"""
User Acknowledgment Model
"""
from .base import models, User
from .acted_rule import ActedRule
from .message_template import MessageTemplate


class UserAcknowledgment(models.Model):
    """Track user acknowledgments of terms, conditions, and messages"""
    ACKNOWLEDGMENT_TYPES = [
        ('required', 'Required Acknowledgment'),
        ('optional', 'Optional Selection'),
        ('preference', 'User Preference'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rule = models.ForeignKey(ActedRule, on_delete=models.CASCADE)
    message_template = models.ForeignKey(MessageTemplate, on_delete=models.CASCADE, null=True, blank=True)
    acknowledgment_type = models.CharField(max_length=20, choices=ACKNOWLEDGMENT_TYPES, default='required')
    is_selected = models.BooleanField(default=False, help_text="For optional rules, whether user selected this option")
    acknowledged_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_data = models.JSONField(default=dict, help_text="Additional session context")

    class Meta:
        db_table = 'acted_rules_user_acknowledgments'
        verbose_name = 'User Acknowledgment'
        verbose_name_plural = 'User Acknowledgments'
        unique_together = ['user', 'rule', 'message_template']

    def __str__(self):
        action = "selected" if self.acknowledgment_type == 'optional' and self.is_selected else "acknowledged"
        return f"{self.user.username} {action} {self.rule.name}"