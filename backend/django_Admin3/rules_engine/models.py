from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import json
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class MessageTemplate(models.Model):
    """Store reusable message templates with variables"""
    name = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=200)
    content = models.TextField()
    message_type = models.CharField(max_length=20, choices=[
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('success', 'Success'),
        ('terms', 'Terms & Conditions'),
    ])
    variables = models.JSONField(default=list, help_text="List of variable names used in template")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_rules_message_templates'
        verbose_name = 'Message Template'
        verbose_name_plural = 'Message Templates'

    def __str__(self):
        return f"{self.name} - {self.message_type}"


class Rule(models.Model):
    """Main rule definition"""
    TRIGGER_TYPES = [
        ('cart_add', 'Add to Cart'),
        ('checkout_start', 'Checkout Start'),
        ('checkout_confirm', 'Checkout Confirm'),
        ('product_view', 'Product View'),
        ('login', 'User Login'),
        ('registration', 'User Registration'),
        ('order_complete', 'Order Complete'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    trigger_type = models.CharField(max_length=20, choices=TRIGGER_TYPES)
    priority = models.IntegerField(default=100, help_text="Lower numbers = higher priority")
    is_active = models.BooleanField(default=True)
    is_blocking = models.BooleanField(default=False, help_text="If true, user must acknowledge before proceeding")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_rules'
        verbose_name = 'Rule'
        verbose_name_plural = 'Rules'
        ordering = ['priority', 'id']

    def __str__(self):
        return f"{self.name} ({self.trigger_type})"


class RuleCondition(models.Model):
    """Individual conditions that must be met for a rule to trigger"""
    CONDITION_TYPES = [
        ('product_category', 'Product Category'),
        ('product_code', 'Product Code'),
        ('product_type', 'Product Type'),
        ('user_type', 'User Type'),
        ('date_range', 'Date Range'),
        ('holiday_proximity', 'Holiday Proximity'),
        ('cart_value', 'Cart Value'),
        ('cart_item_count', 'Cart Item Count'),
        ('user_order_history', 'User Order History'),
        ('custom_field', 'Custom Field'),
    ]

    OPERATORS = [
        ('equals', 'Equals'),
        ('not_equals', 'Not Equals'),
        ('contains', 'Contains'),
        ('not_contains', 'Does Not Contain'),
        ('greater_than', 'Greater Than'),
        ('less_than', 'Less Than'),
        ('between', 'Between'),
        ('in_list', 'In List'),
        ('not_in_list', 'Not In List'),
        ('regex', 'Regular Expression'),
        ('custom_function', 'Custom Function'),
    ]

    rule = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name='conditions')
    condition_type = models.CharField(max_length=30, choices=CONDITION_TYPES)
    field_name = models.CharField(max_length=100, help_text="Field to evaluate (e.g., 'product.type', 'user.email')")
    operator = models.CharField(max_length=20, choices=OPERATORS)
    value = models.TextField(help_text="Value to compare against (can be JSON for complex values)")
    is_negated = models.BooleanField(default=False, help_text="Negate the condition result")

    class Meta:
        db_table = 'acted_rule_conditions'
        verbose_name = 'Rule Condition'
        verbose_name_plural = 'Rule Conditions'

    def __str__(self):
        return f"{self.rule.name}: {self.field_name} {self.operator} {self.value}"

    def evaluate(self, context):
        """Evaluate this condition against the provided context"""
        try:
            # Get the field value from context using dot notation
            field_value = self._get_nested_value(context, self.field_name)
            comparison_value = self._parse_value(self.value)
            
            if self.operator == 'custom_function':
                from .custom_functions import check_same_subject_products
                if isinstance(comparison_value, dict) and 'function' in comparison_value:
                    function_name = comparison_value['function']
                    params = comparison_value.get('params', {})
                    if function_name == 'check_same_subject_products':
                        result = check_same_subject_products(field_value, params)
                    else:
                        result = False
                else:
                    result = False
            else:
                result = self._apply_operator(field_value, comparison_value)
                
            return not result if self.is_negated else result
        except Exception as e:
            # Log error and return False for safety
            logger.error(f"Error evaluating condition: {str(e)}")
            return False

    def _get_nested_value(self, obj, path):
        """Get nested value from object using dot notation (e.g., 'user.profile.type')"""
        keys = path.split('.')
        value = obj
        for key in keys:
            if hasattr(value, key):
                value = getattr(value, key)
            elif isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        return value

    def _parse_value(self, value):
        """Parse value string, handling JSON where appropriate"""
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value

    def _apply_operator(self, field_value, comparison_value):
        """Apply the operator to compare field_value with comparison_value"""
        if self.operator == 'equals':
            return field_value == comparison_value
        elif self.operator == 'not_equals':
            return field_value != comparison_value
        elif self.operator == 'contains':
            return str(comparison_value) in str(field_value)
        elif self.operator == 'not_contains':
            return str(comparison_value) not in str(field_value)
        elif self.operator == 'greater_than':
            return float(field_value) > float(comparison_value)
        elif self.operator == 'less_than':
            return float(field_value) < float(comparison_value)
        elif self.operator == 'between':
            if isinstance(comparison_value, list) and len(comparison_value) == 2:
                return comparison_value[0] <= float(field_value) <= comparison_value[1]
            return False
        elif self.operator == 'in_list':
            if isinstance(comparison_value, list):
                return field_value in comparison_value
            return field_value == comparison_value
        elif self.operator == 'not_in_list':
            if isinstance(comparison_value, list):
                return field_value not in comparison_value
            return field_value != comparison_value
        elif self.operator == 'regex':
            import re
            return bool(re.search(str(comparison_value), str(field_value)))
        return False


class RuleAction(models.Model):
    """Actions to take when a rule is triggered"""
    ACTION_TYPES = [
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


class HolidayCalendar(models.Model):
    """Store holidays and special dates that might affect delivery/operations"""
    name = models.CharField(max_length=100)
    date = models.DateField()
    country = models.CharField(max_length=2, default='GB', help_text="ISO country code")
    is_business_day = models.BooleanField(default=False)
    delivery_delay_days = models.IntegerField(default=0, help_text="Additional delivery delay for this holiday")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'acted_holiday_calendar'
        verbose_name = 'Holiday'
        verbose_name_plural = 'Holiday Calendar'
        unique_together = ['date', 'country']

    def __str__(self):
        return f"{self.name} ({self.date}) - {self.country}"


class RuleExecution(models.Model):
    """Log rule executions for monitoring and debugging"""
    rule = models.ForeignKey(Rule, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    trigger_context = models.JSONField(default=dict)
    conditions_met = models.BooleanField()
    actions_executed = models.JSONField(default=list)
    execution_time = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = 'acted_rule_executions'
        verbose_name = 'Rule Execution'
        verbose_name_plural = 'Rule Executions'

    def __str__(self):
        return f"{self.rule.name} - {self.execution_time}"


class UserAcknowledgment(models.Model):
    """Track user acknowledgments of terms, conditions, and messages"""
    ACKNOWLEDGMENT_TYPES = [
        ('required', 'Required Acknowledgment'),
        ('optional', 'Optional Selection'),
        ('preference', 'User Preference'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rule = models.ForeignKey(Rule, on_delete=models.CASCADE)
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