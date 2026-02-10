"""
Migration 0008: Convert TutorialEvents.instructor FK to M2M instructors.

1. Add M2M field 'instructors' (creates junction table)
2. Migrate existing instructor_id data to junction table
3. Remove old instructor FK column
"""

import django.db.models.deletion
from django.db import migrations, models


def migrate_instructor_fk_to_m2m(apps, schema_editor):
    """Copy existing instructor FK values into the new M2M junction table."""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO "acted"."tutorial_event_instructors"
                (tutorialevents_id, tutorialinstructor_id)
            SELECT id, instructor_id
            FROM acted.tutorial_events
            WHERE instructor_id IS NOT NULL
        """)
        print(f"\n  Migrated {cursor.rowcount} instructor FK values to M2M junction table")


def migrate_m2m_back_to_fk(apps, schema_editor):
    """Reverse: copy first instructor from M2M back to FK column."""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE acted.tutorial_events te
            SET instructor_id = tei.tutorialinstructor_id
            FROM "acted"."tutorial_event_instructors" tei
            WHERE tei.tutorialevents_id = te.id
        """)


class Migration(migrations.Migration):

    dependencies = [
        ('tutorials', '0007_populate_event_fks'),
    ]

    operations = [
        # Step 1: Add M2M field (creates junction table)
        migrations.AddField(
            model_name='tutorialevents',
            name='instructors',
            field=models.ManyToManyField(
                blank=True,
                db_table='"acted"."tutorial_event_instructors"',
                related_name='events',
                to='tutorials.tutorialinstructor',
            ),
        ),

        # Step 2: Migrate existing FK data to junction table
        migrations.RunPython(migrate_instructor_fk_to_m2m, migrate_m2m_back_to_fk),

        # Step 3: Remove old FK column
        migrations.RemoveField(
            model_name='tutorialevents',
            name='instructor',
        ),
    ]
