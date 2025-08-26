"""
Rule Action Model
"""
from .base import models
from .rule import Rule
from .message_template import MessageTemplate


class RuleAction(models.Model):
    """Actions to take when a rule is triggered"""
    ACTION_TYPES = [
        # New refined action types
        ('display', 'Display Message'),
        ('acknowledge', 'Require Acknowledgment'),
        ('update', 'Update Values'),
        ('custom', 'Custom Function'),
        # Legacy types for backward compatibility
        ('show_message', 'Show Message'),
        ('require_acknowledgment', 'Require Acknowledgment'),
        ('redirect', 'Redirect'),
        ('send_email', 'Send Email'),
        ('log_event', 'Log Event'),
        ('custom_function', 'Custom Function'),
        ('calculate_vat', 'Calculate VAT'),
        ('apply_discount', 'Apply Discount'),
        ('calculate_fee', 'Calculate Fee'),
    ]

    rule = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name='actions')
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    message_template = models.ForeignKey(MessageTemplate, on_delete=models.CASCADE, null=True, blank=True)
    parameters = models.JSONField(default=dict, help_text="Additional parameters for the action")
    execution_order = models.IntegerField(default=1)

    class Meta:
        db_table = 'acted_rule_actions'
        verbose_name = 'Rule Action'
        verbose_name_plural = 'Rule Actions'
        ordering = ['execution_order']

    def __str__(self):
        return f"{self.rule.name}: {self.action_type}"
    
    def execute(self, context):
        """Execute this action with the given context"""
        # Map new action types to legacy handlers for backward compatibility
        action_type = self.action_type
        if action_type == 'display':
            action_type = 'show_message'
        elif action_type == 'acknowledge':
            action_type = 'require_acknowledgment'
        elif action_type == 'custom':
            action_type = 'custom_function'
        elif action_type == 'update':
            return self._execute_update_action(context)
        
        # Use existing execution logic for other types
        from ..handlers import BaseRuleHandler
        handler = BaseRuleHandler()
        return handler._execute_action(self, context)
    
    def _execute_update_action(self, context):
        """Execute update action (new action type)"""
        update_params = self.parameters.copy()
        update_type = update_params.get('update_type', 'cart_value')
        
        if update_type == 'cart_value':
            # Add additional charges to cart
            additional_charge = float(update_params.get('additional_charge', 0))
            if additional_charge > 0:
                return {
                    'type': 'update',
                    'update_type': 'cart_value',
                    'additional_charge': additional_charge,
                    'description': update_params.get('description', 'Additional charge'),
                    'rule_id': self.rule.id
                }
        elif update_type == 'user_status':
            # Update user status/properties
            return {
                'type': 'update',
                'update_type': 'user_status',
                'status_updates': update_params.get('status_updates', {}),
                'rule_id': self.rule.id
            }
        elif update_type == 'vat_rate':
            # Update VAT rate
            return {
                'type': 'update',
                'update_type': 'vat_rate',
                'vat_rate': float(update_params.get('vat_rate', 0.2)),
                'rule_id': self.rule.id
            }
        
        return {
            'type': 'update',
            'error': f'Unknown update type: {update_type}',
            'rule_id': self.rule.id
        }