"""
Migration 0010: Move instructors from events to sessions.

1. Add M2M 'instructors' to TutorialSessions (creates junction table)
2. Migrate existing session instructor_id data to junction table
3. Remove old instructor FK from TutorialSessions
4. Remove instructors M2M from TutorialEvents (drops junction table)
"""

from django.db import migrations, models


def migrate_session_instructor_fk_to_m2m(apps, schema_editor):
    """Copy existing session instructor FK values into the new M2M junction table."""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO "acted"."tutorial_session_instructors"
                (tutorialsessions_id, tutorialinstructor_id)
            SELECT id, instructor_id
            FROM acted.tutorial_sessions
            WHERE instructor_id IS NOT NULL
        """)
        print(f"\n  Migrated {cursor.rowcount} session instructor FK values to M2M junction table")


def migrate_session_m2m_back_to_fk(apps, schema_editor):
    """Reverse: copy first instructor from M2M back to FK column."""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE acted.tutorial_sessions ts
            SET instructor_id = tsi.tutorialinstructor_id
            FROM "acted"."tutorial_session_instructors" tsi
            WHERE tsi.tutorialsessions_id = ts.id
        """)


class Migration(migrations.Migration):

    dependencies = [
        ('tutorials', '0009_alter_tutorialevents_store_product'),
    ]

    operations = [
        # Step 1: Add M2M field to TutorialSessions (creates junction table)
        migrations.AddField(
            model_name='tutorialsessions',
            name='instructors',
            field=models.ManyToManyField(
                blank=True,
                db_table='"acted"."tutorial_session_instructors"',
                related_name='sessions',
                to='tutorials.tutorialinstructor',
            ),
        ),

        # Step 2: Migrate existing FK data to junction table
        migrations.RunPython(
            migrate_session_instructor_fk_to_m2m,
            migrate_session_m2m_back_to_fk,
        ),

        # Step 3: Remove old instructor FK from TutorialSessions
        migrations.RemoveField(
            model_name='tutorialsessions',
            name='instructor',
        ),

        # Step 4: Remove instructors M2M from TutorialEvents (drops junction table)
        migrations.RemoveField(
            model_name='tutorialevents',
            name='instructors',
        ),
    ]
