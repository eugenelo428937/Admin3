# Generated migration to create JSONB-based Rules model according to specification

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("rules_engine", "0014_update_entry_points_correct_list"),
    ]

    operations = [
        # Rename old Rule model to RuleLegacy for backup
        migrations.RenameModel(
            old_name="Rule",
            new_name="RuleLegacy",
        ),
        
        # Create new JSONB-based Rule model
        migrations.CreateModel(
            name="Rule",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("rule_id", models.CharField(max_length=100, unique=True, help_text="Unique identifier for the rule")),
                ("name", models.CharField(max_length=200, help_text="Human-readable rule name")),
                ("description", models.TextField(blank=True, help_text="Description of what this rule does")),
                ("entry_point", models.CharField(max_length=50, help_text="Entry point code where this rule triggers")),
                ("priority", models.IntegerField(default=100, help_text="Lower numbers = higher priority")),
                ("active", models.BooleanField(default=True, help_text="Whether this rule is active")),
                ("version", models.IntegerField(default=1, help_text="Rule version number")),
                ("rules_fields_id", models.CharField(max_length=100, blank=True, help_text="ID of the RulesFields schema for context validation")),
                ("condition", models.JSONField(help_text="JSONLogic condition expression")),
                ("actions", models.JSONField(help_text="Array of actions to execute when condition is true")),
                ("stop_processing", models.BooleanField(default=False, help_text="Stop processing other rules if this rule matches")),
                ("metadata", models.JSONField(default=dict, blank=True, help_text="Additional metadata about the rule")),
                ("active_from", models.DateTimeField(null=True, blank=True, help_text="When this rule becomes active")),
                ("active_until", models.DateTimeField(null=True, blank=True, help_text="When this rule expires")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Rule",
                "verbose_name_plural": "Rules",
                "db_table": "rules_engine_rule",
                "ordering": ["entry_point", "priority", "created_at"],
                "indexes": [
                    models.Index(fields=["entry_point", "active", "priority"], name="rules_entry_active_priority"),
                    models.Index(fields=["rule_id"], name="rules_rule_id"),
                    models.Index(fields=["active", "entry_point"], name="rules_active_entry"),
                ],
            },
        ),
        
        # Create RulesFields model for JSON Schema validation
        migrations.CreateModel(
            name="RulesFields",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("fields_id", models.CharField(max_length=100, unique=True, help_text="Unique identifier for the schema")),
                ("name", models.CharField(max_length=200, help_text="Human-readable schema name")),
                ("description", models.TextField(blank=True, help_text="Description of this schema")),
                ("schema", models.JSONField(help_text="JSON Schema definition for context validation")),
                ("version", models.IntegerField(default=1, help_text="Schema version number")),
                ("is_active", models.BooleanField(default=True, help_text="Whether this schema is active")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Rules Fields Schema",
                "verbose_name_plural": "Rules Fields Schemas",
                "db_table": "rules_engine_rules_fields",
                "ordering": ["name"],
            },
        ),
        
        # Create RuleExecution model for audit trail
        migrations.CreateModel(
            name="RuleExecution",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("execution_id", models.CharField(max_length=100, unique=True, help_text="Unique execution identifier")),
                ("rule_id", models.CharField(max_length=100, help_text="ID of the executed rule")),
                ("entry_point", models.CharField(max_length=50, help_text="Entry point that triggered the rule")),
                ("context_snapshot", models.JSONField(help_text="Context data at time of execution")),
                ("actions_result", models.JSONField(help_text="Results of action execution")),
                ("outcome", models.CharField(max_length=50, help_text="Execution outcome (success, blocked, error)")),
                ("execution_time_ms", models.FloatField(help_text="Execution time in milliseconds")),
                ("error_message", models.TextField(blank=True, help_text="Error message if execution failed")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "Rule Execution",
                "verbose_name_plural": "Rule Executions",
                "db_table": "rules_engine_execution",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["rule_id", "created_at"], name="executions_rule_created"),
                    models.Index(fields=["entry_point", "created_at"], name="executions_entry_created"),
                    models.Index(fields=["outcome", "created_at"], name="executions_outcome_created"),
                ],
            },
        ),
    ]