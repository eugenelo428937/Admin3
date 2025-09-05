"""
Acted Rule Model (JSONB-based rules engine)
"""
from .base import models, ValidationError


class ActedRule(models.Model):
    """New JSONB-based Rule model according to specification"""
    
    rule_id = models.CharField(max_length=100, unique=True, help_text="Unique identifier for the rule")
    name = models.CharField(max_length=200, help_text="Human-readable rule name")
    description = models.TextField(blank=True, help_text="Description of what this rule does")
    entry_point = models.CharField(max_length=50, help_text="Entry point code where this rule triggers")
    priority = models.IntegerField(default=100, help_text="Lower numbers = higher priority")
    active = models.BooleanField(default=True, help_text="Whether this rule is active")
    version = models.IntegerField(default=1, help_text="Rule version number")
    rules_fields_id = models.CharField(max_length=100, blank=True, help_text="ID of the ActedRulesFields schema for context validation")
    condition = models.JSONField(help_text="JSONLogic condition expression")
    actions = models.JSONField(help_text="Array of actions to execute when condition is true")
    stop_processing = models.BooleanField(default=False, help_text="Stop processing other rules if this rule matches")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional metadata about the rule")
    active_from = models.DateTimeField(null=True, blank=True, help_text="When this rule becomes active")
    active_until = models.DateTimeField(null=True, blank=True, help_text="When this rule expires")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Acted Rule"
        verbose_name_plural = "Acted Rules"
        db_table = "acted_rules_jsonb"
        ordering = ["entry_point", "priority", "created_at"]
        indexes = [
            models.Index(fields=["entry_point", "active", "priority"], name="acted_rules_entry_active"),
            models.Index(fields=["rule_id"], name="acted_rules_rule_id"),
            models.Index(fields=["active", "entry_point"], name="acted_rules_active_ent"),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.entry_point})"
    
    def clean(self):
        """Validate JSON fields"""
        super().clean()
        
        # Validate condition is proper JSONLogic
        if not isinstance(self.condition, dict):
            raise ValidationError({
                'condition': 'Condition must be a JSON object (JSONLogic expression)'
            })
        
        # Validate actions is a list
        if not isinstance(self.actions, list):
            raise ValidationError({
                'actions': 'Actions must be a JSON array'
            })
        
        # Validate each action has required fields
        for i, action in enumerate(self.actions):
            if not isinstance(action, dict):
                raise ValidationError({
                    'actions': f'Action {i} must be a JSON object'
                })
            if 'type' not in action:
                raise ValidationError({
                    'actions': f'Action {i} must have a "type" field'
                })