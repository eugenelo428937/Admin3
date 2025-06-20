# Generated by Django 5.2.2 on 2025-06-13 09:39

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("rules_engine", "0001_initial"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="holidaycalendar",
            table="acted_holiday_calendar",
        ),
        migrations.AlterModelTable(
            name="rule",
            table="acted_rules",
        ),
        migrations.AlterModelTable(
            name="ruleaction",
            table="acted_rule_actions",
        ),
        migrations.AlterModelTable(
            name="rulecondition",
            table="acted_rule_conditions",
        ),
        migrations.AlterModelTable(
            name="ruleexecution",
            table="acted_rule_executions",
        ),
        migrations.AlterModelTable(
            name="useracknowledgment",
            table="acted_rules_user_acknowledgments",
        ),
    ]
