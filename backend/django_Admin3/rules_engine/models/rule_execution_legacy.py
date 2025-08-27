"""
Rule Execution Model (Legacy)
"""
from .base import models, User
from .rule import Rule


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
        db_table = 'acted_rule_executions_legacy'
        verbose_name = 'Rule Execution (Legacy)'
        verbose_name_plural = 'Rule Executions (Legacy)'

    def __str__(self):
        return f"{self.rule.name} - {self.execution_time}"