from django.db import migrations, models

def populate_rule_codes(apps, schema_editor):
    """
    Populate rule_code for existing ActedRule and ActedRuleExecution records
    """
    ActedRule = apps.get_model('rules_engine', 'ActedRule')
    ActedRuleExecution = apps.get_model('rules_engine', 'ActedRuleExecution')

    # First populate ActedRule records
    for rule in ActedRule.objects.all():
        # Create a unique rule_code based on the rule name and ID
        base_code = rule.name.lower().replace(' ', '_').replace('&', 'and')
        # Remove special characters and limit length
        base_code = ''.join(c for c in base_code if c.isalnum() or c == '_')[:80]
        rule_code = f"{base_code}_v{rule.version}_{rule.id}"

        # Ensure uniqueness
        counter = 1
        original_code = rule_code
        while ActedRule.objects.filter(rule_code=rule_code).exists():
            rule_code = f"{original_code}_{counter}"
            counter += 1

        rule.rule_code = rule_code
        rule.save(update_fields=['rule_code'])

    # Now populate ActedRuleExecution records with rule_code from the old rule_id field
    for execution in ActedRuleExecution.objects.all():
        # The old rule_id field contains the rule code, use it as rule_code
        if hasattr(execution, 'rule_id') and execution.rule_id:
            execution.rule_code = execution.rule_id
        else:
            # Fallback to a default if no rule_id exists
            execution.rule_code = f"unknown_rule_{execution.id}"
        execution.save(update_fields=['rule_code'])

def reverse_populate_rule_codes(apps, schema_editor):
    """
    Reverse operation - not needed for this migration
    """
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('rules_engine', '0004_remove_contentstyle_theme_and_more'),
    ]

    operations = [
        # First add the rule_code field as nullable to both models
        migrations.AddField(
            model_name='actedrule',
            name='rule_code',
            field=models.CharField(
                help_text="Unique code identifier for the rule (e.g., 'marketing_preference_rule_v1')",
                max_length=100,
                null=True,
                blank=True
            ),
        ),
        migrations.AddField(
            model_name='actedruleexecution',
            name='rule_code',
            field=models.CharField(
                help_text="Code of the executed rule",
                max_length=100,
                null=True,
                blank=True
            ),
        ),
        # Populate rule_code values for both models
        migrations.RunPython(populate_rule_codes, reverse_populate_rule_codes),
        # Now make rule_code required and unique for ActedRule
        migrations.AlterField(
            model_name='actedrule',
            name='rule_code',
            field=models.CharField(
                help_text="Unique code identifier for the rule (e.g., 'marketing_preference_rule_v1')",
                max_length=100,
                unique=True
            ),
        ),
        # Make rule_code required for ActedRuleExecution (but not unique)
        migrations.AlterField(
            model_name='actedruleexecution',
            name='rule_code',
            field=models.CharField(
                help_text="Code of the executed rule",
                max_length=100
            ),
        ),
        # Remove the old rule_id field from ActedRuleExecution
        migrations.RemoveField(
            model_name='actedruleexecution',
            name='rule_id',
        ),
        # Update indexes
        migrations.AddIndex(
            model_name='actedrule',
            index=models.Index(fields=['rule_code'], name='acted_rules_rule_code'),
        ),
        migrations.AddIndex(
            model_name='actedruleexecution',
            index=models.Index(fields=['rule_code', 'created_at'], name='acted_exec_rule_created'),
        ),
        # Remove deprecated models
        migrations.DeleteModel(
            name='UserAcknowledgment',
        ),
        migrations.DeleteModel(
            name='UserPreference',
        ),
    ]