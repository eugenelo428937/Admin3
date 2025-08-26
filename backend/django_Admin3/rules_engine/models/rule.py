"""
Rule Model (Legacy)
"""
from .base import models, logger
from .rule_entry_point import RuleEntryPoint


class Rule(models.Model):
    """Main rule definition with entry point integration"""
    # Keep old TRIGGER_TYPES for backward compatibility during migration
    TRIGGER_TYPES = [
        ('cart_add', 'Add to Cart'),
        ('checkout_start', 'Checkout Start'),
        ('checkout_confirm', 'Checkout Confirm'),
        ('product_view', 'Product View'),
        ('login', 'User Login'),
        ('registration', 'User Registration'),
        ('order_complete', 'Order Complete'),
    ]
    
    SUCCESS_CRITERIA = [
        ('all_conditions', 'All conditions must pass'),
        ('any_condition', 'At least one condition must pass'),
        ('custom_function', 'Use custom function to determine success')
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # New entry point field (will replace trigger_type)
    entry_point = models.ForeignKey(
        RuleEntryPoint, 
        on_delete=models.CASCADE,
        related_name='rules',
        null=True,  # Temporary for migration
        blank=True
    )
    
    # Keep old field temporarily for backward compatibility
    trigger_type = models.CharField(
        max_length=20, 
        choices=TRIGGER_TYPES,
        null=True,  # Make nullable for migration
        blank=True
    )
    
    priority = models.IntegerField(default=100, help_text="Lower numbers = higher priority")
    is_active = models.BooleanField(default=True)
    is_blocking = models.BooleanField(default=False, help_text="If true, user must acknowledge before proceeding")
    
    # Success/failure criteria for rule chain execution
    success_criteria = models.CharField(
        max_length=20,
        choices=SUCCESS_CRITERIA,
        default='all_conditions',
        help_text="Criteria for determining if this rule succeeds"
    )
    success_function = models.CharField(
        max_length=100,
        blank=True,
        help_text="Custom function name for success criteria evaluation"
    )
    return_on_failure = models.BooleanField(
        default=False,
        help_text="Return false and stop chain execution if this rule fails"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_rules'
        verbose_name = 'Rule'
        verbose_name_plural = 'Rules'
        ordering = ['priority', 'id']

    def __str__(self):
        if self.entry_point:
            return f"{self.name} ({self.entry_point.code})"
        return f"{self.name} ({self.trigger_type})"  # Fallback during migration
    
    @property
    def trigger_identifier(self):
        """Get the trigger identifier (entry_point.code or trigger_type)"""
        if self.entry_point:
            return self.entry_point.code
        return self.trigger_type
    
    def evaluate_success_criteria(self, condition_results):
        """Evaluate if the rule succeeds based on condition results"""
        if self.success_criteria == 'all_conditions':
            return all(condition_results)
        elif self.success_criteria == 'any_condition':
            return any(condition_results) if condition_results else True
        elif self.success_criteria == 'custom_function' and self.success_function:
            try:
                from . import custom_functions
                func = getattr(custom_functions, self.success_function, None)
                if func:
                    return func(condition_results)
            except (ImportError, AttributeError):
                pass
        return all(condition_results)  # Default fallback