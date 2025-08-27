"""
Rule Condition Group Model
"""
from .base import models, logger
from .rule import Rule


class RuleConditionGroup(models.Model):
    """Groups of conditions with logical operators for composite conditions"""
    LOGICAL_OPERATORS = [
        ('AND', 'All conditions must be true'),
        ('OR', 'At least one condition must be true'),
    ]
    
    name = models.CharField(max_length=100)
    rule = models.ForeignKey(
        Rule,
        on_delete=models.CASCADE,
        related_name='condition_groups'
    )
    logical_operator = models.CharField(
        max_length=3,
        choices=LOGICAL_OPERATORS,
        default='AND'
    )
    parent_group = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        related_name='child_groups',
        null=True,
        blank=True,
        help_text="Parent group for nested conditions"
    )
    execution_order = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'acted_rule_condition_groups'
        verbose_name = 'Rule Condition Group'
        verbose_name_plural = 'Rule Condition Groups'
        ordering = ['rule', 'execution_order']
    
    def __str__(self):
        return f"{self.rule.name} - {self.name} ({self.logical_operator})"
    
    def evaluate(self, context):
        """Evaluate this condition group"""
        condition_results = []
        
        # Evaluate direct conditions
        for condition in self.conditions.all():
            try:
                result = condition.evaluate(context)
                condition_results.append(result)
            except Exception as e:
                logger.error(f"Error evaluating condition {condition.id}: {str(e)}")
                condition_results.append(False)
        
        # Evaluate child groups
        for child_group in self.child_groups.filter(is_active=True):
            try:
                result = child_group.evaluate(context)
                condition_results.append(result)
            except Exception as e:
                logger.error(f"Error evaluating child group {child_group.id}: {str(e)}")
                condition_results.append(False)
        
        # Apply logical operator
        if not condition_results:
            return True  # Empty group evaluates to true
        
        if self.logical_operator == 'AND':
            return all(condition_results)
        elif self.logical_operator == 'OR':
            return any(condition_results)
        
        return False