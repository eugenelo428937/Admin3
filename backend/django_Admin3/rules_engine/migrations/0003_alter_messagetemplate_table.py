# Generated by Django 5.2.2 on 2025-06-13 10:14

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("rules_engine", "0002_alter_holidaycalendar_table_alter_rule_table_and_more"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="messagetemplate",
            table="acted_rules_message_templates",
        ),
    ]
