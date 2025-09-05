# Generated manually to rename acted_rules_engine table
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rules_engine', '0001_initial'),
    ]

    operations = [
        # Rename the table from acted_rules_engine to acted_rules_jsonb
        # This avoids confusion with the legacy acted_rules table
        migrations.RunSQL(
            sql="ALTER TABLE acted_rules_engine RENAME TO acted_rules_jsonb;",
            reverse_sql="ALTER TABLE acted_rules_jsonb RENAME TO acted_rules_engine;",
        ),
    ]