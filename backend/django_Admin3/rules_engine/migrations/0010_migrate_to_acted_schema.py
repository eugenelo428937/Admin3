"""
Migrate rules_engine tables from public schema to acted schema.

Uses SeparateDatabaseAndState to:
- Database: ALTER TABLE SET SCHEMA + RENAME (actual SQL)
- State: AlterModelTable (tells Django's migration state the db_table changed)

Moves all 5 rules_engine tables together in a single migration.

Forward: public.acted_rules* -> acted.rules*, acted.rule_*
Reverse: acted.rules*, acted.rule_* -> public.acted_rules*, public.acted_rule_*
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rules_engine', '0009_add_cart_calculate_vat_entry_point'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                # rules
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_rules SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_rules RENAME TO rules;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.rules RENAME TO acted_rules; '
                        'ALTER TABLE acted.acted_rules SET SCHEMA public;'
                    ),
                ),
                # rules_fields
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_rules_fields SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_rules_fields RENAME TO rules_fields;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.rules_fields RENAME TO acted_rules_fields; '
                        'ALTER TABLE acted.acted_rules_fields SET SCHEMA public;'
                    ),
                ),
                # rule_executions
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_rule_executions SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_rule_executions RENAME TO rule_executions;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.rule_executions RENAME TO acted_rule_executions; '
                        'ALTER TABLE acted.acted_rule_executions SET SCHEMA public;'
                    ),
                ),
                # rule_entry_points
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_rule_entry_points SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_rule_entry_points RENAME TO rule_entry_points;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.rule_entry_points RENAME TO acted_rule_entry_points; '
                        'ALTER TABLE acted.acted_rule_entry_points SET SCHEMA public;'
                    ),
                ),
                # rules_message_templates
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_rules_message_templates SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_rules_message_templates RENAME TO rules_message_templates;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.rules_message_templates RENAME TO acted_rules_message_templates; '
                        'ALTER TABLE acted.acted_rules_message_templates SET SCHEMA public;'
                    ),
                ),
            ],
            state_operations=[
                migrations.AlterModelTable(
                    name='actedrule',
                    table='"acted"."rules"',
                ),
                migrations.AlterModelTable(
                    name='actedrulesfields',
                    table='"acted"."rules_fields"',
                ),
                migrations.AlterModelTable(
                    name='actedruleexecution',
                    table='"acted"."rule_executions"',
                ),
                migrations.AlterModelTable(
                    name='ruleentrypoint',
                    table='"acted"."rule_entry_points"',
                ),
                migrations.AlterModelTable(
                    name='messagetemplate',
                    table='"acted"."rules_message_templates"',
                ),
            ],
        ),
    ]
