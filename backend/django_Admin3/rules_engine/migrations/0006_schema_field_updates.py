from django.db import migrations, models

def migrate_fields_data(apps, schema_editor):
    """
    Copy data from fields_id to fields_code and rules_fields_id to rules_fields_code
    """
    ActedRulesFields = apps.get_model('rules_engine', 'ActedRulesFields')
    ActedRule = apps.get_model('rules_engine', 'ActedRule')

    # Copy fields_id to fields_code for ActedRulesFields
    for fields_obj in ActedRulesFields.objects.all():
        fields_obj.fields_code = fields_obj.fields_id
        fields_obj.save(update_fields=['fields_code'])

    # Copy rules_fields_id to rules_fields_code for ActedRule
    for rule in ActedRule.objects.all():
        if rule.rules_fields_id:
            rule.rules_fields_code = rule.rules_fields_id
            rule.save(update_fields=['rules_fields_code'])

def reverse_migrate_fields_data(apps, schema_editor):
    """
    Reverse operation - copy back from fields_code to fields_id
    """
    ActedRulesFields = apps.get_model('rules_engine', 'ActedRulesFields')
    ActedRule = apps.get_model('rules_engine', 'ActedRule')

    # Copy fields_code back to fields_id for ActedRulesFields
    for fields_obj in ActedRulesFields.objects.all():
        if fields_obj.fields_code:
            fields_obj.fields_id = fields_obj.fields_code
            fields_obj.save(update_fields=['fields_id'])

    # Copy rules_fields_code back to rules_fields_id for ActedRule
    for rule in ActedRule.objects.all():
        if rule.rules_fields_code:
            rule.rules_fields_id = rule.rules_fields_code
            rule.save(update_fields=['rules_fields_id'])

class Migration(migrations.Migration):
    dependencies = [
        ('rules_engine', '0005_add_rule_code_field'),
    ]

    operations = [
        # Add fields_code to ActedRulesFields (nullable first)
        migrations.AddField(
            model_name='actedrulesfields',
            name='fields_code',
            field=models.CharField(
                blank=True,
                help_text='Unique code identifier for the schema',
                max_length=100,
                null=True,
                unique=True
            ),
        ),
        # Add rules_fields_code to ActedRule (nullable first)
        migrations.AddField(
            model_name='actedrule',
            name='rules_fields_code',
            field=models.CharField(
                blank=True,
                help_text='Code of the ActedRulesFields schema for context validation',
                max_length=100,
                null=True
            ),
        ),
        # Rename execution_id to execution_seq_no
        migrations.RenameField(
            model_name='actedruleexecution',
            old_name='execution_id',
            new_name='execution_seq_no',
        ),
        # Copy data from old fields to new fields
        migrations.RunPython(migrate_fields_data, reverse_migrate_fields_data),
        # Now make fields_code required and unique
        migrations.AlterField(
            model_name='actedrulesfields',
            name='fields_code',
            field=models.CharField(
                help_text='Unique code identifier for the schema',
                max_length=100,
                unique=True
            ),
        ),
        # Remove the old fields_id field from ActedRulesFields
        migrations.RemoveField(
            model_name='actedrulesfields',
            name='fields_id',
        ),
        # Remove the old rules_fields_id field from ActedRule
        migrations.RemoveField(
            model_name='actedrule',
            name='rules_fields_id',
        ),
    ]