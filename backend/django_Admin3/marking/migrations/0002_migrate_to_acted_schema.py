"""
Migrate marking table from public schema to acted schema.

Uses SeparateDatabaseAndState to:
- Database: ALTER TABLE SET SCHEMA + RENAME (actual SQL)
- State: AlterModelTable (tells Django's migration state the db_table changed)

Forward: public.acted_marking_paper -> acted.marking_paper
Reverse: acted.marking_paper -> public.acted_marking_paper
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('marking', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_marking_paper SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_marking_paper RENAME TO marking_paper;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.marking_paper RENAME TO acted_marking_paper; '
                        'ALTER TABLE acted.acted_marking_paper SET SCHEMA public;'
                    ),
                ),
            ],
            state_operations=[
                migrations.AlterModelTable(
                    name='markingpaper',
                    table='"acted"."marking_paper"',
                ),
            ],
        ),
    ]
