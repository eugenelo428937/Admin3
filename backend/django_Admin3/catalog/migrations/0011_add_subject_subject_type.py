"""Add subject_type column to acted.catalog_subjects.

Uses SeparateDatabaseAndState: this migration owns the DB-level DDL,
while catalog/subject/migrations/0002_add_subject_type.py owns the state mirror.

RunSQL is used for the database operation because the Subject model was removed
from the catalog app state in migration 0010 (moved to catalog_subjects app),
so AddField cannot resolve the model in the catalog state context.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0010_alter_examsessionsubject_exam_session_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE "acted"."catalog_subjects"
                        ADD COLUMN "subject_type" VARCHAR(4) NOT NULL DEFAULT 'UK';
                    """,
                    reverse_sql="""
                        ALTER TABLE "acted"."catalog_subjects"
                        DROP COLUMN "subject_type";
                    """,
                ),
            ],
        ),
    ]
