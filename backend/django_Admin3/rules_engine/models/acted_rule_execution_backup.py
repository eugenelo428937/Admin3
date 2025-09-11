"""
Acted Rule Execution Model (JSONB-based rules engine)
"""
from .base import models


class ActedRuleExecution(models.Model):
    """Audit trail for rule executions"""
    
    execution_id = models.CharField(max_length=100, unique=True, help_text="Unique execution identifier")
    rule_id = models.CharField(max_length=100, help_text="ID of the executed rule")
    entry_point = models.CharField(max_length=50, help_text="Entry point that triggered the rule")
    context_snapshot = models.JSONField(help_text="Context data at time of execution")
    actions_result = models.JSONField(help_text="Results of action execution")
    outcome = models.CharField(max_length=50, help_text="Execution outcome (success, blocked, error)")
    execution_time_ms = models.FloatField(help_text="Execution time in milliseconds")
    error_message = models.TextField(blank=True, help_text="Error message if execution failed")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Acted Rule Execution"
        verbose_name_plural = "Acted Rule Executions"
        db_table = "acted_rule_executions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["rule_id", "created_at"], name="acted_exec_rule_created"),
            models.Index(fields=["entry_point", "created_at"], name="acted_exec_entry_created"),
            models.Index(fields=["outcome", "created_at"], name="acted_exec_outcome_crtd"),
        ]
    
    def __str__(self):
        return f"Execution {self.execution_id} - {self.outcome}"