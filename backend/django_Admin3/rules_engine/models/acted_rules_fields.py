"""
Acted Rules Fields Model (JSONB-based rules engine)
"""
from .base import models, ValidationError


class ActedRulesFields(models.Model):
    """JSON Schema definitions for context validation"""
    fields_code = models.CharField(max_length=100, unique=True, help_text="Unique code identifier for the schema")
    name = models.CharField(max_length=200, help_text="Human-readable schema name")
    description = models.TextField(blank=True, help_text="Description of this schema")
    schema = models.JSONField(help_text="JSON Schema definition for context validation")
    version = models.IntegerField(default=1, help_text="Schema version number")
    is_active = models.BooleanField(default=True, help_text="Whether this schema is active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Acted Rules Fields Schema"
        verbose_name_plural = "Acted Rules Fields Schemas"
        db_table = "acted_rules_fields"
        ordering = ["name"]
    
    def __str__(self):
        return f"{self.name} (v{self.version})"