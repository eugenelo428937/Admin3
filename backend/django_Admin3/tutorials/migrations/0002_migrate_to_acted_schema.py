"""
Migrate tutorials table from public schema to acted schema.

Uses SeparateDatabaseAndState to:
- Database: ALTER TABLE SET SCHEMA + RENAME (actual SQL)
- State: AlterModelTable (tells Django's migration state the db_table changed)

Forward: public.acted_tutorial_events -> acted.tutorial_events
Reverse: acted.tutorial_events -> public.acted_tutorial_events
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tutorials', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_tutorial_events SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_tutorial_events RENAME TO tutorial_events;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.tutorial_events RENAME TO acted_tutorial_events; '
                        'ALTER TABLE acted.acted_tutorial_events SET SCHEMA public;'
                    ),
                ),
            ],
            state_operations=[
                migrations.AlterModelTable(
                    name='tutorialevent',
                    table='"acted"."tutorial_events"',
                ),
            ],
        ),
    ]
