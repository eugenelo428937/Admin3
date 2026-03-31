# Separate schema migration to remove is_master field after data has been moved.
# Split from 0017 because PostgreSQL can't ALTER TABLE with pending trigger events.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("email_system", "0017_migrate_master_components_data"),
    ]

    operations = [
        migrations.RemoveField(
            model_name='emailtemplate',
            name='is_master',
        ),
    ]
