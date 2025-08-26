"""
Rule Chain Model
"""
from .base import models
from .rule_entry_point import RuleEntryPoint


class RuleChain(models.Model):
    """Rule execution chains for entry points"""
    name = models.CharField(max_length=100)
    entry_point = models.ForeignKey(
        RuleEntryPoint,
        on_delete=models.CASCADE,
        related_name='chains'
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    stop_on_failure = models.BooleanField(
        default=True,
        help_text="Stop chain execution if any rule fails"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'acted_rule_chains'
        verbose_name = 'Rule Chain'
        verbose_name_plural = 'Rule Chains'
        ordering = ['entry_point__code', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.entry_point.code})"