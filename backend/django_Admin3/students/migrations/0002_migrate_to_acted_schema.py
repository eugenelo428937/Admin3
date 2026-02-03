"""
Migrate students table from public schema to acted schema.

Uses SeparateDatabaseAndState to:
- Database: ALTER TABLE SET SCHEMA + RENAME (actual SQL)
- State: AlterModelTable (tells Django's migration state the db_table changed)

Forward: public.acted_students -> acted.students
Reverse: acted.students -> public.acted_students
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_students SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_students RENAME TO students;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.students RENAME TO acted_students; '
                        'ALTER TABLE acted.acted_students SET SCHEMA public;'
                    ),
                ),
            ],
            state_operations=[
                migrations.AlterModelTable(
                    name='student',
                    table='"acted"."students"',
                ),
            ],
        ),
    ]
